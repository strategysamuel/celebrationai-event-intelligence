# CelebrationAI – Event Intelligence Copilot

> **Tagline:** *Plan Smarter. Optimize Better. Celebrate Without Stress.*  
> **Competition Vertical:** Celebration & Event Planner (PROMPTWARS 2026)  
> **Current Release:** CAI-006.1 Final Competition Release  
> **Target Repository:** celebrationai-event-intelligence  
> **Automated Tests:** 105 Passed across 12 Test Suites (100% Pass Rate)

---

## 1. Executive Summary & Problem Statement

### Problem Statement
Planning large-scale celebrations—such as traditional multi-day weddings, milestone anniversaries, high-profile galas, and corporate summits—presents severe decision-making challenges:
- **Uncontrolled Cost Escalation:** Scope changes, guest count expansion, and hidden vendor taxes cause budget overruns averaging 20-30%.
- **Cascading Operational Delays:** Vendor delay in one stream (e.g., venue readiness or lawn canopy setup) cascades into catering delivery and photo schedules.
- **Fragmented Vendor Procurement:** Managing multiple vendor quotations (catering, decor, venue, photography) across scattered spreadsheets leads to poor price transparency and hidden gaps.
- **Lack of Decision Intelligence:** Traditional planning tools act as passive static checklists rather than active decision-support systems that evaluate risks, test scenarios, and propose feasible budget-protection alternatives.

### Proposed Solution
**CelebrationAI** is an enterprise-grade **Event Intelligence Copilot** built specifically for PROMPTWARS 2026. It transforms event management from manual record-keeping into an intelligent, active decision-support engine.

CelebrationAI combines **deterministic domain engines** (for financial integrity, timeline backward scheduling, vendor scoring, and execution readiness scoring) with **server-side Google Gemini AI model routing and fallback** to analyze requirement changes, calculate financial and operational impacts, flag risks, and execute controlled replanning with full user confirmation workflows.

---

## 2. System Architecture

CelebrationAI is structured as a full-stack, modular architecture designed for high reliability, zero data drift, and strict security:

```
                  +---------------------------------------------------+
                  |            React 19 + Vite 8 Client               |
                  |     (11 Navigation Views + Tailwind CSS 4)        |
                  +-------------------------+-------------------------+
                                            |
                                            v REST API / JSON
                  +---------------------------------------------------+
                  |         Express REST API Gateway (server.ts)      |
                  +-------------------------+-------------------------+
                                            |
           +--------------------------------+--------------------------------+
           |                                                                 |
           v                                                                 v
+------------------------------------+                    +------------------------------------+
|    Deterministic Domain Engines    |                    |      Server-Side AI Gateway        |
|------------------------------------|                    |    (server/geminiService.ts)       |
| - Financial & Budget Engine        |                    |------------------------------------|
| - Timeline Backward Scheduling     |                    | - Google GenAI SDK (@google/genai) |
| - Vendor 35/30/20/15 Scoring       |                    | - Model Routing & Fallback         |
| - Rule-Based Risk Scanner          |                    | - Truthful Attribution Metadata    |
| - Dynamic Replanning Engine        |                    | - Zod Runtime Schema Validation    |
| - Celebration Intelligence Engine  |                    | - Deterministic Heuristic Fallback |
| - Execution 4-Factor Readiness     |                    +------------------------------------+
+------------------------------------+
```

### Architectural Principles
1. **Deterministic Core & AI Augmentation:** All accounting, readiness scores, and milestone dates are calculated by deterministic TypeScript domain engines. Gemini AI provides natural-language synthesis, strategic risk briefings, and copilot recommendations based on verified engine outputs.
2. **Server-Side API Key Security:** The `GEMINI_API_KEY` is strictly isolated on the server side and is never exposed in browser bundles or client network traffic.
3. **Active Event Immutability:** Replanning options and what-if scenarios generate immutable preview blueprints until explicit user confirmation is received.
4. **Resilient Model Attribution & Fallback:** Multi-tier model execution (`gemini-3.8-flash` primary -> `gemini-2.5-flash` alternate -> deterministic heuristic) with truthful model attribution metadata.

---

## 3. Key Features & Domain Engines

CelebrationAI features 11 integrated modules accessible via the primary navigation sidebar:

