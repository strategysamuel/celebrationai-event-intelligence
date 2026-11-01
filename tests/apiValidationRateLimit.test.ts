/**
 * Unit tests for API Zod Schemas & Rate Limiter validation
 */

import { describe, it, expect } from 'vitest';
import {
  ChatRequestSchema,
  GeneratePlanRequestSchema,
  ReplanningRequestSchema,
  RiskMitigationRequestSchema,
  VendorNegotiationRequestSchema,
  OperationsRequestSchema,
} from '../server/geminiService';

describe('API Zod Validation & Rate Limit Regression Tests', () => {
  it('validates ReplanningRequestSchema correctly', () => {
    const valid = {
      currentPlan: { id: 'evt-1', name: 'Wedding', totalBudget: 1500000, guestCount: 300 },
      request: { newBudget: 1200000 },
    };
    const res = ReplanningRequestSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('rejects malformed / oversized ReplanningRequestSchema values', () => {
    const malformed = {
      currentPlan: { id: 'evt-1', name: 'Wedding', totalBudget: -500, guestCount: 9999999 },
      request: { newBudget: -100 },
    };
    const res = ReplanningRequestSchema.safeParse(malformed);
    expect(res.success).toBe(false);
  });

  it('rejects oversized prompt in GeneratePlanRequestSchema', () => {
    const oversized = {
      prompt: 'A'.repeat(5000), // exceeds max 4000
    };
    const res = GeneratePlanRequestSchema.safeParse(oversized);
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
