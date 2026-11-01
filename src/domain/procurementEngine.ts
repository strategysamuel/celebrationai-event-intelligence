/**
 * Vendor & Procurement Intelligence Engine (CAI-004)
 *
 * Implements deterministic 4-factor vendor intelligence scoring, quotation parsing & extraction,
 * side-by-side comparison matrix, heuristic negotiation copilot fallback, and procurement budget integration.
 */

import {
  Vendor,
  VendorCategory,
  VendorQuotation,
  VendorNegotiationInsight,
  ProcurementBudgetImpact,
  CategoryProcurementVariance,
  EventPlan,
} from '../types';
import { evaluateBudgetCompatibility } from './vendorEngine';

// 4-Factor Deterministic Scoring Weights (Section 5)
export const PROCUREMENT_SCORE_WEIGHTS = {
  budgetCompatibility: 0.35,
  serviceSuitability: 0.30,
  capacityCompatibility: 0.20,
  verifiedRating: 0.15,
} as const;

/**
 * Calculates 4-Factor Vendor Intelligence Score
 */
export function calculateProcurementVendorScore(params: {
  quotedAmount: number;
  allocatedBudget: number;
  includedServicesCount: number;
  excludedServicesCount: number;
  capacityProvided: number; // e.g. 450 guests
  capacityRequired: number; // e.g. 450 guests
  verifiedRating?: number; // 1-5 scale or null
}): {
  budgetCompatibilityScore: number;
  serviceSuitabilityScore: number;
  capacityScore: number;
  ratingScore: number;
  compositeScore: number;
  transparencyNotes: string[];
} {
  // 1. Budget Compatibility (35%)
  const budgetCompatibilityScore = evaluateBudgetCompatibility(params.quotedAmount, params.allocatedBudget);

  // 2. Service Suitability (30%)
  // Base 70, +5 per included service, -10 per excluded essential service
  let serviceSuitabilityScore = 70 + params.includedServicesCount * 5 - params.excludedServicesCount * 10;
  serviceSuitabilityScore = Math.max(20, Math.min(100, serviceSuitabilityScore));

  // 3. Capacity Compatibility (20%)
  let capacityScore = 100;
  if (params.capacityRequired > 0 && params.capacityProvided > 0) {
    const ratio = params.capacityProvided / params.capacityRequired;
    if (ratio >= 1.0) capacityScore = 100;
    else if (ratio >= 0.8) capacityScore = 75;
    else capacityScore = 40;
  } else {
    capacityScore = 50; // Neutral if capacity unspecified
  }

  // 4. Verified Rating (15%)
  // Missing rating is NOT treated as 100; if missing, treat as neutral 60
  const transparencyNotes: string[] = [];
  let ratingScore = 60;
  if (params.verifiedRating && params.verifiedRating > 0) {
    ratingScore = Math.round((params.verifiedRating / 5) * 100);
  } else {
    transparencyNotes.push('No verified user rating available; neutral rating score of 60 applied.');
  }

  const compositeScore =
    budgetCompatibilityScore * PROCUREMENT_SCORE_WEIGHTS.budgetCompatibility +
    serviceSuitabilityScore * PROCUREMENT_SCORE_WEIGHTS.serviceSuitability +
    capacityScore * PROCUREMENT_SCORE_WEIGHTS.capacityCompatibility +
    ratingScore * PROCUREMENT_SCORE_WEIGHTS.verifiedRating;

  return {
    budgetCompatibilityScore,
    serviceSuitabilityScore,
    capacityScore,
    ratingScore,
    compositeScore: Math.round(compositeScore * 10) / 10,
    transparencyNotes,
  };
}

/**
 * Text & CSV Quotation Extraction Parser (Section 3)
 */
