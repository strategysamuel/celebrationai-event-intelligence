# CelebrationAI – AI Governance & Responsible AI Framework
**Release:** CAI-001 | **PromptWars 2026**

---

## 1. Principles of Responsible Event Intelligence

### A. Non-Hallucinatory Financial Integrity
- Large Language Models are probabilistic and prone to arithmetic drift.
- **Strict Boundary:** The Gemini model is never allowed to calculate financial balances or allocate funds independently. All totals, percentages, remaining buffers, and what-if simulations are computed by the deterministic TypeScript `budgetEngine.ts`.
- The AI's role is strictly confined to suggesting qualitative categories, explaining trade-offs, and formulating negotiation strategies.

### B. Mandatory User Confirmation for Plan Mutations
- Automated replanning algorithms generate proposals, never mutations.
- The user is presented with an explicit side-by-side comparison of baseline vs proposed plans.
- A plan change is only committed to storage after the user clicks **"Confirm & Apply Proposal"**.

### C. Synthetic Data Transparency
- All mock vendors, quotes, and ratings created for competition evaluation are explicitly tagged with `[DEMO DATA]`.
- The system never claims real-time booking availability or verified credentials for synthetic entities.

### D. Zero Credential Exposure
- `GEMINI_API_KEY` is loaded exclusively inside server-side Node.js environment variables.
- Neither the key nor any server secrets are bundled into client-side assets, network packets, or browser storage.

### E. Rate Limiting and DoS Protection
- The Express gateway enforces in-memory rate limiting (max 60 requests/minute per client IP) and caps request payloads at 1 MB to prevent resource exhaustion.
