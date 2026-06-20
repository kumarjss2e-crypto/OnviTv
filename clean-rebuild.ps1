#!/usr/bin/env powershell

Write-Host "============================================================"
Write-Host "OnviTV - Complete Clean Rebuild"
Write-Host "============================================================"
Write-Host ""

Write-Host "[Step 1] Removing node_modules and lock files..."
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
    Write-Host "Removed node_modules"
}
if (Test-Path "package-lock.json") {
    Remove-Item "package-lock.json"
    Write-Host "Removed package-lock.json"
}
Write-Host "Done."
Write-Host ""

Write-Host "[Step 2] Reinstalling npm dependencies..."
npm install
Write-Host "Done."
Write-Host ""

Write-Host "[Step 3] Running expo doctor..."
npx expo doctor
Write-Host ""

Write-Host "[Step 4] Attempting to export bundle (will show real JS error)..."
Write-Host "============================================================"
npx expo export --platform ios

Write-Host ""
Write-Host "============================================================"
Write-Host "If export failed, check the error message above ☝️"
Write-Host "============================================================"
