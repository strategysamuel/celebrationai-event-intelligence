/**
 * Server-Side Gemini Service
 * CelebrationAI - Event Intelligence Copilot
 *
 * Uses official @google/genai SDK with server-side protection,
 * structured JSON output, Zod validation, timeout handling, and graceful fallbacks.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import {
  BudgetCategoryAllocation,
  CopilotChatMessage,
  EventPlan,
  EventType,
  Milestone,
  ReplanningImpact,
  ReplanningRequest,
  RiskAlert,
  Task,
  Vendor,
  VendorCategory,
  FallbackType,
  CelebrationIntelligenceRequest,
  CelebrationIntelligenceReport,
  VendorQuotation,
  VendorNegotiationInsight,
  OperationsCopilotInsight,
} from '../src/types/index.ts';
import { DEFAULT_ALLOCATION_PERCENTAGES, INITIAL_WEDDING_ALLOCATIONS } from '../src/domain/budgetEngine';
import { generateDefaultMilestones, generateDefaultTasks } from '../src/domain/timelineEngine';
import { calculateVendorScore } from '../src/domain/vendorEngine';
import { analyzeCelebrationIntelligence } from '../src/domain/celebrationIntelligenceEngine';
import { generateHeuristicNegotiationInsight } from '../src/domain/procurementEngine';
import {
  calculateEventReadinessScore,
  generateHeuristicOperationsInsight,
} from '../src/domain/executionEngine';

// Configurable model names dynamically read from environment
export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.8-flash';
}

export function getGeminiFallbackModelName(): string {
  return process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash';
}

// Shared server-side SDK client
let aiClient: GoogleGenAI | null = null;
let isTestingOverride = false;

export function setAiClientForTesting(client: any): void {
  aiClient = client;
  isTestingOverride = client !== undefined;
}

export function getAiClient(): GoogleGenAI | null {
  if (isTestingOverride) {
    return aiClient;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const GEMINI_TIMEOUT_MS = 10000;

export async function executeGeminiWithTimeout(params: any): Promise<any> {
  const ai = getAiClient();
  if (!ai) throw new Error('AI client not initialized');

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, GEMINI_TIMEOUT_MS);

  try {
    const configWithSignal = {
      ...(params.config || {}),
      abortSignal: controller.signal,
    };
    const result = await ai.models.generateContent({
      ...params,
      config: configWithSignal,
    });
    return result;
  } catch (err: any) {
    if (controller.signal.aborted || err.name === 'AbortError') {
      throw new Error(`Gemini API request aborted after ${GEMINI_TIMEOUT_MS / 1000}s timeout`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Server-side Gemini Quota Circuit Breaker State & Utilities
let quotaCircuitBreakerState = {
  isDailyQuotaExhausted: false,
  quotaExhaustedAt: 0,
  retryUntil: 0,
  lastQuotaErrorMessage: '',
};

export function getQuotaCircuitBreakerStatus() {
  const now = Date.now();
  if (quotaCircuitBreakerState.isDailyQuotaExhausted && now >= quotaCircuitBreakerState.retryUntil) {
    quotaCircuitBreakerState = {
      isDailyQuotaExhausted: false,
      quotaExhaustedAt: 0,
      retryUntil: 0,
      lastQuotaErrorMessage: '',
    };
  }
  return {
    isOpen: quotaCircuitBreakerState.isDailyQuotaExhausted,
    retryAfterMs: Math.max(0, quotaCircuitBreakerState.retryUntil - now),
    quotaExhaustedAt: quotaCircuitBreakerState.quotaExhaustedAt ? new Date(quotaCircuitBreakerState.quotaExhaustedAt).toISOString() : null,
  };
}

export function resetQuotaCircuitBreakerForTesting() {
  quotaCircuitBreakerState = {
    isDailyQuotaExhausted: false,
    quotaExhaustedAt: 0,
    retryUntil: 0,
    lastQuotaErrorMessage: '',
  };
}

function checkAndRecordDailyQuotaExhaustion(error: any) {
  const msg = (error?.message || String(error)).toLowerCase();
  const status = (error?.status || '').toLowerCase();
  const code = error?.code;

  const is429 = code === 429 || status.includes('resource_exhausted') || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota exceeded');
  const isDailyQuota = is429 || msg.includes('per day limit exceeded') || msg.includes('free tier') || msg.includes('generativelanguage.googleapis.com/generate_content_free_tier_requests') || msg.includes('limit: 20');

  if (isDailyQuota) {
    const now = Date.now();
    let retryDelayMs = 60 * 60 * 1000; // default 1 hour cooldown
    const retryMatch = msg.match(/retryDelay["']?\s*:\s*["']?(\d+)s["']?/i) || msg.match(/please retry in\s+(\d+)h/i);
    if (retryMatch && retryMatch[1]) {
      if (msg.match(/retryDelay/i)) {
        retryDelayMs = parseInt(retryMatch[1], 10) * 1000;
      } else {
        retryDelayMs = parseInt(retryMatch[1], 10) * 3600 * 1000;
      }
    }

    quotaCircuitBreakerState = {
      isDailyQuotaExhausted: true,
      quotaExhaustedAt: now,
      retryUntil: now + retryDelayMs,
      lastQuotaErrorMessage: 'Daily free-tier request limit exceeded. Circuit breaker open.',
    };

    console.warn(
      `[Gemini Circuit Breaker] Daily quota exhaustion detected (429 RESOURCE_EXHAUSTED). Circuit breaker opened for ${Math.round(retryDelayMs / 1000 / 60)} minutes. Routing subsequent requests to heuristic fallback without upstream calls.`
    );
  }
}

export interface ModelRoutingResult {
  rawResponse: any;
  text: string;
  requestedModel: string;
  actualModel: string | null;
  isFallbackModel: boolean;
  modelVersion?: string | null;
  fallbackType: FallbackType;
  source: 'gemini';
}

/**
 * Execute Gemini with dynamic model routing, upstream version inspection,
 * circuit-breaker guard, and optional explicit alternate-model fallback before falling back to heuristics.
 */
