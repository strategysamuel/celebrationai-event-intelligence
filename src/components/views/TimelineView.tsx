import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  ShieldAlert,
} from 'lucide-react';
import { EventPlan, Task, Milestone, TaskStatus, PriorityLevel, VendorCategory } from '../../types';
import {
  analyzeTimelineHealth,
  calculateDateBackward,
  recalculateTimelineOnDateChange,
} from '../../domain/timelineEngine';
import { useAccessibleModal } from '../../hooks/useAccessibleModal';

interface TimelineViewProps {
  activeEvent: EventPlan;
  onUpdateEvent: (updated: EventPlan) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  activeEvent,
  onUpdateEvent,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // New Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const modalRef = useAccessibleModal({
    isOpen: isTaskModalOpen,
    onClose: () => setIsTaskModalOpen(false),
  });
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<VendorCategory>('Venue');
  const [taskDaysBefore, setTaskDaysBefore] = useState<number>(60);
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>('High');
  const [isCriticalPath, setIsCriticalPath] = useState<boolean>(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(
    activeEvent.milestones[0]?.id || 'm-1'
  );

  const health = analyzeTimelineHealth(activeEvent.tasks);

  const handleToggleTaskStatus = (taskId: string) => {
    const updatedTasks = activeEvent.tasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus: TaskStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
        return { ...t, status: nextStatus };
      }
      return t;
    });

    onUpdateEvent({
      ...activeEvent,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = activeEvent.tasks.filter((t) => t.id !== taskId);
    onUpdateEvent({
      ...activeEvent,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: taskTitle.trim(),
      category: taskCategory,
      milestoneId: selectedMilestoneId,
      daysBeforeEvent: taskDaysBefore,
      dueDate: calculateDateBackward(activeEvent.eventDate, taskDaysBefore),
      status: 'Pending',
      priority: taskPriority,
      dependencies: [],
      isCriticalPath,
    };

    onUpdateEvent({
      ...activeEvent,
      tasks: [newTask, ...activeEvent.tasks],
      updatedAt: new Date().toISOString(),
    });

    setIsTaskModalOpen(false);
    setTaskTitle('');
    setTaskDaysBefore(60);
  };

  const filteredTasks = activeEvent.tasks.filter((t) => {
    if (filterCategory !== 'All' && t.category !== filterCategory) return false;
    if (filterStatus !== 'All' && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Timeline & Backward Scheduling Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Target Event Date: <strong className="text-slate-800">{activeEvent.eventDate}</strong> •
            Automated milestone recalibration & critical path governance
          </p>
        </div>

        <button
          onClick={() => setIsTaskModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task Deliverable</span>
        </button>
      </div>

      {/* Timeline Health Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Completion Rate
          </span>
          <div className="text-2xl font-bold text-slate-900">
            {health.completionPercent}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {health.completedTasks} of {health.totalTasks} completed
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Critical Path Items
          </span>
          <div className="text-2xl font-bold text-indigo-600">
            {health.criticalPathPending.length} Pending
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Zero-slack foundational deliverables
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Overdue Tasks
          </span>
          <div
            className={`text-2xl font-bold ${
              health.overdueTasks.length > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {health.overdueTasks.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {health.overdueTasks.length > 0 ? 'Requires priority action' : 'All milestones on schedule'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Blocked by Prerequisite
          </span>
          <div className="text-2xl font-bold text-amber-600">
            {health.blockedTasks.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Awaiting dependency completion
          </span>
        </div>
      </div>

      {/* Backward Scheduling Milestones Runway */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-2">
          Milestone Backward Scheduling Runway
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Sequential gates scheduled backwards from Event Day (T-0) to ensure zero last-minute panic
        </p>

        <div className="relative pl-6 sm:pl-8 border-l-2 border-blue-500/30 space-y-6">
          {activeEvent.milestones.map((m, index) => {
            const milestoneTasks = activeEvent.tasks.filter((t) => t.milestoneId === m.id);
            const completedCount = milestoneTasks.filter((t) => t.status === 'Completed').length;
            const isFinished = milestoneTasks.length > 0 && completedCount === milestoneTasks.length;

            return (
              <div key={m.id} className="relative group">
                {/* Node dot */}
                <div
                  className={`absolute -left-[31px] sm:-left-[39px] top-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${
                    isFinished
                      ? 'bg-emerald-500'
                      : m.daysBeforeEvent === 0
                      ? 'bg-teal-500 animate-bounce'
                      : 'bg-blue-600'
                  }`}
                >
                  {index + 1}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <h4 className="text-xs font-bold text-slate-800">
                      {m.title}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">
                      T - {m.daysBeforeEvent} Days ({m.targetDate})
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-1">
                    <span>
                      {completedCount}/{milestoneTasks.length} tasks finished
                    </span>
                    {isFinished && (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Gate Cleared
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Management & Execution List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Execution Task Ledger</h3>
            <p className="text-xs text-slate-500">
              Interactive checklist with dependency tracking, critical path tags, and due dates
            </p>
          </div>

          {/* Filter dropdowns */}
          <div className="flex items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Venue">Venue</option>
              <option value="Catering">Catering</option>
              <option value="Decoration">Decoration</option>
              <option value="Photography">Photography</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Transport">Transport</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {filteredTasks.map((t) => {
            const isDone = t.status === 'Completed';

            return (
              <div
                key={t.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                  isDone
                    ? 'bg-slate-50/50 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleTaskStatus(t.id)}
                    className="text-slate-400 hover:text-blue-600 cursor-pointer"
                  >
                    {isDone ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div>
                    <span
                      className={`text-xs font-semibold block ${
                        isDone ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {t.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {t.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Due: {t.dueDate} (T-{t.daysBeforeEvent}d)
                      </span>
                      {t.isCriticalPath && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                          Critical Path
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.priority === 'High'
                        ? 'bg-rose-100 text-rose-700'
                        : t.priority === 'Medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t.priority}
                  </span>

                  <button
                    onClick={() => handleDeleteTask(t.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
                    title="Delete task"
                    aria-label={`Delete task ${t.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Task Modal */}
      {isTaskModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 focus:outline-none"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 id="task-modal-title" className="text-base font-bold text-slate-900">Add Task Deliverable</h2>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer p-1 rounded focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-3.5">
              <div>
                <label htmlFor="task-title" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Task Title *
                </label>
                <input
                  id="task-title"
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Finalize floral stage backdrop mockups"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="task-category" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    id="task-category"
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as VendorCategory)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Venue">Venue</option>
                    <option value="Catering">Catering</option>
                    <option value="Decoration">Decoration</option>
                    <option value="Photography">Photography</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Transport">Transport</option>
                    <option value="Accommodation">Accommodation</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="task-priority" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Priority *
                  </label>
                  <select
                    id="task-priority"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as PriorityLevel)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="task-days-before" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Days Before Event (Backward Schedule) *
                </label>
                <input
                  id="task-days-before"
                  type="number"
                  min="0"
                  max="365"
                  value={taskDaysBefore}
                  onChange={(e) => setTaskDaysBefore(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Calculated Due Date: {calculateDateBackward(activeEvent.eventDate, taskDaysBefore)}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="critCheck"
                  checked={isCriticalPath}
                  onChange={(e) => setIsCriticalPath(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <label htmlFor="critCheck" className="text-xs text-slate-700 font-semibold cursor-pointer">
                  Mark as Critical Path (Zero Slack)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
