# Agent Skill: Automated Browser E2E Testing

This guide instructs AI agents on how to execute automated browser E2E tests for registration, login, and voice socket connection verification using browser preview tools.

---

## 1. Automated Execution Instructions

When tasked with verifying E2E system flows:

1. **Locate Test Specs**: Scan the directory `docs/testing/agent/` for test files.
2. **Launch Dev Servers**:
   - Ensure the backend server is listening on port `3001`.
   - Ensure the Vite dev server is running on port `5173`.
3. **Execute via Subagent**: Call the `browser_subagent` tool. In the `Task` description, copy and paste the E2E verification steps described in `docs/testing/agent/` (e.g. `onboarding-auth-e2e.md` or `voice-handshake-e2e.md`).
4. **Analyze Results**: Read the DOM content and examine the subagent report.
5. **Report Status**: Return a detailed success or error log summarizing the state of the interface elements and network handshakes.

---

## 2. Browser Interactive Controls Cheat Sheet

Use these selectors and labels when instructing the browser subagent:

| Element | Identification / Selector | Expected Action / Result |
| :--- | :--- | :--- |
| **Email Input** | `placeholder="you@domain.com"` | Type test email |
| **Password Input** | `placeholder="••••••••"` | Type test password |
| **Display Name Input** | `placeholder="John Doe"` | Type display name |
| **Submit Button** | button text `Log In` / `Register Account` | Click to submit |
| **Category Card** | Class `.category-card` (e.g., `.career`, `.life_advice`, `.family`, `.health`) | Click category track |
| **Mic Toggle Button** | Class `.mic-toggle-btn` / status indicator | Click to trigger socket handshake |
| **End Button** | Class `.end-convo-btn` | Click to end session and return to category grid |