export async function executeGeminiWithRouting(
  params: {
    contents: any;
    config?: any;
  },
  customPrimaryModel?: string,
  customFallbackModel?: string
): Promise<ModelRoutingResult> {
  const breakerStatus = getQuotaCircuitBreakerStatus();
  if (breakerStatus.isOpen) {
    console.warn(
      `[Gemini Circuit Breaker] Circuit breaker is active due to daily quota exhaustion. Bypassing Gemini API and routing to heuristic fallback.`
    );
    throw new Error('GEMINI_QUOTA_CIRCUIT_BREAKER_OPEN');
  }

  const primaryModel = (typeof customPrimaryModel === 'string' && customPrimaryModel.trim() ? customPrimaryModel : getGeminiModelName()) || 'gemini-3.8-flash';
  const fallbackModel = (typeof customFallbackModel === 'string' && customFallbackModel.trim() ? customFallbackModel : getGeminiFallbackModelName()) || 'gemini-2.5-flash';

  try {
    const response = await executeGeminiWithTimeout({
      model: primaryModel,
      contents: params.contents,
      config: params.config,
    });

    const rawVersion = response?.modelVersion;
    const modelVersion = rawVersion && typeof rawVersion === 'string' ? rawVersion.trim() : null;
    let actualModel: string | null = null;
    let fallbackType: FallbackType = 'none';

    if (modelVersion) {
      actualModel = modelVersion;
      const normRequested = String(primaryModel || '').trim().toLowerCase();
      const normVersion = String(modelVersion || '').toLowerCase();
      if (normVersion !== normRequested) {
        fallbackType = 'upstream_model_difference';
      } else {
        fallbackType = 'none';
      }
    } else {
      // Upstream response did not report modelVersion metadata.
      // Do not falsely claim requestedModel was confirmed as serving model.
      actualModel = null;
      fallbackType = 'none';
    }

    const isFallbackModel = fallbackType === 'upstream_model_difference';

    return {
      rawResponse: response,
      text: response?.text || '',
      requestedModel: primaryModel,
      actualModel,
      isFallbackModel,
      modelVersion,
      fallbackType,
      source: 'gemini',
    };
  } catch (primaryError: any) {
    checkAndRecordDailyQuotaExhaustion(primaryError);

    console.warn(
      `Primary Gemini model (${primaryModel}) failed: ${primaryError?.message || primaryError}. Attempting alternate fallback model (${fallbackModel})...`
    );

    const primaryStr = String(primaryModel || '').trim().toLowerCase();
    const fallbackStr = String(fallbackModel || '').trim().toLowerCase();

    // If an alternate fallback model is defined and differs from primary, attempt it
    if (fallbackStr && fallbackStr !== primaryStr) {
      try {
        const fallbackResponse = await executeGeminiWithTimeout({
          model: fallbackModel,
          contents: params.contents,
          config: params.config,
        });

        const rawFallbackVersion = fallbackResponse?.modelVersion;
        const modelVersion =
          rawFallbackVersion && typeof rawFallbackVersion === 'string'
            ? rawFallbackVersion.trim()
            : null;
        const actualModel = modelVersion || fallbackModel;

        return {
          rawResponse: fallbackResponse,
          text: fallbackResponse?.text || '',
          requestedModel: primaryModel,
          actualModel,
          isFallbackModel: true,
          modelVersion,
          fallbackType: 'alternate_model',
          source: 'gemini',
        };
      } catch (fallbackError: any) {
        checkAndRecordDailyQuotaExhaustion(fallbackError);
        console.warn(
          `Alternate fallback model (${fallbackModel}) also failed: ${fallbackError.message}`
        );
        throw fallbackError;
      }
    }

    throw primaryError;
  }
}

// Zod Schemas for API input & output validation
export const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1).max(4000),
    })
  ).min(1).max(50),
  currentEvent: z.object({
    id: z.string().optional(),
    name: z.string().max(200).optional(),
    totalBudget: z.number().min(0).max(1000000000).optional(),
    guestCount: z.number().int().min(0).max(100000).optional(),
  }).passthrough().optional(),
});

export const GeneratePlanRequestSchema = z.object({
  prompt: z.string().min(5).max(4000),
  eventType: z.string().max(100).optional(),
  targetDate: z.string().max(50).optional(),
  guestCount: z.number().int().min(1).max(100000).optional(),
  budget: z.number().min(0).max(1000000000).optional(),
  currency: z.string().max(10).optional(),
});

export const CelebrationIntelligenceRequestSchema = z.object({
  currentPlan: z.any(),
  request: z.object({
    eventId: z.string().min(1),
    newGuestCount: z.number().int().min(1).max(100000).optional(),
    newBudget: z.number().min(0).max(1000000000).optional(),
    newEventDate: z.string().max(50).optional(),
    preservedPriorities: z.array(z.string().max(200)).max(20).optional(),
  }),
});

