<div align="center">
  
# 🚀 AIU
**Personal Knowledge & Voice Preservation AI**

[![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)](/)

*AIU is a full-stack application designed to interview individuals, capturing their unique knowledge, stories, and expertise to train a personalized AI model.*

---

</div>

## 🌟 Core Identity

Our mission is to preserve human knowledge and personality. Whether it's a parent passing down their life lessons and wisdom to their children, or an expert archiving their technical knowledge, AIU acts as the conversational bridge. 

By conducting high-speed, dynamic interviews via the Gemini Live API, we capture Question & Answer pairs tied directly to a specific user. Ultimately, this isolated data is used to train a custom AI model that authentically imitates the interviewed individual.

### 💼 Operational Philosophy
- **Modern App Architecture:** We utilize **Node.js (Express)** for the backend and a **React + TypeScript (Vite)** web application for the frontend.
- **Data Persistence & Isolation:** We place a strong emphasis on data privacy. Every interview snippet is securely isolated using SQLite user foreign keys, ensuring your personal AI model is trained strictly on your own knowledge.

---

## 🛠️ Technology Stack

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite"/>
  <img src="https://img.shields.io/badge/Gemini_Live_API-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini Live API"/>
</p>

### Key Focus Areas
1. **Knowledge Preservation:** Capturing life stories, advice, and expertise through an intuitive web interface.
2. **AI Identity Cloning:** Organizing isolated datasets (Q&A pairs) specifically structured to fine-tune future LLMs and TTS models.
3. **High-Speed Audio:** Utilizing WebSockets for bidirectional low-latency audio streaming with the AI interviewer using Web Audio APIs.

---

## 🏗️ Repository Structure

| Directory | Description | Default Port |
| :--- | :--- | :--- |
| **`/aiu-web`** | The React + TypeScript (Vite) frontend web application. | `localhost:5173` |
| **`/aiu-backend`** | The Express Node.js backend & BFF proxy with SQLite database. | `localhost:3000` |
| **`/documentation`** | Project architecture, setup guides, secrets, and manual test plans. | N/A |

---

## 📚 Project Documentation

Explore the following documentation files to understand, set up, and test the project:

- **Setup Guide**: **[setup.md](file:///home/stepheng753/Development/AIU/documentation/system/setup.md)** — Installation, environment configuration, and execution instructions.
- **Secrets Management**: **[secrets.md](file:///home/stepheng753/Development/AIU/documentation/system/secrets.md)** — Secret tracking guidelines and environment template configurations.
- **System Architecture**: **[architecture.md](file:///home/stepheng753/Development/AIU/documentation/system/architecture.md)** — Sequenced flow diagrams outlining registration, login, WebSocket setup, and database saves.
- **WebSocket Protocol**: **[bff_websocket.md](file:///home/stepheng753/Development/AIU/documentation/system/bff_websocket.md)** — Protocol definitions for client-to-BFF and BFF-to-Gemini WebSocket messages.
- **Database Schema**: **[database_schema.md](file:///home/stepheng753/Development/AIU/documentation/system/database_schema.md)** — SQLite database schema definitions.
- **Manual Testing Guides**: **[manual/](file:///home/stepheng753/Development/AIU/documentation/testing/manual/)** — Step-by-step developer scripts (e.g. `test1.md`, `test2.md`) for validating registration, login, and conversation flows.
- **Agent Testing Guides**: **[agent/](file:///home/stepheng753/Development/AIU/documentation/testing/agent/)** — Automated test sequences (e.g. `test1.md`, `test2.md`) for browser subagents.

---

## 🧠 Code Agent Skills

If you are developing or maintaining this project with AI agents, refer to these step-by-step skills:
- **Audio Processing**: **[SKILL.md](file:///home/stepheng753/Development/AIU/.agents/skills/audio_processing/SKILL.md)** — Web Audio API configuration for 16-bit PCM recording and scheduling.
- **WebSocket Debugging**: **[SKILL.md](file:///home/stepheng753/Development/AIU/.agents/skills/websocket_debugging/SKILL.md)** — Network inspection tips and proxy logging.
- **Database Management**: **[SKILL.md](file:///home/stepheng753/Development/AIU/.agents/skills/database_management/SKILL.md)** — Console SQLite statements and PostgreSQL migration instructions.
- **Agent Testing**: **[SKILL.md](file:///home/stepheng753/Development/AIU/.agents/skills/agent-test/SKILL.md)** — Guidelines for running automated E2E browser preview checks.

---

<div align="center">
  <i>Developed and engineered for AIU</i>
</div>
