/**
 * CelebrationAI - Event Intelligence Copilot
 * Domain Types and Data Contracts
 */

export type EventType =
  | 'Wedding'
  | 'Birthday'
  | 'Anniversary'
  | 'Corporate event'
  | 'Community event'
  | 'Festival'
  | 'Custom event';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type TaskStatus =
  | 'Not Started'
  | 'Pending'
  | 'In Progress'
  | 'Completed'
  | 'Delayed'
  | 'Blocked'
  | 'Overdue';

export type VendorCategory =
  | 'Venue'
  | 'Catering'
  | 'Photography'
  | 'Decoration'
  | 'Entertainment'
  | 'Transport'
  | 'Accommodation'
  | 'Miscellaneous';

export type VendorStatus = 'Inquiry' | 'Quoted' | 'Negotiating' | 'Confirmed' | 'Declined';

export type PaymentStatus = 'Unpaid' | 'Advance Paid' | 'Fully Paid';

export type RiskCategory =
  | 'Budget'
  | 'Vendor'
  | 'Timeline'
  | 'Capacity'
  | 'Logistics'
  | 'Contingency';

export type RiskSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export type RiskStatus = 'Open' | 'Mitigating' | 'Resolved';

export interface BudgetCategoryAllocation {
  category: VendorCategory;
  percentage: number; // e.g. 20 for 20%
  allocatedAmount: number;
}

export interface ExpenseItem {
  id: string;
  category: VendorCategory;
  name: string;
  estimatedCost: number;
  actualCost: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  vendorId?: string;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  category: VendorCategory | string;
  milestoneId?: string;
  dueDate: string; // ISO date string YYYY-MM-DD
  daysBeforeEvent?: number; // backward scheduling offset
  status: TaskStatus;
  priority: PriorityLevel;
  dependencies: string[]; // task IDs
  assignedTo?: string;
  isCriticalPath?: boolean;
  description?: string;
  startDate?: string;
  completionNotes?: string;
  completedAt?: string;
  overrideReason?: string;
  overrideTimestamp?: string;
  isMandatory?: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  targetDate: string; // YYYY-MM-DD
  daysBeforeEvent?: number;
  order?: number;
  completed?: boolean;
  actualCompletionDate?: string;
  delayInDays?: number;
  assignedTo?: string;
  isCriticalPath?: boolean;
  dependencies?: string[];
  status?: 'Pending' | 'In Progress' | 'On Track' | 'Delayed' | 'Completed' | 'Blocked';
  description?: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  contactPerson: string;
  phone: string;
  email: string;
  quotedPrice: number;
  negotiatedPrice: number;
  status: VendorStatus;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  isPreferred: boolean;
  notes?: string;
  amount?: number; // Alias for quoted/agreed amount
  // Scoring parameters (0-100)
  budgetCompatibilityScore?: number; // weight 35%
  serviceSuitabilityScore?: number; // weight 30%
  availabilityScore?: number; // weight 20%
  ratingScore?: number; // weight 15% (scaled from 1-5 rating * 20)
  rating?: number; // 1 to 5 stars
  compositeScore?: number; // computed 0-100
  isDemoData?: boolean;
}

export interface RiskAlert {
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  title: string;
  explanation: string;
  recommendedAction: string;
  status: RiskStatus;
  detectedAt: string;
  source: 'Rule Engine' | 'AI Intelligence';
}

export type FallbackType =
  | 'none'
  | 'upstream_model_difference'
  | 'alternate_model'
  | 'heuristic';