export function extractQuotationFromText(
  text: string,
  fileName: string = 'uploaded_quote.txt'
): { quotation: VendorQuotation; extractionErrors: string[] } {
  const extractionErrors: string[] = [];

  if (!text || text.trim().length === 0) {
    return {
      quotation: createEmptyQuotation(fileName, 'Empty file content provided.'),
      extractionErrors: ['File content is empty.'],
    };
  }

  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  let vendorName = '';
  let category: VendorCategory = 'Catering';
  let quotedAmount = 0;
  let taxesAndGst = 0;
  const includedServices: string[] = [];
  const excludedServices: string[] = [];
  let paymentTerms = 'Not Provided in Quotation';
  let cancellationTerms = 'Not Provided in Quotation';
  let validityPeriod = 'Not Provided in Quotation';
  let capacityDetails = 'Not Provided in Quotation';

  // Parse lines using regex patterns
  for (const line of lines) {
    const lower = line.toLowerCase();

    // Vendor Name
    if (lower.includes('vendor') || lower.includes('caterer') || lower.includes('company') || lower.includes('studio') || lower.includes('decorator')) {
      const parts = line.split(/[:=,-]/);
      if (parts.length > 1) {
        vendorName = parts.slice(1).join(' ').trim();
      } else {
        vendorName = line.replace(/(vendor|caterer|company|studio|decorator|name)/gi, '').trim();
      }
    }

    // Explicit Category line takes highest priority
    if (lower.startsWith('category:') || lower.startsWith('service category:')) {
      const catText = line.split(':')[1]?.trim().toLowerCase() || '';
      if (catText.includes('catering') || catText.includes('food')) category = 'Catering';
      else if (catText.includes('decor') || catText.includes('floral')) category = 'Decoration';
      else if (catText.includes('photo') || catText.includes('video')) category = 'Photography';
      else if (catText.includes('venue') || catText.includes('hall')) category = 'Venue';
      else if (catText.includes('transport')) category = 'Transport';
      else if (catText.includes('room') || catText.includes('hotel')) category = 'Accommodation';
      else if (catText.includes('music') || catText.includes('dj')) category = 'Entertainment';
    } else if (!lower.includes('excluded') && !lower.includes('not included')) {
      // Fallback category detection on non-exclusion lines
      if (lower.includes('catering') || lower.includes('food') || lower.includes('feast') || lower.includes('caterer')) {
        category = 'Catering';
      } else if (lower.includes('decor') || lower.includes('mandap') || lower.includes('floral')) {
        category = 'Decoration';
      } else if (lower.includes('photo') || lower.includes('cinema') || lower.includes('drone')) {
        category = 'Photography';
      } else if (lower.includes('venue') || lower.includes('resort')) {
        category = 'Venue';
      } else if (lower.includes('transport') || lower.includes('shuttle')) {
        category = 'Transport';
      } else if (lower.includes('lodging')) {
        category = 'Accommodation';
      } else if (lower.includes('nadaswaram')) {
        category = 'Entertainment';
      }
    }

    // Amounts: Base Price vs Total Price
    if (lower.includes('base') || lower.includes('subtotal') || lower.includes('quoted amount') || lower.includes('quote amount')) {
      const nums = line.match(/\d+[\d,.]*/g);
      if (nums && nums.length > 0) {
        const val = parseInt(nums[nums.length - 1].replace(/,/g, ''), 10);
        if (!isNaN(val) && val > 1000) {
          quotedAmount = val;
        }
      }
    } else if (lower.includes('total') || lower.includes('grand total')) {
      const nums = line.match(/\d+[\d,.]*/g);
      if (nums && nums.length > 0) {
        const val = parseInt(nums[nums.length - 1].replace(/,/g, ''), 10);
        if (!isNaN(val) && val > 1000 && quotedAmount === 0) {
          quotedAmount = val;
        }
      }
    } else if (quotedAmount === 0 && (lower.includes('amount') || lower.includes('price') || lower.includes('cost'))) {
      const nums = line.match(/\d+[\d,.]*/g);
      if (nums && nums.length > 0) {
        const val = parseInt(nums[nums.length - 1].replace(/,/g, ''), 10);
        if (!isNaN(val) && val > 1000) {
          quotedAmount = val;
        }
      }
    }

    // Tax / GST
    if (lower.includes('tax') || lower.includes('gst') || lower.includes('vat')) {
      const nums = line.match(/\d+[\d,.]*/g);
      if (nums && nums.length > 0) {
        const val = parseInt(nums[nums.length - 1].replace(/,/g, ''), 10);
        if (!isNaN(val) && val < quotedAmount) {
          taxesAndGst = val;
        }
      }
    }

    // Included Services
    if (lower.includes('included') || lower.includes('includes') || lower.includes('package contains') || lower.includes('service:')) {
      const items = line.split(/[:;]/)[1]?.split(/[,|]/) || [line];
      items.forEach((item) => {
        const clean = item.replace(/(includes|included|package contains|service:)/gi, '').trim();
        if (clean.length > 3) includedServices.push(clean);
      });
    }

    // Excluded Services
    if (lower.includes('excluded') || lower.includes('excludes') || lower.includes('not included') || lower.includes('extra charge')) {
      const items = line.split(/[:;]/)[1]?.split(/[,|]/) || [line];
      items.forEach((item) => {
        const clean = item.replace(/(excludes|excluded|not included|extra charge)/gi, '').trim();
        if (clean.length > 3) excludedServices.push(clean);
      });
    }

    // Payment Terms
    if (lower.includes('payment') || lower.includes('deposit') || lower.includes('advance')) {
      paymentTerms = line;
    }

    // Cancellation Terms
    if (lower.includes('cancellation') || lower.includes('refund') || lower.includes('policy')) {
      cancellationTerms = line;
    }

    // Validity
    if (lower.includes('valid') || lower.includes('validity') || lower.includes('expiry')) {
      validityPeriod = line;
    }

    // Capacity
    if (lower.includes('capacity') || lower.includes('guest') || lower.includes('pax') || lower.includes('covers')) {
      capacityDetails = line;
    }
  }

  // Fallbacks if extraction missed fields
  if (!vendorName) {
    vendorName = fileName.replace(/\.[^/.]+$/, '').replace(/[_,-]/g, ' ') || 'Uploaded Vendor Quote';
    extractionErrors.push('Vendor name not explicitly detected; inferred from filename.');
  }

  if (quotedAmount === 0) {
    extractionErrors.push('Quoted price not explicitly detected in uploaded text; requires manual entry.');
  }

  if (includedServices.length === 0) {
    includedServices.push('Standard package provisions as per quotation text');
    extractionErrors.push('Included services list incomplete in raw upload.');
  }

  const totalEstimatedCost = quotedAmount + taxesAndGst;

  const quotation: VendorQuotation = {
    id: `quote-up-${Date.now()}`,
    vendorName,
    category,
    quotedAmount,
    taxesAndGst,
    totalEstimatedCost,
    includedServices,
    excludedServices: excludedServices.length > 0 ? excludedServices : ['Unspecified exclusions'],
    paymentTerms,
    cancellationTerms,
    validityPeriod,
    capacityDetails,
    extractedAt: new Date().toISOString().split('T')[0],
    isVerified: false,
    verificationStatus: 'User-Entered',
    notes: `Extracted from ${fileName}. ${extractionErrors.length > 0 ? 'Requires user verification.' : 'Parsed cleanly.'}`,
    rawFileContent: text,
    fileName,
  };

  return { quotation, extractionErrors };
}

