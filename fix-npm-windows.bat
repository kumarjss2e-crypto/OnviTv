@echo off
REM Windows npm install fix for path length and timeout issues

echo ============================================================
echo Fixing npm for Windows - OnviTV
echo ============================================================
echo.

echo [Step 1] Clearing npm cache aggressively...
call npm cache clean --force
call npm cache verify
echo Done.
echo.

echo [Step 2] Configuring npm to handle long paths...
call npm config set legacy-peer-deps true
call npm config set fetch-timeout 120000
call npm config set fetch-retry-mintimeout 20000
call npm config set fetch-retry-maxtimeout 120000
echo Done.
echo.

echo [Step 3] Installing dependencies with retry...
call npm install --legacy-peer-deps --prefer-offline
echo.

if errorlevel 1 (
    echo Installation failed. Trying alternative approach...
    echo.
    echo [Alternative] Removing problematic jsc-android...
    rmdir /s /q node_modules\jsc-android 2>nul
    call npm install --legacy-peer-deps --prefer-offline
)

echo.
echo ============================================================
if errorlevel 0 (
    echo Installation completed!
    echo.
    echo [Step 4] Running expo doctor...
    call npx expo doctor
) else (
    echo Installation failed. Check the error above.
)
echo ============================================================