export interface EventPlan {
  id: string;
  name: string;
  type: EventType | string;
  location: string;
  eventDate: string; // YYYY-MM-DD
  date?: string; // Alias for eventDate
  guestCount: number;
  totalBudget: number;
  budget?: number; // Alias for totalBudget
  currency: CurrencyCode;
  userPreferences?: string;
  specialRequirements?: string;
  priorityConsiderations?: string;
  createdAt: string;
  updatedAt: string;
  // Financial
  budgetAllocations: BudgetCategoryAllocation[];
  expenses: ExpenseItem[];
  // Timeline
  milestones: Milestone[];
  timeline?: { milestones: Milestone[] };
  tasks: Task[];
  // Vendors
  vendors: Vendor[];
  // Execution & Operational Tracking (CAI-005)
  vendorExecutionTrackings?: VendorExecutionTracking[];
  operationalIssues?: OperationalIssue[];
  activityLog?: ActivityLogEntry[];
  // Risks
  risks: RiskAlert[];
  // AI & Generation Metadata
  metadata?: {
    source: 'gemini' | 'heuristic';
    requestedModel?: string;
    actualModel?: string | null;
    isFallbackModel?: boolean;
    modelVersion?: string | null;
    fallbackType?: FallbackType;
  };
  isDemoData?: boolean;
}

export interface CopilotChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedActions?: string[];
  structuredProposal?: Partial<EventPlan>;
  source?: 'gemini' | 'heuristic';
  model?: string;
  requestedModel?: string;
  actualModel?: string | null;
  isFallbackModel?: boolean;
  modelVersion?: string | null;
  fallbackType?: FallbackType;
}

export interface ReplanningRequest {
  eventId: string;
  newBudget?: number;
  newEventDate?: string;
  newGuestCount?: number;
  preservedPriorities: string[];
  optimizationGoal?: 'Cost Reduction' | 'Premium Experience' | 'Balanced';
}

export interface ReplanningImpact {
  budgetVariance: number;
  budgetChangePercent: number;
  affectedVendors: {
    vendorId: string;
    vendorName: string;
    category: VendorCategory;
    currentQuoted: number;
    recommendedTarget: number;
    actionRequired: string;
  }[];
  affectedMilestones: {
    milestoneId: string;
    title: string;
    oldTargetDate: string;
    newTargetDate: string;
    daysShifted: number;
  }[];
  newRisksIdentified: RiskAlert[];
  recommendedOptimizations: string[];
  explanation: string;
  proposedPlan: EventPlan;
}

// CAI-003 Celebration Intelligence Engine Interfaces
export interface CelebrationIntelligenceRequest {
  eventId: string;
  newGuestCount?: number;
  newBudget?: number;
  newEventDate?: string;
  preservedPriorities?: string[];
}

