/**
 * Vendor Intelligence & Suitability Scoring Engine
 *
 * Scoring Formula:
 * - Budget Compatibility: 35%
 * - Service Suitability: 30%
 * - Availability: 20%
 * - Rating: 15%
 */

import { Vendor, VendorCategory } from '../types';

export const VENDOR_WEIGHTS = {
  budgetCompatibility: 0.35,
  serviceSuitability: 0.30,
  availability: 0.20,
  rating: 0.15,
} as const;

/**
 * Calculates deterministic composite suitability score (0-100)
 */
export function calculateVendorScore(params: {
  budgetCompatibilityScore: number; // 0 - 100
  serviceSuitabilityScore: number; // 0 - 100
  availabilityScore: number; // 0 - 100
  rating: number; // 1 to 5
}): { compositeScore: number; ratingScore: number } {
  // Normalize rating 1-5 to 0-100 scale
  const ratingScore = Math.max(0, Math.min(100, Math.round((params.rating / 5) * 100)));

  const budget = Math.max(0, Math.min(100, params.budgetCompatibilityScore));
  const service = Math.max(0, Math.min(100, params.serviceSuitabilityScore));
  const availability = Math.max(0, Math.min(100, params.availabilityScore));

  const composite =
    budget * VENDOR_WEIGHTS.budgetCompatibility +
    service * VENDOR_WEIGHTS.serviceSuitability +
    availability * VENDOR_WEIGHTS.availability +
    ratingScore * VENDOR_WEIGHTS.rating;

  return {
    compositeScore: Math.round(composite * 10) / 10,
    ratingScore,
  };
}

/**
 * Computes budget compatibility score based on category budget allocation vs quote
 */
export function evaluateBudgetCompatibility(
  quotedPrice: number,
  categoryAllocatedAmount: number
): number {
  if (categoryAllocatedAmount <= 0) return 50;
  const ratio = quotedPrice / categoryAllocatedAmount;

  if (ratio <= 0.85) return 100; // Under allocated budget: perfect score
  if (ratio <= 1.0) return 90; // Exactly on budget
  if (ratio <= 1.1) return 75; // 10% over
  if (ratio <= 1.25) return 55; // 25% over
  if (ratio <= 1.5) return 35; // 50% over
  return 15; // Far over budget
}

/**
 * Ranks vendors within a category based on composite suitability score
 */
export function rankVendorsByCategory(
  vendors: Vendor[],
  category?: VendorCategory
): Vendor[] {
  const filtered = category ? vendors.filter((v) => v.category === category) : [...vendors];
  return filtered.sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));
}

/**
 * Compare two or more vendors side-by-side
 */
export interface VendorComparisonResult {
  vendors: Vendor[];
  highestScoring: Vendor | null;
  bestValue: Vendor | null; // Lowest quoted among confirmed/high scoring
  category: VendorCategory;
  priceDelta: number;
  scoreDelta: number;
}

export function compareVendors(vendors: Vendor[]): VendorComparisonResult | null {
  if (vendors.length === 0) return null;

  const sortedByScore = [...vendors].sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));
  const sortedByPrice = [...vendors].sort((a, b) => a.quotedPrice - b.quotedPrice);

  const highestScoring = sortedByScore[0];
  const bestValue = sortedByPrice[0];

  const highestPrice = sortedByPrice[sortedByPrice.length - 1].quotedPrice;
  const lowestPrice = sortedByPrice[0].quotedPrice;

  return {
    vendors,
    highestScoring,
    bestValue,
    category: vendors[0].category,
    priceDelta: highestPrice - lowestPrice,
    scoreDelta:
      sortedByScore.length > 1
        ? Math.round(((sortedByScore[0].compositeScore ?? 0) - (sortedByScore[sortedByScore.length - 1].compositeScore ?? 0)) * 10) / 10
        : 0,
  };
}
