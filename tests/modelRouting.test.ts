import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleCopilotChat,
  handleGeneratePlan,
  handleRiskMitigation,
  executeGeminiWithRouting,
  setAiClientForTesting,
  getGeminiModelName,
  getGeminiFallbackModelName,
  getQuotaCircuitBreakerStatus,
  resetQuotaCircuitBreakerForTesting,
} from '../server/geminiService';
import { getModelAttributionBadge } from '../src/components/views/CopilotView';
import { RiskAlert } from '../src/types/index.ts';

describe('CAI-002.2.1 Model Attribution Edge-Case Hardening', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Reset AI client and circuit breaker
    setAiClientForTesting(undefined);
    resetQuotaCircuitBreakerForTesting();
  });

  it('1. Confirms default configured primary and fallback model names', () => {
    expect(getGeminiModelName()).toBe('gemini-3.8-flash');
    expect(getGeminiFallbackModelName()).toBe('gemini-2.5-flash');
  });

  it('2. Successfully attributes configured model when upstream metadata confirms gemini-3.8-flash', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        reply: 'Generated using primary configured model.',
        suggestedActions: ['Next Step 1', 'Next Step 2'],
      }),
      modelVersion: 'gemini-3.8-flash',
    });

    setAiClientForTesting({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    const res = await handleCopilotChat([
      { role: 'user', content: 'Plan a wedding reception' },
    ]);

    expect(res.source).toBe('gemini');
    expect(res.requestedModel).toBe('gemini-3.8-flash');
    expect(res.actualModel).toBe('gemini-3.8-flash');
    expect(res.isFallbackModel).toBe(false);
    expect(res.fallbackType).toBe('none');
    expect(res.modelVersion).toBe('gemini-3.8-flash');
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.8-flash',
      })
    );
  });

  it('3. Truthfully identifies upstream model difference when requested gemini-3.8-flash reports gemini-2.5-flash', async () => {
    // Upstream Google endpoint reports modelVersion: gemini-2.5-flash on the primary call
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        reply: 'Response served by upstream cluster running gemini-2.5-flash.',
        suggestedActions: ['Action A', 'Action B'],
      }),
      modelVersion: 'gemini-2.5-flash',
    });

    setAiClientForTesting({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    const res = await handleCopilotChat([
      { role: 'user', content: 'Plan traditional ceremony' },
    ]);

    expect(res.source).toBe('gemini');
    expect(res.requestedModel).toBe('gemini-3.8-flash');
    expect(res.actualModel).toBe('gemini-2.5-flash');
    expect(res.isFallbackModel).toBe(true);
    // Classified as upstream_model_difference, NOT alternate_model
    expect(res.fallbackType).toBe('upstream_model_difference');
    expect(res.modelVersion).toBe('gemini-2.5-flash');
    expect(res.actualModel).not.toBe('gemini-3.8-flash');
  });

  it('4. Classifies version suffix difference as upstream_model_difference rather than alternate_model', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        reply: 'Response from preview cluster.',
        suggestedActions: ['Action 1'],
      }),
      modelVersion: 'gemini-3.8-flash-preview',
    });

    setAiClientForTesting({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    const res = await handleCopilotChat([
      { role: 'user', content: 'Plan timeline review' },
    ]);

    expect(res.source).toBe('gemini');
    expect(res.requestedModel).toBe('gemini-3.8-flash');
    expect(res.actualModel).toBe('gemini-3.8-flash-preview');
    expect(res.isFallbackModel).toBe(true);
    // Verified: NOT an alternate_model invocation, but an upstream difference
    expect(res.fallbackType).toBe('upstream_model_difference');
    expect(res.fallbackType).not.toBe('alternate_model');
  });

  it('5. Correctly identifies explicit alternate-model fallback when primary model throws 429 quota error', async () => {
    const mockGenerateContent = vi
      .fn()
      // First call for primary model fails
      .mockRejectedValueOnce(new Error('Quota exceeded for metric: limit: 20, model: gemini-3.8-flash'))
      // Second call for fallback model succeeds
      .mockResolvedValueOnce({
        text: JSON.stringify({
          reply: 'Recovered via explicit alternate fallback model.',
          suggestedActions: ['Step 1'],
        }),
        modelVersion: 'gemini-2.5-flash',
      });

    setAiClientForTesting({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    const res = await handleCopilotChat([
      { role: 'user', content: 'Generate catering schedule' },
    ]);

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-3.8-flash');
    expect(mockGenerateContent.mock.calls[1][0].model).toBe('gemini-2.5-flash');

    expect(res.source).toBe('gemini');
    expect(res.requestedModel).toBe('gemini-3.8-flash');
    expect(res.actualModel).toBe('gemini-2.5-flash');
    expect(res.isFallbackModel).toBe(true);
    // Verified: Classified as alternate_model because secondary model was explicitly called
    expect(res.fallbackType).toBe('alternate_model');
    expect(res.modelVersion).toBe('gemini-2.5-flash');
  });

  it('6. Missing modelVersion does NOT falsely confirm requested model as serving model', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        reply: 'Response with omitted modelVersion metadata.',
        suggestedActions: ['Action X'],
      }),
      modelVersion: undefined,
    });

    setAiClientForTesting({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    const res = await handleCopilotChat([
      { role: 'user', content: 'Estimate floral budget' },
    ]);

    expect(res.source).toBe('gemini');
    expect(res.requestedModel).toBe('gemini-3.8-flash');
    // Must be null/unreported - never falsely confirming gemini-3.8-flash as the confirmed serving model
    expect(res.actualModel).toBeNull();
    expect(res.modelVersion).toBeNull();
    expect(res.isFallbackModel).toBe(false);
    expect(res.fallbackType).toBe('none');
  });

  it('7. Seamlessly drops to deterministic heuristic fallback when both AI models fail', async () => {
    const mockGenerateContent = vi
      .fn()
      .mockRejectedValue(new Error('Network offline or both models exhausted'));

    setAiClientForTesting({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    const res = await handleCopilotChat([
      { role: 'user', content: 'Wedding in Chennai for 300 guests with Rs.15 lakhs' },
    ]);

    expect(res.source).toBe('heuristic');
    expect(res.requestedModel).toBe('gemini-3.8-flash');
    expect(res.actualModel).toBe('Deterministic Heuristic Engine');
    expect(res.isFallbackModel).toBe(false);
    expect(res.fallbackType).toBe('heuristic');
    expect(res.reply).toContain('Grand Traditional Wedding');
    expect(res.extractedRequirements?.guestCount).toBe(300);
  });

  it('8. Propagates fallbackType and model attribution in full plan generation', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        name: 'Grand Gala Plan',
        totalBudget: 2000000,
        currency: 'INR',
        allocations: [{ category: 'Venue', percentage: 20 }],
        vendorRecommendations: [],
        riskWatchpoints: [],
      }),
      modelVersion: 'gemini-2.5-flash',
    });

    setAiClientForTesting({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    const plan = await handleGeneratePlan({
      prompt: 'Gala plan',
      budget: 2000000,
    });

    expect(plan.metadata).toBeDefined();
    expect(plan.metadata?.source).toBe('gemini');
    expect(plan.metadata?.requestedModel).toBe('gemini-3.8-flash');
    expect(plan.metadata?.actualModel).toBe('gemini-2.5-flash');
    expect(plan.metadata?.isFallbackModel).toBe(true);
    expect(plan.metadata?.fallbackType).toBe('upstream_model_difference');
    expect(plan.metadata?.modelVersion).toBe('gemini-2.5-flash');
  });

  it('9. Propagates fallbackType in AI risk mitigation briefings', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        analysis: 'Supplier contract delay risk analysis.',
        immediateActions: ['Expedite review'],
        contingencyAlternatives: ['Backup provider'],
        preventiveMeasures: ['Milestone locks'],
      }),
      modelVersion: 'gemini-3.8-flash',
    });

    setAiClientForTesting({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    const sampleRisk: RiskAlert = {
      id: 'rsk-test-1',
      category: 'Vendor',
      severity: 'Medium',
      title: 'Contract Signing Delay',
      explanation: 'Venue contract pending signature.',
      recommendedAction: 'Schedule signing meeting.',
      status: 'Open',
      detectedAt: '2026-11-01',
      source: 'Rule Engine',
    };

    const briefing = await handleRiskMitigation(sampleRisk, {
      name: 'Test Event',
      type: 'Wedding',
      budget: 1500000,
      currency: 'INR',
    });

    expect(briefing.source).toBe('gemini');
    expect(briefing.requestedModel).toBe('gemini-3.8-flash');
    expect(briefing.actualModel).toBe('gemini-3.8-flash');
    expect(briefing.isFallbackModel).toBe(false);
    expect(briefing.fallbackType).toBe('none');
  });

  describe('Frontend getModelAttributionBadge Truthful Display Logic', () => {
    it('accurately formats badge when actual model matches configured primary model', () => {
      const badge = getModelAttributionBadge(
        {
          source: 'gemini',
          requestedModel: 'gemini-3.8-flash',
          actualModel: 'gemini-3.8-flash',
          modelVersion: 'gemini-3.8-flash',
          isFallbackModel: false,
          fallbackType: 'none',
        },
        'gemini-3.8-flash'
      );

      expect(badge.variant).toBe('primary-ai');
      expect(badge.label).toBe('Live AI (gemini-3.8-flash)');
      expect(badge.subLabel).toBeUndefined();
    });

    it('accurately formats badge when upstream reports model difference', () => {
      const badge = getModelAttributionBadge(
        {
          source: 'gemini',
          requestedModel: 'gemini-3.8-flash',
          actualModel: 'gemini-2.5-flash',
          isFallbackModel: true,
          modelVersion: 'gemini-2.5-flash',
          fallbackType: 'upstream_model_difference',
        },
        'gemini-3.8-flash'
      );

      expect(badge.variant).toBe('fallback-ai');
      expect(badge.label).toBe('Live AI: gemini-2.5-flash');
      expect(badge.subLabel).toBe('[upstream reported: gemini-2.5-flash; requested: gemini-3.8-flash]');
      // Crucial verification: ensures gemini-3.8-flash is NOT claimed as the actual model
      expect(badge.label).not.toContain('gemini-3.8-flash');
    });

    it('accurately formats badge for explicitly invoked alternate fallback model', () => {
      const badge = getModelAttributionBadge(
        {
          source: 'gemini',
          requestedModel: 'gemini-3.8-flash',
          actualModel: 'gemini-2.5-flash',
          isFallbackModel: true,
          modelVersion: 'gemini-2.5-flash',
          fallbackType: 'alternate_model',
        },
        'gemini-3.8-flash'
      );

      expect(badge.variant).toBe('fallback-ai');
      expect(badge.label).toBe('Live AI: gemini-2.5-flash');
      expect(badge.subLabel).toBe('[alternate fallback from gemini-3.8-flash]');
    });

    it('truthfully reports missing metadata without making unsupported claims', () => {
      const badge = getModelAttributionBadge(
        {
          source: 'gemini',
          requestedModel: 'gemini-3.8-flash',
          actualModel: null,
          modelVersion: null,
          isFallbackModel: false,
          fallbackType: 'none',
        },
        'gemini-3.8-flash'
      );

      expect(badge.variant).toBe('unreported-ai');
      expect(badge.label).toBe('Live AI – requested gemini-3.8-flash; serving model not reported');
      expect(badge.label).not.toContain('undefined');
      expect(badge.label).not.toContain('null');
    });

    it('accurately formats badge for deterministic heuristic fallback', () => {
      const badge = getModelAttributionBadge(
        {
          source: 'heuristic',
          requestedModel: 'gemini-3.8-flash',
          actualModel: 'Deterministic Heuristic Engine',
          isFallbackModel: false,
          fallbackType: 'heuristic',
        },
        'gemini-3.8-flash'
      );

      expect(badge.variant).toBe('heuristic');
      expect(badge.label).toBe('Deterministic Fallback Engine');
      expect(badge.tooltip).toContain('gemini-3.8-flash');
    });

    it('handles legacy responses without attribution fields gracefully', () => {
      const badge = getModelAttributionBadge(
        {
          source: 'gemini',
          model: 'gemini-3.8-flash',
        },
        'gemini-3.8-flash'
      );

      expect(badge.variant).toBe('primary-ai');
      expect(badge.label).toBe('Live AI (gemini-3.8-flash)');
      expect(badge.label).not.toContain('undefined');
      expect(badge.label).not.toContain('null');
    });
  });
});

