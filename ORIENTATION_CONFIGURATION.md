# Orientation Configuration Guide

## Overview
The OnviTV app is configured to:
1. **All screens**: Locked to portrait orientation
2. **VideoPlayer screen (iOS only)**: Allows landscape rotation and auto-rotates when user taps fullscreen button

## Architecture

### Configuration Layers

#### 1. App-Level Configuration (`app.json`)
```json
{
  "expo": {
    "orientation": "portrait",
    "plugins": [
      [
        "expo-screen-orientation",
        {
          "initialOrientation": "PORTRAIT"
        }
      ]
    ]
  }
}
```
- Sets initial app orientation to portrait
- Ensures expo-screen-orientation plugin is configured

#### 2. Navigation Level (`App.js`)
```javascript
import * as ScreenOrientation from 'expo-screen-orientation';

<Stack.Navigator
  screenOptions={{
    headerShown: false,
    animation: 'fade',
    contentStyle: { backgroundColor: colors.neutral.slate900 },
    // Note: Orientation is NOT controlled here, but in screens via useFocusEffect
  }}
>
```
- Navigation stack does NOT set orientation (handled at screen level)
- VideoPlayer screen has no special orientation option

#### 3. Tab Navigation Level (`src/navigation/MainTabs.js`)
```javascript
useFocusEffect(
  React.useCallback(() => {
    if (Platform.OS === 'ios' && ScreenOrientation?.lockAsync) {
      // Lock to portrait when MainTabs is focused
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => {
        // Ignore errors
      });
    }
    return undefined;
  }, [])
);
```
- Locks orientation to portrait when tab screens are focused
- Only on iOS (Android uses device orientation settings)

#### 4. Screen Level (`src/screens/VideoPlayerScreen.js`)
```javascript
useFocusEffect(
  useCallback(() => {
    if (Platform.OS === 'ios' && ScreenOrientation?.unlockAsync) {
      // Unlock orientation when entering VideoPlayer to allow landscape
      ScreenOrientation.unlockAsync().catch(() => {
        // Ignore errors
      });
    }

    // Return cleanup to lock back when leaving
    return () => {
      if (Platform.OS === 'ios' && ScreenOrientation?.lockAsync) {
        // Lock back to portrait when leaving VideoPlayer on iOS
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => {
          // Ignore errors
        });
      }
    };
  }, [])
);
```
- Only applies to VideoPlayer
- On focus: Unlocks orientation (allows landscape)
- On blur: Locks back to portrait
- Only on iOS

## Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│              App Launches                           │
├─────────────────────────────────────────────────────┤
│  app.json: orientation: "portrait"                 │
│  ScreenOrientation Plugin initialized              │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│         MainTabs Screen Focused                     │
│         (Home, LiveTV, EPG, More)                  │
├─────────────────────────────────────────────────────┤
│  iOS: Lock to PORTRAIT                             │
│  Android: Use device settings (portrait preferred)  │
└──────────────┬──────────────────────────────────────┘
               │
               ├─ User navigates to VideoPlayer
               │
               ▼
┌─────────────────────────────────────────────────────┐
│      VideoPlayer Screen Focused                     │
├─────────────────────────────────────────────────────┤
│  iOS: UNLOCK orientation                           │
│       (device orientation drives screen orientation)│
│  Android: User controls via fullscreen button      │
│  User can:                                         │
│  • Tap fullscreen button to rotate to landscape   │
│  • Rotate device to landscape                      │
│  • Rotate device back to portrait                  │
└──────────────┬──────────────────────────────────────┘
               │
               ├─ User presses back or exits
               │
               ▼
