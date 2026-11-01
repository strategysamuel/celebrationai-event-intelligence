import React from 'react';
import {
  Calendar,
  IndianRupee,
  DollarSign,
  AlertOctagon,
  CheckCircle2,
  Users,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { EventPlan } from '../../types';
import { calculateBudgetSummary } from '../../domain/budgetEngine';
import { analyzeTimelineHealth } from '../../domain/timelineEngine';
import { calculateEventReadinessScore } from '../../domain/executionEngine';
import { NavSection } from '../Sidebar';

interface DashboardViewProps {
  activeEvent: EventPlan;
  allEvents: EventPlan[];
  onNavigate: (section: NavSection) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeEvent,
  allEvents,
  onNavigate,
}) => {
  const budgetSummary = calculateBudgetSummary(
    activeEvent.totalBudget,
    activeEvent.budgetAllocations,
    activeEvent.expenses
  );

  const timelineHealth = analyzeTimelineHealth(activeEvent.tasks);
  const readiness = calculateEventReadinessScore(activeEvent);

  // Vendor statistics
  const totalVendors = activeEvent.vendors.length;
  const confirmedVendors = activeEvent.vendors.filter((v) => v.status === 'Confirmed').length;
  const pendingVendors = totalVendors - confirmedVendors;

  // Critical Risks
  const criticalRisks = activeEvent.risks.filter(
    (r) => r.severity === 'Critical' || r.severity === 'High'
  );

  // Upcoming milestones
  const upcomingMilestones = [...activeEvent.milestones]
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
    .slice(0, 4);

  // Format currency symbol
  const formatCurrency = (amount: number) => {
    const symbol =
      activeEvent.currency === 'INR'
        ? '₹'
        : activeEvent.currency === 'USD'
        ? '$'
        : activeEvent.currency === 'EUR'
        ? '€'
        : '£';
    return `${symbol}${amount.toLocaleString()}`;
  };

  // Color mapping for category breakdown
  const categoryColors = [
    'bg-blue-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-purple-500',
    'bg-emerald-500',
    'bg-slate-400',
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner & AI Insights Pill */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {activeEvent.type} Execution Hub
              </span>
              <span className="text-xs text-slate-400">
                Scheduled for {activeEvent.eventDate} ({activeEvent.location})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {activeEvent.name}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {activeEvent.userPreferences ||
                'AI-monitored event blueprint tracking budget allocations, critical vendor contracts, and countdown milestones.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('copilot')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch AI Copilot</span>
            </button>
            <button
              onClick={() => onNavigate('replanning')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <span>Dynamic Replan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* AI Insight Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-teal-300 font-semibold">AI Copilot Strategic Intelligence:</strong>{' '}
            {budgetSummary.isOverBudget
              ? 'Warning: Actual expenditures currently exceed total plan allocation. Rebalance allocations in Budget Intelligence or trigger the Dynamic Replanning module.'
              : `${activeEvent.guestCount} guests projected. Budget utilization is optimal at ${Math.round(
                  (budgetSummary.totalActualExpenses / (budgetSummary.totalBudget || 1)) * 100
                )}%. Key venue and catering milestones are within designated safety thresholds.`}
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Planned Budget */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Planned Budget</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {formatCurrency(budgetSummary.totalBudget)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Contingency:</span>
            <span className="font-semibold text-slate-700">
              {formatCurrency(budgetSummary.contingencyReserve)}
            </span>
          </div>
        </div>

        {/* Actual Expenses */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Committed Spent</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {formatCurrency(budgetSummary.totalActualExpenses)}
          </div>
          <div className="text-[11px] mt-1 font-medium">
            <span
              className={
                budgetSummary.isOverBudget ? 'text-rose-600 font-semibold' : 'text-teal-600 font-semibold'
              }
            >
              {Math.round(
                (budgetSummary.totalActualExpenses / (budgetSummary.totalBudget || 1)) * 100
              )}
              % of budget committed
            </span>
          </div>
        </div>

        {/* Remaining Balance */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Remaining Buffer</span>
            <div
              className={`p-2 rounded-lg ${
                budgetSummary.remainingActualBudget >= 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold ${
              budgetSummary.remainingActualBudget >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {formatCurrency(budgetSummary.remainingActualBudget)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Paid: <span className="font-semibold">{formatCurrency(budgetSummary.totalPaid)}</span>
          </div>
        </div>

        {/* Execution Readiness Score */}
        <div
          onClick={() => onNavigate('execution')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Readiness Score</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {readiness.score}%
          </div>
          <div className="text-[11px] font-semibold text-emerald-700 mt-1">
            {readiness.label}
          </div>
        </div>

        {/* Task Completion */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Task Progress</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {timelineHealth.completionPercent}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {timelineHealth.completedTasks} of {timelineHealth.totalTasks} completed
          </div>
        </div>
      </div>

      {/* Secondary Status Row: Critical Alerts, Vendors, Milestones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Risk Alerts Box */}
        <div
          onClick={() => onNavigate('risks')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-slate-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert
                className={`w-4 h-4 ${
                  criticalRisks.length > 0 ? 'text-rose-500' : 'text-emerald-500'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Risk Engine Alerts
              </span>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                criticalRisks.length > 0
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {criticalRisks.length} Critical / High
            </span>
          </div>

          {criticalRisks.length > 0 ? (
            <div className="space-y-2">
              {criticalRisks.slice(0, 2).map((r) => (
                <div
                  key={r.id}
                  className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-100 text-xs"
                >
                  <p className="font-semibold text-rose-900 truncate">{r.title}</p>
                  <p className="text-[11px] text-rose-700 mt-0.5 line-clamp-1">{r.recommendedAction}</p>
                </div>
              ))}
              <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 pt-1">
                <span>View all {activeEvent.risks.length} identified risks</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          ) : (
            <div className="p-4 text-center rounded-lg bg-slate-50 border border-dashed border-slate-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
              <p className="text-xs font-medium text-slate-700">No Critical Risks</p>
              <p className="text-[11px] text-slate-500">All rules passing verification</p>
            </div>
          )}
        </div>

        {/* Vendors Status Box */}
        <div
          onClick={() => onNavigate('vendors')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-slate-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Vendor Status
              </span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full">
              {confirmedVendors}/{totalVendors} Locked
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-600">Pending Confirmations:</span>
              <span className="font-bold text-amber-600">{pendingVendors} vendors</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
              <span className="text-slate-600">Preferred Candidates:</span>
              <span className="font-bold text-teal-600">
                {activeEvent.vendors.filter((v) => v.isPreferred).length} shortlisted
              </span>
            </div>
            <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 pt-1">
              <span>Explore vendor scores & comparisons</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Milestones Box */}
        <div
          onClick={() => onNavigate('timeline')}
          className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:border-slate-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Upcoming Milestones
              </span>
            </div>
            <span className="text-[11px] text-indigo-600 font-medium">
              {upcomingMilestones.length} gates
            </span>
          </div>

          <div className="space-y-1.5">
            {upcomingMilestones.slice(0, 3).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs border border-slate-100"
              >
                <span className="font-medium text-slate-800 truncate max-w-[150px]">
                  {m.title}
                </span>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {m.targetDate}
                </span>
              </div>
            ))}
            <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 pt-1">
              <span>View full backward schedule</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Visual Section: Budget Utilization Breakdown & Category Progress */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Budget Utilization & Allocation Spectrum
            </h2>
            <p className="text-xs text-slate-500">
              Deterministic allocation tracking across core event categories
            </p>
          </div>
          <button
            onClick={() => onNavigate('budget')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Open Budget Intelligence</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Visual Progress Bar representation */}
        <div className="mb-6">
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {budgetSummary.categoryBreakdown.map((cat, idx) => {
              const color = categoryColors[idx % categoryColors.length];
              return (
                <div
                  key={cat.category}
                  style={{ width: `${cat.percentage}%` }}
                  title={`${cat.category}: ${cat.percentage}% (${formatCurrency(cat.allocatedAmount)})`}
                  className={`${color} h-full transition-all hover:opacity-90 cursor-help`}
                />
              );
            })}
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            {budgetSummary.categoryBreakdown.map((cat, idx) => {
              const color = categoryColors[idx % categoryColors.length];
              return (
                <div
                  key={cat.category}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700"
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="font-semibold">{cat.category}</span>
                  <span className="text-slate-400 font-mono">
                    {cat.percentage}% ({formatCurrency(cat.allocatedAmount)})
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Allocation</th>
                <th className="py-2.5 px-3 text-right">Actual Cost</th>
                <th className="py-2.5 px-3 text-right">Paid Amount</th>
                <th className="py-2.5 px-3 text-right">Variance</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgetSummary.categoryBreakdown.map((cat) => {
                const isOver = cat.actualCost > cat.allocatedAmount;
                return (
                  <tr key={cat.category} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {cat.category}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatCurrency(cat.allocatedAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                      {formatCurrency(cat.actualCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(cat.paidAmount)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-semibold ${
                        isOver ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {isOver ? '-' : '+'}
                      {formatCurrency(Math.abs(cat.variance))}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isOver
                            ? 'bg-rose-100 text-rose-700'
                            : cat.actualCost > 0
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isOver ? 'Over Allocation' : cat.actualCost > 0 ? 'Active' : 'Uncommitted'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
