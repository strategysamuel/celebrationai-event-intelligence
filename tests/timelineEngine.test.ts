import { describe, it, expect } from 'vitest';
import {
  calculateDateBackward,
  generateDefaultMilestones,
  generateDefaultTasks,
  recalculateTimelineOnDateChange,
  analyzeTimelineHealth,
} from '../src/domain/timelineEngine';
import { Task } from '../src/types';

describe('Timeline & Backward Scheduling Engine', () => {
  it('correctly calculates backwards calendar dates', () => {
    const eventDate = '2027-02-15';
    // 10 days before Feb 15, 2027 is Feb 05, 2027
    const result = calculateDateBackward(eventDate, 10);
    expect(result).toBe('2027-02-05');
  });

  it('explicitly rejects invalid date strings with descriptive errors instead of silent fallbacks', () => {
    expect(() => calculateDateBackward('invalid-date', 10)).toThrow(/Invalid event date/);
    expect(() => calculateDateBackward('', 10)).toThrow(/Invalid event date/);
    expect(() => calculateDateBackward('2025-99-99', 10)).toThrow(/Invalid event date/);
  });

  it('generates sequential milestones and tasks for valid dates', () => {
    const milestones = generateDefaultMilestones('2027-02-15', 'Wedding');
    expect(milestones.length).toBeGreaterThanOrEqual(8);
    expect(milestones[0].daysBeforeEvent ?? 0).toBeGreaterThan(milestones[milestones.length - 1].daysBeforeEvent ?? 0);

    const tasks = generateDefaultTasks('2027-02-15', milestones);
    expect(tasks.length).toBeGreaterThanOrEqual(10);
  });

  it('rejects milestone and task generation when given invalid dates', () => {
    expect(() => generateDefaultMilestones('not-a-date', 'Wedding')).toThrow(/Invalid event date/);
    expect(() => generateDefaultTasks('not-a-date', [])).toThrow(/Invalid event date/);
  });

  it('recalculates all milestones and tasks when valid event date shifts', () => {
    const milestones = generateDefaultMilestones('2027-02-15', 'Wedding');
    const tasks = generateDefaultTasks('2027-02-15', milestones);

    const shiftResult = recalculateTimelineOnDateChange('2027-03-15', milestones, tasks);
    expect(shiftResult.shiftedMilestoneCount).toBe(milestones.length);
    // Milestone at T-0 should now be 2027-03-15
    const dayZero = shiftResult.updatedMilestones.find((m) => m.daysBeforeEvent === 0);
    expect(dayZero?.targetDate).toBe('2027-03-15');
  });

  it('safely throws validation error on invalid date shift instead of silent fallback', () => {
    const milestones = generateDefaultMilestones('2027-02-15', 'Wedding');
    const tasks = generateDefaultTasks('2027-02-15', milestones);

    expect(() => recalculateTimelineOnDateChange('malformed-date', milestones, tasks)).toThrow(
      /Invalid event date/
    );
  });

  it('detects completion percentages and overdue tasks', () => {
    const milestones = generateDefaultMilestones('2027-02-15', 'Wedding');
    const tasks = generateDefaultTasks('2027-02-15', milestones);

    // Mark one completed
    tasks[0].status = 'Completed';
    const health = analyzeTimelineHealth(tasks, '2026-11-01');

    expect(health.completedTasks).toBe(1);
    expect(health.totalTasks).toBe(tasks.length);
    expect(health.completionPercent).toBe(Math.round((1 / tasks.length) * 100));
  });

  it('identifies blocked tasks when prerequisite dependencies are pending', () => {
    const taskA: Task = {
      id: 't-a',
      title: 'Prerequisite Task',
      category: 'Venue',
      milestoneId: 'm-1',
      dueDate: '2026-11-10',
      daysBeforeEvent: 90,
      status: 'Pending',
      priority: 'High',
      dependencies: [],
      isCriticalPath: true,
    };

    const taskB: Task = {
      id: 't-b',
      title: 'Dependent Task',
      category: 'Venue',
      milestoneId: 'm-1',
      dueDate: '2026-11-20',
      daysBeforeEvent: 80,
      status: 'Pending',
      priority: 'High',
      dependencies: ['t-a'],
      isCriticalPath: true,
    };

    const health = analyzeTimelineHealth([taskA, taskB], '2026-11-01');
    expect(health.blockedTasks.length).toBe(1);
    expect(health.blockedTasks[0].task.id).toBe('t-b');
    expect(health.blockedTasks[0].blockedBy[0].id).toBe('t-a');
  });
});
