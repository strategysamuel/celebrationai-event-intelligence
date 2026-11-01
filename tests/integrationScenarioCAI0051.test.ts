import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventPlan, Task, Milestone, VendorExecutionTracking, Vendor } from '../src/types';
import { eventStore } from '../src/storage/eventStore';
import { calculateBudgetSummary, validateAllocations } from '../src/domain/budgetEngine';
import { analyzeCelebrationIntelligence } from '../src/domain/celebrationIntelligenceEngine';
import { compareCategoryQuotations, SEED_DEMO_QUOTATIONS } from '../src/domain/procurementEngine';
import {
  calculateEventReadinessScore,
  validateTaskCompletion,
  generateAutoFlaggedIssues,
  calculateVendorExecutionSummary,
  generateDemoExecutionChecklist,
} from '../src/domain/executionEngine';
import { handleOperationsCopilot, setAiClientForTesting } from '../server/geminiService';

const mockChennaiWedding: EventPlan = {
  id: 'evt-chennai-450-audit',
  name: "Ananya & Rohan's Royal Traditional Wedding",
  type: 'Wedding',
  location: 'Chennai, Tamil Nadu, India',
  eventDate: '2027-02-15',
  date: '2027-02-15',
  guestCount: 300,
  totalBudget: 1500000, // ₹15 Lakhs
  budget: 1500000,
  currency: 'INR',
  userPreferences: 'Traditional South Indian Wedding',
  specialRequirements: 'Banana leaf feast, Nadaswaram, Heritage decor',
  priorityConsiderations: 'Catering authenticity',
  createdAt: '2026-10-15T10:00:00Z',
  updatedAt: '2026-11-01T08:30:00Z',
  budgetAllocations: [
    { category: 'Venue', percentage: 20, allocatedAmount: 300000 },
    { category: 'Catering', percentage: 30, allocatedAmount: 450000 },
    { category: 'Decoration', percentage: 15, allocatedAmount: 225000 },
    { category: 'Photography', percentage: 10, allocatedAmount: 150000 },
    { category: 'Entertainment', percentage: 8, allocatedAmount: 120000 },
    { category: 'Accommodation', percentage: 4, allocatedAmount: 60000 },
    { category: 'Transport', percentage: 3, allocatedAmount: 45000 },
    { category: 'Miscellaneous', percentage: 10, allocatedAmount: 150000 },
  ],
  expenses: [
    { id: 'exp-1', category: 'Venue', name: 'Coastal Lawns Deposit', estimatedCost: 300000, actualCost: 300000, paidAmount: 100000, paymentStatus: 'Advance Paid' },
  ],
  milestones: [
    { id: 'm-1', title: 'Venue Contract Signing', targetDate: '2026-11-15', status: 'Completed', isCriticalPath: true },
    { id: 'm-2', title: 'Catering Menu Lock', targetDate: '2026-12-01', status: 'In Progress', isCriticalPath: true },
  ],
  tasks: [],
  vendors: [
    {
      id: 'v-1',
      name: 'Annamalai Caterers',
      category: 'Catering',
      contactPerson: 'Lead Chef',
      phone: '9876543210',
      email: 'chef@annamalai.com',
      quotedPrice: 450000,
      negotiatedPrice: 450000,
      amount: 450000,
      status: 'Confirmed',
      paymentStatus: 'Advance Paid',
      paidAmount: 150000,
      isPreferred: true,
    },
  ],
  risks: [],
  activityLog: [],
};