function createEmptyQuotation(fileName: string, reason: string): VendorQuotation {
  return {
    id: `quote-err-${Date.now()}`,
    vendorName: 'Unverified Vendor',
    category: 'Catering',
    quotedAmount: 0,
    taxesAndGst: 0,
    totalEstimatedCost: 0,
    includedServices: [],
    excludedServices: [],
    paymentTerms: 'Not Provided in Quotation',
    cancellationTerms: 'Not Provided in Quotation',
    validityPeriod: 'Not Provided in Quotation',
    capacityDetails: 'Not Provided in Quotation',
    extractedAt: new Date().toISOString().split('T')[0],
    isVerified: false,
    verificationStatus: 'Not Available',
    notes: `Extraction failed for ${fileName}: ${reason}`,
    fileName,
  };
}

/**
 * Benchmark Demonstration Quotation Dataset (Section 8)
 * Clearly labeled synthetic demonstration quotations for Chennai Wedding (450 Guests, ₹15L Budget)
 */
export const SEED_DEMO_QUOTATIONS: VendorQuotation[] = [
  // --- 3 Caterers ---
  {
    id: 'quote-cat-1',
    vendorName: 'Annamalai Traditional Caterers [DEMO DATA]',
    category: 'Catering',
    quotedAmount: 450000,
    taxesAndGst: 45000, // 10% GST/Service Tax
    totalEstimatedCost: 495000, // ₹1,100/head for 450 guests
    includedServices: [
      '24-Dish Traditional South Indian Banana Leaf Feast (450 Covers)',
      'Live Filter Coffee & Mysore Pak Dessert Counter',
      'Banana Leaf Laying, Server Personnel (45 Staff)',
      'Dining Hall Table & Stool Setup',
    ],
    excludedServices: [
      'Exotic International Live Stalls',
      'Packaged Mineral Water Bottles (Extra charge)',
    ],
    paymentTerms: '30% Advance, 50% Day-of-Event, 20% Post-Event Settlement',
    cancellationTerms: '100% Refund if cancelled >60 days prior; 50% refund if 30-60 days.',
    validityPeriod: 'Valid until 15 Feb 2027',
    capacityDetails: 'Verified capacity up to 600 guests',
    extractedAt: '2026-11-01',
    isVerified: true,
    verificationStatus: 'Synthetic Demonstration',
    notes: 'Primary traditional caterer for Chennai wedding benchmark. Perfect 2-shift banana leaf feast plan.',
    scores: {
      budgetCompatibilityScore: 95,
      serviceSuitabilityScore: 92,
      capacityScore: 100,
      ratingScore: 96, // 4.8 / 5
      compositeScore: 95.2,
    },
  },
  {
    id: 'quote-cat-2',
    vendorName: 'Grand Carnatic Banquet Services [DEMO DATA]',
    category: 'Catering',
    quotedAmount: 490000,
    taxesAndGst: 50000,
    totalEstimatedCost: 540000, // ₹1,200/head for 450 guests
    includedServices: [
      'Multi-Cuisine South & North Indian Grand Buffet (450 Covers)',
      'Live Hot Jalebi, Kulfi, & Filter Coffee Stalls',
      '30 Uniformed Waiters & Cutlery Station',
      'VIP Table Service for Family Elders',
    ],
    excludedServices: [
      'Additional Waiters above 30 (₹1,000/server)',
      'Lawn Marquee Dining Canopy Setup',
    ],
    paymentTerms: '40% Advance, 60% Day-of-Event',
    cancellationTerms: '50% Refund if cancelled >45 days; non-refundable within 45 days.',
    validityPeriod: 'Valid until 31 Jan 2027',
    capacityDetails: 'Rated capacity 500 guests',
    extractedAt: '2026-11-01',
    isVerified: true,
    verificationStatus: 'Synthetic Demonstration',
    notes: 'Higher per-head option with multi-cuisine variety. Fits Option 2 Balanced Celebration.',
    scores: {
      budgetCompatibilityScore: 85,
      serviceSuitabilityScore: 95,
      capacityScore: 100,
      ratingScore: 94, // 4.7 / 5
      compositeScore: 91.8,
    },
  },
  {
    id: 'quote-cat-3',
    vendorName: 'Sri Krishna Catering Line [DEMO DATA]',
    category: 'Catering',
    quotedAmount: 385000,
    taxesAndGst: 35000,
    totalEstimatedCost: 420000, // ₹933/head for 450 guests - LOWEST QUOTE!
    includedServices: [
      'Standard 14-Item Traditional Banana Leaf Meals (450 Covers)',
      'Basic Sweet (Payasam) & Rasam / Sambar Course',
      '20 Kitchen Helpers',
    ],
    excludedServices: [
      'Live Filter Coffee Counter (₹15,000 extra)',
      'Evening Tiffin & Snacks',
      'Dining Table Cleaning Staff',
      'Welcome Drinks',
    ],
    paymentTerms: '50% Advance Upon Booking, 50% Morning of Event',
    cancellationTerms: 'Non-refundable booking advance.',
    validityPeriod: 'Valid until 15 Dec 2026',
    capacityDetails: 'Capacity up to 450 guests max',
    extractedAt: '2026-11-01',
    isVerified: true,
    verificationStatus: 'Synthetic Demonstration',
    isLowestQuote: true, // LOWEST PRICE TAG!
    notes: 'Cheapest caterer option, but leaves live coffee and evening tiffin missing, introducing operational risk.',
    scores: {
      budgetCompatibilityScore: 100,
      serviceSuitabilityScore: 60, // Lower due to omitted essential services
      capacityScore: 80,
      ratingScore: 80, // 4.0 / 5
      compositeScore: 81.0,
    },
  },

  // --- 3 Decorators ---
  {
    id: 'quote-dec-1',
    vendorName: 'Mylapore Royal Decorators [DEMO DATA]',
    category: 'Decoration',
    quotedAmount: 165000,
    taxesAndGst: 15000,
    totalEstimatedCost: 180000, // Fits Option 1 Budget Protection
    includedServices: [
      'Authentic Temple-Motif Marigold & Jasmine Flower Mandap',
      'Banana Stem Hall Entrance Arch & Floral Aisle Pillars',
      'Stage Ambient LED Wash Lights & Sound Backdrop',
    ],
    excludedServices: [
      'Heavy Lawn Canopy Structural Marquee',
      '15 kVA Lighting Generator Rental',
    ],
    paymentTerms: '25% Advance, 75% On Completion of Setup',
    cancellationTerms: '80% refund if cancelled 30 days prior.',
    validityPeriod: 'Valid until 15 Feb 2027',
    capacityDetails: 'Hall stage up to 50ft width',
    extractedAt: '2026-11-01',
    isVerified: true,
    verificationStatus: 'Synthetic Demonstration',
    notes: 'Authentic local floral craftsmanship fitting Option 1 budget protection.',
    scores: {
      budgetCompatibilityScore: 95,
      serviceSuitabilityScore: 92,
      capacityScore: 100,
      ratingScore: 96, // 4.8 / 5
      compositeScore: 95.2,
    },
  },
  {
    id: 'quote-dec-2',
    vendorName: 'Chola Empire Event Designers [DEMO DATA]',
    category: 'Decoration',
    quotedAmount: 205000,
    taxesAndGst: 20000,
    totalEstimatedCost: 225000,
    includedServices: [
      'Exotic Orchid & Rose Floral Mandap Theme',
      'Interactive Photo Booth with LED Neon Signs',
      'Full Stage Backdrop widening to 60ft',
    ],
    excludedServices: [
      'Lawn Dining Canopy Tent',
      'Generator Fuel Expenses',
    ],
    paymentTerms: '50% Advance, 50% Day Before Event',
    cancellationTerms: '50% Refund if cancelled >30 days.',
    validityPeriod: 'Valid until 15 Jan 2027',
    capacityDetails: 'Stage backdrop up to 60ft width',
    extractedAt: '2026-11-01',
    isVerified: true,
    verificationStatus: 'Synthetic Demonstration',
    notes: 'Lavish floral decor option fitting Option 3 premium experience.',
    scores: {
      budgetCompatibilityScore: 75,
      serviceSuitabilityScore: 96,
      capacityScore: 100,
      ratingScore: 94,
      compositeScore: 89.1,
    },
  },
  {
    id: 'quote-dec-3',
    vendorName: 'Sri Balaji Floral Crafts [DEMO DATA]',
    category: 'Decoration',
    quotedAmount: 135000,
    taxesAndGst: 15000,
    totalEstimatedCost: 150000, // LOWEST DECORATOR QUOTE!
    includedServices: [
      'Basic Stage Backdrop with Marigold Garlands',
      'Welcoming Gate Entrance Arch',
    ],
    excludedServices: [
      'Mandap Ceiling Floral Canopy',
      'Stage Lighting & Spotlights',
      'Lighting Generator Rental',
    ],
    paymentTerms: '50% Advance, 50% Day-of-Event',
    cancellationTerms: 'Non-refundable booking deposit.',
    validityPeriod: 'Valid until 31 Dec 2026',
    capacityDetails: 'Stage width up to 35ft max',
    extractedAt: '2026-11-01',
    isVerified: true,
    verificationStatus: 'Synthetic Demonstration',
    isLowestQuote: true, // LOWEST PRICE TAG!
    notes: 'Cheapest decor option, but excludes stage spotlights and generator rental.',
    scores: {
      budgetCompatibilityScore: 100,
      serviceSuitabilityScore: 65,
      capacityScore: 75,
      ratingScore: 82,
      compositeScore: 81.8,
    },
  },

  // --- 2 Photographers ---
  {
    id: 'quote-pho-1',
    vendorName: 'Madras Candid Wedding Stories [DEMO DATA]',
    category: 'Photography',
    quotedAmount: 135000,
    taxesAndGst: 15000,
    totalEstimatedCost: 150000, // LOWEST PHOTOGRAPHER QUOTE!
    includedServices: [
      '1 Lead Candid Photographer (Full Muhurtham & Reception)',
      '1 Traditional HD Videographer',
      '100-Page Hardbound Premium Leather Photo Album',
      '3-Minute Cinematic Teaser Video',
    ],
    excludedServices: [
      'Drone Aerial Videography',
      'Live LED Screen Streaming in Hall',
    ],
    paymentTerms: '20% Booking Advance, 60% On Event Day, 20% On Delivery',
    cancellationTerms: 'Full advance refund if cancelled >45 days.',
    validityPeriod: 'Valid until 15 Feb 2027',
    capacityDetails: 'Full day coverage up to 14 hours',
    extractedAt: '2026-11-01',
    isVerified: true,
    verificationStatus: 'Synthetic Demonstration',
    isLowestQuote: true, // LOWEST PRICE TAG!
    notes: 'Highest overall suitability score fitting Option 1 & Option 2 budgets.',
    scores: {
      budgetCompatibilityScore: 100,
      serviceSuitabilityScore: 92,
      capacityScore: 100,
      ratingScore: 96, // 4.8 / 5
      compositeScore: 97.0,
    },
  },
  {
    id: 'quote-pho-2',
    vendorName: 'Cinematic Chola Films [DEMO DATA]',
    category: 'Photography',
    quotedAmount: 170000,
    taxesAndGst: 17500,
    totalEstimatedCost: 187500,
    includedServices: [
      '2 Candid Photographers + 2 Traditional Video Operators',
      '4K Drone Aerial Venue & Muhurtham Coverage',
      'Same-Day Teaser Reel + 150-Page Album',
      'Raw Unedited Footage Hard Drive Delivery',
    ],
    excludedServices: [
      'Outstation Travel Accommodations (if outside Chennai)',
    ],
    paymentTerms: '40% Advance, 50% Event Day, 10% On Delivery',
    cancellationTerms: '50% Refund if cancelled >30 days.',
    validityPeriod: 'Valid until 15 Jan 2027',
    capacityDetails: 'Multi-crew coverage up to 18 hours',
    extractedAt: '2026-11-01',
    isVerified: true,
    verificationStatus: 'Synthetic Demonstration',
    notes: 'Full VIP cinema crew with drone aerial coverage fitting Option 3 premium experience.',
    scores: {
      budgetCompatibilityScore: 75,
      serviceSuitabilityScore: 98,
      capacityScore: 100,
      ratingScore: 98, // 4.9 / 5
      compositeScore: 90.4,
    },
  },
];

