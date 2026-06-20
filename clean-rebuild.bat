@echo off
REM Complete clean rebuild for iOS
echo ============================================================
echo OnviTV - Complete Clean Rebuild
echo ============================================================
echo.

echo [Step 1] Removing node_modules and lock files...
rmdir /s /q node_modules
del package-lock.json
echo Done.
echo.

echo [Step 2] Reinstalling npm dependencies...
call npm install
echo Done.
echo.

echo [Step 3] Cleaning iOS build artifacts...
rmdir /s /q ios\build 2>nul
rmdir /s /q ios\Pods 2>nul
del /q ios\Podfile.lock 2>nul
echo Done.
echo.

echo [Step 4] Running expo doctor...
call npx expo doctor
echo.

echo [Step 5] Attempting to export bundle...
echo This will show the actual JavaScript error if there is one
call npx expo export --platform ios
echo.

echo ============================================================
echo If the above failed, check the error message above ☝️
echo ============================================================
pause
