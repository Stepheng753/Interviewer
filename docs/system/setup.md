# Setup Guide

This guide provides instructions to set up the development environment for **AIU** using a React + TypeScript web app and a Node.js + SQLite backend.

---

## Prerequisites

- **Node.js**: Version 18.x or higher is recommended.
- **npm**: Installed automatically with Node.js.
- **SQLite3**: The backend utilizes the native `sqlite3` driver which creates a local file database. No separate database server installation is required.

---

## 1. Environment Configurations

Both frontend and backend packages require local environment configurations. Templates are provided as `.env.template` files in their respective folders.

### Backend Configurations
Create a file at `/aiu-backend/.env` matching the template:
```env
PORT=3000
JWT_SECRET=your_jwt_secret_token
GEMINI_API_KEY=your_gemini_api_key
```

### Frontend Configurations
Create a file at `/aiu-web/.env` matching the template:
```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000
```

---

## 2. Backend Setup & Run

1. Navigate to the backend directory:
   ```bash
   cd aiu-backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *Note: On first boot, the server will automatically initialize an SQLite database file named `aiu.db` in the backend root directory.*

---

## 3. Frontend Web Setup & Run

1. Navigate to the frontend directory:
   ```bash
   cd aiu-web
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web app in your browser at `http://localhost:5173`.

---

## 3.5 Quick Run (Both Servers Concurrently)

Alternatively, you can boot both servers concurrently from the root directory using the helper script:
```bash
./run_dev.sh
```
Press `Ctrl+C` inside the terminal to terminate both servers cleanly.

---

## 4. Run Tests

### Backend Tests (Jest)
From `aiu-backend/`:
```bash
npm run test
```

### Frontend Tests (Vitest)
From `aiu-web/`:
```bash
npm run test
```
