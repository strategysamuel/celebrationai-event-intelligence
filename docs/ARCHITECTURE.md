# CelebrationAI – System Architecture & Design
**Release:** CAI-001 | **PromptWars 2026**

---

## 1. System Topology

```
+-------------------------------------------------------------+
|                      Client Browser                         |
|  +-------------------------------------------------------+  |
|  |                 React 19 SPA (Vite)                   |  |
|  |  - Dashboard       - Event Portfolio  - AI Copilot    |  |
|  |  - Budget Engine   - Timeline Manager - Vendor Intel  |  |
|  |  - Risk Engine     - Replanning Diff  - Reports       |  |
|  +---------------------------+---------------------------+  |
|                              | fetch('/api/*')              |
+------------------------------|------------------------------+
                               v
+-------------------------------------------------------------+
|                 Node.js / Express Server                    |
|  - Rate Limiting (60 req/min)                               |
|  - Request Body Limit (1MB)                                 |
|  - Zod Request Schema Validation                            |
|  - Vite Middleware Mode (Dev) / Static Asset Serving (Prod) |
|  +---------------------------+---------------------------+  |
|  |                  Gemini Service Gateway               |  |
|  |  - Configurable Model (GEMINI_MODEL)                  |  |
|  |  - Server-Side Key Isolation (GEMINI_API_KEY)         |  |
|  |  - Structured Output (responseMimeType: json)         |  |
|  |  - Deterministic Fallback Mode                        |  |
|  +---------------------------+---------------------------+  |
+------------------------------|------------------------------+
                               v
               Google Gemini API (Generative AI)
```

---

## 2. Component Layering

### Domain Logic (`src/domain/`)
- `budgetEngine.ts`: Calculates category allocations, variances, contingency reserve, and what-if simulation.
- `timelineEngine.ts`: Computes backward scheduling offsets, milestone dates, task dependencies, and critical path analysis.
- `vendorEngine.ts`: Implements the 35% budget, 30% service, 20% availability, and 15% rating scoring formula.
- `riskEngine.ts`: Deterministic 7-point rule engine evaluating budget overruns, unconfirmed vendors, overdue tasks, and contingency buffers.
- `replanningEngine.ts`: Calculates budget delta, renegotiation targets for non-priority vendors, date shifts, and returns a Before-vs-After proposal.

### Data Storage Abstraction (`src/storage/`)
- `eventStore.ts`: LocalStorage adapter providing atomic CRUD operations, demo dataset restoration, and JSON import/export with schema validation.

### API & Services (`src/services/` & `server/`)
- `apiClient.ts`: Clean frontend abstraction for all server endpoints.
- `server.ts`: Express gateway mounting REST routes and integrating Vite.
- `server/geminiService.ts`: Official `@google/genai` integration with Zod schemas.
