import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  PieChart,
  Clock,
  Briefcase,
  AlertTriangle,
  ArrowRightLeft,
  FileText,
  Settings,
  ChevronRight,
  ShieldCheck,
  Brain,
  Store,
} from 'lucide-react';
import { RiskAlert } from '../types';

export type NavSection =
  | 'overview'
  | 'events'
  | 'copilot'
  | 'intelligence'
  | 'budget'
  | 'timeline'
  | 'vendors'
  | 'procurement'
  | 'execution'
  | 'risks'
  | 'replanning'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  openRiskCount: number;
  pendingTaskCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  openRiskCount,
  pendingTaskCount,
}) => {
  const navItems: {
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
    highlight?: boolean;
  }[] = [
    { id: 'overview', label: '1. Overview', icon: LayoutDashboard },
    { id: 'events', label: '2. My Events', icon: CalendarDays },
    { id: 'copilot', label: '3. AI Planning Copilot', icon: Sparkles },
    {
      id: 'intelligence',
      label: '4. Celebration Intelligence',
      icon: Brain,
      badge: 'CAI-003',
      badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
      highlight: true,
    },
    { id: 'budget', label: '5. Budget Intelligence', icon: PieChart },
    {
      id: 'timeline',
      label: '6. Timeline Manager',
      icon: Clock,
      badge: pendingTaskCount > 0 ? pendingTaskCount : undefined,
      badgeColor: 'bg-slate-200 text-slate-700',
    },
    { id: 'vendors', label: '7. Vendor Directory', icon: Briefcase },
    {
      id: 'procurement',
      label: '8. Procurement Intelligence',
      icon: Store,
      badge: 'CAI-004',
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      highlight: true,
    },
    {
      id: 'execution',
      label: '9. Event Execution',
      icon: ShieldCheck,
      badge: 'CAI-005',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      highlight: true,
    },
    {
      id: 'risks',
      label: '10. Risk Intelligence',
      icon: AlertTriangle,
      badge: openRiskCount > 0 ? openRiskCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-600 border border-rose-300',
    },
    {
      id: 'replanning',
      label: '11. Dynamic Replanning',
      icon: ArrowRightLeft,
      badge: 'AI Engine',
      badgeColor: 'bg-teal-500/20 text-teal-700 border border-teal-300',
    },
    { id: 'reports', label: '12. Event Reports', icon: FileText },
    { id: 'settings', label: '13. Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 min-h-[calc(100vh-61px)]">
      {/* Navigation Links */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Navigation Modules
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer text-left group ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                  : 'hover:bg-slate-800 hover:text-white text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 transition ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-teal-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                    item.badgeColor || 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer System Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-semibold text-slate-200">Competition Build</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          CelebrationAI CAI-001 <br />
          Enterprise Event Intelligence Engine with Zod & GenAI.
        </p>
      </div>
    </aside>
  );
};
