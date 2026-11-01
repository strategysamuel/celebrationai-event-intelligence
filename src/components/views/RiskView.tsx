import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Loader2,
  ArrowRight,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import { EventPlan, RiskAlert, RiskSeverity, RiskStatus } from '../../types';
import { evaluateEventRisks } from '../../domain/riskEngine';
import { apiClient, RiskMitigationResponse } from '../../services/apiClient';

interface RiskViewProps {
  activeEvent: EventPlan;
  onUpdateEvent: (updated: EventPlan) => void;
}

export const RiskView: React.FC<RiskViewProps> = ({
  activeEvent,
  onUpdateEvent,
}) => {
  const [selectedRisk, setSelectedRisk] = useState<RiskAlert | null>(null);
  const [mitigationStrategy, setMitigationStrategy] = useState<RiskMitigationResponse | null>(null);
  const [isMitigating, setIsMitigating] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('All');

  // Dynamically compute fresh risks from the rule engine
  const evaluatedRisks = evaluateEventRisks(activeEvent);

  const handleUpdateRiskStatus = (riskId: string, newStatus: RiskStatus) => {
    // If the risk is in activeEvent.risks, update it
    const existingIndex = activeEvent.risks.findIndex((r) => r.id === riskId);
    let updatedRisks: RiskAlert[];

    if (existingIndex >= 0) {
      updatedRisks = activeEvent.risks.map((r) =>
        r.id === riskId ? { ...r, status: newStatus } : r
      );
    } else {
      // Add from evaluated list with the new status
      const target = evaluatedRisks.find((r) => r.id === riskId);
      if (target) {
        updatedRisks = [...activeEvent.risks, { ...target, status: newStatus }];
      } else {
        updatedRisks = activeEvent.risks;
      }
    }

    onUpdateEvent({
      ...activeEvent,
      risks: updatedRisks,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRequestAiMitigation = async (risk: RiskAlert) => {
    setSelectedRisk(risk);
    setIsMitigating(true);
    setMitigationStrategy(null);

    try {
      const response = await apiClient.getRiskMitigation(risk, {
        name: activeEvent.name,
        type: activeEvent.type,
        budget: activeEvent.totalBudget,
        currency: activeEvent.currency,
      });
      setMitigationStrategy(response);
    } catch (err: any) {
      console.error('Failed to get AI mitigation:', err);
      setMitigationStrategy({
        analysis: risk.explanation,
        immediateActions: [risk.recommendedAction],
        contingencyAlternatives: ['Activate emergency contingency reserve fund'],
        preventiveMeasures: ['Regular vendor check-ins and locked payment milestones'],
      });
    } finally {
      setIsMitigating(false);
    }
  };

  const filteredRisks = evaluatedRisks.filter((r) => {
    if (filterSeverity !== 'All' && r.severity !== filterSeverity) return false;
    return true;
  });

  const criticalCount = evaluatedRisks.filter((r) => r.severity === 'Critical').length;
  const highCount = evaluatedRisks.filter((r) => r.severity === 'High').length;
  const mediumCount = evaluatedRisks.filter((r) => r.severity === 'Medium').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Event Risk Intelligence Engine</h1>
          <p className="text-xs text-slate-500 mt-1">
            7-Point Rule-Based Verification Engine augmented with GenAI mitigation workflows
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterSeverity === sev
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Flagged Watchpoints
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {evaluatedRisks.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Across 6 operational domains
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-1">
            Critical Severity
          </span>
          <div className="text-2xl font-bold text-rose-600 font-mono">
            {criticalCount}
          </div>
          <span className="text-[11px] text-rose-600 font-medium mt-1 block">
            Immediate blocker risk
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
            High Severity
          </span>
          <div className="text-2xl font-bold text-amber-600 font-mono">
            {highCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Vendor / schedule compression
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block mb-1">
            Medium & Advisory
          </span>
          <div className="text-2xl font-bold text-blue-600 font-mono">
            {mediumCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Monitored logistics buffers
          </span>
        </div>
      </div>

      {/* Main Risk Table / Card List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Risk List (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {filteredRisks.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white border border-slate-200">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No Active Risk Flags Detected</h3>
              <p className="text-xs text-slate-500 mt-1">
                All deterministic rule-checks (budget variance, critical vendor lock, milestone buffers) are currently green.
              </p>
            </div>
          ) : (
            filteredRisks.map((risk) => {
              const isCrit = risk.severity === 'Critical';
              const isHigh = risk.severity === 'High';
              const isSelected = selectedRisk?.id === risk.id;

              return (
                <div
                  key={risk.id}
                  className={`p-4 rounded-2xl border transition bg-white shadow-xs ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                          isCrit
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isHigh
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {risk.severity} Severity
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {risk.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={risk.status}
                        onChange={(e) =>
                          handleUpdateRiskStatus(risk.id, e.target.value as RiskStatus)
                        }
                        className="text-[11px] px-2 py-0.5 rounded-md border border-slate-200 bg-white font-semibold text-slate-700 focus:outline-none"
                      >
                        <option value="Open">Open</option>
                        <option value="Mitigating">Mitigating</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    {risk.title}
                  </h3>

                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    {risk.explanation}
                  </p>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 mb-3">
                    <strong className="text-slate-800 block mb-0.5">Recommended Action:</strong>
                    <span>{risk.recommendedAction}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Source: {risk.source} • Detected: {risk.detectedAt}
                    </span>

                    <button
                      onClick={() => handleRequestAiMitigation(risk)}
                      className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Deep AI Mitigation Plan</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: AI Risk Mitigation Drawer (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-fit">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              AI Risk Mitigation Briefing
            </h3>
          </div>

          {!selectedRisk ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Select any risk card on the left and click <strong>"Deep AI Mitigation Plan"</strong> to generate a multi-step contingency briefing.
            </div>
          ) : isMitigating ? (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-600">
                Synthesizing mitigation strategy for <em>"{selectedRisk.title}"</em>...
              </p>
            </div>
          ) : mitigationStrategy ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Root Cause & Operational Impact
                </span>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  {mitigationStrategy.analysis}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block mb-1">
                  Immediate 24-48 Hour Action Checklist
                </span>
                <ul className="space-y-1.5">
                  {mitigationStrategy.immediateActions.map((action, i) => (
                    <li
                      key={i}
                      className="p-2 rounded-lg bg-teal-50/70 border border-teal-100 text-teal-900 flex items-start gap-2"
                    >
                      <span className="font-bold text-teal-600 shrink-0">{i + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block mb-1">
                  Plan B & C Contingency Alternatives
                </span>
                <ul className="space-y-1 text-slate-700 list-disc list-inside">
                  {mitigationStrategy.contingencyAlternatives.map((alt, i) => (
                    <li key={i}>{alt}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Preventive Governance
                </span>
                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                  {mitigationStrategy.preventiveMeasures.map((prev, i) => (
                    <li key={i}>{prev}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
