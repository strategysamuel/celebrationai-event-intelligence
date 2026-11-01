import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateEventReadinessScore,
  validateTaskCompletion,
  generateAutoFlaggedIssues,
  calculateVendorExecutionSummary,
  createActivityLogEntry,
  generateDemoExecutionChecklist,
  generateHeuristicOperationsInsight,
  DEFAULT_VENDOR_STAGES,
} from '../src/domain/executionEngine';
import { handleOperationsCopilot, setAiClientForTesting } from '../server/geminiService';
import {
  EventPlan,
  Task,
  Milestone,
  VendorExecutionTracking,
  OperationalIssue,
} from '../src/types';

const mockBaseEvent: EventPlan = {
  id: 'evt-chennai-450',
  name: "Ananya & Rohan's Royal Traditional Wedding",
  type: 'Wedding',
  location: 'Chennai, Tamil Nadu, India',
  eventDate: '2027-02-15',
  date: '2027-02-15',
  guestCount: 450,
  totalBudget: 1500000,
  budget: 1500000,
  currency: 'INR',
  createdAt: '2026-10-15T10:00:00Z',
  updatedAt: '2026-11-01T08:30:00Z',
  budgetAllocations: [],
  expenses: [],
  milestones: [
    {
      id: 'm-1',
      title: 'Venue Contract Signing',
      targetDate: '2026-11-15',
      status: 'Completed',
      isCriticalPath: true,
      description: 'Sign agreement for Coastal Lawns',
    },
    {
      id: 'm-2',
      title: 'Catering Tasting',
      targetDate: '2026-12-01',
      status: 'In Progress',
      isCriticalPath: true,
      description: 'Finalize traditional 14-item banana leaf menu',
    },
  ],
  tasks: [],
  vendors: [
    {
      id: 'v-1',
      name: 'South Grand Catering',
      category: 'Catering',
      amount: 495000,
      quotedPrice: 495000,
      negotiatedPrice: 495000,
      phone: '9876543210',
      email: 'catering@southgrand.com',
      status: 'Confirmed',
      paymentStatus: 'Advance Paid',
      paidAmount: 150000,
      isPreferred: true,
      contactPerson: 'Ramanathan',
    },
    {
      id: 'v-2',
      name: 'Coastal Heritage Lawns',
      category: 'Venue',
      amount: 330000,
      quotedPrice: 330000,
      negotiatedPrice: 330000,
      phone: '9876543211',
      email: 'info@coastalheritage.com',
      status: 'Confirmed',
      paymentStatus: 'Advance Paid',
      paidAmount: 100000,
      isPreferred: true,
      contactPerson: 'Suresh',
    },
  ],
  risks: [],
  activityLog: [],
};