export interface ImpactAnalysisParameter {
  id: string;
  category:
    | 'Catering'
    | 'Seating'
    | 'Venue Capacity'
    | 'Accommodation'
    | 'Transport'
    | 'Logistics & Decor'
    | 'Budget Variance'
    | 'Vendor Capacity'
    | 'Timeline'
    | 'Risks';
  parameterName: string;
  originalValue: string;
  revisedValue: string;
  difference: string;
  impactSummary: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface CategoryReallocationDetail {
  category: VendorCategory;
  originalAllocation: number;
  revisedAllocation: number;
  amountSavedOrAdded: number; // Positive if added, negative if saved
  assumption: string;
  operationalConsequence: string;
  guestExperienceConsequence: string;
}

export interface PlanningAlternativeOption {
  id: 'option-1' | 'option-2' | 'option-3';
  title: string;
  tagline: string;
  totalEstimatedCost: number;
  budgetVariance: number;
  additionalFundingRequired: number;
  isFeasibleWithinApprovedBudget: boolean;
  cateringAndSeatingImpact: string;
  vendorImpact: string;
  guestExperienceImpact: string;
  operationalRisks: string[];
  advantages: string[];
  disadvantages: string[];
  proposedPlan: EventPlan;
  recommendedAllocations: BudgetCategoryAllocation[];
  reallocationDetails?: CategoryReallocationDetail[];
  unverifiedAssumptions?: string[];
}

export interface VendorCapacityImpactItem {
  vendorId: string;
  vendorName: string;
  category: VendorCategory;
  currentQuoted: number;
  capacityStatus: 'Sufficient' | 'Requires Expansion' | 'Capacity Exceeded' | 'Uncertain';
  dataVerificationStatus: 'Verified' | 'User-Entered' | 'Synthetic Demonstration' | 'Not Available';
  actionRequired: string;
}

export interface TimelineTaskImpactItem {
  taskId: string;
  title: string;
  status: 'Reopened' | 'Deadline Shifted' | 'New Task Added' | 'Critical Path At Risk';
  dueDate: string;
  reason: string;
}

export interface CelebrationIntelligenceReport {
  originalPlan: EventPlan;
  revisedPlan: EventPlan;
  request: CelebrationIntelligenceRequest;
  impactParameters: ImpactAnalysisParameter[];
  budgetSummary: {
    originalBudget: number;
    approvedBudget: number;
    projectedExpenditure: number;
    budgetShortfallOrSurplus: number;
    contingencyAvailable: number;
    potentialSavingsCategories: { category: string; maxSaving: number; rationale: string }[];
  };
  alternatives: PlanningAlternativeOption[];
  vendorCapacityImpacts: VendorCapacityImpactItem[];
  timelineImpacts: TimelineTaskImpactItem[];
  newRisksIdentified: RiskAlert[];
  aiNarrativeSummary?: {
    executiveBriefing: string;
    operationalTradeoffs: string;
    strategicRecommendation: string;
  };
  attributionMetadata?: {
    source: 'gemini' | 'heuristic';
    requestedModel?: string;
    actualModel?: string | null;
    isFallbackModel?: boolean;
    modelVersion?: string | null;
    fallbackType?: FallbackType;
  };
}

// CAI-004 Vendor & Procurement Intelligence Interfaces
export interface VendorQuotation {
  id: string;
  vendorId?: string;
  vendorName: string;
  category: VendorCategory;
  quotedAmount: number; // Base price
  taxesAndGst: number; // Tax/GST amount
  totalEstimatedCost: number; // Base + Taxes
  includedServices: string[];
  excludedServices: string[];
  paymentTerms: string;
  cancellationTerms: string;
  validityPeriod: string; // e.g. "Valid until 15 Feb 2027"
  capacityDetails: string; // e.g. "Up to 500 guests"
  extractedAt: string;
  isVerified: boolean;
  verificationStatus: 'Verified' | 'User-Entered' | 'Synthetic Demonstration' | 'Not Available';
  isLowestQuote?: boolean;
  isRecommended?: boolean;
  notes?: string;
  rawFileContent?: string;
  fileName?: string;
  scores?: {
    budgetCompatibilityScore: number;
    serviceSuitabilityScore: number;
    capacityScore: number;
    ratingScore: number;
    compositeScore: number;
  };
}

export interface VendorNegotiationInsight {
  vendorId: string;
  vendorName: string;
  category: VendorCategory;
  negotiationOpportunities: string[];
  potentialCostReductions: {
    targetArea: string;
    estimatedSavings: number;
    strategy: string;
  }[];
  questionsToAskVendor: string[];
  missingServiceWarnings: string[];
  paymentTermConcerns: string[];
  contractualRiskObservations: string[];
  attributionMetadata?: {
    source: 'gemini' | 'heuristic';
    requestedModel?: string;
    actualModel?: string | null;
    isFallbackModel?: boolean;
    modelVersion?: string | null;
    fallbackType?: FallbackType;
  };
}

export interface ProcurementSelection {
  category: VendorCategory;
  vendorId: string;
  vendorName: string;
  quotationId?: string;
  totalCost: number;
  allocatedBudget: number;
  variance: number;
}

export interface CategoryProcurementVariance {
  category: VendorCategory;
  allocatedBudget: number;
  proposedVendorCost: number;
  variance: number; // allocated - proposed (positive = under budget, negative = overrun)
  status: 'Under Budget' | 'On Budget' | 'Over Budget';
  selectedVendorName?: string;
}

export interface ProcurementBudgetImpact {
  approvedBudget: number;
  existingEstimatedExpenditure: number;
  proposedVendorExpenditure: number;
  remainingBudget: number;
  potentialShortfall: number;
  categoryVariances: CategoryProcurementVariance[];
}

// CAI-005 Event Execution, Monitoring & Readiness Interfaces
// CAI-005 Event Execution, Monitoring & Readiness Interfaces
export type VendorExecutionStage =
  | 'Quotation Received'
  | 'Negotiation'
  | 'Contract Status'
  | 'Advance Payment'
  | 'Final Payment'
  | 'Preparation'
  | 'Event-Day Readiness'
  | 'Post-Event';

export interface VendorExecutionTracking {
  vendorId: string;
  vendorName: string;
  category: VendorCategory | string;
  currentStage?: VendorExecutionStage;
  stageHistory?: {
    stage: VendorExecutionStage;
    updatedAt: string;
    updatedBy: string;
    notes?: string;
  }[];
  deliverableChecklist?: { title: string; isCompleted: boolean }[];
  advancePaymentPaid?: number;
  finalPaymentPaid?: number;
  totalAgreedAmount?: number;
  isConfirmed?: boolean;
  contactPerson?: string;