describe('Gemini Quota Circuit Breaker (CAI-006.2)', () => {
  beforeEach(() => {
    resetQuotaCircuitBreakerForTesting();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetQuotaCircuitBreakerForTesting();
    setAiClientForTesting(undefined);
  });

  it('trips circuit breaker upon encountering daily quota exhaustion 429 error', async () => {
    const mockGenerateContent = vi.fn().mockRejectedValue(
      new Error('Generate content requests per day limit exceeded on Free Tier. Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests')
    );

    setAiClientForTesting({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    const statusBefore = getQuotaCircuitBreakerStatus();
    expect(statusBefore.isOpen).toBe(false);

    const res = await handleCopilotChat([{ role: 'user', content: 'Test daily quota trip' }]);
    expect(res.source).toBe('heuristic');

    const statusAfter = getQuotaCircuitBreakerStatus();
    expect(statusAfter.isOpen).toBe(true);
  });

  it('subsequent requests while circuit breaker is open bypass Gemini calls and use heuristic fallback', async () => {
    const mockGenerateContent = vi.fn().mockRejectedValue(
      new Error('Generate content requests per day limit exceeded on Free Tier')
    );

    setAiClientForTesting({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    await handleCopilotChat([{ role: 'user', content: 'Trip breaker' }]);
    expect(mockGenerateContent).toHaveBeenCalled();

    const callCountAfterFirst = mockGenerateContent.mock.calls.length;

    const res2 = await handleCopilotChat([{ role: 'user', content: 'Second request during open circuit' }]);
    expect(res2.source).toBe('heuristic');

    expect(mockGenerateContent.mock.calls.length).toBe(callCountAfterFirst);
  });
});
