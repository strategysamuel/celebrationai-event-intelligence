/**
 * Timeline and Task Management Engine
 * Implements backward scheduling, milestone dependency graphs, and critical path analysis
 */

import { Milestone, Task, EventType, PriorityLevel, VendorCategory } from '../types';

/**
 * Checks if a date string is a valid parseable date
 */
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parsed = new Date(dateStr);
  return !isNaN(parsed.getTime());
}

/**
 * Calculates a target date based on event date and backward scheduling days.
 * Throws an explicit Error if an invalid date string is provided, ensuring
 * invalid dates are never silently converted or echoed.
 */
export function calculateDateBackward(eventDateStr: string, daysBefore: number): string {
  if (!eventDateStr || typeof eventDateStr !== 'string') {
    throw new Error(`Invalid event date: "${eventDateStr}". Date must be a non-empty string.`);
  }
  const eventDate = new Date(eventDateStr);
  if (isNaN(eventDate.getTime())) {
    throw new Error(`Invalid event date: "${eventDateStr}". Date must be a valid ISO format (YYYY-MM-DD).`);
  }
  const target = new Date(eventDate);
  target.setDate(target.getDate() - daysBefore);
  return target.toISOString().split('T')[0];
}

/**
 * Default milestone templates based on event type.
 * Throws an explicit Error if the event date is invalid.
 */
export function generateDefaultMilestones(eventDate: string, eventType: EventType): Milestone[] {
  if (!isValidDateString(eventDate)) {
    throw new Error(`Invalid event date: "${eventDate}". Cannot generate milestones with an invalid date.`);
  }

  // Milestone days before event
  const baseMilestones = [
    { title: 'Core Vision, Budget & Theme Finalization', daysBeforeEvent: 180, order: 1 },
    { title: 'Prime Venue Selection & Booking', daysBeforeEvent: 150, order: 2 },
    { title: 'Critical Vendors Locked (Catering & Photo)', daysBeforeEvent: 120, order: 3 },
    { title: 'Guest List Finalized & Save-the-Dates Sent', daysBeforeEvent: 90, order: 4 },
    { title: 'Decor Concept & Entertainment Rehearsals', daysBeforeEvent: 60, order: 5 },
    { title: 'Formal Invitations & RSVP Collection', daysBeforeEvent: 45, order: 6 },
    { title: 'Logistics, Transport & Wardrobe Fittings', daysBeforeEvent: 30, order: 7 },
    { title: 'Final Headcount & Run of Show Lock', daysBeforeEvent: 14, order: 8 },
    { title: 'Rehearsal Dinner & Day-Before Prep', daysBeforeEvent: 1, order: 9 },
    { title: 'Celebration Day Execution', daysBeforeEvent: 0, order: 10 },
  ];

  return baseMilestones.map((m, index) => ({
    id: `m-${index + 1}`,
    title: m.title,
    daysBeforeEvent: m.daysBeforeEvent,
    targetDate: calculateDateBackward(eventDate, m.daysBeforeEvent),
    order: m.order,
    completed: false,
  }));
}

/**
 * Default task templates for events
 */
