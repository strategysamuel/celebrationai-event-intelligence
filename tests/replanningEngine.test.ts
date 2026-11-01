import { describe, it, expect } from 'vitest';
import { generateDynamicReplanning } from '../src/domain/replanningEngine';
import { EventPlan } from '../src/types';
import { generateDefaultMilestones, generateDefaultTasks } from '../src/domain/timelineEngine';

describe('Dynamic Replanning Engine (Competition Differentiator)', () => {
  const samplePlan: EventPlan = {
    id: 'plan-15l',
    name: "Ananya & Rohan's Wedding",
    type: 'Wedding',
    location: 'Chennai',
    eventDate: '2027-02-15',
    guestCount: 300,
    totalBudget: 1500000,
    currency: 'INR',
    userPreferences: 'Traditional',
    specialRequirements: '',
    priorityConsiderations: 'Food quality (#1), Photography',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    budgetAllocations: [
      { category: 'Venue', percentage: 20, allocatedAmount: 300000 },
      { category: 'Catering', percentage: 30, allocatedAmount: 450000 },
      { category: 'Photography', percentage: 10, allocatedAmount: 150000 },
      { category: 'Decoration', percentage: 15, allocatedAmount: 225000 },
      { category: 'Miscellaneous', percentage: 25, allocatedAmount: 375000 },
    ],
    expenses: [],
    milestones: generateDefaultMilestones('2027-02-15', 'Wedding'),
    tasks: generateDefaultTasks('2027-02-15', generateDefaultMilestones('2027-02-15', 'Wedding')),
    vendors: [
      {
        id: 'v-decor',
        name: 'Grand Decorators [DEMO DATA]',
        category: 'Decoration',
        contactPerson: 'Kiran',
        phone: '1234',
        email: 'kiran@demo.com',
        quotedPrice: 220000,
        negotiatedPrice: 200000,
        status: 'Confirmed',
        paymentStatus: 'Advance Paid',
        paidAmount: 50000,
        isPreferred: true,
        budgetCompatibilityScore: 85,
        serviceSuitabilityScore: 90,
        availabilityScore: 85,
        rating: 4.6,
        ratingScore: 92,
        compositeScore: 88,
        isDemoData: true,
      },
    ],
    risks: [],
  };

  it('correctly recalculates available funds when budget is reduced from 15L to 12L', () => {
    const impact = generateDynamicReplanning(samplePlan, {
      eventId: samplePlan.id,
      newBudget: 1200000,
      preservedPriorities: ['Catering', 'Photography'],
    });

    expect(impact.budgetVariance).toBe(-300000);
    expect(impact.budgetChangePercent).toBe(-20);
    expect(impact.proposedPlan.totalBudget).toBe(1200000);

    // Protected priority check
    const cateringAlloc = impact.proposedPlan.budgetAllocations.find((a) => a.category === 'Catering');
    expect(cateringAlloc).toBeDefined();

    // Check affected vendors
    expect(impact.affectedVendors.length).toBeGreaterThanOrEqual(1);
    expect(impact.affectedVendors[0].vendorName).toContain('Grand Decorators');
    expect(impact.affectedVendors[0].recommendedTarget).toBeLessThan(220000);
  });

  it('re-schedules milestone deadlines when event date is shifted', () => {
    const impact = generateDynamicReplanning(samplePlan, {
      eventId: samplePlan.id,
      newEventDate: '2027-03-15', // +28 days
      preservedPriorities: [],
    });

    expect(impact.affectedMilestones.length).toBeGreaterThan(0);
    expect(impact.proposedPlan.eventDate).toBe('2027-03-15');
  });
});
