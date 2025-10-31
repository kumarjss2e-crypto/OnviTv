@echo off
title OnviTV - Development Server
color 0A

:menu
cls
echo ========================================
echo        OnviTV Development Menu
echo ========================================
echo.
echo 1. Start Web (Browser)
echo 2. Start Development Server (All Platforms)
echo 3. Clear Cache and Start
echo 4. Exit
echo.
echo ========================================
set /p choice="Select an option (1-4): "

if "%choice%"=="1" goto web
if "%choice%"=="2" goto all
if "%choice%"=="3" goto clear
if "%choice%"=="4" goto end
goto menu

:web
cls
echo ========================================
echo   Starting Web Development Server
echo ========================================
echo.
npx expo start --web
goto end

:all
cls
echo ========================================
echo   Starting Development Server
echo ========================================
echo.
echo Press 'w' to open in web browser
echo Press 'a' to open Android emulator
echo Press 'i' to open iOS simulator
echo.
npx expo start
goto end

:clear
cls
echo ========================================
echo   Clearing Cache and Starting
echo ========================================
echo.
echo Clearing Expo cache...
npx expo start --clear
goto end

:end
pause
