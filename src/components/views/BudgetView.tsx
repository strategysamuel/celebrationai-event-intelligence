import React, { useState } from 'react';
import {
  PieChart,
  Plus,
  Trash2,
  AlertTriangle,
  Sliders,
  DollarSign,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import {
  EventPlan,
  ExpenseItem,
  VendorCategory,
  PaymentStatus,
  BudgetCategoryAllocation,
} from '../../types';
import {
  calculateBudgetSummary,
  validateAllocations,
  simulateBudget,
  INITIAL_WEDDING_ALLOCATIONS,
} from '../../domain/budgetEngine';
import { useAccessibleModal } from '../../hooks/useAccessibleModal';

interface BudgetViewProps {
  activeEvent: EventPlan;
  onUpdateEvent: (updated: EventPlan) => void;
}

export const BudgetView: React.FC<BudgetViewProps> = ({
  activeEvent,
  onUpdateEvent,
}) => {
  const [allocations, setAllocations] = useState<BudgetCategoryAllocation[]>(
    activeEvent.budgetAllocations
  );
  const [allocationError, setAllocationError] = useState<string | null>(null);

  // What-If Simulation State
  const [simulationBudget, setSimulationBudget] = useState<number>(activeEvent.totalBudget);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);

  // New Expense Item Modal / Inline Form State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const modalRef = useAccessibleModal({
    isOpen: isExpenseModalOpen,
    onClose: () => setIsExpenseModalOpen(false),
  });
  const [expenseName, setExpenseName] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<VendorCategory>('Catering');
  const [estimatedCost, setEstimatedCost] = useState<number>(50000);
  const [actualCost, setActualCost] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Unpaid');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseError, setExpenseError] = useState<string | null>(null);

  const budgetSummary = calculateBudgetSummary(
    activeEvent.totalBudget,
    allocations,
    activeEvent.expenses
  );

  const simulationResult = simulateBudget(
    simulationBudget,
    allocations,
    activeEvent.expenses
  );

  const formatCurrency = (amt: number) => {
    const sym =
      activeEvent.currency === 'INR'
        ? '₹'
        : activeEvent.currency === 'USD'
        ? '$'
        : activeEvent.currency === 'EUR'
        ? '€'
        : '£';
    return `${sym}${amt.toLocaleString()}`;
  };

  const handlePercentageChange = (category: VendorCategory, newPct: number) => {
    const updated = allocations.map((a) =>
      a.category === category ? { ...a, percentage: Math.max(0, Math.min(100, newPct)) } : a
    );
    setAllocations(updated);

    const validation = validateAllocations(updated);
    if (!validation.isValid) {
      setAllocationError(validation.error || 'Total allocations must equal 100%');
    } else {
      setAllocationError(null);
    }
  };

  const handleSaveAllocations = () => {
    const validation = validateAllocations(allocations);
    if (!validation.isValid) {
      setAllocationError(validation.error || 'Cannot save: total must equal 100%');
      return;
    }

    const updatedAllocations = allocations.map((a) => ({
      ...a,
      allocatedAmount: Math.round((activeEvent.totalBudget * a.percentage) / 100),
    }));

    const updatedPlan: EventPlan = {
      ...activeEvent,
      budgetAllocations: updatedAllocations,
      updatedAt: new Date().toISOString(),
    };
    onUpdateEvent(updatedPlan);
    setAllocationError(null);
    alert('Category allocations updated and persisted successfully.');
  };

  const handleResetToWeddingDefaults = () => {
    const defaults: BudgetCategoryAllocation[] = INITIAL_WEDDING_ALLOCATIONS.map((a) => ({
      category: a.category,
      percentage: a.percentage,
      allocatedAmount: Math.round((activeEvent.totalBudget * a.percentage) / 100),
    }));
    setAllocations(defaults);
    setAllocationError(null);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);

    if (!expenseName.trim()) {
      setExpenseError('Expense item name is required.');
      return;
    }
    if (estimatedCost < 0 || actualCost < 0 || paidAmount < 0) {
      setExpenseError('Negative expenses are strictly prohibited by financial rules.');
      return;
    }

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      name: expenseName.trim(),
      category: expenseCategory,
      estimatedCost,
      actualCost,
      paidAmount,
      paymentStatus,
      notes: expenseNotes.trim(),
    };

    const updatedExpenses = [...activeEvent.expenses, newExpense];
    const updatedPlan: EventPlan = {
      ...activeEvent,
      expenses: updatedExpenses,
      updatedAt: new Date().toISOString(),
    };

    onUpdateEvent(updatedPlan);
    setIsExpenseModalOpen(false);
    setExpenseName('');
    setEstimatedCost(50000);
    setActualCost(0);
    setPaidAmount(0);
  };

  const handleDeleteExpense = (expenseId: string) => {
    const updatedExpenses = activeEvent.expenses.filter((e) => e.id !== expenseId);
    const updatedPlan: EventPlan = {
      ...activeEvent,
      expenses: updatedExpenses,
      updatedAt: new Date().toISOString(),
    };
    onUpdateEvent(updatedPlan);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Smart Budget Intelligence</h1>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic financial engine with category allocations, variance tracking, and what-if simulation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>{showSimulator ? 'Hide What-If Simulator' : 'What-If Simulation'}</span>
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense Item</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Approved Budget Ceiling
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(budgetSummary.totalBudget)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Locked for {activeEvent.guestCount} guests
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Actual Committed
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(budgetSummary.totalActualExpenses)}
          </div>
          <span
            className={`text-[11px] font-semibold mt-1 block ${
              budgetSummary.isOverBudget ? 'text-rose-600' : 'text-teal-600'
            }`}
          >
            {Math.round(
              (budgetSummary.totalActualExpenses / (budgetSummary.totalBudget || 1)) * 100
            )}
            % of ceiling
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Remaining Buffer
          </span>
          <div
            className={`text-2xl font-bold font-mono ${
              budgetSummary.remainingActualBudget >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {formatCurrency(budgetSummary.remainingActualBudget)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {budgetSummary.isOverBudget ? 'Budget deficit requires adjustment' : 'Positive uncommitted funds'}
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Contingency Pool (7%)
          </span>
          <div className="text-2xl font-bold text-indigo-700 font-mono">
            {formatCurrency(budgetSummary.contingencyReserve)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Protected against unexpected surges
          </span>
        </div>
      </div>

      {/* What-If Simulation Panel (Collapsible) */}
      {showSimulator && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl border border-blue-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-teal-400" />
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  What-If Budget Stress-Test Simulator
                </h3>
                <p className="text-xs text-slate-300">
                  Simulate the ripple effects of budget expansion or budget contraction
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                simulationResult.feasibilityRating === 'Highly Feasible'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : simulationResult.feasibilityRating === 'Tight Buffer'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              Feasibility: {simulationResult.feasibilityRating}
            </span>
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-xs">
              <span>Simulated Budget:</span>
              <span className="font-bold text-teal-300 font-mono text-sm">
                {formatCurrency(simulationBudget)}
              </span>
            </div>
            <input
              type="range"
              min={Math.round(activeEvent.totalBudget * 0.5)}
              max={Math.round(activeEvent.totalBudget * 1.5)}
              step={25000}
              value={simulationBudget}
              onChange={(e) => setSimulationBudget(Number(e.target.value))}
              className="w-full accent-teal-400 h-2 bg-slate-700 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>-50% ({formatCurrency(Math.round(activeEvent.totalBudget * 0.5))})</span>
              <span>Current: {formatCurrency(activeEvent.totalBudget)}</span>
              <span>+50% ({formatCurrency(Math.round(activeEvent.totalBudget * 1.5))})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="font-semibold text-slate-300 block mb-1">
                Projected Buffer / Deficit:
              </span>
              <span
                className={`text-base font-bold font-mono ${
                  simulationResult.projectedDeficitOrSurplus >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {simulationResult.projectedDeficitOrSurplus >= 0 ? '+' : ''}
                {formatCurrency(simulationResult.projectedDeficitOrSurplus)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="font-semibold text-slate-300 block mb-1">
                Simulation Recommendations:
              </span>
              <ul className="space-y-1 list-disc list-inside text-slate-300 text-[11px]">
                {simulationResult.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Category Allocation Sliders & Rules Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Category Allocation Architecture
            </h3>
            <p className="text-xs text-slate-500">
              Strict Business Rule: Category allocations must sum to exactly 100%.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToWeddingDefaults}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Standards</span>
            </button>
            <button
              onClick={handleSaveAllocations}
              className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow cursor-pointer"
            >
              Save Allocations
            </button>
          </div>
        </div>

        {allocationError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{allocationError}</span>
          </div>
        )}

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allocations.map((alloc) => {
            const calculatedAmount = Math.round(
              (activeEvent.totalBudget * alloc.percentage) / 100
            );

            return (
              <div
                key={alloc.category}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50"
              >
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="font-bold text-slate-800">{alloc.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500">
                      {formatCurrency(calculatedAmount)}
                    </span>
                    <span className="font-bold text-blue-600 font-mono w-10 text-right">
                      {alloc.percentage}%
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="60"
                  value={alloc.percentage}
                  onChange={(e) =>
                    handlePercentageChange(alloc.category, Number(e.target.value))
                  }
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost-Saving Recommendations */}
      {budgetSummary.costSavingRecommendations.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 mb-2 text-amber-800 font-bold text-xs">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <span>Budget Intelligence Recommendations</span>
          </div>
          <ul className="space-y-1 text-xs text-amber-900 list-disc list-inside">
            {budgetSummary.costSavingRecommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Detailed Expense Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Track estimates against contracted actual invoices and payment status
            </p>
          </div>
        </div>

        {activeEvent.expenses.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No expenses recorded yet. Click "Add Expense Item" to begin tracking commitments.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Item / Service</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Estimated</th>
                  <th className="py-2.5 px-3 text-right">Actual Cost</th>
                  <th className="py-2.5 px-3 text-right">Paid to Date</th>
                  <th className="py-2.5 px-3 text-center">Payment Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeEvent.expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {exp.name}
                      {exp.notes && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {exp.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{exp.category}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(exp.estimatedCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(exp.actualCost || exp.estimatedCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatCurrency(exp.paidAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          exp.paymentStatus === 'Fully Paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : exp.paymentStatus === 'Advance Paid'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {exp.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
                        title="Remove expense"
                        aria-label={`Remove expense ${exp.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 focus:outline-none"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 id="expense-modal-title" className="text-base font-bold text-slate-900">Add Expense Item</h2>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer p-1 rounded focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {expenseError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {expenseError}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-3.5">
              <div>
                <label htmlFor="expense-name" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Item / Service Name *
                </label>
                <input
                  id="expense-name"
                  type="text"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder="e.g., Candid Cinematography Package"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="expense-category" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Category *
                </label>
                <select
                  id="expense-category"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as VendorCategory)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Venue">Venue</option>
                  <option value="Catering">Catering</option>
                  <option value="Decoration">Decoration</option>
                  <option value="Photography">Photography</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Transport">Transport</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="expense-estimated-cost" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Estimated Cost *
                  </label>
                  <input
                    id="expense-estimated-cost"
                    type="number"
                    min="0"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="expense-actual-cost" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Actual Contract Cost
                  </label>
                  <input
                    id="expense-actual-cost"
                    type="number"
                    min="0"
                    value={actualCost}
                    onChange={(e) => setActualCost(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="expense-paid-amount" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Paid Amount
                  </label>
                  <input
                    id="expense-paid-amount"
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="expense-payment-status" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Payment Status
                  </label>
                  <select
                    id="expense-payment-status"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Advance Paid">Advance Paid</option>
                    <option value="Fully Paid">Fully Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="expense-notes" className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Notes
                </label>
                <input
                  id="expense-notes"
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Optional deliverables / terms notes"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition cursor-pointer"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