| # | Navigation Module | Description & Key Functionality |
|---|---|---|
| **1** | **Overview (Dashboard)** | Real-time command center displaying total events, approved budget, budget utilization, 4-factor execution readiness score gauge, open risk alerts, and synthetic demo dataset toggle. |
| **2** | **My Events** | Full event portfolio manager supporting creation, editing, event switching, JSON import/export, and strict field validation. |
| **3** | **AI Planning Copilot** | Interactive natural-language planner that extracts structured event blueprints using server-side Gemini API or heuristic fallback. |
| **4** | **Budget Intelligence** | Deterministic allocation ledger (100% sum rule), expense tracking with payment status, non-negative financial guardrails, and interactive What-If budget slider. |
| **5** | **Timeline Manager** | Backward scheduling from Celebration Day (T-0), critical path indicators, task dependency enforcement, and automated date-shift recalculation. |
| **6** | **Vendor Intelligence** | Multi-category vendor management, quotation tracking, side-by-side comparison, and 35/30/20/15 suitability scoring (Budget Fit, Service, Availability, Rating). |
| **7** | **Celebration Intelligence** | Dynamic decision-support engine evaluating financial gap scenarios (e.g., ₹15L approved vs ₹18.75L projected for 450 guests) and generating 3 verified strategic options with granular itemized line-item trade-offs. |
| **8** | **Event Execution** | Execution & monitoring dashboard featuring 4-factor readiness scoring (Task 30%, Milestone 25%, Vendor 25%, Risk 20% + penalty guardrails), 8-stage vendor execution tracking, task dependency override protocol, operational issue log, and activity history. |
| **9** | **Risk Intelligence** | 7-point rule-based scanner identifying budget overruns, unconfirmed vendors, dependency bottlenecks, and delayed milestones, paired with AI mitigation briefings. |
| **10** | **Event Reports** | Executive dossier generator outputting audit-ready 6-section financial statements, vendor rosters, milestone schedules, and print/PDF ready styling. |
| **11** | **Settings** | Global currency switcher (₹ INR, $ USD, € EUR, £ GBP), AI model attribution diagnostics, and one-click synthetic demo data reset. |

---

## 4. Technology Stack

- **Frontend:**
  - **Framework:** React 19 (Functional components, hooks, modular view architecture)
  - **Language:** TypeScript 5.8 (Strict typing, comprehensive domain interfaces)
  - **Build Tool:** Vite 8 (Fast modern bundler and dev server)
  - **Styling:** Tailwind CSS 4 (`@import "tailwindcss";` custom navy/emerald/amber theme)
  - **Icons & UI:** Lucide React (Accessible, lightweight SVG icons)
- **Backend & Server Runtime:**
  - **Server:** Node.js + Express REST API Gateway (`server.ts`)
  - **Development Gateway:** Vite dev server middleware integration (`tsx server.ts`)
  - **Security:** Server-side environment isolation, CORS control, strict payload validation
- **AI Integration Engine:**
  - **SDK:** Official `@google/genai` TypeScript SDK
  - **Primary Model:** Configurable via `GEMINI_MODEL` (Default: `gemini-3.8-flash`)
  - **Fallback Model:** `gemini-2.5-flash` with automatic failover
  - **Validation:** Zod runtime schema validation for structured outputs
- **Testing & Quality Control:**
  - **Test Runner:** Vitest (12 suites, 105 automated unit & integration tests)
  - **Static Analysis:** TypeScript Compiler (`tsc --noEmit`)

---

## 5. How the Application Works

1. **Creating / Loading an Event:**
   Users select or create an event (e.g., *Chennai Traditional Wedding*, 450 guests, ₹15,00,000 budget, 15 Feb 2027). The system initializes baseline budget allocations, milestone schedules, tasks, vendor profiles, and risk parameters.

2. **Analyzing Financial Gaps (Celebration Intelligence):**
   When requirements expand (e.g., guest scale from 300 to 450), the Celebration Intelligence Engine identifies the ₹3,75,000 shortfall between the ₹15,00,000 approved budget and ₹18,75,000 projected spend. It presents 3 feasible strategies:
   - *Option 1 (Budget Protection):* Reconciles budget to exactly ₹15,00,000 via itemized savings across venue, decor, and photography while documenting operational consequences.
   - *Option 2 (Balanced Celebration):* Evaluates lawn canopy alternatives, capacity limits, and venue tradeoffs at ₹16,50,000.
   - *Option 3 (Premium Experience):* Approves ₹18,75,000 with complete justification.

