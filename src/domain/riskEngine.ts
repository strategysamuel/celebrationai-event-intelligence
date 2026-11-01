/**
 * Rule-Based Event Risk Intelligence Engine
 *
 * Deterministically evaluates:
 * 1. Budget Overruns
 * 2. Unconfirmed Critical Vendors
 * 3. Delayed / Overdue Tasks
 * 4. Incomplete Dependencies
 * 5. Insufficient Preparation Time
 * 6. Guest Capacity & Scale Risks
 * 7. Missing Contingency Arrangements
 */

import { EventPlan, RiskAlert, RiskCategory, RiskSeverity } from '../types';

export function evaluateEventRisks(plan: EventPlan): RiskAlert[] {
  const risks: RiskAlert[] = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const eventDate = new Date(plan.eventDate);
  const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // 1. Budget Overruns Check
  const totalActual = plan.expenses.reduce(
    (sum, e) => sum + (e.actualCost > 0 ? e.actualCost : e.estimatedCost),
    0
  );

  if (totalActual > plan.totalBudget && plan.totalBudget > 0) {
    const overrunAmt = totalActual - plan.totalBudget;
    risks.push({
      id: 'risk-budget-overrun',
      category: 'Budget',
      severity: 'Critical',
      title: 'Overall Budget Overrun Detected',
      explanation: `Total planned and actual commitments (${plan.currency} ${totalActual.toLocaleString()}) exceed the allocated budget (${plan.currency} ${plan.totalBudget.toLocaleString()}) by ${plan.currency} ${overrunAmt.toLocaleString()}.`,
      recommendedAction:
        'Initiate the Dynamic Replanning module to adjust allocations, apply cost-saving trims to non-essential categories, or inject supplemental reserve funds.',
      status: 'Open',
      detectedAt: todayStr,
      source: 'Rule Engine',
    });
  }

  // Category specific overrun check
  plan.budgetAllocations.forEach((alloc) => {
    const catExpenses = plan.expenses
      .filter((e) => e.category === alloc.category)
      .reduce((sum, e) => sum + (e.actualCost > 0 ? e.actualCost : e.estimatedCost), 0);

    if (alloc.allocatedAmount > 0 && catExpenses > alloc.allocatedAmount * 1.25) {
      const overBy = catExpenses - alloc.allocatedAmount;
      const categoryStr = String(alloc?.category || 'general');
      risks.push({
        id: `risk-cat-overrun-${categoryStr.toLowerCase()}`,
        category: 'Budget',
        severity: 'High',
        title: `Category Budget Exceeded: ${categoryStr}`,
        explanation: `${categoryStr} commitments (${plan.currency} ${catExpenses.toLocaleString()}) exceed the allocated allowance (${plan.currency} ${alloc.allocatedAmount.toLocaleString()}) by ${plan.currency} ${overBy.toLocaleString()} (>125%).`,
        recommendedAction: `Renegotiate ${categoryStr.toLowerCase()} contract scope, compare alternative secondary vendors, or transfer surplus from under-utilized categories.`,
        status: 'Open',
        detectedAt: todayStr,
        source: 'Rule Engine',
      });
    }
  });

  // 2. Unconfirmed Critical Vendors Check
  const criticalCategories = ['Venue', 'Catering'];
  criticalCategories.forEach((cat) => {
    const confirmedVendor = plan.vendors.find(
      (v) => v.category === cat && v.status === 'Confirmed'
    );
    if (!confirmedVendor) {
      const severity: RiskSeverity = daysUntilEvent < 60 ? 'Critical' : 'High';
      risks.push({
        id: `risk-unconfirmed-${cat.toLowerCase()}`,
        category: 'Vendor',
        severity,
        title: `Critical Vendor Unlocked: ${cat}`,
        explanation: `No confirmed booking contract exists for ${cat}. With ${daysUntilEvent} days remaining, peak availability is rapidly closing.`,
        recommendedAction: `Review scored candidates in Vendor Intelligence and secure date reservation deposit immediately to avoid venue/catering loss.`,
        status: 'Open',
        detectedAt: todayStr,
        source: 'Rule Engine',
      });
    }
  });

  // 3. Delayed / Overdue Tasks Check
  const overdueTasks = plan.tasks.filter(
    (t) => t.status !== 'Completed' && new Date(t.dueDate).getTime() < now.getTime()
  );

  if (overdueTasks.length > 0) {
    const criticalOverdue = overdueTasks.filter((t) => t.isCriticalPath || t.priority === 'High');
    risks.push({
      id: 'risk-overdue-tasks',
      category: 'Timeline',
      severity: criticalOverdue.length > 0 ? 'High' : 'Medium',
      title: `${overdueTasks.length} Execution Task(s) Past Due Date`,
      explanation: `${overdueTasks.length} task(s) missed their scheduled milestone deadline (${criticalOverdue.length} critical path items). This risks downstream delivery bottlenecks.`,
      recommendedAction:
        'Reassign pending task owners or trigger Timeline backward rescheduling to absorb delays into upcoming buffer days.',
      status: 'Open',
      detectedAt: todayStr,
      source: 'Rule Engine',
    });
  }

  // 4. Incomplete Dependencies Check
  const taskMap = new Map(plan.tasks.map((t) => [t.id, t]));
  let blockedDependencyCount = 0;

  plan.tasks.forEach((t) => {
    if (t.status !== 'Completed' && t.dependencies && t.dependencies.length > 0) {
      const hasUnresolved = t.dependencies.some((depId) => {
        const dep = taskMap.get(depId);
        return dep && dep.status !== 'Completed';
      });
      if (hasUnresolved) blockedDependencyCount++;
    }
  });

  if (blockedDependencyCount > 2) {
    risks.push({
      id: 'risk-dependency-bottleneck',
      category: 'Timeline',
      severity: 'Medium',
      title: 'Workflow Dependency Bottlenecks Detected',
      explanation: `${blockedDependencyCount} active tasks are currently blocked awaiting completion of prerequisite foundational tasks.`,
      recommendedAction:
        'Expedite unblocking of prerequisite tasks in the Timeline Manager to prevent chain-reaction delays across milestone gates.',
      status: 'Open',
      detectedAt: todayStr,
      source: 'Rule Engine',
    });
  }

  // 5. Insufficient Preparation Time Check
  const completedTasks = plan.tasks.filter((t) => t.status === 'Completed').length;
  const taskProgress = plan.tasks.length > 0 ? (completedTasks / plan.tasks.length) * 100 : 0;

  if (daysUntilEvent > 0 && daysUntilEvent < 30 && taskProgress < 50) {
    risks.push({
      id: 'risk-insufficient-prep-time',
      category: 'Capacity',
      severity: 'Critical',
      title: 'Severe Time Compression Risk',
      explanation: `Only ${daysUntilEvent} days remain until the event, but only ${Math.round(taskProgress)}% of scheduled preparation tasks have been finalized.`,
      recommendedAction:
        'Engage an on-ground day-of event coordinator, fast-track vendor sign-offs, and prune non-critical custom decor items.',
      status: 'Open',
      detectedAt: todayStr,
      source: 'Rule Engine',
    });
  }

  // 6. Guest Capacity & Scale Risks
  if (plan.guestCount > 250) {
    const transportVendor = plan.vendors.find((v) => v.category === 'Transport');
    if (!transportVendor || transportVendor.status === 'Inquiry') {
      risks.push({
        id: 'risk-guest-scale-logistics',
        category: 'Logistics',
        severity: 'Medium',
        title: 'High-Density Guest Logistics Advisory',
        explanation: `With a guest attendance of ${plan.guestCount}, transit shuttle capacity and guest parking arrangements require formal confirmation.`,
        recommendedAction:
          'Validate parking valet capacity with venue and lock shuttle logistics in Vendor Intelligence.',
        status: 'Open',
        detectedAt: todayStr,
        source: 'Rule Engine',
      });
    }
  }

  // 7. Missing Contingency Arrangements Check
  const miscOrContingency = plan.budgetAllocations.find(
    (a) => a.category === 'Miscellaneous'
  );
  if (!miscOrContingency || miscOrContingency.percentage < 5) {
    risks.push({
      id: 'risk-missing-contingency',
      category: 'Contingency',
      severity: 'High',
      title: 'Inadequate Financial Contingency Reserve',
      explanation:
        'Contingency reserve is below recommended standard (minimum 7% for live celebration logistics). Unforeseen weather shifts or guest surges will cause budget deficits.',
      recommendedAction:
        'Carve out at least 7% of total budget as an untouched emergency buffer in Budget Intelligence.',
      status: 'Open',
      detectedAt: todayStr,
      source: 'Rule Engine',
    });
  }

  return risks;
}
