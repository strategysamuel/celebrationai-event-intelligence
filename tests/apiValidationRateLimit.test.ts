/**
 * Unit tests for API Zod Schemas (Replanning, Risk Mitigation, Vendor Negotiation, Operations)
 */

import { describe, it, expect } from 'vitest';
import {
  ReplanningRequestSchema,
  RiskMitigationRequestSchema,
  VendorNegotiationRequestSchema,
  OperationsRequestSchema,
} from '../server/geminiService';

describe('API Zod Validation Regression Tests', () => {
  it('validates ReplanningRequestSchema correctly', () => {
    const valid = {
      currentPlan: { id: 'evt-1', name: 'Wedding', totalBudget: 1500000, guestCount: 300 },
      request: { newBudget: 1200000 },
    };
    const res = ReplanningRequestSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('rejects invalid ReplanningRequestSchema without currentPlan or request', () => {
    const invalid = { currentPlan: { id: 'evt-1' } };
    const res = ReplanningRequestSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('validates RiskMitigationRequestSchema correctly', () => {
    const valid = {
      risk: { id: 'r1', title: 'Budget Breach', severity: 'Critical' },
      planContext: { name: 'Wedding', type: 'Wedding', budget: 1500000, currency: 'INR' },
    };
    const res = RiskMitigationRequestSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('validates VendorNegotiationRequestSchema correctly', () => {
    const valid = {
      quotation: { vendorName: 'Grand Catering', quotedAmount: 450000 },
      allocatedBudget: 400000,
    };
    const res = VendorNegotiationRequestSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('validates OperationsRequestSchema correctly', () => {
    const valid = {
      event: { id: 'evt-1', name: 'Wedding' },
    };
    const res = OperationsRequestSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });
});
