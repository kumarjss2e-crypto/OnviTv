@echo off
echo ========================================
echo   OnviTV - Starting Web Development
echo ========================================
echo.

REM Navigate to project directory
cd /d "%~dp0"

echo Starting Expo development server...
echo.
echo The app will open in your browser automatically.
echo Press Ctrl+C to stop the server.
echo.

REM Start Expo and open web automatically
npx expo start --web

pause
