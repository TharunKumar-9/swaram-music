@echo off
chcp 65001 >nul
title Swaram - Retro Music Player (Tollywood Edition)
echo ========================================================
echo   🎵 Swaram - Retro Music Player (Tollywood Edition)
echo   🚀 Checking port 3000...
echo ========================================================

rem Free port 3000 if another instance is already running
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo   ⚡ Port 3000 in use by PID %%a. Closing previous instance...
  taskkill /F /PID %%a >nul 2>&1
)

echo   🚀 Opening http://localhost:3000 in your browser...
echo ========================================================
start http://localhost:3000
node server.js
pause