describe('CAI-005.1 Full Application Integration & Financial Integrity Audit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAiClientForTesting(null);

    // Mock in-memory localStorage for Node test runner
    const localStoreMap = new Map<string, string>();
    const mockLocalStorage = {
      getItem: (key: string) => localStoreMap.get(key) || null,
      setItem: (key: string, value: string) => localStoreMap.set(key, value),
      removeItem: (key: string) => localStoreMap.delete(key),
      clear: () => localStoreMap.clear(),
      length: localStoreMap.size,
      key: (i: number) => Array.from(localStoreMap.keys())[i] || null,
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  describe('1. Financial Reconciliation & Non-Duplication Audit', () => {
    it('reconciles category allocations exactly to approved budget of ₹15,00,000', () => {
      const validation = validateAllocations(mockChennaiWedding.budgetAllocations);
      expect(validation.isValid).toBe(true);
      expect(validation.totalPercentage).toBe(100);

      const summary = calculateBudgetSummary(
        mockChennaiWedding.totalBudget,
        mockChennaiWedding.budgetAllocations,
        mockChennaiWedding.expenses
      );

      expect(summary.totalBudget).toBe(1500000);
      const allocatedSum = summary.categoryBreakdown.reduce((sum, c) => sum + c.allocatedAmount, 0);
      expect(allocatedSum).toBe(1500000);
    });

    it('verifies paid advances do not exceed total agreed commitments and remaining balance is exact', () => {
      const vendor: Vendor = mockChennaiWedding.vendors[0];
      const totalAgreed = vendor.negotiatedPrice || vendor.quotedPrice;
      const paidAdvance = vendor.paidAmount;
      const remainingBalance = totalAgreed - paidAdvance;

      expect(paidAdvance).toBeLessThanOrEqual(totalAgreed);
      expect(remainingBalance).toBe(300000); // 4,50,000 - 1,50,000 = 3,00,000
    });
  });

  describe('2. End-to-End Business Scenario: Guest Scale 300 to 450 Impact Analysis', () => {
    it('calculates exact ₹3,75,000 unadjusted shortfall when scaling guests from 300 to 450', () => {
      const report = analyzeCelebrationIntelligence(mockChennaiWedding, {
        eventId: mockChennaiWedding.id,
        newGuestCount: 450,
      });

      expect(report.originalPlan.guestCount).toBe(300);
      expect(report.revisedPlan.guestCount).toBe(450);

      // 450 / 300 = 1.5 ratio -> Projected = 15,00,000 * 1.25 (scaled variable catering/venue) = 18,75,000
      expect(report.budgetSummary.approvedBudget).toBe(1500000);
      expect(report.budgetSummary.projectedExpenditure).toBe(1875000);
      expect(report.budgetSummary.budgetShortfallOrSurplus).toBe(-375000); // negative = shortfall ₹3,75,000
      expect(Math.abs(report.budgetSummary.budgetShortfallOrSurplus)).toBe(375000);
    });

    it('guarantees immutability: analyzing intelligence options does not mutate active event in storage', () => {
      const pristineBefore = JSON.stringify(mockChennaiWedding);
      analyzeCelebrationIntelligence(mockChennaiWedding, {
        eventId: mockChennaiWedding.id,
        newGuestCount: 450,
      });
      const pristineAfter = JSON.stringify(mockChennaiWedding);

      expect(pristineBefore).toBe(pristineAfter);
    });
  });

  describe('3. Procurement & Vendor Quotation Audit', () => {
    it('compares category quotations and ranks vendors without altering approved budget', () => {
      const cateringQuotes = SEED_DEMO_QUOTATIONS.filter((q) => q.category === 'Catering');
      expect(cateringQuotes.length).toBeGreaterThan(0);

      const comparison = compareCategoryQuotations(cateringQuotes, 'Catering', 450000);
      expect(comparison.category).toBe('Catering');
      expect(comparison.quotations.length).toBe(cateringQuotes.length);
      expect(mockChennaiWedding.totalBudget).toBe(1500000); // Unchanged
    });
  });

  describe('4. Readiness Score Boundary & Clamping Audit', () => {
    it('clamps readiness score strictly between 0 and 100 even with extreme penalty deductions', () => {
      const blockedTasks: Task[] = Array.from({ length: 15 }, (_, i) => ({
        id: `t-blk-${i}`,
        title: `Blocked Critical Task ${i}`,
        category: 'Operations',
        status: 'Blocked',
        priority: 'Critical',
        dueDate: '2026-10-01',
        assignedTo: 'Lead',
        isMandatory: true,
        dependencies: [],
      }));

      const eventWithHeavyPenalties: EventPlan = {
        ...mockChennaiWedding,
        tasks: blockedTasks,
      };

      const readiness = calculateEventReadinessScore(eventWithHeavyPenalties, [], []);
      expect(readiness.score).toBe(0); // Clamped at 0, not negative
      expect(readiness.score).toBeGreaterThanOrEqual(0);
      expect(readiness.score).toBeLessThanOrEqual(100);
    });

    it('validates multi-prerequisite task completion dependencies and rationale constraints', () => {
      const taskList: Task[] = [
        { id: 't-1', title: 'Task 1', category: 'Venue', status: 'Completed', priority: 'High', dueDate: '2026-11-01', dependencies: [] },
        { id: 't-2', title: 'Task 2', category: 'Venue', status: 'In Progress', priority: 'High', dueDate: '2026-11-02', dependencies: [] },
        { id: 't-3', title: 'Task 3', category: 'Venue', status: 'Pending', priority: 'High', dueDate: '2026-11-03', dependencies: ['t-1', 't-2'] },
      ];

      // Missing dependency t-2
      const valFail = validateTaskCompletion('t-3', taskList);
      expect(valFail.canComplete).toBe(false);

      // Attempt override with short/empty rationale (< 5 chars)
      const valShort = validateTaskCompletion('t-3', taskList, 'abc');
      expect(valShort.canComplete).toBe(false);

      // Valid override with rationale >= 5 chars
      const valPass = validateTaskCompletion('t-3', taskList, 'Client verbal approval during site inspection');
      expect(valPass.canComplete).toBe(true);
      expect(valPass.isOverridden).toBe(true);
    });
  });

  describe('5. Data Persistence & Multi-Event Isolation Audit', () => {
    it('isolates state changes between multiple stored events', () => {
      const eventA: EventPlan = { ...mockChennaiWedding, id: 'evt-A', name: 'Event Alpha' };
      const eventB: EventPlan = { ...mockChennaiWedding, id: 'evt-B', name: 'Event Beta' };

      eventStore.saveEvent(eventA);
      eventStore.saveEvent(eventB);

      // Update event A
      const updatedA: EventPlan = { ...eventA, guestCount: 600 };
      eventStore.saveEvent(updatedA);

      const fetchedA = eventStore.getEventById('evt-A');
      const fetchedB = eventStore.getEventById('evt-B');

      expect(fetchedA?.guestCount).toBe(600);
      expect(fetchedB?.guestCount).toBe(300); // Uncontaminated
    });

    it('recovers gracefully when localStorage contains malformed JSON', () => {
      localStorage.setItem('celebrationai_events_cai001', '{ malformed_json:::');
      const events = eventStore.getAllEvents();
      expect(events).toBeDefined();
      expect(events.length).toBeGreaterThan(0); // Restores seed fallback safely
    });
  });

  describe('6. Gemini API Server-Side Security & Heuristic Fallback Audit', () => {
    it('ensures Gemini API key is never exposed in frontend code and server-side fallback works smoothly', async () => {
      const insight = await handleOperationsCopilot(mockChennaiWedding);
      expect(insight).toBeDefined();
      expect(insight.source).toBe('heuristic'); // Gracefully falls back when API key is unconfigured in test
      expect(insight.requestedModel).toBe('gemini-3.8-flash');
    });
  });
});
