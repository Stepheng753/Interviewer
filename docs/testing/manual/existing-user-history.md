# Manual Test: Existing User Account Flow

This test validates logging in with an existing user, loading saved QA history, starting a new interview, and checking database persistence.

---

## Prerequisites
This test assumes that the database already contains a user profile (e.g. `alice@test.com` with password `password123` created in **[Manual Test: Fresh User Onboarding](file:///home/stepheng753/Development/AIU/docs/testing/manual/fresh-user-onboarding.md)**).

---

## Action Steps

### Step 1: Authentication
1. Open the browser and go to `http://localhost:5173`.
2. Enter the existing user credentials:
   - **Email**: `alice@test.com`
   - **Password**: `password123`
3. Click **Log In**.
4. Verify you are redirected to the dashboard and that the left-hand sidebar lists the QA history entries recorded in past sessions.

### Step 2: Context Resumption
1. Verify that the category selection grid displays four tracks.
2. Select any category track (e.g. **Family & Roots**).
3. The console opens and the floating microphone control container displays, reading: `CONSOLE PAUSED • CLICK MIC TO RESUME`.
4. Verify that the left-hand sidebar lists the user's past QA history correctly.
5. Click the **Microphone Toggle button** to start the session.
6. Speak a response clearly to verify the AI interviewer picks up the conversation and responds contextually (e.g. greeting you by name, summarizing known facts in that category, and asking a follow-up or new question).
7. Click the **Microphone Toggle button** to pause the session.
8. Click the **End** button inside the console to stop the session and return to the grid.
9. Verify the new dialogue turns are appended to the sidebar list in real-time.
