@echo off
REM Step 1: Run expo doctor to check for issues
echo Running expo doctor...
npx expo doctor
pause

REM Step 2: Try bundling manually to expose the real error
echo.
echo Attempting manual bundle export...
npx expo export --platform ios
pause