/**
 * Compare Quotations Side-by-Side (Section 4 & Section 8)
 */
export function compareCategoryQuotations(
  quotations: VendorQuotation[],
  category: VendorCategory,
  allocatedCategoryBudget: number = 450000
): {
  category: VendorCategory;
  quotations: VendorQuotation[];
  lowestQuoteVendor: VendorQuotation | null;
  recommendedVendor: VendorQuotation | null;
  priceSpread: number;
} {
  const filtered = quotations.filter((q) => q.category === category);
  if (filtered.length === 0) {
    return {
      category,
      quotations: [],
      lowestQuoteVendor: null,
      recommendedVendor: null,
      priceSpread: 0,
    };
  }

  // Calculate composite scores if not already set
  const scored = filtered.map((q) => {
    const scores = q.scores || calculateProcurementVendorScore({
      quotedAmount: q.totalEstimatedCost,
      allocatedBudget: allocatedCategoryBudget,
      includedServicesCount: q.includedServices.length,
      excludedServicesCount: q.excludedServices.length,
      capacityProvided: 450,
      capacityRequired: 450,
      verifiedRating: 4.5,
    });
    return {
      ...q,
      scores,
    };
  });

  // Find lowest quotation
  const sortedByPrice = [...scored].sort((a, b) => a.totalEstimatedCost - b.totalEstimatedCost);
  const lowestPrice = sortedByPrice[0].totalEstimatedCost;
  const highestPrice = sortedByPrice[sortedByPrice.length - 1].totalEstimatedCost;

  // Mark lowest quote flag
  const evaluated = scored.map((q) => ({
    ...q,
    isLowestQuote: q.totalEstimatedCost === lowestPrice,
  }));

  // Find recommended vendor based on composite score (NOT automatically cheapest)
  const sortedByScore = [...evaluated].sort((a, b) => (b.scores?.compositeScore || 0) - (a.scores?.compositeScore || 0));
  const recommendedId = sortedByScore[0].id;

  const finalQuotations = evaluated.map((q) => ({
    ...q,
    isRecommended: q.id === recommendedId,
  }));

  return {
    category,
    quotations: finalQuotations,
    lowestQuoteVendor: finalQuotations.find((q) => q.isLowestQuote) || null,
    recommendedVendor: finalQuotations.find((q) => q.isRecommended) || null,
    priceSpread: highestPrice - lowestPrice,
  };
}

