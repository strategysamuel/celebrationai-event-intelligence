/**
 * Celebration Intelligence Module View (CAI-003)
 * CelebrationAI - Event Intelligence Copilot
 *
 * Provides Interactive What-If Simulation, 10-Parameter Impact Analysis,
 * Budget Intelligence, 3 Alternative Planning Strategies, Vendor & Timeline Impacts,
 * Risk Intelligence, and Controlled Replanning Approval Workflow.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Briefcase,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Sliders,
  Check,
  X,
  TrendingUp,
  AlertCircle,
  FileCheck,
  ShieldAlert,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  EventPlan,
  CelebrationIntelligenceReport,
  PlanningAlternativeOption,
  CelebrationIntelligenceRequest,
} from '../../types';
import { analyzeCelebrationIntelligence } from '../../domain/celebrationIntelligenceEngine';
import { apiClient } from '../../services/apiClient';
import { getModelAttributionBadge } from './CopilotView';

interface CelebrationIntelligenceViewProps {
  activeEvent: EventPlan;
  onApplyPlan: (plan: EventPlan) => void;
  geminiModel: string;
}

export const CelebrationIntelligenceView: React.FC<CelebrationIntelligenceViewProps> = ({
  activeEvent,
  onApplyPlan,
  geminiModel,
}) => {
  // Simulator Controls State
  const [guestCountInput, setGuestCountInput] = useState<number>(300);
  const [budgetInput, setBudgetInput] = useState<number>(activeEvent.totalBudget || 1500000);
  const [eventDateInput, setEventDateInput] = useState<string>(activeEvent.eventDate || '2027-02-15');
  const [preservedPriorities, setPreservedPriorities] = useState<string[]>(['Catering', 'Photography']);

  // Report & Loading State
  const [report, setReport] = useState<CelebrationIntelligenceReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<'option-1' | 'option-2' | 'option-3'>('option-1');

  // Approval Workflow Modal State
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'impact' | 'alternatives' | 'vendors' | 'timeline' | 'risks'>('impact');

  const lastAnalyzedRef = useRef({ guests: 0, budget: 0, date: '', prioritiesKey: '' });

  // Sync inputs when active event changes with strict clamping
  useEffect(() => {
    setGuestCountInput(Math.max(100, Math.min(1000, activeEvent.guestCount || 300)));
    setBudgetInput(Math.max(500000, Math.min(5000000, activeEvent.totalBudget || 1500000)));
    setEventDateInput(activeEvent.eventDate || '2027-02-15');
  }, [activeEvent.id]);

  // Debounced execution of analysis only when inputs actually change
  useEffect(() => {
    const prioritiesKey = [...preservedPriorities].sort().join(',');
    if (
      lastAnalyzedRef.current.guests === guestCountInput &&
      lastAnalyzedRef.current.budget === budgetInput &&
      lastAnalyzedRef.current.date === eventDateInput &&
      lastAnalyzedRef.current.prioritiesKey === prioritiesKey
    ) {
      return;
    }

    const timer = setTimeout(() => {
      lastAnalyzedRef.current = { guests: guestCountInput, budget: budgetInput, date: eventDateInput, prioritiesKey };
      runAnalysis(guestCountInput, budgetInput, eventDateInput, preservedPriorities);
    }, 300);

    return () => clearTimeout(timer);
  }, [guestCountInput, budgetInput, eventDateInput, preservedPriorities]);

  // Run Engine Analysis
  const runAnalysis = async (
    guests: number,
    budget: number,
    date: string,
    priorities: string[]
  ) => {
    setIsAnalyzing(true);
    const req: CelebrationIntelligenceRequest = {
      eventId: activeEvent.id,
      newGuestCount: guests,
      newBudget: budget,
      newEventDate: date,
      preservedPriorities: priorities,
    };

    try {
      const resReport = await apiClient.analyzeCelebrationIntelligence(activeEvent, req);
      setReport(resReport);
    } catch (err) {
      console.warn('Backend Intelligence call failed, running local deterministic fallback:', err);
      const localReport = analyzeCelebrationIntelligence(activeEvent, req);
      setReport(localReport);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Quick Action: Signature Benchmark (300 -> 450 guests @ 15L)
  const handleLoadSignatureBenchmark = () => {
    setGuestCountInput(450);
    setBudgetInput(1500000);
    setEventDateInput('2027-02-15');
    setPreservedPriorities(['Catering', 'Photography']);
  };

  // Priority Toggle
  const togglePriority = (category: string) => {
    const updated = preservedPriorities.includes(category)
      ? preservedPriorities.filter((p) => p !== category)
      : [...preservedPriorities, category];
    setPreservedPriorities(updated);
  };

  // Selected Alternative
  const selectedOption = report?.alternatives.find((a) => a.id === selectedAlternativeId) || report?.alternatives[0];

  // User Approval Execution
  const handleConfirmAndApply = () => {
    if (!selectedOption) return;
    onApplyPlan(selectedOption.proposedPlan);
    setShowApprovalModal(false);
    alert(`Successfully applied ${selectedOption.title} to your active event portfolio! All budget allocations and tasks have been updated.`);
  };

  const badgeMeta = report?.attributionMetadata
    ? getModelAttributionBadge(
        {
          source: report.attributionMetadata.source,
          requestedModel: report.attributionMetadata.requestedModel,
          actualModel: report.attributionMetadata.actualModel,
          isFallbackModel: report.attributionMetadata.isFallbackModel,
          modelVersion: report.attributionMetadata.modelVersion,
          fallbackType: report.attributionMetadata.fallbackType,
        },
        geminiModel
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Top Title Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Celebration Intelligence Engine</h1>
              <span className="bg-teal-500/20 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/30">
                CAI-003 Decision Support
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Simulate requirement changes, calculate 10-point operational impacts, and evaluate 3 alternative planning strategies.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {badgeMeta && (
            <span
              title={badgeMeta.tooltip}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
                badgeMeta.variant === 'primary-ai'
                  ? 'bg-teal-950/60 text-teal-300 border-teal-800'
                  : badgeMeta.variant === 'fallback-ai'
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                  : badgeMeta.variant === 'unreported-ai'
                  ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {badgeMeta.variant === 'heuristic' ? '⚡' : '✨'} {badgeMeta.label}
            </span>
          )}

          <button
            onClick={handleLoadSignatureBenchmark}
            className="px-3.5 py-2 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Signature Benchmark (450 Guests @ ₹15L)</span>
          </button>
        </div>
      </div>

      {/* Interactive What-If Simulator Panel */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Sliders className="w-4 h-4 text-teal-600" />
            <span>Interactive What-If Event Simulator</span>
          </div>
          <span className="text-xs text-slate-500">
            Active Event: <strong className="text-slate-800">{activeEvent.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Guest Count Control */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" /> Guest Headcount
              </span>
              <span className="text-blue-600 font-bold">{guestCountInput} Guests</span>
            </label>
            <input
              type="range"
              min="100"
              max="1000"
              step="25"
              value={guestCountInput}
              onChange={(e) => {
                const val = Math.max(100, Math.min(1000, parseInt(e.target.value, 10) || 300));
                setGuestCountInput(val);
              }}
              className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <button
                onClick={() => setGuestCountInput(300)}
                className="hover:text-blue-600 cursor-pointer"
              >
                300 (Original)
              </button>
              <button
                onClick={() => setGuestCountInput(450)}
                className="text-teal-600 font-bold cursor-pointer"
              >
                450 (Benchmark)
              </button>
              <button
                onClick={() => setGuestCountInput(600)}
                className="hover:text-blue-600 cursor-pointer"
              >
                600
              </button>
            </div>
          </div>

          {/* Total Budget Control */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Approved Budget Ceiling
              </span>
              <span className="text-emerald-700 font-bold">₹{budgetInput.toLocaleString()}</span>
            </label>
            <input
              type="range"
              min="500000"
              max="5000000"
              step="50000"
              value={budgetInput}
              onChange={(e) => {
                const val = Math.max(500000, Math.min(5000000, parseInt(e.target.value, 10) || 1500000));
                setBudgetInput(val);
              }}
              className="w-full accent-emerald-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <button
                onClick={() => setBudgetInput(1500000)}
                className="text-emerald-700 font-bold cursor-pointer"
              >
                ₹15 Lakhs (Ceiling)
              </button>
              <button
                onClick={() => setBudgetInput(1875000)}
                className="hover:text-emerald-600 cursor-pointer"
              >
                ₹18.75 Lakhs
              </button>
            </div>
          </div>

          {/* Event Date Control */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-600" /> Event Target Date
            </label>
            <input
              type="date"
              value={eventDateInput}
              onChange={(e) => setEventDateInput(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[10px] text-slate-400">Date changes require explicit confirmation.</p>
          </div>
        </div>

        {/* Priority Protection Checkboxes */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-600">Preserved Priority Categories:</span>
          {['Catering', 'Venue', 'Decoration', 'Photography', 'Accommodation'].map((cat) => {
            const isChecked = preservedPriorities.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => togglePriority(cat)}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                  isChecked
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isChecked && <Check className="w-3 h-3 text-blue-600" />}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Analysis Display */}
      {isAnalyzing ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-800">Calculating Celebration Intelligence Impact...</p>
          <p className="text-xs text-slate-500">Evaluating 10 operational parameters, budget variance, and 3 alternatives.</p>
        </div>
      ) : report ? (
        <>
          {/* Executive Before vs After Comparison Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Guest Headcount</span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-extrabold text-slate-900">{report.originalPlan.guestCount} → {report.revisedPlan.guestCount}</span>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  +{report.revisedPlan.guestCount - report.originalPlan.guestCount} Guests
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                +{Math.round(((report.revisedPlan.guestCount - report.originalPlan.guestCount) / (report.originalPlan.guestCount || 1)) * 100)}% Headcount Escalation
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approved Budget Ceiling</span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-extrabold text-slate-900">₹{report.budgetSummary.approvedBudget.toLocaleString()}</span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Fixed Ceiling</span>
              </div>
              <p className="text-[10px] text-slate-500">Approved host expenditure cap</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Projected Unadjusted Cost</span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-extrabold text-slate-900">₹{report.budgetSummary.projectedExpenditure.toLocaleString()}</span>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">+25% Baseline</span>
              </div>
              <p className="text-[10px] text-slate-500">Unadjusted cost at original per-head standard</p>
            </div>

            <div className={`p-4 rounded-xl border shadow-xs space-y-1 ${
              report.budgetSummary.budgetShortfallOrSurplus < 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-emerald-50/50 border-emerald-200'
            }`}>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Budget Variance / Deficit</span>
              <div className="flex items-baseline justify-between">
                <span className={`text-lg font-extrabold ${
                  report.budgetSummary.budgetShortfallOrSurplus < 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {report.budgetSummary.budgetShortfallOrSurplus < 0 ? `-₹${Math.abs(report.budgetSummary.budgetShortfallOrSurplus).toLocaleString()}` : `+₹${report.budgetSummary.budgetShortfallOrSurplus.toLocaleString()}`}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  report.budgetSummary.budgetShortfallOrSurplus < 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {report.budgetSummary.budgetShortfallOrSurplus < 0 ? 'Shortfall Identified' : 'Balanced'}
                </span>
              </div>
              <p className="text-[10px] text-slate-600">
                Contingency Available: ₹{report.budgetSummary.contingencyAvailable.toLocaleString()}
              </p>
            </div>
          </div>

          {/* AI Narrative Briefing Box */}
          {report.aiNarrativeSummary && (
            <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Executive Event Intelligence Briefing
              </div>
              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {report.aiNarrativeSummary.executiveBriefing}
              </p>
              <div className="pt-2 border-t border-slate-800 text-xs text-amber-300 font-medium">
                👉 <strong>Strategic Recommendation:</strong> {report.aiNarrativeSummary.strategicRecommendation}
              </div>
            </div>
          )}

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200">
            {[
              { id: 'impact', label: '10-Point Impact Analysis' },
              { id: 'alternatives', label: '3 Alternative Strategies' },
              { id: 'vendors', label: 'Vendor Capacity Impact' },
              { id: 'timeline', label: 'Timeline & Tasks' },
              { id: 'risks', label: 'Risk Intelligence' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: 10-Point Impact Analysis Table */}
          {activeTab === 'impact' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Detailed 10-Parameter Operational & Financial Consequences
                </h3>
                <span className="text-xs text-slate-500">10 parameters evaluated</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-y border-slate-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Parameter / Category</th>
                      <th className="py-2.5 px-3">Original Value (300 Guests)</th>
                      <th className="py-2.5 px-3">Revised Value (450 Guests)</th>
                      <th className="py-2.5 px-3">Variance / Difference</th>
                      <th className="py-2.5 px-3">Operational Impact</th>
                      <th className="py-2.5 px-3">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.impactParameters.map((param) => (
                      <tr key={param.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-semibold text-slate-900">{param.parameterName}</td>
                        <td className="py-3 px-3 text-slate-600">{param.originalValue}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">{param.revisedValue}</td>
                        <td className="py-3 px-3 font-bold text-blue-700">{param.difference}</td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs">{param.impactSummary}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            param.severity === 'Critical'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : param.severity === 'High'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-50 text-blue-700'
                          }`}>
                            {param.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Three Alternative Strategies Cards */}
          {activeTab === 'alternatives' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Select a Strategic Replanning Option</h3>
                  <p className="text-xs text-slate-500">Three distinct options generated to rebalance requirements for 450 guests.</p>
                </div>
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Review Selected Strategy & Apply ({selectedOption?.title.split('–')[1]?.trim()})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {report.alternatives.map((option) => {
                  const isSelected = selectedAlternativeId === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() => setSelectedAlternativeId(option.id)}
                      className={`rounded-2xl p-5 border-2 transition cursor-pointer flex flex-col justify-between space-y-4 ${
                        isSelected
                          ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Header & Feasibility Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                              {option.id.toUpperCase()}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{option.title}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            option.isFeasibleWithinApprovedBudget
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {option.isFeasibleWithinApprovedBudget ? 'Feasible @ ₹15L' : 'Requires +₹3.75L'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 italic font-medium">{option.tagline}</p>

                        {/* Financial Summary */}
                        <div className="bg-slate-50 p-3 rounded-xl space-y-1 border border-slate-100">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Estimated Total Cost:</span>
                            <span className="font-bold text-slate-900">₹{option.totalEstimatedCost.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Budget Variance:</span>
                            <span className={`font-bold ${option.budgetVariance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {option.budgetVariance > 0 ? `+₹${option.budgetVariance.toLocaleString()}` : '₹0 (On Budget)'}
                            </span>
                          </div>
                        </div>

                        {/* Catering & Vendor Details */}
                        <div className="space-y-2 text-xs text-slate-700">
                          <div>
                            <strong className="text-slate-900">Catering Strategy:</strong>
                            <p className="text-slate-600 text-[11px] leading-relaxed mt-0.5">{option.cateringAndSeatingImpact}</p>
                          </div>
                          <div>
                            <strong className="text-slate-900">Vendor & Decor Impact:</strong>
                            <p className="text-slate-600 text-[11px] leading-relaxed mt-0.5">{option.vendorImpact}</p>
                          </div>
                        </div>

                        {/* Option 1 Audit Breakdown Table */}
                        {option.reallocationDetails && option.reallocationDetails.length > 0 && (
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">
                              Category Reallocation & Consequence Audit
                            </span>
                            <div className="space-y-1.5 text-[10px]">
                              {option.reallocationDetails.map((det) => (
                                <div key={det.category} className="p-1.5 bg-white rounded border border-slate-200/80 space-y-0.5">
                                  <div className="flex justify-between font-bold text-slate-800">
                                    <span>{det.category}</span>
                                    <span className={det.amountSavedOrAdded > 0 ? 'text-blue-700' : det.amountSavedOrAdded < 0 ? 'text-emerald-700' : 'text-slate-500'}>
                                      ₹{det.originalAllocation.toLocaleString()} → ₹{det.revisedAllocation.toLocaleString()} ({det.amountSavedOrAdded > 0 ? `+₹${det.amountSavedOrAdded.toLocaleString()}` : det.amountSavedOrAdded < 0 ? `-₹${Math.abs(det.amountSavedOrAdded).toLocaleString()}` : '₹0'})
                                    </span>
                                  </div>
                                  <p className="text-slate-600">⚙️ <strong>Ops:</strong> {det.operationalConsequence}</p>
                                  <p className="text-slate-600">✨ <strong>Guest:</strong> {det.guestExperienceConsequence}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Option 2 Unverified Assumptions Audit */}
                        {option.unverifiedAssumptions && option.unverifiedAssumptions.length > 0 && (
                          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200 space-y-1.5">
                            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-700" /> Unverified Logistics & Permit Assumptions
                            </span>
                            <ul className="list-disc list-inside text-[10px] text-amber-900 space-y-1">
                              {option.unverifiedAssumptions.map((ass, idx) => (
                                <li key={idx} className="leading-tight">{ass}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Option 3 Explicit Funding Gap Warning */}
                        {option.id === 'option-3' && (
                          <div className="bg-rose-50 rounded-xl p-3 border border-rose-200 space-y-1 text-rose-900">
                            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-600" /> Supplemental Host Funding Required
                            </span>
                            <p className="text-[11px] font-extrabold text-rose-700">
                              Funding Gap: +₹3,75,000 (Requires ₹18.75 Lakhs Total)
                            </p>
                            <p className="text-[10px] text-rose-800">
                              This premium option cannot be accommodated within the approved ₹15,00,000 ceiling. Requires an immediate +25% host capital injection.
                            </p>
                          </div>
                        )}

                        {/* Advantages & Disadvantages */}
                        <div className="space-y-2 text-[11px]">
                          <div>
                            <strong className="text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Advantages:
                            </strong>
                            <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                              {option.advantages.map((adv, idx) => (
                                <li key={idx}>{adv}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <strong className="text-rose-700 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-600" /> Trade-Offs / Risks:
                            </strong>
                            <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                              {option.disadvantages.map((dis, idx) => (
                                <li key={idx}>{dis}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlternativeId(option.id);
                          setShowApprovalModal(true);
                        }}
                        className={`w-full py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <span>{isSelected ? 'Selected Strategy' : 'Select Strategy'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Vendor Capacity Impact */}
          {activeTab === 'vendors' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" /> Vendor Intelligence Capacity Assessment
                </h3>
                <span className="text-xs text-slate-500">Synthetic vendors labelled as [DEMO DATA]</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-y border-slate-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Vendor Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Capacity Status</th>
                      <th className="py-2.5 px-3">Data Verification</th>
                      <th className="py-2.5 px-3">Contract Action Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.vendorCapacityImpacts.map((vendor) => (
                      <tr key={vendor.vendorId} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-bold text-slate-900">{vendor.vendorName}</td>
                        <td className="py-3 px-3 text-slate-600">{vendor.category}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            vendor.capacityStatus === 'Sufficient'
                              ? 'bg-emerald-100 text-emerald-800'
                              : vendor.capacityStatus === 'Capacity Exceeded'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {vendor.capacityStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] border border-slate-200">
                            {vendor.dataVerificationStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 max-w-sm">{vendor.actionRequired}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Timeline Task Impacts */}
          {activeTab === 'timeline' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Timeline Manager & Critical Task Shifts
              </h3>

              <div className="space-y-3">
                {report.timelineImpacts.map((item) => (
                  <div key={item.taskId} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'Reopened'
                            ? 'bg-amber-100 text-amber-800'
                            : item.status === 'New Task Added'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.status}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600">{item.reason}</p>
                    </div>

                    <div className="text-right shrink-0 text-xs">
                      <span className="text-slate-400">Target Due Date:</span>
                      <p className="font-bold text-slate-800">{item.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Risk Intelligence Assessment */}
          {activeTab === 'risks' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" /> Risk Intelligence Assessment
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.newRisksIdentified.map((risk) => (
                  <div key={risk.id} className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">{risk.category} RISK</span>
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                        {risk.severity} Severity
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{risk.title}</h4>
                    <p className="text-xs text-slate-600">{risk.explanation}</p>
                    <div className="pt-2 border-t border-rose-200/50 text-xs text-slate-700 font-medium">
                      💡 <strong>Mitigation:</strong> {risk.recommendedAction}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Controlled Replanning & User Approval Modal (Section 6) */}
      {showApprovalModal && selectedOption && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <span>Confirm Replanning Strategy & Apply</span>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <p className="text-slate-600">
                You are about to apply <strong>{selectedOption.title}</strong> to your active event portfolio. Review the final summary below before confirming:
              </p>

              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Option:</span>
                  <span className="font-bold text-blue-700">{selectedOption.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Revised Headcount:</span>
                  <span className="font-bold text-slate-900">{guestCountInput} Guests (was {activeEvent.guestCount})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Revised Total Budget:</span>
                  <span className="font-bold text-emerald-700">₹{selectedOption.totalEstimatedCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Additional Funding Required:</span>
                  <span className={`font-bold ${selectedOption.additionalFundingRequired > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {selectedOption.additionalFundingRequired > 0 ? `+₹${selectedOption.additionalFundingRequired.toLocaleString()}` : '₹0 (Within Approved Ceiling)'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Recommended Category Allocations:</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {selectedOption.recommendedAllocations.map((alloc) => (
                    <div key={alloc.category} className="p-2 bg-slate-100 rounded-lg flex justify-between">
                      <span className="text-slate-600">{alloc.category} ({alloc.percentage}%):</span>
                      <span className="font-bold text-slate-900">₹{alloc.allocatedAmount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                <strong className="flex items-center gap-1 font-bold text-amber-950">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Controlled Replanning Policy:
                </strong>
                <p className="text-[11px]">
                  Clicking "Confirm and Apply Changes" will write these approved updates to your active event portfolio. Clicking "Cancel" will discard these changes and leave your original event completely untouched.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel & Retain Original Plan
              </button>
              <button
                onClick={handleConfirmAndApply}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm and Apply Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
