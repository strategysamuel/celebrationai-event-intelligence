/**
 * Deterministic Financial & Budget Calculation Engine
 * CelebrationAI - Event Intelligence Copilot
 */

import { BudgetCategoryAllocation, ExpenseItem, VendorCategory } from '../types';

export const DEFAULT_ALLOCATION_PERCENTAGES: Record<VendorCategory, number> = {
  Venue: 20,
  Catering: 30,
  Decoration: 15,
  Photography: 10,
  Entertainment: 8,
  Accommodation: 4,
  Transport: 3,
  Miscellaneous: 3,
  // Note: 4 + 3 = 7% (Accommodation & Transport), Contingency handled as separate pool (7%)
};

// Standard wedding allocation model defined in specification:
// Venue: 20%, Catering: 30%, Decoration: 15%, Photography: 10%, Entertainment: 8%,
// Accommodation and transport: 7% (Transport 3% + Accommodation 4%), Miscellaneous: 3%, Contingency: 7%
export const INITIAL_WEDDING_ALLOCATIONS: { category: VendorCategory; percentage: number }[] = [
  { category: 'Venue', percentage: 20 },
  { category: 'Catering', percentage: 30 },
  { category: 'Decoration', percentage: 15 },
  { category: 'Photography', percentage: 10 },
  { category: 'Entertainment', percentage: 8 },
  { category: 'Accommodation', percentage: 4 },
  { category: 'Transport', percentage: 3 },
  { category: 'Miscellaneous', percentage: 10 }, // 3% misc + 7% contingency reserve
];

export interface BudgetSummary {
  totalBudget: number;
  totalEstimatedExpenses: number;
  totalActualExpenses: number;
  totalPaid: number;
  remainingActualBudget: number;
  remainingEstimatedBudget: number;
  variance: number; // totalBudget - totalActualExpenses
  variancePercent: number;
  isOverBudget: boolean;
  categoryBreakdown: {
    category: VendorCategory;
    allocatedAmount: number;
    percentage: number;
    estimatedCost: number;
    actualCost: number;
    paidAmount: number;
    variance: number;
    utilizationPercent: number;
  }[];
  contingencyReserve: number;
  costSavingRecommendations: string[];
}

/**
 * Validates that allocations sum up to exactly 100%
 */
export function validateAllocations(allocations: BudgetCategoryAllocation[]): {
  isValid: boolean;
  totalPercentage: number;
  error?: string;
} {
  const sum = Math.round(allocations.reduce((acc, curr) => acc + curr.percentage, 0) * 100) / 100;
  if (Math.abs(sum - 100) > 0.01) {
    return {
      isValid: false,
      totalPercentage: sum,
      error: `Category allocations sum to ${sum}%, but must equal exactly 100%.`,
    };
  }
  return { isValid: true, totalPercentage: 100 };
}

/**
 * Calculates deterministic budget summary with robust decimal rounding
 */
