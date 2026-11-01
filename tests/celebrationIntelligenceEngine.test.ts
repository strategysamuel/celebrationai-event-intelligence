import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { analyzeCelebrationIntelligence } from '../src/domain/celebrationIntelligenceEngine';
import { handleCelebrationIntelligence, setAiClientForTesting } from '../server/geminiService';
import { EventPlan, CelebrationIntelligenceRequest } from '../src/types/index.ts';

const mockBaselineEvent: EventPlan = {
  id: 'evt-chennai-wedding-2027',
  name: 'Grand Chennai South Indian Wedding',
  type: 'Wedding',
  location: 'Chennai, Tamil Nadu, India',
  eventDate: '2027-02-15',
  guestCount: 300,
  totalBudget: 1500000,
  currency: 'INR',
  userPreferences: 'Traditional South Indian South style, banana leaf feast.',
  specialRequirements: 'Air conditioned dining, parking for 100 cars.',
  priorityConsiderations: 'Catering authenticity (#1), Candid Photography',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  budgetAllocations: [
    { category: 'Catering', percentage: 30, allocatedAmount: 450000 },
    { category: 'Venue', percentage: 20, allocatedAmount: 300000 },
    { category: 'Decoration', percentage: 15, allocatedAmount: 225000 },
    { category: 'Photography', percentage: 12, allocatedAmount: 180000 },
    { category: 'Accommodation', percentage: 8, allocatedAmount: 120000 },
    { category: 'Transport', percentage: 5, allocatedAmount: 75000 },
    { category: 'Miscellaneous', percentage: 6, allocatedAmount: 90000 },
    { category: 'Entertainment', percentage: 4, allocatedAmount: 60000 },
  ],
  expenses: [
    { id: 'exp-1', category: 'Catering', name: 'Banquet Feast', estimatedCost: 450000, actualCost: 0, paidAmount: 0, paymentStatus: 'Unpaid' },
    { id: 'exp-2', category: 'Venue', name: 'Heritage Kalyana Mandapam', estimatedCost: 300000, actualCost: 0, paidAmount: 0, paymentStatus: 'Unpaid' },
  ],
  milestones: [
    { id: 'm-1', title: 'Primary Venue Locked', targetDate: '2026-10-15', daysBeforeEvent: 120, order: 1, completed: true },
    { id: 'm-2', title: 'Catering Menu Locked', targetDate: '2026-11-15', daysBeforeEvent: 90, order: 2, completed: false },
  ],
  tasks: [
    { id: 't-1', title: 'Finalize Catering Menu & Headcount Lock', dueDate: '2026-11-15', daysBeforeEvent: 90, status: 'In Progress', priority: 'High', assignedTo: 'Catering Manager', milestoneId: 'm-2', category: 'Catering', dependencies: [], isCriticalPath: true },
    { id: 't-2', title: 'Venue Hall Layout & Seating Chart', dueDate: '2026-11-20', daysBeforeEvent: 85, status: 'Pending', priority: 'Medium', assignedTo: 'Decorator', milestoneId: 'm-1', category: 'Venue', dependencies: [], isCriticalPath: false },
  ],
  vendors: [
    {
      id: 'vnd-1',
      name: 'Annamalai Traditional Caterers [DEMO DATA]',
      category: 'Catering',
      contactPerson: 'S. Annamalai',
      phone: '+91 98400 12345',
      email: 'annamalai@demo.com',
      quotedPrice: 450000,
      negotiatedPrice: 440000,
      status: 'Quoted',
      paymentStatus: 'Unpaid',
      paidAmount: 0,
      isPreferred: true,
      notes: 'Specialist in 24-dish traditional banana leaf feasts.',
      budgetCompatibilityScore: 92,
      serviceSuitabilityScore: 95,
      availabilityScore: 90,
      rating: 4.8,
      ratingScore: 96,
      compositeScore: 93,
      isDemoData: true,
    },
    {
      id: 'vnd-2',
      name: 'Mahabalipuram Heritage Lawns [DEMO DATA]',
      category: 'Venue',
      contactPerson: 'R. K. Raman',
      phone: '+91 98400 67890',
      email: 'info@heritage.demo',
      quotedPrice: 300000,
      negotiatedPrice: 290000,
      status: 'Confirmed',
      paymentStatus: 'Advance Paid',
      paidAmount: 50000,
      isPreferred: true,
      notes: 'Coastal lawn with AC indoor hall.',
      budgetCompatibilityScore: 90,
      serviceSuitabilityScore: 92,
      availabilityScore: 88,
      rating: 4.7,
      ratingScore: 94,
      compositeScore: 91,
      isDemoData: true,
    },
  ],
  risks: [],
};

