# Manual Test: Fresh User Onboarding

This test validates registering a new user, logging in, selecting an interview track, starting an interview, pausing and resuming, ending the session, and verifying SQLite database persistence.

---

## Prerequisites
Ensure both the backend server and frontend Vite server are running. 
See the **[Setup Guide](file:///home/stepheng753/Development/Interviewer/docs/system/setup.md)** for details.

---

## Action Steps

### Step 1: User Registration
1. Open your browser and navigate to `http://localhost:5173`.
2. Locate the "Register here" link on the login card and click it.
3. Fill out the form fields:
   - **Display Name**: `Alice Test`
   - **Email**: `alice@test.com`
   - **Password**: `password123`
4. Click **Register Account**. Verify that the web app successfully redirects you to the login screen.

### Step 2: First-Time Authentication
1. On the login screen, enter:
   - **Email**: `alice@test.com`
   - **Password**: `password123`
2. Click **Log In**.
3. Verify that you are redirected to the main console and that the history panel in the sidebar is empty.

### Step 3: Track Selection & Active Voice Session
1. Verify that the dashboard displays the **Select Interview Track** screen with a 2x2 grid containing four options: **Career & Ambition**, **Life Advice & Wisdom**, **Family & Roots**, and **Health & Wellness**.
2. Click on the **Career & Ambition** track card.
3. Observe that the console opens and the floating microphone control container displays at the bottom, reading: `CONSOLE PAUSED • CLICK MIC TO RESUME`.
4. Click the **Microphone Toggle button** to start streaming.
5. Approve browser microphone access when prompted.
6. Observe the status transitions:
   - The status indicator changes to `NEGOTIATING HANDSHAKE...` and then to `STREAMING SOUND INPUT...` (with green waves).
   - The AI interviewer greeting plays through your speaker, and its transcript is added to the dialogue panel.
7. Speak a response clearly (e.g., "Hi! I am Alice. I want to save my wisdom on development.").
8. Verify that the AI responds contextually and the dialogue transcripts append.
9. Click the **Microphone Toggle button** to pause. Verify the status returns to `CONSOLE PAUSED • CLICK MIC TO RESUME` and the AI stops speaking.
10. Click the **Microphone Toggle button** again. Verify the conversation resumes smoothly where it left off, and the AI repeats its last question instead of starting a new greeting sequence.
11. Click the **End** button inside the control console. Verify the session is closed and you are returned to the 2x2 selection grid screen.

### Step 4: Verify DB Storage
1. Click on any category track to open the console again.
2. Confirm that the question-and-answer exchanges from the completed session are successfully listed in the sidebar history log.
3. (Optional) Run the sqlite3 console tool to inspect the records:
   ```bash
   sqlite3 interviewer-backend/interviewer.db "SELECT * FROM qa_pairs;"
   ```
   Verify that the questions and responses match Alice's session.