/**
 * Generate Grounded Heuristic Negotiation Insights (Section 6)
 */
export function generateHeuristicNegotiationInsight(
  quotation: VendorQuotation,
  allocatedBudget: number = 450000
): VendorNegotiationInsight {
  const opportunities: string[] = [];
  const costReductions: { targetArea: string; estimatedSavings: number; strategy: string }[] = [];
  const questionsToAsk: string[] = [];
  const missingServiceWarnings: string[] = [];
  const paymentTermConcerns: string[] = [];
  const contractualRisks: string[] = [];

  // Negotiation Opportunities & Cost Reduction Targets
  if (quotation.totalEstimatedCost > allocatedBudget) {
    const delta = quotation.totalEstimatedCost - allocatedBudget;
    opportunities.push(`Price is ₹${delta.toLocaleString()} above category budget. Negotiate 8-10% volume discount.`);
    costReductions.push({
      targetArea: 'Category Allocation Reconciliation',
      estimatedSavings: delta,
      strategy: `Request unbundling non-essential exclusions or requesting ₹${delta.toLocaleString()} bulk volume waiver for 450 guests.`,
    });
  } else {
    const savingsPotential = Math.round(quotation.quotedAmount * 0.05);
    opportunities.push(`Vendor is within category allocation. Target ₹${savingsPotential.toLocaleString()} (5%) courtesy discount for early advance payment.`);
    costReductions.push({
      targetArea: 'Early Settlement Courtesy Discount',
      estimatedSavings: savingsPotential,
      strategy: 'Offer 40% immediate advance in exchange for 5% package fee reduction.',
    });
  }

  // Missing Service Warnings
  if (quotation.excludedServices && quotation.excludedServices.length > 0) {
    quotation.excludedServices.forEach((exc) => {
      missingServiceWarnings.push(`Excluded Service: ${exc}`);
      questionsToAsk.push(`What is the exact additional surcharge if we decide to include "${exc}" on the event day?`);
    });
  }

  // Payment Term Concerns
  if (quotation.paymentTerms.toLowerCase().includes('50% advance') || quotation.paymentTerms.toLowerCase().includes('non-refundable')) {
    paymentTermConcerns.push('Upfront advance requirement is 50%+ or includes non-refundable deposit terms.');
    questionsToAsk.push('Can the initial booking advance be structured as 25% upon contract lock and 25% 14 days prior to event?');
  } else {
    questionsToAsk.push('Is the 20% post-event settlement balance contingent on quality inspection sign-off?');
  }

  // Contractual Risks
  if (!quotation.validityPeriod || quotation.validityPeriod.includes('Not Provided')) {
    contractualRisks.push('Quotation validity period is unspecified. Secure written price lock through 15 Feb 2027.');
  }

  return {
    vendorId: quotation.vendorId || quotation.id,
    vendorName: quotation.vendorName,
    category: quotation.category,
    negotiationOpportunities: opportunities,
    potentialCostReductions: costReductions,
    questionsToAskVendor: questionsToAsk,
    missingServiceWarnings,
    paymentTermConcerns,
    contractualRiskObservations: contractualRisks,
    attributionMetadata: {
      source: 'heuristic',
      requestedModel: 'gemini-3.8-flash',
      actualModel: 'Deterministic Heuristic Engine',
      isFallbackModel: false,
      modelVersion: null,
      fallbackType: 'heuristic',
    },
  };
}

