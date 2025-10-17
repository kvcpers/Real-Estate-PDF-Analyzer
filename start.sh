#!/bin/bash

echo "🚀 Starting Real Estate PDF Analyzer..."

# Start the Python backend
echo "Starting Python backend with MinerU..."
cd /Users/kacper/Downloads/real-estate-analyzer
source mineru-env/bin/activate
python pdf_service.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start the Next.js frontend
echo "Starting Next.js frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo "✅ Services started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user to stop
wait
