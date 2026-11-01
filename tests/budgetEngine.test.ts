import { describe, it, expect } from 'vitest';
import {
  calculateBudgetSummary,
  validateAllocations,
  simulateBudget,
  INITIAL_WEDDING_ALLOCATIONS,
} from '../src/domain/budgetEngine';
import { BudgetCategoryAllocation, ExpenseItem } from '../src/types';

describe('Budget Intelligence Engine', () => {
  it('validates that default allocations sum up to exactly 100%', () => {
    const allocations: BudgetCategoryAllocation[] = INITIAL_WEDDING_ALLOCATIONS.map((a) => ({
      category: a.category,
      percentage: a.percentage,
      allocatedAmount: (1500000 * a.percentage) / 100,
    }));

    const result = validateAllocations(allocations);
    expect(result.isValid).toBe(true);
    expect(result.totalPercentage).toBe(100);
  });

  it('rejects allocation percentages that do not sum to 100%', () => {
    // Under 100%
    const underAllocations: BudgetCategoryAllocation[] = [
      { category: 'Venue', percentage: 20, allocatedAmount: 20000 },
      { category: 'Catering', percentage: 30, allocatedAmount: 30000 },
    ];
    const underResult = validateAllocations(underAllocations);
    expect(underResult.isValid).toBe(false);
    expect(underResult.error).toContain('must equal exactly 100%');

    // Over 100%
    const overAllocations: BudgetCategoryAllocation[] = [
      { category: 'Venue', percentage: 60, allocatedAmount: 60000 },
      { category: 'Catering', percentage: 50, allocatedAmount: 50000 },
    ];
    const overResult = validateAllocations(overAllocations);
    expect(overResult.isValid).toBe(false);
    expect(overResult.error).toContain('must equal exactly 100%');
  });

  it('correctly calculates budget summary, variance, and remaining buffer', () => {
    const totalBudget = 1000000;
    const allocations: BudgetCategoryAllocation[] = [
      { category: 'Venue', percentage: 50, allocatedAmount: 500000 },
      { category: 'Catering', percentage: 50, allocatedAmount: 500000 },
    ];
    const expenses: ExpenseItem[] = [
      {
        id: '1',
        name: 'Grand Ballroom',
        category: 'Venue',
        estimatedCost: 500000,
        actualCost: 480000,
        paidAmount: 200000,
        paymentStatus: 'Advance Paid',
      },
    ];

    const summary = calculateBudgetSummary(totalBudget, allocations, expenses);
    expect(summary.totalBudget).toBe(1000000);
    expect(summary.totalActualExpenses).toBe(480000);
    expect(summary.remainingActualBudget).toBe(520000);
    expect(summary.isOverBudget).toBe(false);
    expect(summary.contingencyReserve).toBe(70000); // 7%
  });

  it('strictly throws an error on negative expenses according to financial safety rules', () => {
    const totalBudget = 500000;
    const allocations: BudgetCategoryAllocation[] = [
      { category: 'Venue', percentage: 100, allocatedAmount: 500000 },
    ];
    const negativeExpense: ExpenseItem = {
      id: 'bad',
      name: 'Invalid Item',
      category: 'Venue',
      estimatedCost: -1000,
      actualCost: 0,
      paidAmount: 0,
      paymentStatus: 'Unpaid',
    };

    expect(() =>
      calculateBudgetSummary(totalBudget, allocations, [negativeExpense])
    ).toThrow('Negative expense detected');
  });

  it('correctly calculates across various budget scales (₹15L, ₹5L, ₹1L)', () => {
    const defaultAllocations = INITIAL_WEDDING_ALLOCATIONS;

    // Scale 1: 15 Lakhs
    const alloc15L: BudgetCategoryAllocation[] = defaultAllocations.map((a) => ({
      category: a.category,
      percentage: a.percentage,
      allocatedAmount: Math.round((1500000 * a.percentage) / 100),
    }));
    const summary15L = calculateBudgetSummary(1500000, alloc15L, []);
    expect(summary15L.totalBudget).toBe(1500000);
    expect(summary15L.contingencyReserve).toBe(105000); // 7% of 15L

    // Scale 2: 5 Lakhs
    const alloc5L: BudgetCategoryAllocation[] = defaultAllocations.map((a) => ({
      category: a.category,
      percentage: a.percentage,
      allocatedAmount: Math.round((500000 * a.percentage) / 100),
    }));
    const summary5L = calculateBudgetSummary(500000, alloc5L, []);
    expect(summary5L.totalBudget).toBe(500000);
    expect(summary5L.contingencyReserve).toBe(35000); // 7% of 5L

    // Scale 3: 1 Lakh
    const alloc1L: BudgetCategoryAllocation[] = defaultAllocations.map((a) => ({
      category: a.category,
      percentage: a.percentage,
      allocatedAmount: Math.round((100000 * a.percentage) / 100),
    }));
    const summary1L = calculateBudgetSummary(100000, alloc1L, []);
    expect(summary1L.totalBudget).toBe(100000);
    expect(summary1L.contingencyReserve).toBe(7000); // 7% of 1L
  });

  it('handles zero budget safely without division-by-zero or NaN errors', () => {
    const allocations: BudgetCategoryAllocation[] = [
      { category: 'Venue', percentage: 100, allocatedAmount: 0 },
    ];
    const summary = calculateBudgetSummary(0, allocations, []);
    expect(summary.totalBudget).toBe(0);
    expect(summary.remainingActualBudget).toBe(0);
    expect(summary.variancePercent).toBe(0);
    expect(summary.contingencyReserve).toBe(0);
  });

  it('accurately detects when expenses exceed approved budget', () => {
    const totalBudget = 500000;
    const allocations: BudgetCategoryAllocation[] = [
      { category: 'Venue', percentage: 100, allocatedAmount: 500000 },
    ];
    const overExpenses: ExpenseItem[] = [
      {
        id: 'e1',
        name: 'Luxury Venue Package',
        category: 'Venue',
        estimatedCost: 600000,
        actualCost: 650000,
        paidAmount: 200000,
        paymentStatus: 'Advance Paid',
      },
    ];

    const summary = calculateBudgetSummary(totalBudget, allocations, overExpenses);
    expect(summary.isOverBudget).toBe(true);
    expect(summary.remainingActualBudget).toBe(-150000);
    expect(summary.variance).toBe(-150000);
    expect(summary.costSavingRecommendations.some((r) => r.includes('exceeds budget'))).toBe(true);
  });

  it('simulates what-if scenarios accurately for budget reductions and increases', () => {
    const allocations: BudgetCategoryAllocation[] = [
      { category: 'Venue', percentage: 40, allocatedAmount: 400000 },
      { category: 'Catering', percentage: 60, allocatedAmount: 600000 },
    ];
    const expenses: ExpenseItem[] = [
      {
        id: '1',
        name: 'Venue',
        category: 'Venue',
        estimatedCost: 350000,
        actualCost: 350000,
        paidAmount: 350000,
        paymentStatus: 'Fully Paid',
      },
    ];

    // Budget reduction simulation (e.g. 10L -> 300k, resulting in deficit vs 350k expense)
    const simReduced = simulateBudget(300000, allocations, expenses);
    expect(simReduced.simulatedBudget).toBe(300000);
    expect(simReduced.projectedDeficitOrSurplus).toBe(-50000);
    expect(simReduced.feasibilityRating).toBe('High Deficit Risk');

    // Budget increase simulation (e.g. 10L -> 15L)
    const simIncreased = simulateBudget(1500000, allocations, expenses);
    expect(simIncreased.simulatedBudget).toBe(1500000);
    expect(simIncreased.projectedDeficitOrSurplus).toBe(1150000);
    expect(simIncreased.feasibilityRating).toBe('Highly Feasible');
  });
});
