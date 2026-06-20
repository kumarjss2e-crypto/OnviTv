@echo off
echo ============================================================
echo OnviTV iOS Build Diagnostics - JavaScript Bundling Error
echo ============================================================
echo.

echo [Step 1] Checking project health...
npx expo doctor
echo.

echo [Step 2] Attempting to export bundle (will show real JS error)...
echo This will fail and show the exact line causing the problem
echo.
npx expo export --platform ios

pause
