@echo off
cd /d %~dp0
echo Starting English With Songs (EWG) MVP...

:: Start Backend
echo Starting Backend...
cd backend
if not exist venv (
    echo Virtual environment not found! Please run setup first.
    pause
    exit /b
)
start "EWG Backend" cmd /k "venv\Scripts\activate && python -m app.main"
cd ..

:: Start Frontend
echo Starting Frontend...
cd frontend
if not exist node_modules (
    echo Node modules not found! Installing...
    call npm install
)
start "EWG Frontend" cmd /k "npm run dev"
cd ..

echo ===================================================
echo Project started!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo ===================================================