export function calculateBudgetSummary(
  totalBudget: number,
  allocations: BudgetCategoryAllocation[],
  expenses: ExpenseItem[]
): BudgetSummary {
  const safeBudget = Math.max(0, Math.round(totalBudget));

  // Validate negative expenses
  for (const exp of expenses) {
    if (exp.estimatedCost < 0 || exp.actualCost < 0 || exp.paidAmount < 0) {
      throw new Error(`Negative expense detected in item '${exp.name}'. Expenses cannot be negative.`);
    }
  }

  let totalEstimated = 0;
  let totalActual = 0;
  let totalPaid = 0;

  const categoryMap = new Map<
    VendorCategory,
    { allocated: number; percentage: number; estimated: number; actual: number; paid: number }
  >();

  allocations.forEach((alloc) => {
    const allocatedAmt = Math.round((safeBudget * alloc.percentage) / 100);
    categoryMap.set(alloc.category, {
      allocated: allocatedAmt,
      percentage: alloc.percentage,
      estimated: 0,
      actual: 0,
      paid: 0,
    });
  });

  expenses.forEach((exp) => {
    totalEstimated += exp.estimatedCost;
    totalActual += exp.actualCost > 0 ? exp.actualCost : exp.estimatedCost;
    totalPaid += exp.paidAmount;

    const existing = categoryMap.get(exp.category);
    if (existing) {
      existing.estimated += exp.estimatedCost;
      existing.actual += exp.actualCost > 0 ? exp.actualCost : exp.estimatedCost;
      existing.paid += exp.paidAmount;
    }
  });

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, val]) => {
    const variance = val.allocated - val.actual;
    const utilizationPercent =
      val.allocated > 0 ? Math.round((val.actual / val.allocated) * 1000) / 10 : 0;
    return {
      category,
      allocatedAmount: val.allocated,
      percentage: val.percentage,
      estimatedCost: val.estimated,
      actualCost: val.actual,
      paidAmount: val.paid,
      variance,
      utilizationPercent,
    };
  });

  const remainingActualBudget = safeBudget - totalActual;
  const remainingEstimatedBudget = safeBudget - totalEstimated;
  const variance = safeBudget - totalActual;
  const variancePercent =
    safeBudget > 0 ? Math.round(((totalActual - safeBudget) / safeBudget) * 1000) / 10 : 0;

  // Contingency reserve: 7% default of safeBudget
  const contingencyReserve = Math.round(safeBudget * 0.07);

  // Cost-saving recommendations based on utilization
  const recommendations: string[] = [];
  categoryBreakdown.forEach((cat) => {
    if (cat.actualCost > cat.allocatedAmount && cat.allocatedAmount > 0) {
      const overBy = cat.actualCost - cat.allocatedAmount;
      recommendations.push(
        `Category '${cat.category}' exceeds allocation by ${overBy.toLocaleString()}. Consider negotiating vendor packages or reducing ancillary options.`
      );
    }
  });

  if (totalActual > safeBudget) {
    recommendations.push(
      `Total expenditure exceeds budget by ${(totalActual - safeBudget).toLocaleString()}. Consider reallocating from contingency or lower-priority line items.`
    );
  } else if (remainingActualBudget > 0 && remainingActualBudget < safeBudget * 0.05) {
    recommendations.push(
      'Buffer is running low (<5% remaining). Review uncommitted vendor add-ons before locking final contracts.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Healthy budget distribution: All key categories are currently tracking within their designated boundaries.'
    );
  }

  return {
    totalBudget: safeBudget,
    totalEstimatedExpenses: totalEstimated,
    totalActualExpenses: totalActual,
    totalPaid,
    remainingActualBudget,
    remainingEstimatedBudget,
    variance,
    variancePercent,
    isOverBudget: totalActual > safeBudget,
    categoryBreakdown,
    contingencyReserve,
    costSavingRecommendations: recommendations,
  };
}

/**
 * What-If Budget Simulation:
 * Simulates the impact of varying total budget or specific category allocations
 */
export function simulateBudget(
  simulatedTotalBudget: number,
  currentAllocations: BudgetCategoryAllocation[],
  currentExpenses: ExpenseItem[]
): {
  simulatedBudget: number;
  simulatedAllocations: { category: VendorCategory; newAllocated: number; diffFromCurrent: number }[];
  projectedDeficitOrSurplus: number;
  feasibilityRating: 'Highly Feasible' | 'Tight Buffer' | 'High Deficit Risk';
  recommendations: string[];
} {
  const currentTotal = currentExpenses.reduce(
    (sum, e) => sum + (e.actualCost > 0 ? e.actualCost : e.estimatedCost),
    0
  );
  const projectedDeficitOrSurplus = simulatedTotalBudget - currentTotal;

  const simulatedAllocations = currentAllocations.map((alloc) => {
    const newAllocated = Math.round((simulatedTotalBudget * alloc.percentage) / 100);
    const oldAllocated = alloc.allocatedAmount;
    return {
      category: alloc.category,
      newAllocated,
      diffFromCurrent: newAllocated - oldAllocated,
    };
  });

  let feasibilityRating: 'Highly Feasible' | 'Tight Buffer' | 'High Deficit Risk' = 'Highly Feasible';
  const recommendations: string[] = [];

  if (projectedDeficitOrSurplus < 0) {
    feasibilityRating = 'High Deficit Risk';
    recommendations.push(
      `Projected deficit of ${Math.abs(projectedDeficitOrSurplus).toLocaleString()}. Category trims of at least ${Math.round((Math.abs(projectedDeficitOrSurplus) / simulatedTotalBudget) * 100)}% will be necessary.`
    );
    recommendations.push(
      'Consider renegotiating photography hours, opting for a seasonal floral arrangement, or limiting open-bar duration.'
    );
  } else if (projectedDeficitOrSurplus < simulatedTotalBudget * 0.1) {
    feasibilityRating = 'Tight Buffer';
    recommendations.push(
      'Tight contingency margin (<10%). Lock in contract fixed rates early to avoid unpredicted peak-season surcharges.'
    );
  } else {
    feasibilityRating = 'Highly Feasible';
    recommendations.push(
      `Comfortable surplus buffer of ${projectedDeficitOrSurplus.toLocaleString()} available for premium upgrades or guest experience enhancements.`
    );
  }

  return {
    simulatedBudget: simulatedTotalBudget,
    simulatedAllocations,
    projectedDeficitOrSurplus,
    feasibilityRating,
    recommendations,
  };
}
