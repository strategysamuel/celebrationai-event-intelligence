import { describe, it, expect } from 'vitest';
import { calculateVendorScore, evaluateBudgetCompatibility, compareVendors } from '../src/domain/vendorEngine';
import { Vendor } from '../src/types';

describe('Vendor Intelligence Engine', () => {
  it('correctly applies scoring weights (35% budget, 30% service, 20% availability, 15% rating)', () => {
    // 100 on everything: composite should be 100
    const perfectScore = calculateVendorScore({
      budgetCompatibilityScore: 100,
      serviceSuitabilityScore: 100,
      availabilityScore: 100,
      rating: 5, // 5/5 -> 100%
    });

    expect(perfectScore.compositeScore).toBe(100);
    expect(perfectScore.ratingScore).toBe(100);

    // Weighted test:
    // budget = 80 * 0.35 = 28
    // service = 90 * 0.30 = 27
    // availability = 70 * 0.20 = 14
    // rating = 4.0/5.0 = 80 * 0.15 = 12
    // total = 28 + 27 + 14 + 12 = 81
    const testScore = calculateVendorScore({
      budgetCompatibilityScore: 80,
      serviceSuitabilityScore: 90,
      availabilityScore: 70,
      rating: 4.0,
    });

    expect(testScore.compositeScore).toBe(81);
  });

  it('evaluates budget compatibility tiers correctly', () => {
    // Under allocated budget (<= 85% of allocated)
    expect(evaluateBudgetCompatibility(80000, 100000)).toBe(100);
    // Exactly on budget
    expect(evaluateBudgetCompatibility(100000, 100000)).toBe(90);
    // 10% over
    expect(evaluateBudgetCompatibility(110000, 100000)).toBe(75);
    // Highly over
    expect(evaluateBudgetCompatibility(200000, 100000)).toBe(15);
  });

  it('correctly compares multiple candidate vendors', () => {
    const v1: Vendor = {
      id: 'v1',
      name: 'Vendor A [DEMO DATA]',
      category: 'Venue',
      contactPerson: 'Alice',
      phone: '123',
      email: 'a@demo.com',
      quotedPrice: 200000,
      negotiatedPrice: 190000,
      status: 'Quoted',
      paymentStatus: 'Unpaid',
      paidAmount: 0,
      isPreferred: false,
      budgetCompatibilityScore: 80,
      serviceSuitabilityScore: 80,
      availabilityScore: 80,
      ratingScore: 80,
      rating: 4,
      compositeScore: 80,
      isDemoData: true,
    };

    const v2: Vendor = {
      ...v1,
      id: 'v2',
      name: 'Vendor B [DEMO DATA]',
      quotedPrice: 150000,
      compositeScore: 92,
    };

    const result = compareVendors([v1, v2]);
    expect(result).not.toBeNull();
    expect(result?.highestScoring?.id).toBe('v2');
    expect(result?.bestValue?.id).toBe('v2');
    expect(result?.priceDelta).toBe(50000);
    expect(result?.scoreDelta).toBe(12);
  });
});