3. **Managing Execution & Vendor Operations:**
   The Event Execution module monitors daily task progress, milestone target dates, 8-stage vendor procurement, and operational issues. The 4-factor engine calculates real-time readiness percentage (0-100%) and applies penalty deductions for blocked critical tasks or unconfirmed critical vendors.

4. **Applying Dynamic Replanning:**
   When budget adjustments or date shifts are requested, the engine generates an immutable Before/After diff blueprint. Selecting "Apply Strategy" updates the EventStore only after explicit user confirmation.

---

## 6. Installation & Local Execution

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Quickstart Guide

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/strategysamuel/celebrationai-event-intelligence.git
   cd celebrationai-event-intelligence
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Set your Google Gemini API key in `.env`:
   ```env
   GEMINI_API_KEY="your-actual-gemini-api-key"
   GEMINI_MODEL="gemini-3.8-flash"
   PORT="3000"
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Access the application at `http://localhost:3000`.

5. **Build for Production:**
   ```bash
   npm run build
   npm run start
   ```

---

## 7. Environment Variables & API Configuration

| Variable | Description | Required | Default / Example |
|---|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key obtained from Google AI Studio. Stored strictly server-side. | Optional (Heuristic fallback active if missing/exceeded) | `AIzaSy...` |
| `GEMINI_MODEL` | Primary Gemini model requested by the server gateway. | Optional | `gemini-3.8-flash` |
| `APP_URL` | Application root URL for API routes and self-referential calls. | Optional | `http://localhost:3000` |
| `PORT` | Node.js Express server port. | Optional | `3000` |

---

## 8. Security & Privacy Audit

- **Server-Side API Key Protection:** The `GEMINI_API_KEY` is loaded strictly in Node.js server context (`server.ts`, `server/geminiService.ts`). It is never bundled into browser client code or sent to client-side network inspectors.
- **Zero API Key Leaks:** Production build bundles (`dist/assets/*.js`) have been audited and contain zero hardcoded secrets or API key strings.
- **Git Hygiene:** `.env` files and build outputs are excluded via `.gitignore`. `.env.example` contains sanitized placeholders only.
- **Data Privacy:** All event records, custom budgets, and vendor entries are stored locally within client `localStorage` (via EventStore). No user event data is transmitted to third-party tracking services.

---

## 9. Synthetic Demonstration Dataset Disclaimer

CelebrationAI includes a built-in synthetic benchmark dataset (*Chennai Traditional Wedding*, 450 guests, ₹15,00,000 budget, 15 Feb 2027) designed for demonstration and competition evaluation:
- All vendor names (*Grand Palace Hall*, *Royal Feast Caterers*, *Candid Frame Studios*, *Luxe Floral Decor*), contacts, pricing, and ratings are **100% synthetic mock records**.
- Demo vendor profiles are clearly tagged with `[DEMO DATA]` in the UI.
- Users can clear demo data or reset to benchmark state at any time via Settings or the Overview banner.

---

## 10. Automated Testing Instructions & Verification Results

CelebrationAI maintains a rigorous automated unit and integration test suite powering 100% regression coverage:

### Running Tests

```bash
# Run all Vitest unit and integration tests
npm run test

# Run TypeScript lint verification
npm run lint

# Run production build compilation
npm run build
```

### Verified Test Results (CAI-006.1 Baseline)

- **Total Test Suites:** 12 Passed (12 total)
- **Total Tests:** 105 Passed (105 total)
- **Execution Time:** ~7.00 seconds
- **Pass Rate:** 100.0%

#### Test Suite Breakdown

