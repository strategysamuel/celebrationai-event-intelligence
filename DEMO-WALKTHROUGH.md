# CELEBRATIONAI – SIGNATURE DEMONSTRATION WALKTHROUGH
## PROMPTWARS 2026 Competition Review Guide

**Application:** CelebrationAI – Event Intelligence Copilot  
**Benchmark Scenario:** Chennai Traditional Wedding (450 Guests, ₹15,00,000 Budget, 15 Feb 2027)  
**Release Baseline:** CAI-006 Final  

---

### DEMO OVERVIEW

This walkthrough guides competition judges through the signature end-to-end demonstration scenario for **CelebrationAI**.

---

### STEP-BY-STEP DEMO SCRIPT

#### STEP A: Landing Dashboard & Event Overview
1. Navigate to **1. Overview** in the left sidebar.
2. Observe the active event: **Ananya & Rohan's Royal Traditional Wedding [DEMO DATA]**.
3. Inspect top KPI cards:
   - **Planned Budget**: ₹15,00,000
   - **Committed Expenditure**: ₹15,00,000 (100% allocated)
   - **Remaining Buffer**: ₹0
   - **Execution Readiness Score**: 85% (Optimum Readiness)
   - **Task Progress**: 4 of 7 completed

---

#### STEP B: Budget Allocation & Reconciliation
1. Navigate to **5. Budget Intelligence**.
2. Verify the 8 category budget allocations:
   - Catering: ₹4,50,000 (30%)
   - Venue: ₹3,00,000 (20%)
   - Decoration: ₹2,25,000 (15%)
   - Photography: ₹1,50,000 (10%)
   - Entertainment: ₹1,20,000 (8%)
   - Accommodation: ₹60,000 (4%)
   - Transport: ₹45,00,00 (3%)
   - Miscellaneous / Contingency: ₹1,50,000 (10%)
3. Total allocations reconcile to **exactly ₹15,00,000 (100.0%)**.

---

#### STEP C & D: Guest Scale Impact Analysis (300 ➔ 450 Guests)
1. Navigate to **4. Celebration Intelligence**.
2. Select or enter guest headcount increase: **300 guests ➔ 450 guests (+50% increase)**.
3. Click **Run Celebration Impact Analysis**.
4. Observe the deterministic calculation results:
   - Approved Budget: **₹15,00,000**
   - Unadjusted Projected Expenditure: **₹18,75,000**
   - Funding Gap / Shortfall: **-₹3,75,000**

---

#### STEP E: Apply Option 1 (Budget Protection Strategy)
1. Inspect proposed alternative strategies:
   - **Option 1: Budget Protection** (Fits 450 guests strictly within ₹15 Lakhs).
   - **Option 2: Balanced Celebration**
   - **Option 3: Premium Scaling**
2. Click **Apply Option 1 (Budget Protection)**.
3. Note the explicit user confirmation modal. Click **Confirm & Reallocate Budget**.
4. Verify that total revised budget reconciles to **₹15,00,000**.

---

#### STEP F: Vendor Procurement & Quotation Comparison
1. Navigate to **8. Procurement Intelligence**.
2. Select category **Catering**.
3. Inspect side-by-side vendor quotation comparison:
   - **Annamalai Caterers [DEMO DATA]**: Quoted ₹4,50,000 • Suitability Score 90.4 / 100 • Recommended.
   - **South Grand Catering [DEMO DATA]**: Quoted ₹4,95,000.
4. Click **Select & Confirm Vendor Assignment**. Confirm in the dialog.

---

#### STEP G: Event Execution & Readiness Score
1. Navigate to **9. Event Execution**.
2. Inspect the **Task Checklist**:
   - Note mandatory task dependency enforcement (e.g. Catering menu lock depends on Venue capacity lock).
   - Attempt to complete a dependent task without prerequisite -> observe dependency block.
   - Click **Authorize Override & Complete** -> enter rationale string (e.g., "Client verbal walk-through approval") -> observe audit entry logged under `"Event administrator"`.
3. Inspect **Vendor Execution Tracker**:
   - Update stage for Annamalai Caterers to **Advance Payment**.
4. Inspect **Readiness Score Breakdown**:
   - Deterministic 4-Factor Score: Task (30%), Milestone (25%), Vendor (25%), Risk (20%).

---

#### STEP H: AI Operations Briefing & Executive Dossier Export
1. Click **AI Operations Copilot** tab in Execution view or navigate to **3. AI Planning Copilot**.
2. Click **Generate Operational Briefing**.
3. Inspect the response:
   - Grounded operational advice.
   - **Model Attribution Badge**: Shows requested model `gemini-3.8-flash`, actual serving model, and `fallbackType`.
4. Navigate to **12. Event Reports**.
5. Click **Print / Export PDF Dossier** -> preview or print clean 6-section HTML dossier.

---

### SUMMARY OF BENCHMARK SCENARIO PARAMETERS

- **Event Name**: Ananya & Rohan's Royal Traditional Wedding
- **Location**: Chennai, Tamil Nadu, India
- **Date**: 15 February 2027
- **Guest Headcount**: 450
- **Approved Budget**: ₹15,00,000
- **Projected Shortfall (Unadjusted)**: ₹3,75,000
- **Final Protection Budget**: ₹15,00,000
- **Readiness Score**: 85% (Optimum Readiness)
