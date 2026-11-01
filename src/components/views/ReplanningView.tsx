import React, { useState } from 'react';
import {
  ArrowRightLeft,
  DollarSign,
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { EventPlan, ReplanningImpact, ReplanningRequest } from '../../types';
import { apiClient } from '../../services/apiClient';

interface ReplanningViewProps {
  activeEvent: EventPlan;
  onApplyPlan: (plan: EventPlan) => void;
}

export const ReplanningView: React.FC<ReplanningViewProps> = ({
  activeEvent,
  onApplyPlan,
}) => {
  // Input fields for scenario
  const [newBudget, setNewBudget] = useState<number>(activeEvent.totalBudget);
  const [newEventDate, setNewEventDate] = useState<string>(activeEvent.eventDate);
  const [newGuestCount, setNewGuestCount] = useState<number>(activeEvent.guestCount);
  const [preservedPrioritiesText, setPreservedPrioritiesText] = useState<string>(
    activeEvent.priorityConsiderations || 'Food & Catering, Candid Photography'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [replanningImpact, setReplanningImpact] = useState<ReplanningImpact | null>(null);

  const formatCurrency = (amt: number) => {
    const sym =
      activeEvent.currency === 'INR'
        ? '₹'
        : activeEvent.currency === 'USD'
        ? '$'
        : activeEvent.currency === 'EUR'
        ? '€'
        : '£';
    return `${sym}${amt.toLocaleString()}`;
  };

  const handleSimulateReplan = async () => {
    setIsLoading(true);
    try {
      const preservedList = preservedPrioritiesText
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const request: ReplanningRequest = {
        eventId: activeEvent.id,
        newBudget,
        newEventDate,
        newGuestCount,
        preservedPriorities: preservedList,
      };

      const impact = await apiClient.dynamicReplan(activeEvent, request);
      setReplanningImpact(impact);
    } catch (err: any) {
      alert(err.message || 'Replanning calculation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAndApply = () => {
    if (!replanningImpact) return;
    if (
      confirm(
        'Confirming will update your active event plan with the recalculated budget allocations, vendor targets, and backward milestones. Proceed?'
      )
    ) {
      onApplyPlan(replanningImpact.proposedPlan);
      alert('Event plan has been dynamically updated with all replanned adjustments!');
    }
  };

  // Quick preset scenario loaders
  const loadScenarioBudgetCut = () => {
    // E.g. Rs. 15L -> 12L (20% reduction)
    const target = Math.round(activeEvent.totalBudget * 0.8);
    setNewBudget(target);
    setPreservedPrioritiesText('Catering, Photography');
  };

  const loadScenarioDatePostpone = () => {
    const d = new Date(activeEvent.eventDate);
    d.setDate(d.getDate() + 30);
    setNewEventDate(d.toISOString().split('T')[0]);
  };

  const loadScenarioGuestSurge = () => {
    setNewGuestCount(Math.round(activeEvent.guestCount * 1.25));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-teal-500/20 text-teal-800 border border-teal-500/30 uppercase tracking-wider">
              Core Differentiator
            </span>
            <span className="text-xs text-slate-500">Continuous Dynamic Adaptation</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Intelligent Dynamic Replanning Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Recompute financial allocations, renegotiate vendor targets, and absorb date shifts while safeguarding user priorities
          </p>
        </div>

        {/* Quick Scenario Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadScenarioBudgetCut}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition"
          >
            Scenario: -20% Budget Cut
          </button>
          <button
            onClick={loadScenarioDatePostpone}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition"
          >
            Scenario: +30 Days Shift
          </button>
          <button
            onClick={loadScenarioGuestSurge}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition"
          >
            Scenario: +25% Guests
          </button>
        </div>
      </div>

      {/* Input Parameters Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <span>Replanning Parameters & Priority Preservation</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {/* Target Budget */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              New Budget Target
            </label>
            <div className="relative">
              <input
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(Number(e.target.value))}
                min="10000"
                step="10000"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Current: {formatCurrency(activeEvent.totalBudget)}
            </span>
          </div>

          {/* Target Event Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              New Event Date
            </label>
            <input
              type="date"
              value={newEventDate}
              onChange={(e) => setNewEventDate(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Current: {activeEvent.eventDate}
            </span>
          </div>

          {/* Guest Count */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              New Guest Attendance
            </label>
            <input
              type="number"
              value={newGuestCount}
              onChange={(e) => setNewGuestCount(Number(e.target.value))}
              min="10"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Current: {activeEvent.guestCount} guests
            </span>
          </div>
        </div>

        {/* Protected Priorities */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Protected Priorities (Comma separated categories that CANNOT be compromised)
          </label>
          <input
            type="text"
            value={preservedPrioritiesText}
            onChange={(e) => setPreservedPrioritiesText(e.target.value)}
            placeholder="e.g., Catering, Photography"
            className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleSimulateReplan}
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Execute Dynamic Replanning & Generate Impact Diff</span>
        </button>
      </div>

      {/* Comparison & Impact Assessment */}
      {replanningImpact && (
        <div className="space-y-6">
          {/* Executive Explanation Banner */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                    Dynamic Rebalancing Rationale
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {replanningImpact.explanation}
                </p>
              </div>

              {/* Confirm & Adopt Button */}
              <button
                onClick={handleConfirmAndApply}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 shrink-0 transition cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm & Apply Proposal</span>
              </button>
            </div>
          </div>

          {/* Side-by-Side Before vs After Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wide block mb-3 w-fit">
                Current Active Plan (Baseline)
              </span>

              <div className="space-y-2 text-xs mb-4">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Budget:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {formatCurrency(activeEvent.totalBudget)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Event Date:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {activeEvent.eventDate}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Guest Count:</span>
                  <span className="font-bold text-slate-800">
                    {activeEvent.guestCount} Attendees
                  </span>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">
                Category Allocations (Baseline)
              </h4>
              <div className="space-y-1.5 text-[11px]">
                {activeEvent.budgetAllocations.map((a) => (
                  <div key={a.category} className="flex justify-between text-slate-600">
                    <span>{a.category} ({a.percentage}%):</span>
                    <span className="font-mono text-slate-800">
                      {formatCurrency(a.allocatedAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* After (Proposed) Card */}
            <div className="bg-white rounded-2xl border-2 border-teal-500/60 p-5 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-800 uppercase tracking-wide">
                  Proposed Replanned Architecture
                </span>
                <span
                  className={`text-xs font-bold font-mono ${
                    replanningImpact.budgetVariance < 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {replanningImpact.budgetVariance < 0 ? '' : '+'}
                  {formatCurrency(replanningImpact.budgetVariance)} (
                  {replanningImpact.budgetChangePercent}%)
                </span>
              </div>

              <div className="space-y-2 text-xs mb-4">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Replanned Budget:</span>
                  <span className="font-bold text-teal-800 font-mono">
                    {formatCurrency(replanningImpact.proposedPlan.totalBudget)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Recalibrated Date:</span>
                  <span className="font-bold text-teal-800 font-mono">
                    {replanningImpact.proposedPlan.eventDate}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Adjusted Headcount:</span>
                  <span className="font-bold text-teal-800">
                    {replanningImpact.proposedPlan.guestCount} Attendees
                  </span>
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">
                Rebalanced Allocations
              </h4>
              <div className="space-y-1.5 text-[11px]">
                {replanningImpact.proposedPlan.budgetAllocations.map((a) => (
                  <div key={a.category} className="flex justify-between text-slate-600">
                    <span>{a.category} ({a.percentage}%):</span>
                    <span className="font-mono font-bold text-teal-900">
                      {formatCurrency(a.allocatedAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Affected Vendors Renegotiation Targets */}
          {replanningImpact.affectedVendors.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Affected Vendors & Value-Engineering Targets
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Specific contract renegotiation targets to absorb financial adjustments without quality collapse
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {replanningImpact.affectedVendors.map((av) => (
                  <div
                    key={av.vendorId}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-800">{av.vendorName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                        {av.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 my-2 font-mono">
                      <span className="line-through text-slate-400">
                        {formatCurrency(av.currentQuoted)}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-teal-700 font-bold">
                        Target: {formatCurrency(av.recommendedTarget)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-1">{av.actionRequired}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Cost Optimizations */}
          {replanningImpact.recommendedOptimizations.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-3">
                Recommended Strategic Optimizations
              </h3>
              <ul className="space-y-2 text-xs text-slate-700">
                {replanningImpact.recommendedOptimizations.map((opt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                    <span>{opt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
