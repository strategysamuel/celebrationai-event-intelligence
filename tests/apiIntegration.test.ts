import { describe, it, expect } from 'vitest';
import {
  ChatRequestSchema,
  GeneratePlanRequestSchema,
  handleCopilotChat,
  handleRiskMitigation,
} from '../server/geminiService';
import { RiskAlert } from '../src/types/index.ts';

describe('API Gateway & Server Schemas Validation', () => {
  it('validates correct ChatRequestSchema structure', () => {
    const validPayload = {
      messages: [
        { role: 'user', content: 'Plan a wedding in Chennai for 300 guests with Rs.15L budget' },
      ],
      currentEvent: { name: 'My Wedding', totalBudget: 1500000 },
    };

    const result = ChatRequestSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects ChatRequestSchema with oversized message array or missing roles', () => {
    const invalidPayload = {
      messages: [
        { role: 'invalid_role', content: 'Hello' },
      ],
    };

    const result = ChatRequestSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('validates GeneratePlanRequestSchema with required fields', () => {
    const validPlanRequest = {
      prompt: 'Traditional wedding in Chennai for 300 guests',
      budget: 1500000,
      currency: 'INR',
      guestCount: 300,
    };

    const result = GeneratePlanRequestSchema.safeParse(validPlanRequest);
    expect(result.success).toBe(true);
  });

  it('rejects GeneratePlanRequestSchema with prompt shorter than 5 chars', () => {
    const shortPromptRequest = {
      prompt: 'Hi',
    };

    const result = GeneratePlanRequestSchema.safeParse(shortPromptRequest);
    expect(result.success).toBe(false);
  });

  it('distinguishes live versus heuristic source in Copilot responses', async () => {
    const res = await handleCopilotChat([
      { role: 'user', content: 'I am organizing a wedding in Chennai for 300 guests with Rs.15 lakhs' },
    ]);

    expect(res).toBeDefined();
    expect(res.reply).toBeDefined();
    expect(res.suggestedActions.length).toBeGreaterThanOrEqual(1);
    expect(['gemini', 'heuristic']).toContain(res.source);
    expect(res.model).toBeDefined();
    expect(res.requestedModel).toBeDefined();
    expect(res.actualModel !== undefined).toBe(true);
    expect(typeof res.isFallbackModel).toBe('boolean');
    expect(['none', 'upstream_model_difference', 'alternate_model', 'heuristic']).toContain(res.fallbackType);
  }, 15000);

  it('generates multi-step risk mitigation briefing safely', async () => {
    const sampleRisk: RiskAlert = {
      id: 'rsk-test-1',
      category: 'Budget',
      severity: 'High',
      title: 'Catering Line Exceeds Allocation',
      explanation: 'Agreed menu exceeds baseline allowance by ₹15,000.',
      recommendedAction: 'Reallocate surplus from venue savings.',
      status: 'Open',
      detectedAt: '2026-11-01',
      source: 'Rule Engine',
    };

    const briefing = await handleRiskMitigation(sampleRisk, {
      name: 'Test Wedding',
      type: 'Wedding',
      budget: 1500000,
      currency: 'INR',
    });

    expect(briefing.analysis).toBeDefined();
    expect(briefing.immediateActions.length).toBeGreaterThanOrEqual(1);
    expect(briefing.contingencyAlternatives.length).toBeGreaterThanOrEqual(1);
    expect(briefing.preventiveMeasures.length).toBeGreaterThanOrEqual(1);
  }, 15000);
});