describe('CAI-003 Celebration Intelligence Engine Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAiClientForTesting(null);
  });

  afterEach(() => {
    setAiClientForTesting(null);
  });

  it('1. Calculates guest count increase from 300 to 450 correctly', () => {
    const request: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
      newEventDate: '2027-02-15',
    };

    const report = analyzeCelebrationIntelligence(mockBaselineEvent, request);

    expect(report.originalPlan.guestCount).toBe(300);
    expect(report.revisedPlan.guestCount).toBe(450);
    expect(report.request.newGuestCount).toBe(450);

    const cateringParam = report.impactParameters.find((p) => p.category === 'Catering');
    expect(cateringParam).toBeDefined();
    expect(cateringParam?.originalValue).toContain('300');
    expect(cateringParam?.revisedValue).toContain('450');
    expect(cateringParam?.difference).toContain('+150');
  });

  it('2. Evaluates fixed budget of ₹15 Lakhs without silent budget escalation', () => {
    const request: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    const report = analyzeCelebrationIntelligence(mockBaselineEvent, request);

    expect(report.budgetSummary.approvedBudget).toBe(1500000);
    expect(report.budgetSummary.originalBudget).toBe(1500000);
  });

  it('3. Calculates budget shortfall correctly for 450 guests (-₹3,75,000 deficit)', () => {
    const request: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    const report = analyzeCelebrationIntelligence(mockBaselineEvent, request);

    expect(report.budgetSummary.projectedExpenditure).toBe(1875000);
    expect(report.budgetSummary.budgetShortfallOrSurplus).toBe(-375000);
    expect(report.budgetSummary.contingencyAvailable).toBe(105000); // 7% of 15L
  });

  it('4. Generates three distinct planning alternatives', () => {
    const request: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    const report = analyzeCelebrationIntelligence(mockBaselineEvent, request);

    expect(report.alternatives.length).toBe(3);
    const ids = report.alternatives.map((a) => a.id);
    expect(ids).toEqual(['option-1', 'option-2', 'option-3']);
  });

  it('5. Correctly flags over-budget alternative (Option 3)', () => {
    const request: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    const report = analyzeCelebrationIntelligence(mockBaselineEvent, request);

    const option1 = report.alternatives.find((a) => a.id === 'option-1');
    const option2 = report.alternatives.find((a) => a.id === 'option-2');
    const option3 = report.alternatives.find((a) => a.id === 'option-3');

    expect(option1?.isFeasibleWithinApprovedBudget).toBe(true);
    expect(option1?.totalEstimatedCost).toBe(1500000);
    expect(option1?.additionalFundingRequired).toBe(0);

    expect(option2?.isFeasibleWithinApprovedBudget).toBe(true);
    expect(option2?.totalEstimatedCost).toBe(1500000);

    expect(option3?.isFeasibleWithinApprovedBudget).toBe(false); // Explicitly unfeasible within 15L
    expect(option3?.totalEstimatedCost).toBe(1875000);
    expect(option3?.additionalFundingRequired).toBe(375000);
  });

  it('6. Detects venue capacity constraint for 450 guests', () => {
    const request: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    const report = analyzeCelebrationIntelligence(mockBaselineEvent, request);

    const venueParam = report.impactParameters.find((p) => p.category === 'Venue Capacity');
    expect(venueParam).toBeDefined();
    expect(venueParam?.severity).toBe('Critical');
    expect(venueParam?.impactSummary).toContain('staggered');
  });

  it('7. Detects catering capacity impact', () => {
    const request: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    const report = analyzeCelebrationIntelligence(mockBaselineEvent, request);

    const cateringParam = report.impactParameters.find((p) => p.category === 'Catering');
    expect(cateringParam).toBeDefined();
    expect(cateringParam?.impactSummary).toContain('catering allowance');
  });

  it('8. Handles vendor capacity and data verification status truthfully', () => {
    const request: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    const report = analyzeCelebrationIntelligence(mockBaselineEvent, request);

    expect(report.vendorCapacityImpacts.length).toBeGreaterThanOrEqual(2);
    const catVendor = report.vendorCapacityImpacts.find((v) => v.category === 'Catering');
    expect(catVendor?.capacityStatus).toBe('Requires Expansion');
    expect(catVendor?.dataVerificationStatus).toBe('Synthetic Demonstration');
    expect(catVendor?.actionRequired).toContain('addendum');
  });

  it('9. Preserves timeline dependencies and identifies task shifts', () => {
    const request: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    const report = analyzeCelebrationIntelligence(mockBaselineEvent, request);

    expect(report.timelineImpacts.length).toBeGreaterThanOrEqual(3);
    const reopenedTask = report.timelineImpacts.find((t) => t.status === 'Reopened');
    expect(reopenedTask).toBeDefined();
    expect(reopenedTask?.title).toContain('Catering');
  });

  it('10. Identifies newly introduced risks', () => {
    const request: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    const report = analyzeCelebrationIntelligence(mockBaselineEvent, request);

    expect(report.newRisksIdentified.length).toBeGreaterThanOrEqual(3);
    const riskTitles = report.newRisksIdentified.map((r) => r.title);
    expect(riskTitles.some((t) => t.includes('Catering'))).toBe(true);
    expect(riskTitles.some((t) => t.includes('Dining Hall'))).toBe(true);
    expect(riskTitles.some((t) => t.includes('Deficit'))).toBe(true);
  });

  it('11. Guarantees original plan remains completely unchanged before confirmation', () => {
    const request: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    const report = analyzeCelebrationIntelligence(mockBaselineEvent, request);

    // Verify pristine original state
    expect(mockBaselineEvent.guestCount).toBe(300);
    expect(mockBaselineEvent.totalBudget).toBe(1500000);
    expect(report.originalPlan.guestCount).toBe(300);
  });

  it('12. Simulates user cancelling replanning without modifying event', () => {
    const activeState = { ...mockBaselineEvent };
    const request: CelebrationIntelligenceRequest = {
      eventId: activeState.id,
      newGuestCount: 450,
    };

    const report = analyzeCelebrationIntelligence(activeState, request);

    // User cancels modal -> active state is untouched
    expect(activeState.guestCount).toBe(300);
    expect(report.originalPlan.guestCount).toBe(300);
  });

  it('13. Applies approved replanning option to update the event correctly', () => {
    const request: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    const report = analyzeCelebrationIntelligence(mockBaselineEvent, request);
    const selectedOption = report.alternatives.find((a) => a.id === 'option-1')!;

    // Simulate user confirming option 1
    const updatedActiveEvent = selectedOption.proposedPlan;

    expect(updatedActiveEvent.guestCount).toBe(450);
    expect(updatedActiveEvent.totalBudget).toBe(1500000);
    expect(updatedActiveEvent.budgetAllocations.find((a) => a.category === 'Catering')?.allocatedAmount).toBe(495000);
  });

  it('14. Dynamic What-If recalculations update results instantly', () => {
    const req1: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };
    const rep1 = analyzeCelebrationIntelligence(mockBaselineEvent, req1);
    expect(rep1.budgetSummary.projectedExpenditure).toBe(1875000);

    // User moves slider to 600 guests
    const req2: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 600,
      newBudget: 1800000,
    };
    const rep2 = analyzeCelebrationIntelligence(mockBaselineEvent, req2);
    expect(rep2.revisedPlan.guestCount).toBe(600);
    expect(rep2.budgetSummary.approvedBudget).toBe(1800000);
  });

  it('15. Gemini failure or missing API key does not prevent deterministic analysis', async () => {
    // Client is null
    setAiClientForTesting(null);

    const req: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    const report = await handleCelebrationIntelligence(mockBaselineEvent, req);

    expect(report).toBeDefined();
    expect(report.impactParameters.length).toBe(10);
    expect(report.alternatives.length).toBe(3);
    expect(report.aiNarrativeSummary?.executiveBriefing).toBeDefined();
    expect(report.attributionMetadata?.source).toBe('heuristic');
    expect(report.attributionMetadata?.actualModel).toBe('Deterministic Heuristic Engine');
  });

  it('16. Propagates model attribution truthfully when Gemini enriches narrative', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        executiveBriefing: 'Custom Gemini Executive Briefing for 450 guests.',
        operationalTradeoffs: 'Custom trade-offs explanation.',
        strategicRecommendation: 'Adopt Option 1.',
      }),
      modelVersion: 'gemini-3.8-flash',
    });

    setAiClientForTesting({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    const req: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    const report = await handleCelebrationIntelligence(mockBaselineEvent, req);

    expect(report.aiNarrativeSummary?.executiveBriefing).toContain('Custom Gemini');
    expect(report.attributionMetadata?.source).toBe('gemini');
    expect(report.attributionMetadata?.requestedModel).toBe('gemini-3.8-flash');
    expect(report.attributionMetadata?.actualModel).toBe('gemini-3.8-flash');
    expect(report.attributionMetadata?.fallbackType).toBe('none');
  });

  it('17. Verifies correct Premium Budget presentation (₹15L approved, ₹18.75L projected, ₹3.75L gap)', () => {
    const req: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };
    const report = analyzeCelebrationIntelligence(mockBaselineEvent, req);

    expect(report.budgetSummary.approvedBudget).toBe(1500000);
    expect(report.budgetSummary.projectedExpenditure).toBe(1875000);
    expect(report.budgetSummary.budgetShortfallOrSurplus).toBe(-375000);

    const opt3 = report.alternatives.find((a) => a.id === 'option-3')!;
    expect(opt3.totalEstimatedCost).toBe(1875000);
    expect(opt3.additionalFundingRequired).toBe(375000);
    expect(opt3.isFeasibleWithinApprovedBudget).toBe(false);
  });

  it('18. Validates Option 1 Budget Protection reallocations, consequences, and exact ₹15L reconciliation', () => {
    const req: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };
    const report = analyzeCelebrationIntelligence(mockBaselineEvent, req);
    const opt1 = report.alternatives.find((a) => a.id === 'option-1')!;

    expect(opt1.isFeasibleWithinApprovedBudget).toBe(true);
    expect(opt1.totalEstimatedCost).toBe(1500000);

    // Sum of recommended allocations must reconcile exactly to ₹15,00,000
    const totalAllocated = opt1.recommendedAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    expect(totalAllocated).toBe(1500000);

    // Reallocation details must specify ops and guest consequences for each category
    expect(opt1.reallocationDetails).toBeDefined();
    expect(opt1.reallocationDetails!.length).toBe(8);

    const cateringDet = opt1.reallocationDetails!.find((d) => d.category === 'Catering')!;
    expect(cateringDet.originalAllocation).toBe(450000);
    expect(cateringDet.revisedAllocation).toBe(495000);
    expect(cateringDet.amountSavedOrAdded).toBe(45000);
    expect(cateringDet.operationalConsequence).toContain('2-shift staggered dining');
    expect(cateringDet.guestExperienceConsequence).toContain('Authentic traditional South Indian');

    const decorDet = opt1.reallocationDetails!.find((d) => d.category === 'Decoration')!;
    expect(decorDet.amountSavedOrAdded).toBe(-45000); // Saved ₹45,000 via local marigolds
  });

  it('19. Validates Option 2 Balanced Celebration lawn canopy assumptions and exact ₹15L reconciliation', () => {
    const req: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };
    const report = analyzeCelebrationIntelligence(mockBaselineEvent, req);
    const opt2 = report.alternatives.find((a) => a.id === 'option-2')!;

    expect(opt2.isFeasibleWithinApprovedBudget).toBe(true);
    expect(opt2.totalEstimatedCost).toBe(1500000);

    const totalAllocated = opt2.recommendedAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    expect(totalAllocated).toBe(1500000);

    expect(opt2.unverifiedAssumptions).toBeDefined();
    expect(opt2.unverifiedAssumptions!.length).toBeGreaterThanOrEqual(3);
    expect(opt2.unverifiedAssumptions!.some((a) => a.includes('lawn marquee canopy'))).toBe(true);
    expect(opt2.unverifiedAssumptions!.some((a) => a.includes('weather in Chennai'))).toBe(true);
  });

  it('20. Validates Option 3 Premium Experience unfeasible status and ₹3.75L funding gap', () => {
    const req: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };
    const report = analyzeCelebrationIntelligence(mockBaselineEvent, req);
    const opt3 = report.alternatives.find((a) => a.id === 'option-3')!;

    expect(opt3.isFeasibleWithinApprovedBudget).toBe(false);
    expect(opt3.totalEstimatedCost).toBe(1875000);
    expect(opt3.additionalFundingRequired).toBe(375000);

    const totalAllocated = opt3.recommendedAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    expect(totalAllocated).toBe(1875000);
  });

  it('21. Financial Engineering Rules: No negative allocations, no missing categories, contingency buffer included', () => {
    const req: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };
    const report = analyzeCelebrationIntelligence(mockBaselineEvent, req);

    report.alternatives.forEach((opt) => {
      expect(opt.recommendedAllocations.length).toBe(8);
      opt.recommendedAllocations.forEach((alloc) => {
        expect(alloc.allocatedAmount).toBeGreaterThan(0);
        expect(alloc.percentage).toBeGreaterThan(0);
      });

      // Must include Miscellaneous / Contingency
      const misc = opt.recommendedAllocations.find((a) => a.category === 'Miscellaneous');
      expect(misc).toBeDefined();
      expect(misc!.allocatedAmount).toBeGreaterThan(0);
    });
  });

  it('22. Guarantees active event immutability until explicit confirmation', () => {
    const originalCopy = JSON.parse(JSON.stringify(mockBaselineEvent));
    const req: CelebrationIntelligenceRequest = {
      eventId: mockBaselineEvent.id,
      newGuestCount: 450,
      newBudget: 1500000,
    };

    // Run engine analysis multiple times
    analyzeCelebrationIntelligence(mockBaselineEvent, req);
    analyzeCelebrationIntelligence(mockBaselineEvent, req);

    // Active event object must remain 100% identical
    expect(mockBaselineEvent).toEqual(originalCopy);
  });
});
