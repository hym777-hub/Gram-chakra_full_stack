@echo off
title GramChakra SBM-G Platform Launcher
color 0A

echo =====================================================================
echo    GramChakra: SBM-G Rural Solid Waste & MLP Management System
echo =====================================================================
echo.
echo [1/4] Configuring Environment & Node.js Runtime...
set "PATH=C:\Users\hymbo\nodejs;%PATH%"

REM Check if backend node_modules exist, auto-install if missing
if not exist "%~dp0backend\node_modules" (
    echo [Setup] Installing backend dependencies...
    cd /d "%~dp0backend"
    call npm install
)

REM Check if frontend node_modules exist, auto-install if missing
if not exist "%~dp0frontend\node_modules" (
    echo [Setup] Installing frontend dependencies...
    cd /d "%~dp0frontend"
    call npm install
)

echo [2/4] Launching Express REST Backend Server (Port 5000)...
start "GramChakra Backend Server" cmd /k "cd /d %~dp0backend && set PATH=C:\Users\hymbo\nodejs;%%PATH%% && node server.js"

echo [3/4] Launching Vite Frontend Dev Server (Port 5173)...
start "GramChakra Frontend Client" cmd /k "cd /d %~dp0frontend && set PATH=C:\Users\hymbo\nodejs;%%PATH%% && npx vite --host 0.0.0.0 --port 5173"

echo.
echo [4/4] Waiting 4 seconds for servers to initialize...
timeout /t 4 /nobreak >nul

echo Opening GramChakra Dashboard in default browser: http://localhost:5173 ...
start http://localhost:5173

echo.
echo =====================================================================
echo    GramChakra is now running! Keep server windows open.
echo    Backend API:  http://localhost:5000/api/health
echo    Frontend App: http://localhost:5173
echo =====================================================================
pause
