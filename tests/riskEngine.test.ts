import { describe, it, expect } from 'vitest';
import { evaluateEventRisks } from '../src/domain/riskEngine';
import { EventPlan } from '../src/types';
import { generateDefaultMilestones, generateDefaultTasks } from '../src/domain/timelineEngine';

describe('Risk Intelligence Engine', () => {
  const basePlan: EventPlan = {
    id: 'test-event',
    name: 'Test Celebration',
    type: 'Wedding',
    location: 'Chennai',
    eventDate: '2027-02-15',
    guestCount: 300,
    totalBudget: 1000000,
    currency: 'INR',
    userPreferences: 'Traditional',
    specialRequirements: '',
    priorityConsiderations: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    budgetAllocations: [
      { category: 'Venue', percentage: 20, allocatedAmount: 200000 },
      { category: 'Catering', percentage: 30, allocatedAmount: 300000 },
      { category: 'Miscellaneous', percentage: 10, allocatedAmount: 100000 }, // contains contingency
    ],
    expenses: [],
    milestones: generateDefaultMilestones('2027-02-15', 'Wedding'),
    tasks: generateDefaultTasks('2027-02-15', generateDefaultMilestones('2027-02-15', 'Wedding')),
    vendors: [],
    risks: [],
  };

  it('detects unconfirmed critical vendors (Venue / Catering)', () => {
    const risks = evaluateEventRisks(basePlan);
    const unconfirmedVenue = risks.find((r) => r.id === 'risk-unconfirmed-venue');
    const unconfirmedCatering = risks.find((r) => r.id === 'risk-unconfirmed-catering');

    expect(unconfirmedVenue).toBeDefined();
    expect(unconfirmedCatering).toBeDefined();
  });

  it('detects budget overruns when expenses exceed approved total budget', () => {
    const overBudgetPlan: EventPlan = {
      ...basePlan,
      expenses: [
        {
          id: 'exp-big',
          name: 'Excessive Expense',
          category: 'Venue',
          estimatedCost: 1200000, // Exceeds 1000000 total budget
          actualCost: 1200000,
          paidAmount: 500000,
          paymentStatus: 'Advance Paid',
        },
      ],
    };

    const risks = evaluateEventRisks(overBudgetPlan);
    const overrunRisk = risks.find((r) => r.id === 'risk-budget-overrun');
    expect(overrunRisk).toBeDefined();
    expect(overrunRisk?.severity).toBe('Critical');
  });

  it('detects low or missing contingency reserve allocations', () => {
    const noContingencyPlan: EventPlan = {
      ...basePlan,
      budgetAllocations: [
        { category: 'Venue', percentage: 50, allocatedAmount: 500000 },
        { category: 'Catering', percentage: 50, allocatedAmount: 500000 },
        // Miscellaneous (contingency) is omitted or 0%
      ],
    };

    const risks = evaluateEventRisks(noContingencyPlan);
    const contingencyRisk = risks.find((r) => r.id === 'risk-missing-contingency');
    expect(contingencyRisk).toBeDefined();
    expect(contingencyRisk?.severity).toBe('High');
  });
});
