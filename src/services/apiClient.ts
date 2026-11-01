/**
 * Frontend API Client
 * Clean interface for server-side REST API calls.
 * Note: Never imports @google/genai in frontend code.
 */

import {
  CopilotChatMessage,
  EventPlan,
  FallbackType,
  ReplanningImpact,
  ReplanningRequest,
  RiskAlert,
  CelebrationIntelligenceRequest,
  CelebrationIntelligenceReport,
  OperationsCopilotInsight,
} from '../types';

export interface HealthResponse {
  status: string;
  application: string;
  release: string;
  geminiModel: string;
  apiKeyConfigured: boolean;
  serverTime: string;
  environment: string;
}

export interface CopilotChatResponse {
  reply: string;
  suggestedActions: string[];
  extractedRequirements?: Partial<EventPlan>;
  source?: 'gemini' | 'heuristic';
  model?: string;
  requestedModel?: string;
  actualModel?: string | null;
  isFallbackModel?: boolean;
  modelVersion?: string | null;
  fallbackType?: FallbackType;
}

export interface RiskMitigationResponse {
  analysis: string;
  immediateActions: string[];
  contingencyAlternatives: string[];
  preventiveMeasures: string[];
  source?: 'gemini' | 'heuristic';
  requestedModel?: string;
  actualModel?: string | null;
  isFallbackModel?: boolean;
  modelVersion?: string | null;
  fallbackType?: FallbackType;
}

export const apiClient = {
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async sendCopilotChat(
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    currentEvent?: Partial<EventPlan>
  ): Promise<CopilotChatResponse> {
    const res = await fetch('/api/copilot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, currentEvent }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to communicate with AI Copilot');
    }

    return res.json();
  },

  async generatePlan(params: {
    prompt: string;
    eventType?: string;
    targetDate?: string;
    guestCount?: number;
    budget?: number;
    currency?: string;
  }): Promise<EventPlan> {
    const res = await fetch('/api/copilot/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to generate event plan');
    }

    return res.json();
  },

  async dynamicReplan(
    currentPlan: EventPlan,
    request: ReplanningRequest
  ): Promise<ReplanningImpact> {
    const res = await fetch('/api/copilot/replan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPlan, request }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Replanning calculation failed');
    }

    return res.json();
  },

  async getRiskMitigation(
    risk: RiskAlert,
    planContext: { name: string; type: string; budget: number; currency: string }
  ): Promise<RiskMitigationResponse> {
    const res = await fetch('/api/copilot/risk-mitigation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ risk, planContext }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Risk mitigation briefing failed');
    }

    return res.json();
  },

  async analyzeCelebrationIntelligence(
    currentPlan: EventPlan,
    request: CelebrationIntelligenceRequest
  ): Promise<CelebrationIntelligenceReport> {
    const res = await fetch('/api/copilot/celebration-intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPlan, request }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Celebration Intelligence analysis failed');
    }

    return res.json();
  },

  async analyzeVendorNegotiation(
    quotation: any,
    allocatedBudget: number = 450000
  ): Promise<any> {
    const res = await fetch('/api/copilot/vendor-negotiation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotation, allocatedBudget }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Vendor negotiation copilot analysis failed');
    }

    return res.json();
  },

  async analyzeEventOperations(
    event: EventPlan
  ): Promise<OperationsCopilotInsight> {
    const res = await fetch('/api/copilot/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Event Operations Copilot analysis failed');
    }

    return res.json();
  },
};