export const ReplanningRequestSchema = z.object({
  currentPlan: z.any(),
  request: z.object({
    newBudget: z.number().min(0).max(1000000000).optional(),
    newDate: z.string().max(50).optional(),
    newGuestCount: z.number().int().min(1).max(100000).optional(),
  }).passthrough(),
});

export const RiskMitigationRequestSchema = z.object({
  risk: z.any(),
  planContext: z.object({
    name: z.string().max(200),
    type: z.string().max(100),
    budget: z.number().min(0).max(1000000000),
    currency: z.string().max(10),
  }).optional(),
});

export const VendorNegotiationRequestSchema = z.object({
  quotation: z.any(),
  allocatedBudget: z.number().min(0).max(1000000000).optional(),
});

export const OperationsRequestSchema = z.object({
  event: z.any(),
});

// System Instructions
const COPILOT_SYSTEM_INSTRUCTION = `You are CelebrationAI, an elite Principal Event Intelligence Copilot and Executive Wedding/Event Planner.
Your purpose is to help users organize weddings, birthdays, anniversaries, corporate and community events.
You are sharp, warm, structured, highly knowledgeable about vendor contracts, regional customs, timeline risks, and budget optimization.

Guidelines:
1. Understand the user's requirements (event type, guest count, budget, date, location, theme, priorities).
2. If any critical info is missing (such as exact date, guest count, or budget), ask sharp, relevant follow-up questions (maximum 2-3 at a time).
3. Always suggest concrete numbers, realistic category allocations, and risk watchpoints.
4. Keep answers structured with crisp bullet points, clear highlights, and actionable advice.
5. In your response, if you have gathered enough parameters, provide a structured plan preview.
`;

/**
 * Handle Conversational AI Planning Chat
 */