export function generateDefaultTasks(eventDate: string, milestones: Milestone[]): Task[] {
  if (!isValidDateString(eventDate)) {
    throw new Error(`Invalid event date: "${eventDate}". Cannot generate tasks with an invalid date.`);
  }
  const milestoneMap = new Map(milestones.map((m) => [m.order, m.id]));

  const rawTasks: {
    title: string;
    category: VendorCategory;
    milestoneOrder: number;
    daysBeforeEvent: number;
    priority: PriorityLevel;
    isCriticalPath: boolean;
    depIndex?: number;
  }[] = [
    {
      title: 'Determine overall event budget ceiling & contingency pool',
      category: 'Miscellaneous',
      milestoneOrder: 1,
      daysBeforeEvent: 180,
      priority: 'High',
      isCriticalPath: true,
    },
    {
      title: 'Shortlist top 3 potential venues and schedule site walkthroughs',
      category: 'Venue',
      milestoneOrder: 2,
      daysBeforeEvent: 165,
      priority: 'High',
      isCriticalPath: true,
    },
    {
      title: 'Sign venue contract and pay initial deposit to secure date',
      category: 'Venue',
      milestoneOrder: 2,
      daysBeforeEvent: 150,
      priority: 'High',
      isCriticalPath: true,
      depIndex: 1,
    },
    {
      title: 'Conduct food tasting sessions with catering candidates',
      category: 'Catering',
      milestoneOrder: 3,
      daysBeforeEvent: 135,
      priority: 'High',
      isCriticalPath: true,
    },
    {
      title: 'Confirm primary caterer and lock menu selections',
      category: 'Catering',
      milestoneOrder: 3,
      daysBeforeEvent: 120,
      priority: 'High',
      isCriticalPath: true,
      depIndex: 3,
    },
    {
      title: 'Book lead photographer & videographer crew',
      category: 'Photography',
      milestoneOrder: 3,
      daysBeforeEvent: 110,
      priority: 'Medium',
      isCriticalPath: false,
    },
    {
      title: 'Finalize guest list and dispatch digital Save the Date notices',
      category: 'Miscellaneous',
      milestoneOrder: 4,
      daysBeforeEvent: 90,
      priority: 'Medium',
      isCriticalPath: false,
    },
    {
      title: 'Review floral & stage lighting mockups with decorator',
      category: 'Decoration',
      milestoneOrder: 5,
      daysBeforeEvent: 60,
      priority: 'Medium',
      isCriticalPath: false,
    },
    {
      title: 'Book DJ / live band and curate event soundtrack',
      category: 'Entertainment',
      milestoneOrder: 5,
      daysBeforeEvent: 55,
      priority: 'Medium',
      isCriticalPath: false,
    },
    {
      title: 'Send formal invitation cards with dietary RSVP deadline',
      category: 'Miscellaneous',
      milestoneOrder: 6,
      daysBeforeEvent: 45,
      priority: 'High',
      isCriticalPath: true,
    },
    {
      title: 'Confirm airport / transit shuttles and room blocks',
      category: 'Transport',
      milestoneOrder: 7,
      daysBeforeEvent: 30,
      priority: 'Medium',
      isCriticalPath: false,
    },
    {
      title: 'Transmit finalized guest headcount to venue and catering team',
      category: 'Catering',
      milestoneOrder: 8,
      daysBeforeEvent: 14,
      priority: 'High',
      isCriticalPath: true,
      depIndex: 9,
    },
    {
      title: 'Distribute minute-by-minute run of show to all coordinators',
      category: 'Miscellaneous',
      milestoneOrder: 8,
      daysBeforeEvent: 7,
      priority: 'High',
      isCriticalPath: true,
    },
    {
      title: 'Venue walk-through with key coordinators and sound check',
      category: 'Entertainment',
      milestoneOrder: 9,
      daysBeforeEvent: 1,
      priority: 'High',
      isCriticalPath: true,
    },
  ];

  return rawTasks.map((t, idx) => {
    const taskId = `t-${idx + 1}`;
    const milestoneId = milestoneMap.get(t.milestoneOrder) || milestones[0]?.id || 'm-1';
    const depTaskId = t.depIndex !== undefined ? `t-${t.depIndex + 1}` : undefined;

    return {
      id: taskId,
      title: t.title,
      category: t.category,
      milestoneId,
      dueDate: calculateDateBackward(eventDate, t.daysBeforeEvent),
      daysBeforeEvent: t.daysBeforeEvent,
      status: 'Pending',
      priority: t.priority,
      dependencies: depTaskId ? [depTaskId] : [],
      isCriticalPath: t.isCriticalPath,
    };
  });
}

/**
 * Re-schedules milestones and tasks when the event date changes
 */
export function recalculateTimelineOnDateChange(
  newEventDate: string,
  milestones: Milestone[],
  tasks: Task[]
): {
  updatedMilestones: Milestone[];
  updatedTasks: Task[];
  shiftedMilestoneCount: number;
} {
  if (!isValidDateString(newEventDate)) {
    throw new Error(`Invalid event date: "${newEventDate}". Cannot recalculate timeline with an invalid date.`);
  }

  const updatedMilestones = milestones.map((m) => ({
    ...m,
    targetDate: calculateDateBackward(newEventDate, m.daysBeforeEvent ?? 0),
  }));

  const updatedTasks = tasks.map((t) => ({
    ...t,
    dueDate: calculateDateBackward(newEventDate, t.daysBeforeEvent ?? 0),
  }));

  return {
    updatedMilestones,
    updatedTasks,
    shiftedMilestoneCount: milestones.length,
  };
}

/**
 * Analyzes tasks for overdue status, dependency bottlenecks, and critical path
 */
export function analyzeTimelineHealth(
  tasks: Task[],
  todayStr: string = new Date().toISOString().split('T')[0]
): {
  totalTasks: number;
  completedTasks: number;
  completionPercent: number;
  overdueTasks: Task[];
  blockedTasks: { task: Task; blockedBy: Task[] }[];
  criticalPathPending: Task[];
} {
  const today = new Date(todayStr).getTime();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const overdueTasks: Task[] = [];
  const blockedTasks: { task: Task; blockedBy: Task[] }[] = [];
  const criticalPathPending: Task[] = [];

  let completedCount = 0;

  tasks.forEach((task) => {
    if (task.status === 'Completed') {
      completedCount++;
      return;
    }

    const dueDate = new Date(task.dueDate).getTime();
    if (dueDate < today) {
      overdueTasks.push({ ...task, status: 'Overdue' });
    }

    if (task.isCriticalPath) {
      criticalPathPending.push(task);
    }

    // Check dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      const blockers: Task[] = [];
      task.dependencies.forEach((depId) => {
        const depTask = taskMap.get(depId);
        if (depTask && depTask.status !== 'Completed') {
          blockers.push(depTask);
        }
      });
      if (blockers.length > 0) {
        blockedTasks.push({ task, blockedBy: blockers });
      }
    }
  });

  const completionPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return {
    totalTasks: tasks.length,
    completedTasks: completedCount,
    completionPercent,
    overdueTasks,
    blockedTasks,
    criticalPathPending,
  };
}
