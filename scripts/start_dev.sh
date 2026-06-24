#!/bin/bash

# Navigate to workspace root relative to script location
cd "$(dirname "$0")/.."

# Function to clean up background processes on exit
cleanup() {
  echo ""
  echo "🛑 Stopping development servers..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  exit 0
}

# Trap Ctrl+C (SIGINT) and SIGTERM signals
trap cleanup SIGINT SIGTERM

echo "🚀 Starting AIU Development Servers..."

# Start backend server
echo "🔌 Starting backend server on port 3001..."
(cd aiu-backend && npm run dev) &
BACKEND_PID=$!

# Start frontend Vite server
echo "💻 Starting frontend Vite server on port 5173..."
(cd aiu-web && npm run dev) &
FRONTEND_PID=$!

echo "--------------------------------------------------------"
echo "🟢 Both servers are launching!"
echo "   - Backend: http://localhost:3001"
echo "   - Frontend: http://localhost:5173"
echo "--------------------------------------------------------"
echo "Press Ctrl+C to terminate both servers."
echo "--------------------------------------------------------"

# Wait for background processes
wait
