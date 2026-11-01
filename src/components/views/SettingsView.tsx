import React from 'react';
import {
  Settings,
  Cpu,
  RefreshCw,
  ShieldCheck,
  Database,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { EventPlan, CurrencyCode } from '../../types';

interface SettingsViewProps {
  activeEvent: EventPlan;
  onUpdateCurrency: (currency: CurrencyCode) => void;
  onResetDemoData: () => void;
  geminiModel: string;
  isAiOnline: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  activeEvent,
  onUpdateCurrency,
  onResetDemoData,
  geminiModel,
  isAiOnline,
}) => {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">System & Engine Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure currency standards, verify server-side AI integrations, and manage demonstration state
        </p>
      </div>

      {/* AI Model & Security Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
          <Cpu className="w-5 h-5 text-teal-600" />
          <h2 className="text-base font-bold text-slate-900">
            Artificial Intelligence Architecture
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="font-bold text-slate-800 block">Active Gemini Model</span>
              <span className="text-[11px] text-slate-500">
                Configured via GEMINI_MODEL server environment variable
              </span>
            </div>
            <span className="px-3 py-1 rounded-lg bg-slate-900 text-teal-300 font-mono font-bold text-xs">
              {geminiModel}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="font-bold text-slate-800 block">Server-Side API Key Protection</span>
              <span className="text-[11px] text-slate-500">
                API credentials are strictly quarantined on the Express backend; 0 client bundle exposure
              </span>
            </div>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Quarantined & Protected</span>
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="font-bold text-slate-800 block">GenAI SDK Status</span>
              <span className="text-[11px] text-slate-500">
                Official @google/genai TypeScript SDK with Zod schema validation
              </span>
            </div>
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs ${
                isAiOnline
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isAiOnline ? 'Online & Ready' : 'Heuristic Mode'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Financial Currency Standardization */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Currency Standardization
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Select the active currency symbol for all budget charts, vendor quotations, and ledger exports
        </p>

        <div className="flex flex-wrap gap-3">
          {[
            { code: 'INR', label: 'INR (₹ - Indian Rupee)' },
            { code: 'USD', label: 'USD ($ - US Dollar)' },
            { code: 'EUR', label: 'EUR (€ - Euro)' },
            { code: 'GBP', label: 'GBP (£ - British Pound)' },
          ].map((c) => (
            <button
              key={c.code}
              onClick={() => onUpdateCurrency(c.code as CurrencyCode)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                activeEvent.currency === c.code
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Synthetic Demo Data Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Reset Synthetic Demonstration Dataset
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Restores the default competition benchmark events (Chennai Wedding, Bengaluru Birthday, Corporate Summit)
            </p>
          </div>

          <button
            onClick={() => {
              if (
                confirm(
                  'Are you sure you want to restore the default synthetic demo dataset? Any custom unsaved plans will be reset.'
                )
              ) {
                onResetDemoData();
              }
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
