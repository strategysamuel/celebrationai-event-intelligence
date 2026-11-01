# CelebrationAI – Test Strategy & Verification Plan
**Release:** CAI-001 | **PromptWars 2026**

---

## 1. Quality Objectives

1. **Deterministic Accuracy:** 100% of mathematical operations regarding money, percentages, and calendar backward scheduling must be proven via unit tests.
2. **Defensive Validation:** Rejection of negative numbers, invalid dates, and out-of-bounds inputs.
3. **Graceful Degradation:** Verified fallback operation when AI services are unreachable.
4. **End-to-End Build Cleanliness:** Zero TypeScript compilation errors (`tsc --noEmit`) and successful production bundle generation (`vite build`).

---

## 2. Test Suites

### Suite 1: Budget Engine (`tests/budgetEngine.test.ts`)
- Verification that initial wedding allocations sum to 100%.
- Rejection of allocations whose sum is != 100%.
- Accurate planned vs actual expense variance calculation.
- Detection and rejection of negative expense entries.
- What-If simulation accuracy across surplus and deficit conditions.

### Suite 2: Vendor Intelligence (`tests/vendorEngine.test.ts`)
- Mathematical validation of scoring weights: (35% Budget, 30% Service, 20% Availability, 15% Rating).
- Budget compatibility tiers calculation.
- Multi-vendor comparison delta logic.

### Suite 3: Timeline & Backward Scheduling (`tests/timelineEngine.test.ts`)
- Calculation of target calendar dates backwards from T-0.
- Automatic recalibration of milestone dates when the event date shifts.
- Completion percentage and overdue task tracking.

### Suite 4: Risk Intelligence (`tests/riskEngine.test.ts`)
- Rule-based detection of unconfirmed critical vendors (Venue/Catering).
- Detection of budget ceiling breaches.
- Identification of sub-standard contingency reserves (<5%).

### Suite 5: Dynamic Replanning (`tests/replanningEngine.test.ts`)
- Budget cut scenario (₹15L → ₹12L) absorbing reductions while safeguarding protected priorities.
- Vendor renegotiation target generation.
- Calendar date shift recalculations.

---

## 3. Test Execution Commands

```bash
# Execute unit tests
npm run test

# Run TypeScript typecheck
npm run lint

# Build production assets
npm run build
```