  // Legacy fields for backward compatibility
  quotationReceived?: boolean;
  negotiationCompleted?: boolean;
  contractStatus?: 'Pending' | 'In Progress' | 'Confirmed' | 'Delayed' | 'Completed' | 'Blocked';
  advancePaymentStatus?: PaymentStatus;
  finalPaymentStatus?: PaymentStatus;
  servicePreparationStatus?: 'Not Started' | 'In Progress' | 'Confirmed' | 'Delayed' | 'Completed' | 'Blocked';
  eventDayReadinessStatus?: 'Pending' | 'On Track' | 'Ready' | 'Delayed' | 'Critical Risk';
  postEventCompletionStatus?: 'Pending' | 'Completed';
  isDemoData?: boolean;
}

export interface OperationalIssue {
  id: string;
  title: string;
  description: string;
  category: RiskCategory | VendorCategory | string;
  probability?: 'High' | 'Medium' | 'Low';
  impact?: 'Critical' | 'High' | 'Medium' | 'Low';
  severity: RiskSeverity | PriorityLevel;
  responsiblePerson?: string;
  mitigationAction?: string;
  recommendedMitigation?: string;
  targetResolutionDate?: string;
  status: RiskStatus | 'Open' | 'Resolved' | 'In Progress';
  detectedAt?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  linkedTaskId?: string;
  linkedMilestoneId?: string;
  linkedVendorId?: string;
  isAutoFlagged?: boolean;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string; // ISO string or format
  actor: string; // Neutral actor e.g. "Event administrator"
  actionType?: 'Task' | 'Milestone' | 'Vendor' | 'Risk' | 'Budget' | 'Readiness' | 'System';
  category?: 'Task Update' | 'Dependency Override' | 'Vendor Milestone' | 'Risk Register' | 'AI Operations Briefing' | 'System Configuration' | string;
  action?: string;
  description?: string;
  details?: any;
}

export interface ReadinessScoreBreakdown {
  score: number; // 0 - 100
  overallScore?: number; // Alias
  label: 'Optimum Readiness' | 'Moderate Readiness' | 'High Operational Risk' | 'Critical Execution Deficit';
  breakdown: {
    taskScore: number; // 30% weight
    milestoneScore: number; // 25% weight
    vendorScore: number; // 25% weight
    riskScore: number; // 20% weight
    penaltyDeduction: number;
    completedTasks: number;
    totalTasks: number;
    pendingTasks: number;
    blockedTasks: number;
  };
  penalties: string[];
  penaltiesApplied?: {
    reason: string;
    penaltyPoints: number;
  }[];
  scoreChangeExplanation: string;
}

export interface OperationsCopilotInsight {
  groundedSummary: string;
  readinessSummary?: string;
  urgentActions: string[];
  vendorCoordinationGaps: string[];
  delayedMilestoneExplanations?: string[];
  taskPrioritizationAdvice?: string[];
  source?: 'gemini' | 'heuristic';
  requestedModel?: string;
  actualModel?: string | null;
  isFallbackModel?: boolean;
  modelVersion?: string | null;
  fallbackType?: FallbackType;
  attributionMetadata?: {
    source: 'gemini' | 'heuristic';
    requestedModel?: string;
    actualModel?: string | null;
    isFallbackModel?: boolean;
    modelVersion?: string | null;
    fallbackType?: FallbackType;
  };
}