/**
 * Calculate Procurement Budget Impact (Section 7)
 */
export function calculateProcurementBudgetImpact(
  activePlan: EventPlan,
  selectedProcurements: { category: VendorCategory; vendorName: string; cost: number }[]
): ProcurementBudgetImpact {
  const approvedBudget = activePlan.totalBudget;
  const existingExpenditure = activePlan.expenses.reduce((sum, e) => sum + (e.actualCost || e.estimatedCost), 0);

  // Group proposed vendor costs by category
  const proposedCategoryCosts: Partial<Record<VendorCategory, { name: string; cost: number }>> = {};
  selectedProcurements.forEach((proc) => {
    proposedCategoryCosts[proc.category] = {
      name: proc.vendorName,
      cost: proc.cost,
    };
  });

  let totalProposedExpenditure = 0;
  const categoryVariances: CategoryProcurementVariance[] = activePlan.budgetAllocations.map((alloc) => {
    const proposed = proposedCategoryCosts[alloc.category];
    const proposedCost = proposed ? proposed.cost : alloc.allocatedAmount;
    totalProposedExpenditure += proposedCost;

    const variance = alloc.allocatedAmount - proposedCost; // positive = savings, negative = overrun
    let status: 'Under Budget' | 'On Budget' | 'Over Budget' = 'On Budget';
    if (variance > 0) status = 'Under Budget';
    else if (variance < 0) status = 'Over Budget';

    return {
      category: alloc.category,
      allocatedBudget: alloc.allocatedAmount,
      proposedVendorCost: proposedCost,
      variance,
      status,
      selectedVendorName: proposed?.name,
    };
  });

  const remainingBudget = approvedBudget - totalProposedExpenditure;
  const potentialShortfall = remainingBudget < 0 ? Math.abs(remainingBudget) : 0;

  return {
    approvedBudget,
    existingEstimatedExpenditure: existingExpenditure,
    proposedVendorExpenditure: totalProposedExpenditure,
    remainingBudget,
    potentialShortfall,
    categoryVariances,
  };
}
