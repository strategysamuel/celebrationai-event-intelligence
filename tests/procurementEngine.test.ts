import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateProcurementVendorScore,
  extractQuotationFromText,
  SEED_DEMO_QUOTATIONS,
  compareCategoryQuotations,
  generateHeuristicNegotiationInsight,
  calculateProcurementBudgetImpact,
} from '../src/domain/procurementEngine';
import { handleVendorNegotiationCopilot, setAiClientForTesting } from '../server/geminiService';
import { VendorQuotation, EventPlan } from '../src/types';

const mockTestEvent: EventPlan = {
  id: 'evt-chennai-450',
  name: "Ananya & Rohan's Royal Traditional Wedding",
  type: 'Wedding',
  location: 'Chennai, Tamil Nadu, India',
  eventDate: '2027-02-15',
  guestCount: 450,
  totalBudget: 1500000, // ₹15 Lakhs
  currency: 'INR',
  userPreferences: 'Traditional South Indian wedding',
  specialRequirements: 'Banana leaf feast',
  priorityConsiderations: 'Catering authenticity',
  createdAt: '2026-10-15T10:00:00Z',
  updatedAt: '2026-11-01T08:30:00Z',
  budgetAllocations: [
    { category: 'Venue', percentage: 22, allocatedAmount: 330000 },
    { category: 'Catering', percentage: 33, allocatedAmount: 495000 },
    { category: 'Decoration', percentage: 12, allocatedAmount: 180000 },
    { category: 'Photography', percentage: 10, allocatedAmount: 150000 },
    { category: 'Accommodation', percentage: 9, allocatedAmount: 135000 },
    { category: 'Transport', percentage: 5, allocatedAmount: 75000 },
    { category: 'Miscellaneous', percentage: 5, allocatedAmount: 75000 },
    { category: 'Entertainment', percentage: 4, allocatedAmount: 60000 },
  ],
  expenses: [
    { id: 'e-1', category: 'Venue', name: 'Coastal Heritage Lawns', estimatedCost: 330000, actualCost: 330000, paidAmount: 100000, paymentStatus: 'Advance Paid' },
  ],
  milestones: [],
  tasks: [],
  vendors: [],
  risks: [],
};

