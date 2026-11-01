import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  AlertCircle,
  Plus,
  Filter,
  Search,
  Sparkles,
  Users,
  DollarSign,
  Calendar,
  Lock,
  Unlock,
  Building2,
  Activity,
  FileCheck,
  FileText,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  EventPlan,
  Task,
  Milestone,
  TaskStatus,
  PriorityLevel,
  VendorExecutionTracking,
  OperationalIssue,
  ActivityLogEntry,
  OperationsCopilotInsight,
  VendorExecutionStage,
} from '../../types';
import {
  calculateEventReadinessScore,
  validateTaskCompletion,
  generateAutoFlaggedIssues,
  calculateVendorExecutionSummary,
  createActivityLogEntry,
  generateDemoExecutionChecklist,
  DEFAULT_VENDOR_STAGES,
} from '../../domain/executionEngine';
import { apiClient } from '../../services/apiClient';

interface ExecutionMonitoringViewProps {
  event: EventPlan;
  onUpdateEvent: (updatedEvent: EventPlan) => void;
}

export const ExecutionMonitoringView: React.FC<ExecutionMonitoringViewProps> = ({
  event,
  onUpdateEvent,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'checklist' | 'milestones' | 'vendors' | 'risks' | 'history' | 'copilot'
  >('overview');

  // Task Filter state
  const [taskCategoryFilter, setTaskCategoryFilter] = useState<string>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>('');

  // Modals state
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false);
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [showAddIssueModal, setShowAddIssueModal] = useState<boolean>(false);
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideError, setOverrideError] = useState<string>('');

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Operations');
  const [newTaskPriority, setNewTaskPriority] = useState<PriorityLevel>('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('Event coordinator');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskIsMandatory, setNewTaskIsMandatory] = useState(true);

  // New Issue Form State
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueCategory, setNewIssueCategory] = useState('Operational');
  const [newIssueSeverity, setNewIssueSeverity] = useState<PriorityLevel>('High');
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [newIssueMitigation, setNewIssueMitigation] = useState('');

  // AI Operations Copilot state
  const [copilotInsight, setCopilotInsight] = useState<OperationsCopilotInsight | null>(null);
  const [copilotLoading, setCopilotLoading] = useState<boolean>(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  // Derive execution tracking data from event or initialize defaults
  const tasks = event.tasks || [];
  const milestones = event.timeline?.milestones || [];
  const vendorTrackings: VendorExecutionTracking[] = useMemo(() => {
    if (event.vendorExecutionTrackings && event.vendorExecutionTrackings.length > 0) {
      return event.vendorExecutionTrackings;
    }
    // Auto-generate execution trackings from existing vendors if not present
    return (event.vendors || []).map((v) => ({
      vendorId: v.id,
      vendorName: v.name,
      category: v.category,
      currentStage: v.status === 'Confirmed' ? 'Contract Status' : 'Quotation Received',
      stageHistory: [
        {
          stage: 'Quotation Received',
          updatedAt: new Date().toISOString(),
          updatedBy: 'Event administrator',
          notes: 'Initial quotation catalogued',
        },
      ],
      deliverableChecklist: [
        { title: 'Contract execution', isCompleted: v.status === 'Confirmed' },
        { title: 'Advance payment', isCompleted: v.status === 'Confirmed' },
        { title: 'Event-day setup verification', isCompleted: false },
      ],
      advancePaymentPaid: (v.amount || v.quotedPrice || 0) * 0.3,
      finalPaymentPaid: 0,
      totalAgreedAmount: v.amount || v.quotedPrice || 0,
      isConfirmed: v.status === 'Confirmed',
      contactPerson: v.contactPerson || 'Vendor Lead',
    }));
  }, [event.vendorExecutionTrackings, event.vendors]);

  const activityLog = event.activityLog || [];

  // Auto-flagged issues
  const autoIssues = useMemo(
    () => generateAutoFlaggedIssues(event, vendorTrackings),
    [event, vendorTrackings]
  );
  const customIssues = event.operationalIssues || [];
  const allIssues = useMemo(() => [...autoIssues, ...customIssues], [autoIssues, customIssues]);

  // Readiness Score Calculation
  const readinessSummary = useMemo(
    () => calculateEventReadinessScore(event, vendorTrackings, allIssues),
    [event, vendorTrackings, allIssues]
  );

  const vendorSummary = useMemo(
    () => calculateVendorExecutionSummary(vendorTrackings),
    [vendorTrackings]
  );

  // Function to seed demo checklist if empty or user requests
  const handleSeedDemoData = () => {
    const demoTasks = generateDemoExecutionChecklist();
    const demoLogEntry = createActivityLogEntry(
      'System Configuration',
      'Loaded synthetic Chennai Wedding demonstration dataset (CAI-005)',
      { taskCount: demoTasks.length, source: 'Demo Generator' }
    );

    const updated = {
      ...event,
      tasks: demoTasks,
      activityLog: [demoLogEntry, ...(event.activityLog || [])],
      vendorExecutionTrackings: vendorTrackings,
    };
    onUpdateEvent(updated);
  };

  // Helper to log activity and update event
  const recordActivityAndUpdate = (
    category: ActivityLogEntry['category'],
    action: string,
    details?: any,
    taskUpdates?: Task[],
    issueUpdates?: OperationalIssue[],
    vendorUpdates?: VendorExecutionTracking[]
  ) => {
    const newLogEntry = createActivityLogEntry(category, action, details);
    const updated: EventPlan = {
      ...event,
      tasks: taskUpdates !== undefined ? taskUpdates : tasks,
      operationalIssues: issueUpdates !== undefined ? issueUpdates : customIssues,
      vendorExecutionTrackings: vendorUpdates !== undefined ? vendorUpdates : vendorTrackings,
      activityLog: [newLogEntry, ...activityLog],
    };
    onUpdateEvent(updated);
  };

  // Task Completion Handler
  const handleToggleTaskCompletion = (task: Task) => {
    if (task.status === 'Completed') {
      // Re-open task
      const updatedTasks = tasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: 'In Progress' as TaskStatus,
              completedAt: undefined,
              completionNotes: undefined,
            }
          : t
      );
      recordActivityAndUpdate(
        'Task Update',
        `Re-opened task: "${task.title}"`,
        { taskId: task.id },
        updatedTasks
      );
      return;
    }

    // Attempting to complete task
    const validation = validateTaskCompletion(task.id, tasks);
    if (!validation.canComplete) {
      setTargetTaskId(task.id);
      setOverrideError(validation.reason || 'Missing prerequisites');
      setShowOverrideModal(true);
      return;
    }

    // Complete task standard
    const now = new Date().toISOString();
    const updatedTasks = tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            status: 'Completed' as TaskStatus,
            completedAt: now,
            completionNotes: 'Completed by administrator',
          }
        : t
    );
    recordActivityAndUpdate(
      'Task Update',
      `Completed task: "${task.title}"`,
      { taskId: task.id, completedAt: now },
      updatedTasks
    );
  };

  // Override Dependency Completion Handler
  const handleConfirmOverride = () => {
    if (!overrideReason.trim()) {
      setOverrideError('An explicit override rationale is required for security and audit integrity.');
      return;
    }
    if (!targetTaskId) return;

    const task = tasks.find((t) => t.id === targetTaskId);
    if (!task) return;

    const now = new Date().toISOString();
    const updatedTasks = tasks.map((t) =>
      t.id === targetTaskId
        ? {
            ...t,
            status: 'Completed' as TaskStatus,
            completedAt: now,
            overrideReason: overrideReason.trim(),
            overrideTimestamp: now,
            completionNotes: `Dependency override authorized: ${overrideReason.trim()}`,
          }
        : t
    );

    recordActivityAndUpdate(
      'Dependency Override',
      `Authorized dependency override to complete task "${task.title}"`,
      { taskId: task.id, reason: overrideReason.trim(), timestamp: now },
      updatedTasks
    );

    setShowOverrideModal(false);
    setTargetTaskId(null);
    setOverrideReason('');
    setOverrideError('');
  };

  // Add Task Handler
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      status: 'Pending',
      priority: newTaskPriority,
      dueDate: newTaskDueDate || event.date || event.eventDate || '2027-02-15',
      assignedTo: newTaskAssignedTo,
      description: newTaskDescription,
      isMandatory: newTaskIsMandatory,
      dependencies: [],
    };

    const updatedTasks = [newTask, ...tasks];
    recordActivityAndUpdate(
      'Task Update',
      `Created new execution task: "${newTask.title}"`,
      { taskId: newTask.id, category: newTaskCategory, priority: newTaskPriority },
      updatedTasks
    );

    setNewTaskTitle('');
    setNewTaskDescription('');
    setShowAddTaskModal(false);
  };

  // Add Issue Handler
  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueTitle.trim()) return;

    const newIssue: OperationalIssue = {
      id: `issue-custom-${Date.now()}`,
      title: newIssueTitle.trim(),
      category: newIssueCategory,
      severity: newIssueSeverity,
      description: newIssueDescription,
      recommendedMitigation: newIssueMitigation,
      status: 'Open',
      detectedAt: new Date().toISOString(),
      isAutoFlagged: false,
    };

    const updatedIssues = [newIssue, ...customIssues];
    recordActivityAndUpdate(
      'Risk Register',
      `Logged operational issue: "${newIssue.title}"`,
      { issueId: newIssue.id, severity: newIssueSeverity },
      undefined,
      updatedIssues
    );

    setNewIssueTitle('');
    setNewIssueDescription('');
    setNewIssueMitigation('');
    setShowAddIssueModal(false);
  };

  // Update Vendor Stage Handler
  const handleUpdateVendorStage = (vendorId: string, newStage: VendorExecutionStage) => {
    const updatedTrackings = vendorTrackings.map((vt) => {
      if (vt.vendorId === vendorId) {
        return {
          ...vt,
          currentStage: newStage,
          isConfirmed: newStage !== 'Quotation Received' && newStage !== 'Negotiation',
          stageHistory: [
            ...(vt.stageHistory || []),
            {
              stage: newStage,
              updatedAt: new Date().toISOString(),
              updatedBy: 'Event administrator',
              notes: `Stage updated to ${newStage}`,
            },
          ],
        };
      }
      return vt;
    });

    const vt = vendorTrackings.find((v) => v.vendorId === vendorId);
    recordActivityAndUpdate(
      'Vendor Milestone',
      `Updated execution stage for ${vt?.vendorName || 'Vendor'} to "${newStage}"`,
      { vendorId, stage: newStage },
      undefined,
      undefined,
      updatedTrackings
    );
  };

  // Fetch AI Operations Copilot Insight
  const handleFetchCopilotInsight = async () => {
    setCopilotLoading(true);
    setCopilotError(null);
    try {
      const insight = await apiClient.analyzeEventOperations(event);
      setCopilotInsight(insight);
      recordActivityAndUpdate(
        'AI Operations Briefing',
        'Generated AI Event Operations Copilot briefing',
        { requestedModel: insight.requestedModel, actualModel: insight.actualModel }
      );
    } catch (err: any) {
      setCopilotError(err.message || 'Failed to fetch AI operations briefing');
    } finally {
      setCopilotLoading(false);
    }
  };

  // Task Filtered List
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskCategoryFilter !== 'all' && t.category !== taskCategoryFilter) return false;
      if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) return false;
      if (taskPriorityFilter !== 'all' && t.priority !== taskPriorityFilter) return false;
      if (
        taskSearchQuery.trim() &&
        !t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) &&
        !t.category.toLowerCase().includes(taskSearchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, taskCategoryFilter, taskStatusFilter, taskPriorityFilter, taskSearchQuery]);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.category))),
    [tasks]
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 shadow-xl border border-slate-700/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                CAI-005 Release Baseline
              </span>
              <span className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium rounded-full">
                {event.type}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              {event.name}
            </h1>
            <p className="text-slate-300 text-sm mt-1 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-teal-400" /> {event.date}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4 text-teal-400" /> {event.location}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4 text-teal-400" /> {event.guestCount} Guests
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <DollarSign className="w-4 h-4" /> ₹{(event.budget || event.totalBudget || 0).toLocaleString('en-IN')} Budget
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto">
            {tasks.length === 0 && (
              <button
                onClick={handleSeedDemoData}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                [DEMO DATA] Seed Chennai Wedding Checklist
              </button>
            )}
            <button
              onClick={handleSeedDemoData}
              title="Re-seed Chennai Wedding demo tasks"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              Reset Demo Checklist
            </button>
          </div>
        </div>

        {/* Readiness Overview Banner */}
        <div className="mt-6 pt-6 border-t border-slate-700/60 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="#334155" strokeWidth="4" fill="transparent" />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke={
                    readinessSummary.score >= 85
                      ? '#10b981'
                      : readinessSummary.score >= 65
                      ? '#f59e0b'
                      : '#ef4444'
                  }
                  strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${
                    2 * Math.PI * 20 * (1 - readinessSummary.score / 100)
                  }`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-xs font-bold text-white">
                {readinessSummary.score}%
              </span>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Readiness Score</div>
              <div
                className={`text-xs font-bold ${
                  readinessSummary.score >= 85
                    ? 'text-emerald-400'
                    : readinessSummary.score >= 65
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {readinessSummary.label}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-xs text-slate-400 font-medium">Task Progress</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {readinessSummary.breakdown.completedTasks} / {readinessSummary.breakdown.totalTasks}
            </div>
            <div className="text-[11px] text-slate-400">
              {readinessSummary.breakdown.blockedTasks > 0 ? (
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> {readinessSummary.breakdown.blockedTasks} Blocked
                </span>
              ) : (
                `${readinessSummary.breakdown.pendingTasks} Pending`
              )}
            </div>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-xs text-slate-400 font-medium">Vendor Execution</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {vendorSummary.confirmedCount} / {vendorSummary.totalVendors} Confirmed
            </div>
            <div className="text-[11px] text-slate-400">
              ₹{(vendorSummary.totalCommitted / 100000).toFixed(2)}L Committed
            </div>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
            <div className="text-xs text-slate-400 font-medium">Operational Risks</div>
            <div className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
              <span
                className={allIssues.filter((i) => i.status === 'Open').length > 0 ? 'text-rose-400' : 'text-emerald-400'}
              >
                {allIssues.filter((i) => i.status === 'Open').length}
              </span>
              <span className="text-xs font-normal text-slate-400">Open</span>
            </div>
            <div className="text-[11px] text-slate-400">
              {allIssues.filter((i) => i.severity === 'Critical' && i.status === 'Open').length} Critical
            </div>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60 col-span-2 md:col-span-1">
            <div className="text-xs text-slate-400 font-medium">Penalties Applied</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">
              -{readinessSummary.breakdown.penaltyDeduction} pts
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {readinessSummary.penalties.length > 0
                ? readinessSummary.penalties[0]
                : 'No active penalties'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 bg-slate-50 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium text-xs rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Readiness & Overview
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2 font-medium text-xs rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'checklist'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Task Checklist ({tasks.length})
        </button>

        <button
          onClick={() => setActiveTab('milestones')}
          className={`px-4 py-2 font-medium text-xs rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'milestones'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Milestones & Schedule
        </button>

        <button
          onClick={() => setActiveTab('vendors')}
          className={`px-4 py-2 font-medium text-xs rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'vendors'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Vendor Execution ({vendorTrackings.length})
        </button>

        <button
          onClick={() => setActiveTab('risks')}
          className={`px-4 py-2 font-medium text-xs rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'risks'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Risk Register ({allIssues.filter((i) => i.status === 'Open').length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium text-xs rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Activity Log ({activityLog.length})
        </button>

        <button
          onClick={() => setActiveTab('copilot')}
          className={`px-4 py-2 font-medium text-xs rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'copilot'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-teal-700 bg-teal-50 hover:bg-teal-100 font-semibold'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Operations Copilot
        </button>
      </div>

      {/* TAB 1: OVERVIEW & READINESS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 4-Factor Breakdown Card */}
            <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                Deterministic 4-Factor Readiness Score Breakdown
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-700">1. Task Completion (30%)</span>
                    <span className="text-sm font-bold text-slate-900">
                      {readinessSummary.breakdown.taskScore} / 30
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-600 h-2 rounded-full"
                      style={{ width: `${(readinessSummary.breakdown.taskScore / 30) * 100}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    {readinessSummary.breakdown.completedTasks} completed out of {readinessSummary.breakdown.totalTasks} total tasks
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-700">2. Milestone Readiness (25%)</span>
                    <span className="text-sm font-bold text-slate-900">
                      {readinessSummary.breakdown.milestoneScore} / 25
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(readinessSummary.breakdown.milestoneScore / 25) * 100}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    {milestones.filter((m) => m.status === 'Completed').length} completed, {milestones.filter((m) => m.delayInDays && m.delayInDays > 0).length} delayed
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-700">3. Vendor Readiness (25%)</span>
                    <span className="text-sm font-bold text-slate-900">
                      {readinessSummary.breakdown.vendorScore} / 25
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full"
                      style={{ width: `${(readinessSummary.breakdown.vendorScore / 25) * 100}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    {vendorSummary.confirmedCount} of {vendorSummary.totalVendors} vendors fully confirmed
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-700">4. Risk Resolution (20%)</span>
                    <span className="text-sm font-bold text-slate-900">
                      {readinessSummary.breakdown.riskScore} / 20
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${(readinessSummary.breakdown.riskScore / 20) * 100}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    {allIssues.filter((i) => i.status === 'Resolved').length} resolved out of {allIssues.length} total operational risks
                  </div>
                </div>
              </div>

              {/* Guardrail Penalties Section */}
              {readinessSummary.penalties.length > 0 && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Active Guardrail Penalty Deductions (-{readinessSummary.breakdown.penaltyDeduction} points)
                  </div>
                  <ul className="space-y-1">
                    {readinessSummary.penalties.map((penalty, idx) => (
                      <li key={idx} className="text-xs text-rose-700 flex items-start gap-2">
                        <span className="text-rose-500 font-bold">•</span>
                        {penalty}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Quick Actions & Status Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  Quick Action Controls
                </h3>
                <p className="text-xs text-slate-600 mb-4">
                  Manage event execution tasks, resolve operational issues, or run AI briefing.
                </p>

                <div className="space-y-2.5">
                  <button
                    onClick={() => {
                      setActiveTab('checklist');
                      setShowAddTaskModal(true);
                    }}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-teal-400" /> Add Execution Task
                    </span>
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('risks');
                      setShowAddIssueModal(true);
                    }}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold rounded-xl text-xs transition flex items-center justify-between border border-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Log Operational Risk
                    </span>
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('copilot');
                      if (!copilotInsight) handleFetchCopilotInsight();
                    }}
                    className="w-full py-2.5 px-4 bg-teal-50 hover:bg-teal-100 text-teal-900 font-semibold rounded-xl text-xs transition flex items-center justify-between border border-teal-200"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-teal-600" /> Run AI Operations Briefing
                    </span>
                    <ChevronRight className="w-4 h-4 opacity-70" />
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Domain Engine Authority:</span>
                <span className="font-semibold text-slate-700">Deterministic Rule Engine</span>
              </div>
            </div>
          </div>

          {/* Urgent Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Blocked or Overdue Tasks */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-rose-600" />
                Critical Blocked or Overdue Tasks ({tasks.filter((t) => t.status === 'Blocked' || t.status === 'Overdue').length})
              </h3>
              {tasks.filter((t) => t.status === 'Blocked' || t.status === 'Overdue').length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No blocked or overdue tasks. All execution tasks are progressing normally.
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks
                    .filter((t) => t.status === 'Blocked' || t.status === 'Overdue')
                    .slice(0, 4)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{t.title}</div>
                          <div className="text-[11px] text-rose-700 mt-1">
                            {t.category} • Due: {t.dueDate} • Assigned: {t.assignedTo}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('checklist');
                            setTargetTaskId(t.id);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-300 rounded-lg transition"
                        >
                          Resolve
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Auto-Flagged Operational Risks */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Auto-Flagged Operational Risk Register ({allIssues.filter((i) => i.status === 'Open').length})
              </h3>
              {allIssues.filter((i) => i.status === 'Open').length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No open operational risks recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {allIssues
                    .filter((i) => i.status === 'Open')
                    .slice(0, 4)
                    .map((issue) => (
                      <div
                        key={issue.id}
                        className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{issue.title}</span>
                            <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 text-[10px] font-extrabold rounded">
                              {issue.severity}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1">
                            {issue.recommendedMitigation || issue.description}
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('risks')}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-300 rounded-lg transition"
                        >
                          View Risk
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TASK CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <select
                value={taskCategoryFilter}
                onChange={(e) => setTaskCategoryFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Not Started">Not Started</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Delayed">Delayed</option>
                <option value="Blocked">Blocked</option>
                <option value="Overdue">Overdue</option>
              </select>

              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddTaskModal(true)}
              className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>

          {/* Task List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No execution tasks match the selected filters.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const isCompleted = task.status === 'Completed';
                  const isBlocked = task.status === 'Blocked';
                  const validation = validateTaskCompletion(task.id, tasks);

                  return (
                    <div
                      key={task.id}
                      className={`p-4 hover:bg-slate-50/80 transition flex items-start gap-4 ${
                        isCompleted ? 'bg-slate-50/50 opacity-80' : ''
                      }`}
                    >
                      <button
                        onClick={() => handleToggleTaskCompletion(task)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition flex-shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : !validation.canComplete
                            ? 'border-rose-300 text-rose-500 bg-rose-50 hover:bg-rose-100'
                            : 'border-slate-300 hover:border-teal-500 text-transparent'
                        }`}
                        title={
                          isCompleted
                            ? 'Mark incomplete'
                            : !validation.canComplete
                            ? 'Task has incomplete dependencies. Click to override.'
                            : 'Mark task complete'
                        }
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm font-bold ${
                              isCompleted
                                ? 'line-through text-slate-500'
                                : 'text-slate-900'
                            }`}
                          >
                            {task.title}
                          </span>

                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full ${
                              task.priority === 'Critical'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : task.priority === 'High'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : task.priority === 'Medium'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {task.priority}
                          </span>

                          <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                            {task.category}
                          </span>

                          {!validation.canComplete && !isCompleted && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Mandatory Dependencies Pending
                            </span>
                          )}

                          {task.overrideReason && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded flex items-center gap-1">
                              <Unlock className="w-3 h-3" /> Dependency Override Authorized
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-600 mt-1">{task.description}</p>
                        )}

                        <div className="text-[11px] text-slate-400 mt-2 flex flex-wrap items-center gap-4">
                          <span>Due: <strong className="text-slate-700">{task.dueDate}</strong></span>
                          <span>Assigned: <strong className="text-slate-700">{task.assignedTo}</strong></span>
                          {task.dependencies && task.dependencies.length > 0 && (
                            <span>
                              Prerequisites: {task.dependencies.join(', ')}
                            </span>
                          )}
                          {task.completedAt && (
                            <span className="text-emerald-600">
                              Completed: {new Date(task.completedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MILESTONES & SCHEDULE */}
      {activeTab === 'milestones' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-teal-600" />
              Timeline & Milestone Schedule Tracking
            </h2>
            <p className="text-xs text-slate-600 mb-6">
              Track major event milestones, delay in days, and critical-path schedule impact.
            </p>

            {milestones.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No timeline milestones defined. Generate or seed an event plan to view milestones.
              </div>
            ) : (
              <div className="relative border-l-2 border-teal-200 ml-4 pl-6 space-y-6">
                {milestones.map((m) => {
                  const isDone = m.status === 'Completed';
                  const isDelayed = (m.delayInDays && m.delayInDays > 0) || m.status === 'Delayed';

                  return (
                    <div key={m.id} className="relative">
                      {/* Timeline dot */}
                      <span
                        className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                          isDone
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : isDelayed
                            ? 'border-rose-500 bg-rose-500 text-white'
                            : 'border-teal-500'
                        }`}
                      />

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{m.title}</h4>
                          <div className="flex items-center gap-2">
                            {m.isCriticalPath && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 font-extrabold text-[10px] rounded border border-purple-200">
                                [CRITICAL PATH]
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                                isDone
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isDelayed
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {m.status}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 mt-1">{m.description}</p>

                        <div className="text-[11px] text-slate-500 mt-3 flex flex-wrap items-center gap-4">
                          <span>Target Date: <strong className="text-slate-800">{m.targetDate}</strong></span>
                          <span>Assigned To: <strong className="text-slate-800">{m.assignedTo || 'Lead Coordinator'}</strong></span>
                          {isDelayed && (
                            <span className="text-rose-600 font-bold">
                              Delayed by {m.delayInDays || 2} days
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: VENDOR EXECUTION TRACKING */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              Vendor Execution & Delivery Stage Tracker
            </h2>
            <p className="text-xs text-slate-600 mb-6">
              Track vendor progress across 8 execution stages from quotation through event-day readiness.
            </p>

            {vendorTrackings.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No active vendors associated with this event.
              </div>
            ) : (
              <div className="space-y-6">
                {vendorTrackings.map((vt) => {
                  const currentStageIdx = DEFAULT_VENDOR_STAGES.indexOf(vt.currentStage || 'Quotation Received');

                  return (
                    <div
                      key={vt.vendorId}
                      className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{vt.vendorName}</h3>
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded">
                              {vt.category}
                            </span>
                            {vt.isConfirmed ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Confirmed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Unconfirmed
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Contact: {vt.contactPerson || 'Vendor Lead'} • Agreed Budget: ₹{(vt.totalAgreedAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">Set Execution Stage:</span>
                          <select
                            value={vt.currentStage}
                            onChange={(e) =>
                              handleUpdateVendorStage(vt.vendorId, e.target.value as VendorExecutionStage)
                            }
                            className="py-1.5 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
                          >
                            {DEFAULT_VENDOR_STAGES.map((stg) => (
                              <option key={stg} value={stg}>
                                {stg}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 8-Stage Progress Bar */}
                      <div className="pt-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                          <span>Quotation</span>
                          <span>Negotiation</span>
                          <span>Contract</span>
                          <span>Advance</span>
                          <span>Final Pay</span>
                          <span>Prep</span>
                          <span>Event-Day</span>
                          <span>Post-Event</span>
                        </div>
                        <div className="grid grid-cols-8 gap-1 bg-slate-200 p-1 rounded-lg">
                          {DEFAULT_VENDOR_STAGES.map((stg, i) => (
                            <div
                              key={stg}
                              className={`h-2 rounded ${
                                i <= currentStageIdx
                                  ? 'bg-teal-600'
                                  : 'bg-slate-300'
                              }`}
                              title={`${stg} (${i <= currentStageIdx ? 'Passed' : 'Pending'})`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: OPERATIONAL RISK REGISTER */}
      {activeTab === 'risks' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  Operational Risk & Issue Register
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Auto-flagged overdue tasks, delayed milestones, unconfirmed vendors, and custom issues.
                </p>
              </div>

              <button
                onClick={() => setShowAddIssueModal(true)}
                className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Log Custom Issue
              </button>
            </div>

            {allIssues.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No operational risks or issues recorded.
              </div>
            ) : (
              <div className="space-y-4">
                {allIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      issue.status === 'Resolved'
                        ? 'bg-slate-50 border-slate-200 opacity-70'
                        : issue.severity === 'Critical'
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-amber-50/70 border-amber-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{issue.title}</span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${
                            issue.severity === 'Critical'
                              ? 'bg-rose-200 text-rose-800'
                              : issue.severity === 'High'
                              ? 'bg-amber-200 text-amber-800'
                              : 'bg-blue-200 text-blue-800'
                          }`}
                        >
                          {issue.severity} Severity
                        </span>
                        {issue.isAutoFlagged && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded">
                            Auto-Flagged
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{issue.description}</p>
                      {issue.recommendedMitigation && (
                        <div className="text-xs text-slate-800 font-semibold mt-2">
                          Mitigation: <span className="font-normal">{issue.recommendedMitigation}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      Detected: {new Date(issue.detectedAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: ACTIVITY HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Chronological System Activity Log
            </h2>
            <p className="text-xs text-slate-600 mb-6">
              Complete audit trial of execution actions performed by Event administrator.
            </p>

            {activityLog.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No activity recorded yet. Actions will be logged chronologically.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activityLog.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{log.action}</span>
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded">
                          {log.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Actor: <strong className="text-slate-700">{log.actor}</strong>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: AI OPERATIONS COPILOT */}
      {activeTab === 'copilot' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-600" />
                  AI Event Operations Briefing Copilot
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Generates operational summaries, urgent action plans, and vendor gap analysis using Gemini API.
                </p>
              </div>

              <button
                onClick={handleFetchCopilotInsight}
                disabled={copilotLoading}
                className="py-2.5 px-5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl text-xs shadow transition flex items-center gap-2 disabled:opacity-50"
              >
                {copilotLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {copilotLoading ? 'Generating AI Briefing...' : 'Generate Operational Briefing'}
              </button>
            </div>

            {copilotError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl mb-4">
                {copilotError}
              </div>
            )}

            {!copilotInsight && !copilotLoading && (
              <div className="py-12 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Click &quot;Generate Operational Briefing&quot; to inspect real-time AI operations recommendations.
              </div>
            )}

            {copilotInsight && (
              <div className="space-y-6">
                {/* Truthful Model Attribution Badge */}
                <div className="p-3 bg-slate-900 text-white rounded-xl text-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Response Source: <strong className="text-teal-300">{copilotInsight.source}</strong></span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-300 text-[11px]">
                    <span>Requested: <strong>{copilotInsight.requestedModel}</strong></span>
                    <span>Actual: <strong>{copilotInsight.actualModel || 'Unreported'}</strong></span>
                    <span>Fallback: <strong>{copilotInsight.fallbackType}</strong></span>
                  </div>
                </div>

                {/* Grounded Briefing */}
                <div className="p-5 bg-teal-50/60 border border-teal-200 rounded-2xl">
                  <h3 className="text-sm font-bold text-teal-950 mb-2">Grounded Operational Briefing</h3>
                  <p className="text-xs text-teal-900 leading-relaxed whitespace-pre-line">
                    {copilotInsight.groundedSummary}
                  </p>
                </div>

                {/* Urgent Action Items */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Urgent Operational Actions
                  </h3>
                  <div className="space-y-2">
                    {copilotInsight.urgentActions.map((action, i) => (
                      <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                        <span className="font-bold text-amber-700">•</span>
                        {action}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vendor Coordination Gaps */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Vendor Coordination Gaps
                  </h3>
                  <div className="space-y-2">
                    {copilotInsight.vendorCoordinationGaps.map((gap, i) => (
                      <div key={i} className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                        <span className="font-bold text-blue-700">•</span>
                        {gap}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD TASK */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Execution Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Conduct sound check at venue"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Operations">Operations</option>
                    <option value="Venue">Venue</option>
                    <option value="Catering">Catering</option>
                    <option value="Decoration">Decoration</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Guest Management">Guest Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Operational details or specific requirements..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DEPENDENCY OVERRIDE CONFIRMATION */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
            <div className="flex items-center gap-3 text-rose-700 mb-3">
              <Lock className="w-6 h-6 text-rose-600" />
              <h3 className="text-base font-bold">Mandatory Dependency Enforcement</h3>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              This task cannot be completed through standard validation because its prerequisite mandatory tasks are incomplete:
            </p>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold mb-4">
              {overrideError}
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-900">
                Authorize Override Rationale (Required for Audit Log) *
              </label>
              <textarea
                rows={3}
                required
                value={overrideReason}
                onChange={(e) => {
                  setOverrideReason(e.target.value);
                  setOverrideError('');
                }}
                placeholder="State operational reason for overriding mandatory dependency (e.g., Client verbally approved venue layout during walk-through)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowOverrideModal(false);
                  setTargetTaskId(null);
                  setOverrideReason('');
                  setOverrideError('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOverride}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5"
              >
                <Unlock className="w-4 h-4" /> Authorize Override & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: LOG CUSTOM OPERATIONAL ISSUE */}
      {showAddIssueModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Log Operational Issue</h3>
            <form onSubmit={handleCreateIssue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Title *</label>
                <input
                  type="text"
                  required
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  placeholder="e.g., Generator fuel capacity warning"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
                  <select
                    value={newIssueSeverity}
                    onChange={(e) => setNewIssueSeverity(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={newIssueCategory}
                    onChange={(e) => setNewIssueCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newIssueDescription}
                  onChange={(e) => setNewIssueDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recommended Mitigation</label>
                <textarea
                  rows={2}
                  value={newIssueMitigation}
                  onChange={(e) => setNewIssueMitigation(e.target.value)}
                  placeholder="Planned mitigation step..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddIssueModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow"
                >
                  Log Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
