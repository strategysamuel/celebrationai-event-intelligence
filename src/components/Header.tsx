import React from 'react';
import {
  Sparkles,
  Calendar,
  ChevronDown,
  PlusCircle,
  Cpu,
  Layers,
  ArrowRightLeft,
} from 'lucide-react';
import { EventPlan } from '../types';

interface HeaderProps {
  events: EventPlan[];
  activeEvent: EventPlan;
  onSelectEvent: (id: string) => void;
  onOpenCreateModal: () => void;
  onNavigateToReplanning: () => void;
  isAiOnline: boolean;
  geminiModel: string;
}

export const Header: React.FC<HeaderProps> = ({
  events,
  activeEvent,
  onSelectEvent,
  onOpenCreateModal,
  onNavigateToReplanning,
  isAiOnline,
  geminiModel,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between shadow-md">
      {/* Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white font-black text-xl tracking-tighter">
          CAI
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-teal-200 bg-clip-text text-transparent">
              CelebrationAI
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full tracking-wide uppercase">
              CAI-006 Final
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Plan Smarter. Optimize Better. Celebrate Without Stress.
          </p>
        </div>
      </div>

      {/* Right Controls: Event Switcher & AI Status & Replanning Quick Action */}
      <div className="flex items-center gap-3">
        {/* Dynamic Replanning CTA Button */}
        <button
          onClick={onNavigateToReplanning}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/40 text-xs font-medium transition cursor-pointer"
          title="Simulate budget drops, date changes, or priority recalculations"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-teal-400" />
          <span>Replanning Engine</span>
        </button>

        {/* Event Selector Dropdown */}
        <div className="relative flex items-center bg-slate-800/90 hover:bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 transition">
          <Calendar className="w-4 h-4 text-teal-400 mr-2 shrink-0" />
          <div className="flex flex-col text-left mr-2 max-w-[140px] sm:max-w-[200px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Active Event
            </span>
            <select
              value={activeEvent.id}
              onChange={(e) => onSelectEvent(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer truncate"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id} className="bg-slate-900 text-white">
                  {ev.name} ({ev.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* New Event Button */}
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Event</span>
        </button>

        {/* AI Model Badge */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded-md text-[11px] text-slate-300"
          title={`Configurable Server-side Model: ${geminiModel}`}
        >
          <Cpu className="w-3 h-3 text-teal-400" />
          <span className="truncate max-w-[100px]">{geminiModel}</span>
          <span className={`w-2 h-2 rounded-full ${isAiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </div>
      </div>
    </header>
  );
};