describe('CAI-005 Event Execution, Monitoring & Readiness Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAiClientForTesting(null);
  });

  describe('1. Synthetic Demonstration Dataset', () => {
    it('generates demo execution checklist for Chennai Wedding with 450 guests', () => {
      const demoTasks = generateDemoExecutionChecklist();
      expect(demoTasks).toBeDefined();
      expect(demoTasks.length).toBeGreaterThanOrEqual(7);

      const mandatoryTasks = demoTasks.filter((t) => t.isMandatory);
      expect(mandatoryTasks.length).toBeGreaterThan(0);

      const criticalTasks = demoTasks.filter((t) => t.priority === 'Critical');
      expect(criticalTasks.length).toBeGreaterThan(0);
    });
  });

  describe('2. Deterministic 4-Factor Event Readiness Scoring & Penalties', () => {
    it('calculates 100% readiness score for a perfectly completed event', () => {
      const perfectTasks: Task[] = [
        {
          id: 't-1',
          title: 'Sign Venue Contract',
          category: 'Venue',
          status: 'Completed',
          priority: 'Critical',
          dueDate: '2026-11-01',
          assignedTo: 'Lead Coordinator',
          isMandatory: true,
          dependencies: [],
        },
      ];

      const perfectMilestones: Milestone[] = [
        {
          id: 'm-1',
          title: 'Venue Locked',
          description: 'Confirmed',
          targetDate: '2026-11-01',
          status: 'Completed',
          isCriticalPath: true,
        },
      ];

      const perfectVendors: VendorExecutionTracking[] = [
        {
          vendorId: 'v-1',
          vendorName: 'South Grand Catering',
          category: 'Catering',
          currentStage: 'Event-Day Readiness',
          stageHistory: [],
          deliverableChecklist: [],
          advancePaymentPaid: 150000,
          finalPaymentPaid: 345000,
          totalAgreedAmount: 495000,
          isConfirmed: true,
          contactPerson: 'Lead',
        },
      ];

      const perfectEvent: EventPlan = {
        ...mockBaseEvent,
        tasks: perfectTasks,
        milestones: perfectMilestones,
        timeline: { milestones: perfectMilestones },
      };

      const readiness = calculateEventReadinessScore(perfectEvent, perfectVendors, []);
      expect(readiness.score).toBe(100);
      expect(readiness.label).toBe('Optimum Readiness');
      expect(readiness.breakdown.penaltyDeduction).toBe(0);
    });

    it('applies explicit -10 penalty deductions for blocked tasks and unconfirmed critical vendors', () => {
      const blockedTask: Task = {
        id: 't-blocked',
        title: 'Stage Electrical Wiring',
        category: 'Decoration',
        status: 'Blocked',
        priority: 'Critical',
        dueDate: '2026-11-01',
        assignedTo: 'Electrician',
        isMandatory: true,
        dependencies: [],
      };

      const unconfirmedVendors: VendorExecutionTracking[] = [
        {
          vendorId: 'v-1',
          vendorName: 'South Grand Catering',
          category: 'Catering',
          currentStage: 'Quotation Received',
          stageHistory: [],
          deliverableChecklist: [],
          advancePaymentPaid: 0,
          finalPaymentPaid: 0,
          totalAgreedAmount: 495000,
          isConfirmed: false,
          contactPerson: 'Lead',
        },
      ];

      const eventWithBlockedTask: EventPlan = {
        ...mockBaseEvent,
        tasks: [blockedTask],
      };

      const readiness = calculateEventReadinessScore(eventWithBlockedTask, unconfirmedVendors, []);
      expect(readiness.breakdown.penaltyDeduction).toBeGreaterThanOrEqual(20);
      expect(readiness.penalties).toContain('Blocked critical execution task (-10 pts)');
      expect(readiness.penalties).toContain('Unconfirmed critical vendor (catering/venue) (-10 pts)');
    });

    it('handles missing or empty event data safely without NaN or throwing errors', () => {
      const emptyEvent: EventPlan = {
        id: 'empty-1',
        name: 'New Event',
        type: 'Wedding',
        location: 'Location',
        eventDate: '2027-05-01',
        date: '2027-05-01',
        guestCount: 0,
        totalBudget: 0,
        budget: 0,
        currency: 'INR',
        createdAt: '2026-11-01',
        updatedAt: '2026-11-01',
        budgetAllocations: [],
        expenses: [],
        milestones: [],
        tasks: [],
        vendors: [],
        risks: [],
      };

      const result = calculateEventReadinessScore(emptyEvent, [], []);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(isNaN(result.score)).toBe(false);
    });
  });

  describe('3. Mandatory Task Dependency Enforcement & Override Rules', () => {
    it('allows completing a task when all mandatory dependencies are completed', () => {
      const taskList: Task[] = [
        {
          id: 't-1',
          title: 'Finalize Floor Plan',
          category: 'Venue',
          status: 'Completed',
          priority: 'Critical',
          dueDate: '2026-11-01',
          assignedTo: 'Planner',
          isMandatory: true,
          dependencies: [],
        },
        {
          id: 't-2',
          title: 'Set Up Tables',
          category: 'Decoration',
          status: 'Pending',
          priority: 'High',
          dueDate: '2026-11-02',
          assignedTo: 'Decorator',
          isMandatory: true,
          dependencies: ['t-1'],
        },
      ];

      const validation = validateTaskCompletion('t-2', taskList);
      expect(validation.canComplete).toBe(true);
    });

    it('blocks completion when mandatory prerequisite task is incomplete', () => {
      const taskList: Task[] = [
        {
          id: 't-1',
          title: 'Finalize Floor Plan',
          category: 'Venue',
          status: 'In Progress',
          priority: 'Critical',
          dueDate: '2026-11-01',
          assignedTo: 'Planner',
          isMandatory: true,
          dependencies: [],
        },
        {
          id: 't-2',
          title: 'Set Up Tables',
          category: 'Decoration',
          status: 'Pending',
          priority: 'High',
          dueDate: '2026-11-02',
          assignedTo: 'Decorator',
          isMandatory: true,
          dependencies: ['t-1'],
        },
      ];

      const validation = validateTaskCompletion('t-2', taskList);
      expect(validation.canComplete).toBe(false);
      expect(validation.reason).toContain('Prerequisite task "Finalize Floor Plan" is incomplete');
    });
  });

  describe('4. Operational Risk Auto-Flagging Engine', () => {
    it('auto-flags overdue critical tasks and unconfirmed critical vendors', () => {
      const overdueTask: Task = {
        id: 't-overdue',
        title: 'Pay Venue Security Deposit',
        category: 'Venue',
        status: 'Overdue',
        priority: 'Critical',
        dueDate: '2026-10-01',
        assignedTo: 'Finance',
        isMandatory: true,
        dependencies: [],
      };

      const unconfirmedVendors: VendorExecutionTracking[] = [
        {
          vendorId: 'v-unconfirmed',
          vendorName: 'Royal Tent House',
          category: 'Catering',
          currentStage: 'Quotation Received',
          stageHistory: [],
          deliverableChecklist: [],
          advancePaymentPaid: 0,
          finalPaymentPaid: 0,
          totalAgreedAmount: 500000,
          isConfirmed: false,
          contactPerson: 'Lead',
        },
      ];

      const testEvent: EventPlan = {
        ...mockBaseEvent,
        tasks: [overdueTask],
      };

      const issues = generateAutoFlaggedIssues(testEvent, unconfirmedVendors);
      expect(issues.length).toBeGreaterThan(0);

      const overdueIssue = issues.find((i) => i.title.includes('Overdue Task'));
      expect(overdueIssue).toBeDefined();
      expect(overdueIssue?.severity).toBe('Critical');

      const vendorIssue = issues.find((i) => i.title.includes('Unconfirmed Vendor'));
      expect(vendorIssue).toBeDefined();
    });
  });

  describe('5. Vendor Execution Stage Tracking Summary', () => {
    it('calculates vendor stage distribution and payment commitments', () => {
      const trackings: VendorExecutionTracking[] = [
        {
          vendorId: 'v-1',
          vendorName: 'Catering Vendor',
          category: 'Catering',
          currentStage: 'Advance Payment',
          stageHistory: [],
          deliverableChecklist: [],
          advancePaymentPaid: 150000,
          finalPaymentPaid: 0,
          totalAgreedAmount: 495000,
          isConfirmed: true,
          contactPerson: 'Lead',
        },
        {
          vendorId: 'v-2',
          vendorName: 'Venue Vendor',
          category: 'Venue',
          currentStage: 'Contract Status',
          stageHistory: [],
          deliverableChecklist: [],
          advancePaymentPaid: 100000,
          finalPaymentPaid: 0,
          totalAgreedAmount: 330000,
          isConfirmed: true,
          contactPerson: 'Lead',
        },
      ];

      const summary = calculateVendorExecutionSummary(trackings);
      expect(summary.totalVendors).toBe(2);
      expect(summary.confirmedCount).toBe(2);
      expect(summary.totalCommitted).toBe(825000);
      expect(summary.totalAdvancePaid).toBe(250000);
      expect(summary.stageCounts['Advance Payment']).toBe(1);
    });
  });

  describe('6. Chronological Activity Logging', () => {
    it('creates an activity log entry with neutral actor "Event administrator"', () => {
      const entry = createActivityLogEntry(
        'Dependency Override',
        'Authorized dependency override for floor plan task',
        { taskId: 't-101', rationale: 'Client verbal approval' }
      );

      expect(entry.actor).toBe('Event administrator');
      expect(entry.category).toBe('Dependency Override');
      expect(entry.action).toContain('Authorized dependency override');
      expect(entry.timestamp).toBeDefined();
    });
  });

  describe('7. AI Operations Copilot & Fallback Routing', () => {
    it('returns grounded heuristic operations insight when Gemini client is not initialized', async () => {
      const insight = await handleOperationsCopilot(mockBaseEvent);

      expect(insight).toBeDefined();
      expect(insight.source).toBe('heuristic');
      expect(insight.requestedModel).toBe('gemini-3.8-flash');
      expect(insight.fallbackType).toBe('heuristic');
      expect(insight.groundedSummary).toContain('Chennai');
      expect(insight.urgentActions.length).toBeGreaterThan(0);
      expect(insight.vendorCoordinationGaps.length).toBeGreaterThan(0);
    });

    it('correctly attributes live response metadata when Gemini API succeeds', async () => {
      const mockAiClient = {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify({
              groundedSummary: 'Live Gemini operational briefing for Chennai Wedding.',
              urgentActions: ['Re-verify banana leaf supplier', 'Confirm generator back-up'],
              vendorCoordinationGaps: ['Catering stage is Advance Payment'],
            }),
            modelVersion: 'gemini-3.8-flash-2026-11',
          }),
        },
      };

      setAiClientForTesting(mockAiClient as any);

      const insight = await handleOperationsCopilot(mockBaseEvent);

      expect(insight.source).toBe('gemini');
      expect(insight.requestedModel).toBe('gemini-3.8-flash');
      expect(insight.actualModel).toBe('gemini-3.8-flash-2026-11');
      expect(insight.fallbackType).toBe('upstream_model_difference');
      expect(insight.groundedSummary).toContain('Live Gemini operational briefing');
    });
  });
});