describe('CAI-004 Vendor & Procurement Intelligence Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAiClientForTesting(null);
  });

  it('1. Calculates deterministic 4-factor vendor intelligence score (35% Budget, 30% Service, 20% Capacity, 15% Rating)', () => {
    const scores = calculateProcurementVendorScore({
      quotedAmount: 495000,
      allocatedBudget: 495000,
      includedServicesCount: 4,
      excludedServicesCount: 1,
      capacityProvided: 450,
      capacityRequired: 450,
      verifiedRating: 4.8,
    });

    expect(scores.budgetCompatibilityScore).toBe(90); // Exactly on budget
    expect(scores.serviceSuitabilityScore).toBe(80); // 70 + 20 - 10
    expect(scores.capacityScore).toBe(100); // 450 / 450 = 100%
    expect(scores.ratingScore).toBe(96); // 4.8 / 5 * 100

    // Composite = 90*0.35 + 80*0.30 + 100*0.20 + 96*0.15 = 31.5 + 24 + 20 + 14.4 = 89.9
    expect(scores.compositeScore).toBe(89.9);
  });

  it('2. Missing rating is not inflated to 100% and adds a transparency note', () => {
    const scores = calculateProcurementVendorScore({
      quotedAmount: 495000,
      allocatedBudget: 495000,
      includedServicesCount: 3,
      excludedServicesCount: 0,
      capacityProvided: 450,
      capacityRequired: 450,
      verifiedRating: undefined, // Missing rating
    });

    expect(scores.ratingScore).toBe(60); // Neutral rating score
    expect(scores.transparencyNotes.length).toBeGreaterThan(0);
    expect(scores.transparencyNotes[0]).toContain('No verified user rating available');
  });

  it('3. Extracts quotation parameters cleanly from text without fabricating values', () => {
    const sampleText = `
Vendor: Grand Carnatic Banquet Services
Category: Catering
Quoted Amount: Rs 490,000
GST Tax: Rs 50,000
Total Cost: Rs 540,000
Included: Multi-Cuisine South & North Indian Grand Buffet, Live Hot Jalebi, 30 Uniformed Waiters
Excluded: Additional Waiters above 30, Lawn Marquee Dining Canopy Setup
Payment Terms: 40% Advance, 60% Day-of-Event
Cancellation Policy: 50% Refund if cancelled >45 days
Validity: Valid until 31 Jan 2027
Capacity: Rated capacity 500 guests
    `;

    const { quotation, extractionErrors } = extractQuotationFromText(sampleText, 'sample_quote.txt');

    expect(quotation.vendorName).toContain('Grand Carnatic Banquet Services');
    expect(quotation.category).toBe('Catering');
    expect(quotation.quotedAmount).toBe(490000);
    expect(quotation.taxesAndGst).toBe(50000);
    expect(quotation.totalEstimatedCost).toBe(540000);
    expect(quotation.includedServices.length).toBeGreaterThanOrEqual(1);
    expect(quotation.excludedServices.length).toBeGreaterThanOrEqual(1);
    expect(quotation.paymentTerms).toContain('40% Advance');
    expect(extractionErrors.length).toBe(0);
  });

  it('4. Handles missing fields in raw uploads gracefully by flagging extraction errors', () => {
    const incompleteText = `
Quoted Amount: Rs 150,000
Included: Stage backdrop
    `;

    const { quotation, extractionErrors } = extractQuotationFromText(incompleteText, 'incomplete_quote.txt');

    expect(quotation.vendorName).toBe('incomplete quote');
    expect(quotation.category).toBe('Catering');
    expect(extractionErrors.length).toBeGreaterThan(0);
    expect(extractionErrors.some((e) => e.includes('Vendor name not explicitly detected'))).toBe(true);
  });

  it('5. Benchmark dataset contains 3 caterers, 3 decorators, and 2 photographers with synthetic labels', () => {
    const caterers = SEED_DEMO_QUOTATIONS.filter((q) => q.category === 'Catering');
    const decorators = SEED_DEMO_QUOTATIONS.filter((q) => q.category === 'Decoration');
    const photographers = SEED_DEMO_QUOTATIONS.filter((q) => q.category === 'Photography');

    expect(caterers.length).toBe(3);
    expect(decorators.length).toBe(3);
    expect(photographers.length).toBe(2);

    SEED_DEMO_QUOTATIONS.forEach((q) => {
      expect(q.vendorName).toContain('[DEMO DATA]');
      expect(q.verificationStatus).toBe('Synthetic Demonstration');
    });
  });

  it('6. Identifies lowest quote tag while recommending highest composite score vendor', () => {
    const comparison = compareCategoryQuotations(SEED_DEMO_QUOTATIONS, 'Catering', 495000);

    expect(comparison.quotations.length).toBe(3);
    expect(comparison.lowestQuoteVendor).toBeDefined();
    expect(comparison.lowestQuoteVendor?.vendorName).toContain('Sri Krishna Catering Line');
    expect(comparison.lowestQuoteVendor?.isLowestQuote).toBe(true);

    // Recommended vendor is highest composite score (Annamalai Caterers), NOT automatically the cheapest
    expect(comparison.recommendedVendor).toBeDefined();
    expect(comparison.recommendedVendor?.vendorName).toContain('Annamalai Traditional Caterers');
    expect(comparison.recommendedVendor?.isRecommended).toBe(true);
  });

  it('7. Generates grounded heuristic negotiation insights based on quotation inclusions and exclusions', () => {
    const catQuote = SEED_DEMO_QUOTATIONS[2]; // Sri Krishna Catering Line (excludes live coffee & servers)
    const insight = generateHeuristicNegotiationInsight(catQuote, 495000);

    expect(insight.vendorName).toContain('Sri Krishna Catering Line');
    expect(insight.missingServiceWarnings.length).toBeGreaterThan(0);
    expect(insight.questionsToAskVendor.length).toBeGreaterThan(0);
    expect(insight.questionsToAskVendor.some((q) => q.includes('additional surcharge'))).toBe(true);
  });

  it('8. Propagates model attribution truthfully in negotiation copilot when Gemini is available', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        negotiationOpportunities: ['Custom Gemini negotiation opportunity 1'],
        potentialCostReductions: [{ targetArea: 'Catering', estimatedSavings: 20000, strategy: 'Package deal' }],
        questionsToAskVendor: ['What is the server ratio?'],
        missingServiceWarnings: ['No mineral water'],
        paymentTermConcerns: ['50% advance high'],
        contractualRiskObservations: ['Validity short'],
      }),
      modelVersion: 'gemini-3.8-flash',
    });

    setAiClientForTesting({
      models: {
        generateContent: mockGenerateContent,
      },
    });

    const quote = SEED_DEMO_QUOTATIONS[0];
    const insight = await handleVendorNegotiationCopilot(quote, 495000);

    expect(insight.negotiationOpportunities[0]).toContain('Custom Gemini');
    expect(insight.attributionMetadata?.source).toBe('gemini');
    expect(insight.attributionMetadata?.requestedModel).toBe('gemini-3.8-flash');
    expect(insight.attributionMetadata?.actualModel).toBe('gemini-3.8-flash');
  });

  it('9. Calculates procurement budget impact and category variances correctly', () => {
    const selectedList = [
      { category: 'Catering' as const, vendorName: 'Annamalai Caterers', cost: 495000 },
      { category: 'Decoration' as const, vendorName: 'Mylapore Decorators', cost: 180000 },
      { category: 'Photography' as const, vendorName: 'Madras Candid Stories', cost: 150000 },
    ];

    const impact = calculateProcurementBudgetImpact(mockTestEvent, selectedList);

    expect(impact.approvedBudget).toBe(1500000);
    // Proposed = Catering (495k) + Decor (180k) + Photo (150k) + Venue (330k) + Accom (135k) + Transport (75k) + Misc (75k) + Ent (60k) = 1,500,000
    expect(impact.proposedVendorExpenditure).toBe(1500000);
    expect(impact.remainingBudget).toBe(0);
    expect(impact.potentialShortfall).toBe(0);

    const cateringVar = impact.categoryVariances.find((v) => v.category === 'Catering')!;
    expect(cateringVar.allocatedBudget).toBe(495000);
    expect(cateringVar.proposedVendorCost).toBe(495000);
    expect(cateringVar.variance).toBe(0);
    expect(cateringVar.status).toBe('On Budget');
  });

  it('10. Active event state remains immutable until user confirms procurement bundle', () => {
    const originalCopy = JSON.parse(JSON.stringify(mockTestEvent));

    const selectedList = [
      { category: 'Catering' as const, vendorName: 'Annamalai Caterers', cost: 495000 },
    ];

    calculateProcurementBudgetImpact(mockTestEvent, selectedList);
    compareCategoryQuotations(SEED_DEMO_QUOTATIONS, 'Catering', 495000);

    // Active event plan must remain 100% identical
    expect(mockTestEvent).toEqual(originalCopy);
  });
});
