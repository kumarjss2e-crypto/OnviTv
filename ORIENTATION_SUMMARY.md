# Orientation Configuration - Quick Summary

## What Was Changed

### 1. **app.json** - App-level configuration
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
- **Before**: No explicit screen orientation plugin config
- **After**: Portrait orientation locked at app initialization
- **Effect**: All screens start in portrait mode

### 2. **App.js** - Navigation stack
```javascript
import * as ScreenOrientation from 'expo-screen-orientation';

// Stack Navigator has NO orientation options
// (handled at screen level instead)
```
- **Added**: Import for ScreenOrientation
- **Effect**: Orientation logic moved to individual screens for fine control

### 3. **src/navigation/MainTabs.js** - Tab navigation
```javascript
useFocusEffect(
  React.useCallback(() => {
    if (Platform.OS === 'ios' && ScreenOrientation?.lockAsync) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    }
  }, [])
);
```
- **Added**: useFocusEffect hook to lock tabs to portrait
- **Effect**: Home, LiveTV, EPG, and More screens forced to portrait on iOS

### 4. **src/screens/VideoPlayerScreen.js** - Video playback
```javascript
useFocusEffect(
  useCallback(() => {
    if (Platform.OS === 'ios' && ScreenOrientation?.unlockAsync) {
      // Unlock on entry - allow landscape
      ScreenOrientation.unlockAsync().catch(() => {});
    }

    // Lock back on exit
    return () => {
      if (Platform.OS === 'ios' && ScreenOrientation?.lockAsync) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      }
    };
  }, [])
);
```
- **Added**: useFocusEffect to manage orientation on enter/exit
- **Effect**: VideoPlayer allows landscape rotation on iOS, returns to portrait on exit

## Behavior Summary

| Screen | Portrait | Landscape | Platform |
|--------|----------|-----------|----------|
| HomeScreen | ✅ Locked | ❌ No | iOS |
| LiveTVScreen | ✅ Locked | ❌ No | iOS |
| EPGScreen | ✅ Locked | ❌ No | iOS |
| MoreScreen | ✅ Locked | ❌ No | iOS |
| VideoPlayer | ✅ Normal | ✅ Allowed | iOS |
| All Screens | 🔄 Device | 🔄 Device | Android |
| All Screens | 🌐 Browser | 🌐 Browser | Web |

## How It Works

### When User Opens App
```
1. App launches → app.json sets orientation to portrait
2. MainTabs screens visible → MainTabs useFocusEffect locks portrait
3. All tab screens forced to portrait (iOS)
```

### When User Enters VideoPlayer
```
1. VideoPlayer gains focus → useFocusEffect runs
2. ScreenOrientation.unlockAsync() called
3. iOS: Orientation now responds to device rotation
4. User can rotate device → landscape mode enabled
5. User can tap fullscreen → toggleFullscreen() rotates screen
```

### When User Exits VideoPlayer
```
1. VideoPlayer loses focus → useFocusEffect cleanup runs
2. ScreenOrientation.lockAsync(PORTRAIT) called
3. Screen forced back to portrait
4. MainTabs regain focus → back to locked portrait mode
```

## Files Modified

| File | Change | Impact |
|------|--------|--------|
| app.json | Added ScreenOrientation plugin | App-level orientation config |
| App.js | Added ScreenOrientation import | Enables orientation management |
| MainTabs.js | Added useFocusEffect hook | All tabs locked to portrait |
| VideoPlayerScreen.js | Added useFocusEffect hook + import | VideoPlayer allows landscape |

## Testing the Configuration

### Test 1: Portrait Lock on Main Screens (iOS)
1. Open app
2. Navigate to HomeScreen
3. Try rotating device
4. ✅ Expected: Screen stays portrait, not rotating

### Test 2: Landscape Available in VideoPlayer (iOS)
1. Navigate to VideoPlayer
2. Try rotating device to landscape
3. ✅ Expected: Screen rotates to landscape

### Test 3: Return to Portrait (iOS)
1. While in VideoPlayer landscape
2. Rotate device back to portrait OR tap fullscreen
3. Press back button
4. ✅ Expected: Returns to portrait-locked tab screen

### Test 4: Android Behavior
1. Open app on Android device
2. All screens allow device rotation
3. VideoPlayer fullscreen button works
4. ✅ Expected: No forced orientation, user controls via device

## Key Features

✅ **All Screens Portrait** - Except VideoPlayer, all locked to portrait  
✅ **VideoPlayer Landscape** - Allows landscape rotation on iOS  
✅ **Smooth Transitions** - No jarring orientation changes  
✅ **iOS & Android Support** - Different behavior per platform  
✅ **Web Compatible** - Web uses native browser fullscreen  
✅ **Auto Cleanup** - Orientation resets when leaving VideoPlayer  
✅ **User Control** - User can rotate device or tap fullscreen button  

## Notes

- **Only applies to iOS**: Android and Web use native behavior
- **Async operations**: Orientation changes are non-blocking
- **No breaking changes**: Existing functionality preserved
- **Clean code**: Uses React Navigation's useFocusEffect for lifecycle
- **Performance**: Minimal overhead, no continuous polling

## Related Configuration

- See `ORIENTATION_CONFIGURATION.md` for detailed technical documentation
- See VideoPlayer code for fullscreen toggle implementation
- See MainTabs code for tab-level orientation control

## Troubleshooting

**Issue**: Landscape not working in VideoPlayer  
**Solution**: Ensure useFocusEffect is properly added to VideoPlayerScreen

**Issue**: Can't lock portrait on other screens  
**Solution**: Verify MainTabs has useFocusEffect with ScreenOrientation.lockAsync

**Issue**: Orientation not working on Android  
**Solution**: Expected - Android uses device orientation preferences instead