┌─────────────────────────────────────────────────────┐
│         Back to MainTabs Screen                     │
├─────────────────────────────────────────────────────┤
│  iOS: Lock back to PORTRAIT                        │
│  Screen forced back to portrait orientation        │
└─────────────────────────────────────────────────────┘
```

## Platform-Specific Behavior

### iOS
| Screen | Behavior | Method |
|--------|----------|--------|
| All (except VideoPlayer) | Locked to portrait | `ScreenOrientation.lockAsync(PORTRAIT)` |
| VideoPlayer | Unlocked (allows landscape) | `ScreenOrientation.unlockAsync()` |
| VideoPlayer fullscreen | Landscape via device rotation | User rotates device |
| Exit VideoPlayer | Forced back to portrait | Cleanup function in `useFocusEffect` |

### Android
| Screen | Behavior | Method |
|--------|----------|--------|
| All screens | Respects device orientation | Device orientation preference |
| All screens | App prefers portrait in manifest | android:screenOrientation in AndroidManifest |
| VideoPlayer | User controls via fullscreen UI | toggleFullscreen() function |

### Web
| Screen | Behavior | Method |
|--------|----------|--------|
| All screens | Full browser viewport | No orientation control |
| VideoPlayer | Browser fullscreen | Web Fullscreen API |

## Implementation Details

### Entry Point: `App.js`

1. **Import ScreenOrientation**
```javascript
import * as ScreenOrientation from 'expo-screen-orientation';
```

2. **Stack Navigator** - No orientation options
```javascript
<Stack.Navigator screenOptions={{ headerShown: false, ... }} />
```

3. **VideoPlayer Screen** - No special options
```javascript
<Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
```

### Tab Navigation: `src/navigation/MainTabs.js`

1. **useFocusEffect Hook** - Locks to portrait when tabs active
```javascript
useFocusEffect(
  React.useCallback(() => {
    if (Platform.OS === 'ios' && ScreenOrientation?.lockAsync) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    }
  }, [])
);
```

### Video Player: `src/screens/VideoPlayerScreen.js`

1. **useFocusEffect Hook** - Manages orientation on enter/exit
```javascript
useFocusEffect(
  useCallback(() => {
    if (Platform.OS === 'ios' && ScreenOrientation?.unlockAsync) {
      ScreenOrientation.unlockAsync();
    }

    return () => {
      if (Platform.OS === 'ios' && ScreenOrientation?.lockAsync) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      }
    };
  }, [])
);
```

2. **toggleFullscreen Function** - Handles landscape on demand
```javascript
const toggleFullscreen = async () => {
  if (Platform.OS === 'web') {
    // Web fullscreen API
    ...
  } else {
    // Mobile: Check current orientation
    const currentOrientation = await ScreenOrientation.getOrientationAsync();
    if (isLandscape) {
      // Lock to portrait
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    } else {
      // Lock to landscape
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
  }
};
```

## User Interactions

### Navigating to VideoPlayer
```
1. User on HomeScreen (portrait locked)
2. User taps a movie/channel
3. VideoPlayer screen opens
4. useFocusEffect fires → ScreenOrientation.unlockAsync()
5. iOS: Orientation unlocked, responds to device rotation
6. User can rotate device or tap fullscreen button
```

### Rotating Device to Landscape
```
1. VideoPlayer screen is active
2. Device orientation is unlocked
3. User rotates device to landscape
4. iOS: Automatically rotates to landscape
5. Video player expands to fill screen
```

### Exiting VideoPlayer
```
1. User presses back button
2. VideoPlayer useFocusEffect cleanup runs
3. ScreenOrientation.lockAsync(PORTRAIT) executes
4. Screen forces back to portrait
5. User returns to portrait-locked tab screen
```

## Configuration Options

### To Modify Initial Orientation
Edit `app.json`:
```json
{
  "expo": {
    "orientation": "portrait"  // or "landscape" or "default"
  }
}
```

### To Change VideoPlayer Behavior
Edit `src/screens/VideoPlayerScreen.js`:
```javascript
// To allow both portrait and landscape
ScreenOrientation.unlockAsync();

// To force only landscape
ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

// To allow all orientations
ScreenOrientation.unlockAsync();
```

### To Change Other Screens
Edit `src/navigation/MainTabs.js`:
```javascript
useFocusEffect(
  React.useCallback(() => {
    // Lock to landscape instead
    if (Platform.OS === 'ios' && ScreenOrientation?.lockAsync) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
  }, [])
);
```

## Platform-Specific Files

### iOS Configuration
- `app.json` - Orientation preference
- `Podfile` - No special orientation config needed
- Info.plist - Auto-generated by Expo

### Android Configuration
- `app.json` - Orientation preference
- `build.gradle` - No special orientation config needed
- AndroidManifest.xml - Auto-generated by Expo

## Troubleshooting

### Portrait Lock Not Working
- **Cause**: `useFocusEffect` not returning cleanup function
- **Solution**: Ensure cleanup function returns orientation lock call

### Landscape Not Available in VideoPlayer
- **Cause**: Screen not properly unfocusing from MainTabs
- **Solution**: Check that MainTabs has `useFocusEffect` with proper cleanup

### Rotation Too Slow
- **Cause**: Async operations taking time
- **Solution**: Orientation changes are async, add small setTimeout if needed

### Web Behavior Different
- **Cause**: ScreenOrientation doesn't apply to web
- **Solution**: Web uses browser fullscreen API (different behavior expected)

## Testing Checklist

### Portrait Lock Tests
- [ ] Open HomeScreen - locked to portrait
- [ ] Try rotating device - stays portrait on iOS
- [ ] Try rotating device - rotates normally on Android
- [ ] Open LiveTVScreen - locked to portrait
- [ ] Open MoreScreen - locked to portrait

### VideoPlayer Tests
- [ ] Open VideoPlayer from HomeScreen
- [ ] Try rotating device - rotates to landscape on iOS
- [ ] Tap fullscreen button - toggles landscape on iOS
- [ ] Press back button - returns to portrait
- [ ] Verify MainTabs back to portrait-locked

### Transition Tests
- [ ] MainTabs → VideoPlayer → MainTabs
- [ ] MainTabs → VideoPlayer (landscape) → MainTabs
- [ ] Test on both iOS and Android
- [ ] Test on multiple devices

## Performance Considerations

1. **Async Operations**: Orientation changes are async, so no performance impact
2. **useFocusEffect**: Runs on every focus, but minimal overhead
3. **No Custom Polling**: Uses native focus events, not device listeners
4. **Memory**: No orientation listeners leak if cleanup properly returns

## Related Documentation

- [Expo Screen Orientation](https://docs.expo.dev/versions/latest/sdk/screen-orientation/)
- [React Navigation useFocusEffect](https://reactnavigation.org/docs/use-focus-effect/)
- [React Native Platform Module](https://reactnative.dev/docs/platform-specific-code)

## Summary

The orientation system works by:
1. **App Level**: Sets portrait as default via `app.json`
2. **Tab Level**: Locks MainTabs to portrait via `useFocusEffect`
3. **VideoPlayer**: Unlocks orientation on focus, locks on blur
4. **Platform-Aware**: Only applies orientation logic on iOS, Android/Web use native behavior

This ensures all screens stay portrait except VideoPlayer which supports landscape rotation on iOS while maintaining user control via device orientation and fullscreen button.
