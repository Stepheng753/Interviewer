# Agent Test: Voice Handshake E2E Check

This specification defines the instructions for an AI agent to verify the track selection, live WebSocket proxy connection, and pausing/resuming/ending sessions.

---

## E2E Test Sequence

1. **Prerequisite**: Log in to the application and navigate to the dashboard `http://127.0.0.1:5173/`.

2. **Track Selection**:
   - Locate the category selection screen with heading `Select Interview Track`.
   - Click the category card for **Career & Ambition** (identifiable by class `.category-card.career` or title text).

3. **Handshake and Pause/Resume Verification**:
   - Verify that the active console is rendered, showing the mic panel with status `CONSOLE PAUSED • CLICK MIC TO RESUME`.
   - Click the Microphone Toggle button (identifiable by class `.mic-toggle-btn` or text).
   - Verify that status changes to `NEGOTIATING HANDSHAKE...` and then `STREAMING SOUND INPUT...` or `GEMINI TALKING...`.
   - Click the Microphone Toggle button again to pause the session.
   - Verify the status text returns to `CONSOLE PAUSED • CLICK MIC TO RESUME`.
   - Click the Microphone Toggle button again to resume the session.
   - Verify the status changes back to `STREAMING SOUND INPUT...` or `GEMINI TALKING...`.

4. **Session Termination**:
   - Click the **End** button inside the console (identifiable by class `.end-convo-btn`).
   - Verify that you are returned to the selection grid showing the `Select Interview Track` heading.
