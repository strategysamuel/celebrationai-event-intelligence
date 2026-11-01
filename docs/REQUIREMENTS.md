# CelebrationAI – Requirements Traceability Matrix
**Release:** CAI-001 | **PromptWars 2026**

---

| Spec # | Functional Requirement | Implementation Component | Verification Method |
|---|---|---|---|
| **REQ-01** | Support 7 Event Types (Wedding, Birthday, Anniversary, Corporate, Community, Festival, Custom) | `src/types/index.ts`, `src/components/views/EventsView.tsx` | Unit tests & Event creation modal validation |
| **REQ-02** | Capture name, type, location, date, guest count, budget, currency, preferences, priorities | `src/types/index.ts`, `src/components/views/EventsView.tsx` | Schema validation & CRUD tests |
| **REQ-03** | Conversational AI Planning Copilot extracting requirements and asking follow-ups | `server/geminiService.ts`, `src/components/views/CopilotView.tsx` | Automated chat endpoint tests & UI interaction |
| **REQ-04** | Initial wedding allocation defaults (Venue 20%, Catering 30%, Decor 15%, Photo 10%, Entertainment 8%, Accom/Transport 7%, Misc 3%, Contingency 7%) | `src/domain/budgetEngine.ts`, `src/components/views/BudgetView.tsx` | `tests/budgetEngine.test.ts` (100% sum check) |
| **REQ-05** | Deterministic calculations, non-negative accounting, and What-If simulation | `src/domain/budgetEngine.ts`, `src/components/views/BudgetView.tsx` | Negative expense unit tests & simulation tests |
| **REQ-06** | Backward scheduling timeline from event date with critical path awareness | `src/domain/timelineEngine.ts`, `src/components/views/TimelineView.tsx` | `tests/timelineEngine.test.ts` |
| **REQ-07** | Vendor suitability scoring (Budget 35%, Service 30%, Availability 20%, Rating 15%) | `src/domain/vendorEngine.ts`, `src/components/views/VendorView.tsx` | `tests/vendorEngine.test.ts` |
| **REQ-08** | Synthetic demonstration vendors clearly labeled [DEMO DATA] | `src/storage/seedData.ts`, `src/components/views/VendorView.tsx` | Code & UI audit |
| **REQ-09** | Rule-based risk engine checking overruns, unconfirmed vendors, overdue tasks, bottlenecks | `src/domain/riskEngine.ts`, `src/components/views/RiskView.tsx` | `tests/riskEngine.test.ts` |
| **REQ-10** | Dynamic Replanning with before-and-after diffs and user confirmation | `src/domain/replanningEngine.ts`, `src/components/views/ReplanningView.tsx` | `tests/replanningEngine.test.ts` |
| **REQ-11** | Printable executive dossier and export | `src/components/views/ReportsView.tsx` | Print stylesheet check & browser rendering |
| **REQ-12** | Server-side API key protection; 0 client bundle leaks | `server.ts`, `server/geminiService.ts` | Vite bundle grep & env check |
