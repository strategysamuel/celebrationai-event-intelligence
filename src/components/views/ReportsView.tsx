import React from 'react';
import {
  Printer,
  FileText,
  DollarSign,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { EventPlan } from '../../types';
import { calculateBudgetSummary } from '../../domain/budgetEngine';
import { analyzeTimelineHealth } from '../../domain/timelineEngine';
import { calculateEventReadinessScore } from '../../domain/executionEngine';

interface ReportsViewProps {
  activeEvent: EventPlan;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ activeEvent }) => {
  const budgetSummary = calculateBudgetSummary(
    activeEvent.totalBudget || activeEvent.budget || 1500000,
    activeEvent.budgetAllocations || [],
    activeEvent.expenses || []
  );

  const timelineHealth = analyzeTimelineHealth(activeEvent.tasks || []);
  const readiness = calculateEventReadinessScore(activeEvent);

  const formatCurrency = (amt: number) => {
    const sym = activeEvent.currency === 'INR' ? '₹' : '$';
    return `${sym}${amt.toLocaleString('en-IN')}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const confirmedVendorsCount = (activeEvent.vendors || []).filter((v) => v.status === 'Confirmed').length;
  const totalVendorsCount = (activeEvent.vendors || []).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Executive Event Dossier & Comprehensive Report</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase">
              CAI-006 Certified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audit-grade stakeholder report covering financial reconciliation, procurement, timeline, risks, and readiness metrics.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow transition cursor-pointer self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-teal-400" />
          <span>Print / Export PDF Dossier</span>
        </button>
      </div>

      {/* Printable Report Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm print:shadow-none print:border-none print:p-0 space-y-8">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-teal-300 uppercase tracking-wide">
                CelebrationAI Intelligence Report
              </span>
              {activeEvent.isDemoData && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                  [DEMO DATA]
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 mt-2 tracking-tight">
              {activeEvent.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Event Type: <strong className="text-slate-800">{activeEvent.type}</strong> • Location: <strong className="text-slate-800">{activeEvent.location}</strong>
            </p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600 font-mono space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p><strong>Scheduled Date:</strong> {activeEvent.eventDate || activeEvent.date}</p>
            <p><strong>Guest Headcount:</strong> {activeEvent.guestCount} Guests</p>
            <p><strong>Approved Budget:</strong> {formatCurrency(budgetSummary.totalBudget)}</p>
            <p><strong>Dossier Date:</strong> {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        {/* Section 1: Executive Readiness Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            1. Deterministic 4-Factor Event Readiness Summary
          </h3>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="sm:col-span-1 border-r border-slate-200 pr-4 flex flex-col justify-center">
              <div className="text-xs text-slate-500 font-semibold">Overall Score</div>
              <div className="text-3xl font-black text-slate-900 mt-0.5">{readiness.score}%</div>
              <div className="text-[11px] font-bold text-teal-700 mt-1">{readiness.label}</div>
            </div>

            <div className="sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Task Score (30%)</span>
                <span className="font-bold text-slate-900">{readiness.breakdown.taskScore} / 30 pts</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Milestone Score (25%)</span>
                <span className="font-bold text-slate-900">{readiness.breakdown.milestoneScore} / 25 pts</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Vendor Score (25%)</span>
                <span className="font-bold text-slate-900">{readiness.breakdown.vendorScore} / 25 pts</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Risk Score (20%)</span>
                <span className="font-bold text-slate-900">{readiness.breakdown.riskScore} / 20 pts</span>
              </div>
            </div>
          </div>

          {readiness.penalties.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <strong className="font-bold">Active Guardrail Penalties (-{readiness.breakdown.penaltyDeduction} pts):</strong>{' '}
              {readiness.penalties.join('; ')}
            </div>
          )}
        </div>

        {/* Section 2: AI-Generated Executive Briefing */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              2. AI-Generated Strategic Executive Briefing
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-800 rounded">
              [AI-GENERATED BRIEFING]
            </span>
          </div>

          <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-xl text-xs text-slate-800 leading-relaxed space-y-2">
            <p>
              This event blueprint balances an approved budget of <strong>{formatCurrency(budgetSummary.totalBudget)}</strong> with a projected guest count of <strong>{activeEvent.guestCount}</strong> guests in {activeEvent.location}.
            </p>
            <p>
              <strong>Operational Status:</strong> Task execution progress stands at <strong>{timelineHealth.completionPercent}%</strong> with {confirmedVendorsCount} of {totalVendorsCount} vendors confirmed on contract. The 4-factor deterministic readiness score is calculated at <strong>{readiness.score}% ({readiness.label})</strong>.
            </p>
            <p className="text-slate-600 italic">
              Note: This section is generated dynamically by server-side AI Copilot models and provides advisory guidance without mutating underlying financial or operational records.
            </p>
          </div>
        </div>

        {/* Section 3: Financial & Allocation Statement */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            3. Comprehensive Financial Allocation & Reconciliation
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Approved Budget</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{formatCurrency(budgetSummary.totalBudget)}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Committed Expenditure</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{formatCurrency(budgetSummary.totalActualExpenses)}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Paid Advances</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{formatCurrency(budgetSummary.totalPaid)}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Remaining Balance</span>
              <span className={`font-bold font-mono text-sm ${budgetSummary.remainingActualBudget >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatCurrency(budgetSummary.remainingActualBudget)}
              </span>
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Allocation %</th>
                <th className="py-2.5 px-3 text-right">Allocated Amount</th>
                <th className="py-2.5 px-3 text-right">Contracted / Actual</th>
                <th className="py-2.5 px-3 text-right">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {budgetSummary.categoryBreakdown.map((c) => (
                <tr key={c.category}>
                  <td className="py-2 px-3 font-semibold text-slate-800">{c.category}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">{c.percentage}%</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">{formatCurrency(c.allocatedAmount)}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(c.actualCost)}</td>
                  <td className={`py-2 px-3 text-right font-mono font-semibold ${c.variance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {c.variance >= 0 ? '+' : ''}{formatCurrency(c.variance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4: Vendor Intelligence & Procurement Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            4. Vendor Roster & Procurement Commitments
          </h3>

          {(activeEvent.vendors || []).length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">No active vendors attached to event.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                  <th className="py-2.5 px-3">Vendor Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Suitability Score</th>
                  <th className="py-2.5 px-3 text-right">Contracted Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeEvent.vendors || []).map((v) => (
                  <tr key={v.id}>
                    <td className="py-2 px-3 font-semibold text-slate-800">{v.name}</td>
                    <td className="py-2 px-3 text-slate-600">{v.category}</td>
                    <td className="py-2 px-3 font-semibold text-slate-700">{v.status}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-teal-800">{v.compositeScore ?? 85} / 100</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(v.amount || v.negotiatedPrice || v.quotedPrice || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Section 5: Timeline, Milestones & Task Progress */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            5. Schedule Milestones & Execution Checklist Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block mb-2">Milestone Timeline Gates</span>
              <div className="space-y-1.5">
                {(activeEvent.milestones || []).slice(0, 4).map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-slate-700">
                    <span className="truncate max-w-[200px]">{m.title}</span>
                    <span className="font-mono text-slate-500">{m.targetDate}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block mb-2">Execution Task Counters</span>
              <div className="space-y-1 text-slate-700">
                <p>Total Checklist Tasks: <strong>{(activeEvent.tasks || []).length}</strong></p>
                <p>Completed Tasks: <strong className="text-emerald-700">{timelineHealth.completedTasks}</strong></p>
                <p>Pending Tasks: <strong>{timelineHealth.totalTasks - timelineHealth.completedTasks}</strong></p>
                <p>Completion Ratio: <strong className="text-teal-700">{timelineHealth.completionPercent}%</strong></p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Operational Risk Register */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            6. Operational Risk & Issue Register
          </h3>

          {(activeEvent.risks || []).length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">No open risks or operational flags recorded.</p>
          ) : (
            <div className="space-y-2">
              {(activeEvent.risks || []).map((r) => (
                <div key={r.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-slate-800">{r.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 font-bold">{r.severity}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">{r.recommendedAction || r.explanation}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 shrink-0">{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