export async function handleCopilotChat(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  currentEvent?: Partial<EventPlan>
): Promise<{
  reply: string;
  suggestedActions: string[];
  extractedRequirements?: Partial<EventPlan>;
  source: 'gemini' | 'heuristic';
  model?: string;
  requestedModel: string;
  actualModel: string | null;
  isFallbackModel: boolean;
  modelVersion?: string | null;
  fallbackType: FallbackType;
}> {
  const selectedModel = getGeminiModelName();
  const ai = getAiClient();

  // If no AI key available, run intelligent deterministic heuristic assistant
  if (!ai) {
    return generateHeuristicChatResponse(messages, currentEvent, selectedModel);
  }

  try {
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const conversationHistory = messages
      .slice(-8)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const promptText = `
${conversationHistory}

Current Active Event Context:
Name: ${currentEvent?.name || 'Not set'}
Type: ${currentEvent?.type || 'Not specified'}
Location: ${currentEvent?.location || 'Not specified'}
Date: ${currentEvent?.eventDate || 'Not specified'}
Guests: ${currentEvent?.guestCount || 'Not specified'}
Budget: ${currentEvent?.currency || 'INR'} ${currentEvent?.totalBudget || 'Not specified'}

Analyze the user's latest message: "${lastUserMessage}".
Provide an intelligent response that:
1. Acknowledges their request and identifies any missing details.
2. Offers 3-4 specific planning recommendations.
3. Suggests 3 quick action buttons they can click next.
4. If they shared budget/date/guests/type, extract those into structured parameters.

Return response in strict JSON format matching this structure:
{
  "reply": "Your markdown-formatted conversational response...",
  "suggestedActions": ["Action 1", "Action 2", "Action 3"],
  "extractedRequirements": {
    "name": "Suggested Event Name",
    "type": "Wedding | Birthday | Anniversary | Corporate event | Community event | Festival | Custom event",
    "location": "City/Region",
    "eventDate": "YYYY-MM-DD",
    "guestCount": 300,
    "totalBudget": 1500000,
    "currency": "INR | USD | EUR | GBP",
    "userPreferences": "Extracted style/preferences",
    "priorityConsiderations": "Key priorities"
  }
}
`;

    const routingResult = await executeGeminiWithRouting({
      contents: promptText,
      config: {
        systemInstruction: COPILOT_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const rawText = routingResult.text || '{}';
    const parsed = JSON.parse(rawText);

    return {
      reply: parsed.reply || 'I am ready to help you plan your event. Tell me your vision!',
      suggestedActions: parsed.suggestedActions || [
        'Generate Full Event Plan',
        'Optimize Budget Allocations',
        'Review Critical Path Timeline',
      ],
      extractedRequirements: parsed.extractedRequirements,
      source: 'gemini',
      model: routingResult.actualModel || routingResult.requestedModel,
      requestedModel: routingResult.requestedModel,
      actualModel: routingResult.actualModel,
      isFallbackModel: routingResult.isFallbackModel,
      modelVersion: routingResult.modelVersion,
      fallbackType: routingResult.fallbackType,
    };
  } catch (err: any) {
    if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      console.warn('Gemini quota exceeded (429). Falling back to deterministic heuristic engine.');
    } else {
      console.error('Gemini Copilot chat error, falling back to deterministic heuristic:', err.message);
    }
    return generateHeuristicChatResponse(messages, currentEvent, selectedModel);
  }
}

/**
 * Handle Full Event Plan Generation via Gemini Structured Outputs
 */
export async function handleGeneratePlan(params: {
  prompt: string;
  eventType?: string;
  targetDate?: string;
  guestCount?: number;
  budget?: number;
  currency?: string;
}): Promise<EventPlan> {
  const selectedModel = getGeminiModelName();
  const ai = getAiClient();
  const safeCurrency = (params.currency as any) || 'INR';

  // Fallback if AI not available
  if (!ai) {
    return generateHeuristicEventPlan(params, selectedModel);
  }

  try {
    const promptText = `
The user wants to generate a complete event plan based on this description:
"${params.prompt}"

Given parameters:
Event Type: ${params.eventType || 'Auto-detect'}
Date: ${params.targetDate || 'Auto-detect (approx 6 months out YYYY-MM-DD)'}
Guests: ${params.guestCount || 200}
Budget: ${params.budget || 1000000} ${safeCurrency}

Create a complete, realistic, professional event plan with:
- Sensible category percentage allocations summing to 100% (Venue, Catering, Decoration, Photography, Entertainment, Accommodation, Transport, Miscellaneous).
- 4-8 realistic expenses with estimated costs.
- 5 realistic synthetic demonstration vendors clearly named with "[DEMO DATA]" suffix, with contact details, quoted prices, and scores.
- 6-10 scheduled milestones and tasks.
- 2-4 realistic initial risk alerts with severities.

Return strictly JSON matching this structure:
{
  "name": "Event Title",
  "type": "Wedding",
  "location": "City, Country",
  "eventDate": "YYYY-MM-DD",
  "guestCount": 300,
  "totalBudget": 1500000,
  "currency": "${safeCurrency}",
  "userPreferences": "Description of preferences",
  "specialRequirements": "Special notes",
  "priorityConsiderations": "Priority items",
  "allocations": [
    { "category": "Venue", "percentage": 20 },
    { "category": "Catering", "percentage": 30 },
    { "category": "Decoration", "percentage": 15 },
    { "category": "Photography", "percentage": 10 },
    { "category": "Entertainment", "percentage": 8 },
    { "category": "Accommodation", "percentage": 4 },
    { "category": "Transport", "percentage": 3 },
    { "category": "Miscellaneous", "percentage": 10 }
  ],
  "vendorRecommendations": [
    {
      "name": "Vendor Name [DEMO DATA]",
      "category": "Venue",
      "contactPerson": "Contact Name",
      "phone": "+91 98000 00000",
      "email": "vendor@example.demo",
      "quotedPrice": 300000,
      "negotiatedPrice": 285000,
      "budgetCompatibilityScore": 90,
      "serviceSuitabilityScore": 95,
      "availabilityScore": 90,
      "rating": 4.8,
      "notes": "Vendor highlight"
    }
  ],
  "riskWatchpoints": [
    {
      "category": "Budget",
      "severity": "Medium",
      "title": "Watchpoint title",
      "explanation": "Why this is a risk",
      "recommendedAction": "Action to mitigate"
    }
  ]
}
`;

    const routingResult = await executeGeminiWithRouting({
      contents: promptText,
      config: {
        systemInstruction: 'You are an expert AI event architect. Output strictly valid JSON.',
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(routingResult.text || '{}');
    const plan = assembleEventPlanFromAI(parsed, params);
    plan.metadata = {
      source: 'gemini',
      requestedModel: routingResult.requestedModel,
      actualModel: routingResult.actualModel,
      isFallbackModel: routingResult.isFallbackModel,
      modelVersion: routingResult.modelVersion,
      fallbackType: routingResult.fallbackType,
    };
    return plan;
  } catch (err: any) {
    if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      console.warn('Gemini quota exceeded (429). Falling back to heuristic engine.');
    } else {
      console.error('Gemini plan generation error, falling back to heuristic engine:', err.message);
    }
    return generateHeuristicEventPlan(params, selectedModel);
  }
}

/**
 * AI-Enriched Risk Mitigation Strategy
 */
export async function handleRiskMitigation(
  risk: RiskAlert,
  planSummary: { name: string; type: string; budget: number; currency: string }
): Promise<{
  analysis: string;
  immediateActions: string[];
  contingencyAlternatives: string[];
  preventiveMeasures: string[];
  source: 'gemini' | 'heuristic';
  requestedModel: string;
  actualModel: string | null;
  isFallbackModel: boolean;
  modelVersion?: string | null;
  fallbackType: FallbackType;
}> {
  const selectedModel = getGeminiModelName();
  const ai = getAiClient();
  if (!ai) {
    return {
      analysis: `Rule-Engine identified ${risk.severity} risk: "${risk.title}". This risk impacts ${risk.category} directly.`,
      immediateActions: [
        risk.recommendedAction,
        'Review current allocation vs quoted vendor commitments.',
        'Convene immediate stakeholder alignment session.',
      ],
      contingencyAlternatives: [
        'Utilize the 7% emergency contingency buffer.',
        'Negotiate secondary vendor quotes or scale down optional add-ons.',
      ],
      preventiveMeasures: [
        'Lock contract dates with non-refundable minimum commitments.',
        'Enable milestone notifications 14 days before critical deadlines.',
      ],
      source: 'heuristic',
      requestedModel: selectedModel,
      actualModel: 'Deterministic Heuristic Engine',
      isFallbackModel: false,
      modelVersion: null,
      fallbackType: 'heuristic',
    };
  }

  try {
    const prompt = `
Event Context:
Name: ${planSummary.name}
Type: ${planSummary.type}
Total Budget: ${planSummary.currency} ${planSummary.budget.toLocaleString()}

Active Risk Alert:
Title: ${risk.title}
Category: ${risk.category}
Severity: ${risk.severity}
Explanation: ${risk.explanation}
Initial Recommended Action: ${risk.recommendedAction}

Formulate an executive risk mitigation briefing.
Return strictly JSON:
{
  "analysis": "Root cause analysis and projected operational impact...",
  "immediateActions": ["Action 1 within 24-48 hours", "Action 2", "Action 3"],
  "contingencyAlternatives": ["Plan B alternative", "Plan C alternative"],
  "preventiveMeasures": ["Process control to prevent recurrence"]
}
`;

    const routingResult = await executeGeminiWithRouting({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(routingResult.text || '{}');
    return {
      analysis: parsed.analysis || risk.explanation,
      immediateActions: parsed.immediateActions || [risk.recommendedAction],
      contingencyAlternatives: parsed.contingencyAlternatives || ['Activate emergency contingency reserve fund'],
      preventiveMeasures: parsed.preventiveMeasures || ['Regular vendor check-ins and locked payment milestones'],
      source: 'gemini',
      requestedModel: routingResult.requestedModel,
      actualModel: routingResult.actualModel,
      isFallbackModel: routingResult.isFallbackModel,
      modelVersion: routingResult.modelVersion,
      fallbackType: routingResult.fallbackType,
    };
  } catch (e: any) {
    return {
      analysis: risk.explanation,
      immediateActions: [risk.recommendedAction],
      contingencyAlternatives: ['Activate emergency contingency reserve fund'],
      preventiveMeasures: ['Regular vendor check-ins and locked payment milestones'],
      source: 'heuristic',
      requestedModel: selectedModel,
      actualModel: 'Deterministic Heuristic Engine',
      isFallbackModel: false,
      modelVersion: null,
      fallbackType: 'heuristic',
    };
  }
}

// Helper: Deterministic Heuristic Chat Fallback
function generateHeuristicChatResponse(
  messages: { role: string; content: string }[],
  currentEvent?: Partial<EventPlan>,
  requestedModel: string = getGeminiModelName()
) {
  const lastMsg = (messages[messages.length - 1]?.content || '').toLowerCase();

  // Pattern detection for wedding in Chennai
  if (lastMsg.includes('chennai') || lastMsg.includes('wedding') || lastMsg.includes('lakh')) {
    return {
      reply: `### Event Requirements Analyzed: Grand Traditional Wedding

I have extracted your core parameters:
- **Location:** Chennai, Tamil Nadu
- **Guest Capacity:** ~300 Guests
- **Budget Ceiling:** ₹15,00,000 (Rs. 15 Lakhs)
- **Aesthetic:** Traditional South Indian with modern comforts

#### Key Architectural Recommendations:
1. **Venue Strategy:** Allocate 20% (₹3,00,000). Prioritize Mahabalipuram heritage coastal lawns or central Chennai air-conditioned kalyana mandapams with spacious car parking.
2. **Catering Focus:** Allocate 30% (₹4,50,000). Traditional banana leaf feasts require dedicated servers and live tiffin stations (filter coffee, hot jalebi).
3. **Timeline Cadence:** Book primary venue and caterer at least 150-120 days out to guarantee peak auspicious date (Muhurtham) availability.
4. **Contingency Buffer:** We have reserved 7% (₹1,05,000) for last-minute guest escalations and weather protection.`,
      suggestedActions: [
        'Generate Full Event Plan Now',
        'Simulate Budget at ₹12 Lakhs',
        'Review Critical Path Timeline',
      ],
      extractedRequirements: {
        name: "Grand Chennai Traditional Wedding",
        type: 'Wedding' as EventType,
        location: 'Chennai, Tamil Nadu, India',
        eventDate: '2027-02-15',
        guestCount: 300,
        totalBudget: 1500000,
        currency: 'INR' as const,
        userPreferences: 'Traditional South Indian decor, authentic multi-course banana leaf feast, classical live instrumentals.',
        priorityConsiderations: 'Catering authenticity (#1 Priority), Candid Photography, Seamless Guest Transit.',
      },
      source: 'heuristic' as const,
      model: 'Deterministic Heuristic Engine',
      requestedModel,
      actualModel: 'Deterministic Heuristic Engine',
      isFallbackModel: false,
      modelVersion: null,
      fallbackType: 'heuristic' as const,
    };
  }

  return {
    reply: `### CelebrationAI Planning Intelligence Active

I am ready to help you architect and optimize your celebration!

To build your optimized event roadmap, please tell me:
1. **Event Type & Theme:** (e.g., Wedding, Milestone 30th Birthday, Corporate Summit)
2. **Location & Target Date:**
3. **Guest Headcount & Budget Ceiling:**
4. **Non-Negotiable Priorities:** (e.g., Gourmet dining, luxury photography, live music)

Or click one of the quick suggestions below to load a pre-configured scenario.`,
    suggestedActions: [
      'Plan 300-Guest Chennai Wedding (₹15 Lakhs)',
      'Plan 120-Guest Rooftop Birthday Gala',
      'Plan 250-Guest Corporate Leadership Summit',
    ],
    source: 'heuristic' as const,
    model: 'Deterministic Heuristic Engine',
    requestedModel,
    actualModel: 'Deterministic Heuristic Engine',
    isFallbackModel: false,
    modelVersion: null,
    fallbackType: 'heuristic' as const,
  };
}

// Helper: Heuristic Event Plan Generator
function generateHeuristicEventPlan(
  params: {
    prompt: string;
    eventType?: string;
    targetDate?: string;
    guestCount?: number;
    budget?: number;
    currency?: string;
  },
  requestedModel: string = getGeminiModelName()
): EventPlan {
  const budget = params.budget || 1500000;
  const currency = (params.currency as any) || 'INR';
  const eventDate = params.targetDate || '2027-02-15';
  const type: EventType = (params.eventType as EventType) || 'Wedding';
  const guestCount = params.guestCount || 300;

  const milestones = generateDefaultMilestones(eventDate, type);
  const tasks = generateDefaultTasks(eventDate, milestones);

  const budgetAllocations: BudgetCategoryAllocation[] = INITIAL_WEDDING_ALLOCATIONS.map((a) => ({
    category: a.category,
    percentage: a.percentage,
    allocatedAmount: Math.round((budget * a.percentage) / 100),
  }));

  const planId = `cai-plan-${Date.now()}`;

  return {
    id: planId,
    name: `${type} Celebration in ${params.prompt.slice(0, 30)}...`,
    type,
    location: 'Chennai, India',
    eventDate,
    guestCount,
    totalBudget: budget,
    currency,
    userPreferences: params.prompt,
    specialRequirements: 'Eco-friendly arrangements, premium dining experience.',
    priorityConsiderations: 'High-quality catering, seamless execution, memorable guest hospitality.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    budgetAllocations,
    expenses: [
      {
        id: `exp-${Date.now()}-1`,
        category: 'Venue',
        name: 'Selected Prime Venue',
        estimatedCost: Math.round(budget * 0.2),
        actualCost: 0,
        paidAmount: 0,
        paymentStatus: 'Unpaid',
      },
      {
        id: `exp-${Date.now()}-2`,
        category: 'Catering',
        name: 'Full Banquet Dining Service',
        estimatedCost: Math.round(budget * 0.3),
        actualCost: 0,
        paidAmount: 0,
        paymentStatus: 'Unpaid',
      },
    ],
    milestones,
    tasks,
    vendors: [
      {
        id: `vnd-${Date.now()}-1`,
        name: 'Heritage Grand Banquets [DEMO DATA]',
        category: 'Venue',
        contactPerson: 'K. R. Nair',
        phone: '+91 98400 11221',
        email: 'info@heritagegrand.demo',
        quotedPrice: Math.round(budget * 0.2),
        negotiatedPrice: Math.round(budget * 0.19),
        status: 'Quoted',
        paymentStatus: 'Unpaid',
        paidAmount: 0,
        isPreferred: true,
        notes: 'High capacity lawn with indoor ballroom fallback.',
        budgetCompatibilityScore: 92,
        serviceSuitabilityScore: 95,
        availabilityScore: 90,
        rating: 4.8,
        ratingScore: 96,
        compositeScore: 93,
        isDemoData: true,
      },
    ],
    risks: [],
    metadata: {
      source: 'heuristic',
      requestedModel,
      actualModel: 'Deterministic Heuristic Engine',
      isFallbackModel: false,
      modelVersion: null,
      fallbackType: 'heuristic',
    },
  };
}

// Assemble full EventPlan from AI parsed response
function assembleEventPlanFromAI(parsed: any, params: any): EventPlan {
  const budget = parsed.totalBudget || params.budget || 1500000;
  const currency = parsed.currency || params.currency || 'INR';
  const eventDate = parsed.eventDate || params.targetDate || '2027-02-15';
  const type: EventType = parsed.type || params.eventType || 'Wedding';
  const guestCount = parsed.guestCount || params.guestCount || 300;

  const milestones = generateDefaultMilestones(eventDate, type);
  const tasks = generateDefaultTasks(eventDate, milestones);

  const allocations: BudgetCategoryAllocation[] = (parsed.allocations || INITIAL_WEDDING_ALLOCATIONS).map(
    (a: any) => ({
      category: a.category,
      percentage: a.percentage,
      allocatedAmount: Math.round((budget * a.percentage) / 100),
    })
  );

  const vendors: Vendor[] = (parsed.vendorRecommendations || []).map((v: any, idx: number) => {
    const { compositeScore, ratingScore } = calculateVendorScore({
      budgetCompatibilityScore: v.budgetCompatibilityScore || 85,
      serviceSuitabilityScore: v.serviceSuitabilityScore || 90,
      availabilityScore: v.availabilityScore || 85,
      rating: v.rating || 4.5,
    });
    return {
      id: `vnd-ai-${idx + 1}`,
      name: v.name.includes('[DEMO DATA]') ? v.name : `${v.name} [DEMO DATA]`,
      category: v.category || 'Venue',
      contactPerson: v.contactPerson || 'Coordinator',
      phone: v.phone || '+91 98400 00000',
      email: v.email || 'vendor@example.demo',
      quotedPrice: v.quotedPrice || Math.round(budget * 0.15),
      negotiatedPrice: v.negotiatedPrice || Math.round(budget * 0.14),
      status: 'Quoted',
      paymentStatus: 'Unpaid',
      paidAmount: 0,
      isPreferred: idx === 0,
      notes: v.notes || 'Curated candidate',
      budgetCompatibilityScore: v.budgetCompatibilityScore || 85,
      serviceSuitabilityScore: v.serviceSuitabilityScore || 90,
      availabilityScore: v.availabilityScore || 85,
      rating: v.rating || 4.5,
      ratingScore,
      compositeScore,
      isDemoData: true,
    };
  });

  const risks: RiskAlert[] = (parsed.riskWatchpoints || []).map((r: any, idx: number) => ({
    id: `rsk-ai-${idx + 1}`,
    category: r.category || 'Budget',
    severity: r.severity || 'Medium',
    title: r.title || 'Risk Watchpoint',
    explanation: r.explanation || 'Identified potential risk',
    recommendedAction: r.recommendedAction || 'Monitor during milestone reviews',
    status: 'Open',
    detectedAt: new Date().toISOString().split('T')[0],
    source: 'AI Intelligence',
  }));

  return {
    id: `cai-plan-${Date.now()}`,
    name: parsed.name || `${type} Celebration`,
    type,
    location: parsed.location || 'Chennai, India',
    eventDate,
    guestCount,
    totalBudget: budget,
    currency,
    userPreferences: parsed.userPreferences || params.prompt,
    specialRequirements: parsed.specialRequirements || 'None specified',
    priorityConsiderations: parsed.priorityConsiderations || 'Budget discipline and high quality guest hospitality',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    budgetAllocations: allocations,
    expenses: allocations.slice(0, 4).map((a, i) => ({
      id: `exp-init-${i + 1}`,
      category: a.category,
      name: `Core ${a.category} Provisioning`,
      estimatedCost: a.allocatedAmount,
      actualCost: 0,
      paidAmount: 0,
      paymentStatus: 'Unpaid',
    })),
    milestones,
    tasks,
    vendors,
    risks,
  };
}

/**
 * Celebration Intelligence Analysis Handler with Gemini Narrative Enrichment
 */
export async function handleCelebrationIntelligence(
  currentPlan: EventPlan,
  request: CelebrationIntelligenceRequest
): Promise<CelebrationIntelligenceReport> {
  // First execute deterministic engine analysis
  const report = analyzeCelebrationIntelligence(currentPlan, request);

  const ai = getAiClient();
  if (!ai) {
    return report;
  }

  try {
    const prompt = `
Event Intelligence Analysis Request:
Event Name: ${currentPlan.name}
Event Type: ${currentPlan.type}
Location: ${currentPlan.location}
Original Headcount: ${currentPlan.guestCount}
Revised Headcount: ${request.newGuestCount ?? currentPlan.guestCount}
Approved Budget: ${currentPlan.currency} ${(request.newBudget ?? currentPlan.totalBudget).toLocaleString()}
Projected Cost at Baseline Standard: ${currentPlan.currency} ${report.budgetSummary.projectedExpenditure.toLocaleString()}
Budget Deficit / Shortfall: ${currentPlan.currency} ${report.budgetSummary.budgetShortfallOrSurplus.toLocaleString()}

Formulate executive AI narrative insights:
Return strictly JSON:
{
  "executiveBriefing": "Markdown summary of key operational and financial impacts...",
  "operationalTradeoffs": "Key trade-offs between catering per head, venue hall layout, and decor...",
  "strategicRecommendation": "Clear advice on whether Option 1 (Budget Protection) or Option 2 (Balanced) is best..."
}
`;

    const routingResult = await executeGeminiWithRouting({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(routingResult.text || '{}');
    if (parsed.executiveBriefing) {
      report.aiNarrativeSummary = {
        executiveBriefing: typeof parsed.executiveBriefing === 'string' ? parsed.executiveBriefing : String(parsed.executiveBriefing || ''),
        operationalTradeoffs: typeof parsed.operationalTradeoffs === 'string' ? parsed.operationalTradeoffs : (parsed.operationalTradeoffs ? String(parsed.operationalTradeoffs) : (report.aiNarrativeSummary?.operationalTradeoffs || '')),
        strategicRecommendation: typeof parsed.strategicRecommendation === 'string' ? parsed.strategicRecommendation : (parsed.strategicRecommendation ? String(parsed.strategicRecommendation) : (report.aiNarrativeSummary?.strategicRecommendation || '')),
      };
    }

    report.attributionMetadata = {
      source: 'gemini',
      requestedModel: routingResult.requestedModel,
      actualModel: routingResult.actualModel,
      isFallbackModel: routingResult.isFallbackModel,
      modelVersion: routingResult.modelVersion,
      fallbackType: routingResult.fallbackType,
    };

    return report;
  } catch (err: any) {
    const errMessage = String(err?.message || err || 'Unknown error');
    console.warn('Gemini narrative briefing enrichment failed, using deterministic narrative:', errMessage);
    return report;
  }
}

/**
 * Negotiation Intelligence Copilot Handler with Gemini Enrichment (CAI-004)
 */
export async function handleVendorNegotiationCopilot(
  quotation: VendorQuotation,
  allocatedBudget: number = 450000
): Promise<VendorNegotiationInsight> {
  const heuristicInsight = generateHeuristicNegotiationInsight(quotation, allocatedBudget);

  const ai = getAiClient();
  if (!ai) {
    return heuristicInsight;
  }

  try {
    const prompt = `
Vendor Quotation Negotiation Intelligence Analysis:
Vendor Name: ${quotation.vendorName}
Category: ${quotation.category}
Quoted Amount: ₹${quotation.quotedAmount.toLocaleString()}
Taxes/GST: ₹${quotation.taxesAndGst.toLocaleString()}
Total Cost: ₹${quotation.totalEstimatedCost.toLocaleString()}
Allocated Category Budget: ₹${allocatedBudget.toLocaleString()}
Included Services: ${quotation.includedServices.join(', ')}
Excluded Services: ${quotation.excludedServices.join(', ')}
Payment Terms: ${quotation.paymentTerms}
Cancellation Terms: ${quotation.cancellationTerms}
Validity: ${quotation.validityPeriod}

Grounded in this quotation data, formulate negotiation insights.
Return strictly JSON matching this structure:
{
  "negotiationOpportunities": ["Specific negotiation point 1", "Specific negotiation point 2"],
  "potentialCostReductions": [
    {
      "targetArea": "Category / Service Area",
      "estimatedSavings": 25000,
      "strategy": "Specific negotiation tactic..."
    }
  ],
  "questionsToAskVendor": ["Question 1", "Question 2"],
  "missingServiceWarnings": ["Warning 1"],
  "paymentTermConcerns": ["Concern 1"],
  "contractualRiskObservations": ["Observation 1"]
}
`;

    const routingResult = await executeGeminiWithRouting({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(routingResult.text || '{}');
    if (parsed.negotiationOpportunities && Array.isArray(parsed.negotiationOpportunities)) {
      return {
        vendorId: quotation.vendorId || quotation.id,
        vendorName: quotation.vendorName,
        category: quotation.category,
        negotiationOpportunities: parsed.negotiationOpportunities.length > 0 ? parsed.negotiationOpportunities : heuristicInsight.negotiationOpportunities,
        potentialCostReductions: parsed.potentialCostReductions && Array.isArray(parsed.potentialCostReductions) ? parsed.potentialCostReductions : heuristicInsight.potentialCostReductions,
        questionsToAskVendor: parsed.questionsToAskVendor && Array.isArray(parsed.questionsToAskVendor) ? parsed.questionsToAskVendor : heuristicInsight.questionsToAskVendor,
        missingServiceWarnings: parsed.missingServiceWarnings && Array.isArray(parsed.missingServiceWarnings) ? parsed.missingServiceWarnings : heuristicInsight.missingServiceWarnings,
        paymentTermConcerns: parsed.paymentTermConcerns && Array.isArray(parsed.paymentTermConcerns) ? parsed.paymentTermConcerns : heuristicInsight.paymentTermConcerns,
        contractualRiskObservations: parsed.contractualRiskObservations && Array.isArray(parsed.contractualRiskObservations) ? parsed.contractualRiskObservations : heuristicInsight.contractualRiskObservations,
        attributionMetadata: {
          source: 'gemini',
          requestedModel: routingResult.requestedModel,
          actualModel: routingResult.actualModel,
          modelVersion: routingResult.modelVersion,
          fallbackType: routingResult.fallbackType,
        },
      };
    }

    return heuristicInsight;
  } catch (err: any) {
    console.warn('Gemini negotiation copilot failed, returning heuristic insight:', err.message);
    return heuristicInsight;
  }
}

/**
 * AI Event Operations Copilot Handler with Gemini Enrichment (CAI-005)
 */
export async function handleOperationsCopilot(
  event: EventPlan
): Promise<OperationsCopilotInsight> {
  const readiness = calculateEventReadinessScore(event);
  const heuristicInsight = generateHeuristicOperationsInsight(event, readiness);

  const ai = getAiClient();
  if (!ai) {
    return heuristicInsight;
  }

  try {
    const tasks = event.tasks || [];
    const risks = event.risks || [];
    const prompt = `
Event Operations & Readiness Intelligence Request:
Event Name: ${event.name}
Event Type: ${event.type}
Location: ${event.location}
Date: ${event.date || '2027-02-15'}
Guest Count: ${event.guestCount}
Total Budget: ${event.currency} ${(event.budget || 1500000).toLocaleString()}
Calculated Readiness Score: ${readiness.score}% (${readiness.label})
Penalties Applied: ${readiness.penalties.join('; ') || 'None'}
Task Counters: Total ${tasks.length}, Completed ${tasks.filter((t) => t.status === 'Completed').length}, Blocked ${tasks.filter((t) => t.status === 'Blocked').length}
Open Risks: ${risks.filter((r) => r.status !== 'Resolved').length}

Formulate operations briefing grounded strictly in this actual event data.
Return strictly JSON matching this structure:
{
  "groundedSummary": "Executive summary of event readiness...",
  "urgentActions": [
    "Specific urgent action 1",
    "Specific urgent action 2"
  ],
  "vendorCoordinationGaps": [
    "Vendor gap 1"
  ]
}
`;

    const routingResult = await executeGeminiWithRouting({
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(routingResult.text || '{}');
    if (parsed.groundedSummary && Array.isArray(parsed.urgentActions)) {
      return {
        groundedSummary: parsed.groundedSummary || heuristicInsight.groundedSummary,
        urgentActions: parsed.urgentActions.length > 0 ? parsed.urgentActions.map((a: any) => typeof a === 'string' ? a : a.actionTitle || JSON.stringify(a)).slice(0, 5) : heuristicInsight.urgentActions,
        vendorCoordinationGaps: parsed.vendorCoordinationGaps && parsed.vendorCoordinationGaps.length > 0
          ? parsed.vendorCoordinationGaps.map((g: any) => typeof g === 'string' ? g : JSON.stringify(g))
          : heuristicInsight.vendorCoordinationGaps,
        source: 'gemini',
        requestedModel: routingResult.requestedModel,
        actualModel: routingResult.actualModel,
        isFallbackModel: routingResult.isFallbackModel,
        modelVersion: routingResult.modelVersion,
        fallbackType: routingResult.fallbackType,
      };
    }

    return heuristicInsight;
  } catch (err: any) {
    console.warn('Gemini operations copilot failed, returning heuristic insight:', err.message);
    return heuristicInsight;
  }
}