| Test Suite | File Path | Tests Passed | Domain Area Covered |
|---|---|:---:|---|
| **API Integration** | `tests/apiIntegration.test.ts` | 6 / 6 | Server schemas, API gateway routes, copilot fallback |
| **Celebration Intelligence** | `tests/celebrationIntelligenceEngine.test.ts` | 22 / 22 | Budget protection, guest scale (450), strategy validation |
| **Procurement Engine** | `tests/procurementEngine.test.ts` | 10 / 10 | Quotation analysis, category comparison, scoring |
| **Model Routing** | `tests/modelRouting.test.ts` | 15 / 15 | Model attribution edge cases, fallback rules, 429 quota handling |
| **Integration Scenario** | `tests/integrationScenarioCAI0051.test.ts` | 10 / 10 | Full end-to-end business workflow audit |
| **Execution Engine** | `tests/executionEngine.test.ts` | 11 / 11 | 4-factor readiness score, dependency overrides, vendor stages |
| **Budget Engine** | `tests/budgetEngine.test.ts` | 8 / 8 | Allocations sum, 7% contingency reserve, What-If slider |
| **Replanning Engine** | `tests/replanningEngine.test.ts` | 2 / 2 | Immutable strategy preview diffs, user confirmation |
| **Risk Engine** | `tests/riskEngine.test.ts` | 3 / 3 | 7-point health scan, critical severity alerts |
| **Event Store** | `tests/eventStore.test.ts` | 7 / 7 | Event CRUD, active event immutability, backup export |
| **Timeline Engine** | `tests/timelineEngine.test.ts` | 8 / 8 | Backward scheduling, date validation, critical path |
| **Vendor Engine** | `tests/vendorEngine.test.ts` | 3 / 3 | 35/30/20/15 suitability scoring formula |

---

## 11. Demonstration & Walkthrough Instructions

For a complete step-by-step evaluator walkthrough of all 11 modules and competition benchmark scenarios, refer to:
- `DEMO-WALKTHROUGH.md`: Interactive demonstration script for judges and evaluators.
- `CAI-006.1-FINAL-RELEASE-REPORT.md`: Comprehensive final release audit report.
- `FINAL-RELEASE-CHECKLIST.md`: Verification checklist for PROMPTWARS 2026 submission.

---

## 12. Implemented Features vs. Future Roadmap

### Implemented Features (CAI-006.1)
- [x] Full event portfolio management with local persistence and active event immutability.
- [x] Server-side Gemini AI copilot with multi-tier model routing (`gemini-3.8-flash` -> `gemini-2.5-flash` -> Heuristic) and truthful attribution metadata.
- [x] Deterministic 100% budget allocation engine with non-negative math and interactive What-If stress tester.
- [x] Backward timeline scheduling from Celebration Day (T-0) with critical path tagging.
- [x] Multi-factor vendor suitability scoring (35% Budget, 30% Quality, 20% Availability, 15% Rating).
- [x] Celebration Intelligence Engine generating 3 verified financial strategies for guest scale / budget gap scenarios.
- [x] Vendor procurement & quotation management (itemized tax breakdown, category comparison).
- [x] Event execution & monitoring module with 4-factor readiness scoring (Task 30%, Milestone 25%, Vendor 25%, Risk 20% + penalty guardrails), vendor stage tracking, dependency override protocol, and operational logs.
- [x] 7-point automated risk intelligence scanner.
- [x] Audit-ready 6-section PDF/print executive report dossier.
- [x] Global multi-currency support (₹, $, €, £).

### Future Roadmap (Post-Competition Enhancements)
- [ ] Real-time collaborative multi-user planning via WebSockets.
- [ ] Native OCR document parsing for PDF vendor quote uploads.
- [ ] Direct WhatsApp / Email automated vendor reminder dispatch.
- [ ] Integration with cloud accounting software (QuickBooks / Tally).

---

## 13. Known Limitations & Scope Boundaries

1. **Local Storage Persistence:** Application data persists in browser `localStorage`. In multi-device setups without cloud backend sync, events remain local to the specific browser instance (mitigated by JSON import/export).
2. **Quotation File Uploads:** PDF and Excel quotation uploads extract metadata via file reader parsing; complex scanned multi-page raster images require OCR capability planned for future releases.
3. **Gemini Free Tier Quotas:** When Gemini API free-tier daily request limits (429 RESOURCE_EXHAUSTED) are encountered, the system seamlessly transitions to the deterministic heuristic copilot engine, maintaining 100% feature availability.

---

## 14. License & Competition Attribution

Developed for **PROMPTWARS 2026** — *Vertical: Celebration & Event Planner*.  
Copyright (c) 2026 CelebrationAI Team. All rights reserved.
