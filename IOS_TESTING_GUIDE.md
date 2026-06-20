
# iOS Testing Guide for OnviTV

## Overview
Your app uses custom native libraries (like react-native-video, react-native-google-mobile-ads, etc.), so **Expo Go won't work directly**. Here's how you can test on iOS!

---

## Option 1: Use EAS Build to Create a Custom Dev Client (Recommended!)
You already have EAS Build set up! Here's how to use it:

### Step 1: Log in to Expo
Run this command in your terminal (PowerShell/Command Prompt):
```powershell
npx eas login
```

### Step 2: Build a Development Client for iOS (Simulator or Device)
You have 2 choices:

#### A) iOS Simulator Build (for testing on Mac with Xcode)
```powershell
npx eas build --profile development --platform ios
```

#### B) iOS Device Build (for testing on your physical iPhone/iPad)
First, register your iOS device with EAS (run this):
```powershell
npx eas device:create
```
Then build for device:
```powershell
npx eas build --profile dev-client --platform ios
```

### Step 3: Once Build is Complete
EAS will give you a link to download the build!
1. Install the build on your iOS device/simulator
2. Run your dev server:
   ```powershell
   npm start
   ```
3. Open your custom dev client app, it should connect automatically!

---

## Option 2: Use Expo Go for Basic UI Testing (Limited Functionality)
For just testing basic UI (not streaming or ads), you can try Expo Go:
1. Install Expo Go from the App Store on your iPhone/iPad
2. Run:
   ```powershell
   npm run start:expo-go
   ```
3. Open Expo Go, scan the QR code!

**NOTE**: This will have limited functionality because some libraries aren't available in Expo Go!

---

## Viewing Debug Logs

### Method 1: Using your Dev Client
When using your custom dev client, shake your device to open the dev menu and select "Debug Remote JS"!

### Method 2: Using Expo Dev Tools
When `npm start` is running, open the URL it shows (usually `http://localhost:8081`) in your browser for logs!

### Method 3: Using Console Logs
All the `console.log()` statements we added will show up in your terminal running the dev server!

---

## Troubleshooting
If you have any issues:
1. Check your terminal logs first!
2. Clear your node_modules and reinstall if needed:
   ```powershell
   rm -rf node_modules package-lock.json
   npm install
   ```
3. Make sure you're using the correct start script!
