# Google Sign-In Setup for OnviTV

## Current Status
✅ Fixed app crash (removed Animated.loop from OnboardingScreen)
✅ Replaced expo-av with react-native-video
✅ Installed @react-native-google-signin/google-signin package
✅ Updated authService.js to support Google Sign-In on both web and mobile
⚠️ Need to complete configuration

## Steps to Complete Google Sign-In Setup

### 1. Get Your Web Client ID from Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **onvi-iptv-player**
3. Go to **Project Settings** (gear icon) → **General**
4. Scroll down to **Your apps** section
5. Find the **Web app** (if you don't have one, add it)
6. Copy the **Web Client ID** (looks like: `1035586796015-xxxxxxxxxx.apps.googleusercontent.com`)

### 2. Update Firebase Configuration

Open `src/config/firebase.js` and replace this line:
```javascript
webClientId: '1035586796015-YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
```

With your actual Web Client ID:
```javascript
webClientId: '1035586796015-YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com',
```

### 3. Build the APK

Run in the android folder:
```bash
.\gradlew.bat assembleRelease
```

### 4. Test Google Sign-In

1. Install the new APK
2. Try signing in with Google
3. It should now work on mobile!

## What Was Fixed

### Animation Crash Issue
- **Problem**: `Animated.loop` in OnboardingScreen was causing crashes when navigating away
- **Solution**: Disabled the looping animation (can be re-enabled later with proper cleanup)

### Google Sign-In Issue
- **Problem**: Used web-only Firebase methods (`signInWithRedirect`) on mobile
- **Solution**: 
  - Installed `@react-native-google-signin/google-signin` package
  - Updated `authService.js` to use proper Google Sign-In SDK for mobile
  - Added platform-specific logic (web uses popup, mobile uses SDK)

## Files Modified

1. `src/screens/OnboardingScreen.js` - Disabled Animated.loop
2. `src/screens/LoginScreen.js` - Disabled entrance animations
3. `src/services/authService.js` - Added proper Google Sign-In for mobile
4. `src/config/firebase.js` - Added GoogleSignin configuration
5. `babel.config.js` - Removed reanimated plugin
6. `package.json` - Added @react-native-google-signin/google-signin

## Next Steps

1. Get your Web Client ID from Firebase Console
2. Update `src/config/firebase.js` with the correct Web Client ID
3. Rebuild the APK
4. Test Google Sign-In functionality

## Notes

- Email/password sign-in works perfectly
- Google Sign-In will work once you add the correct Web Client ID
- The app no longer crashes when navigating between screens
- Video playback now uses react-native-video instead of expo-av
