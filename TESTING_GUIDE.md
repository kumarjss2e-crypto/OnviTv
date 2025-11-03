# OnviTV Testing Guide

## Quick Reference

### ✅ Test on Localhost (Web)
- UI/UX design
- Navigation flow
- Search & filters
- Playlist management
- User authentication
- Settings screens
- Layout & styling

### ✅ Test on Mobile APK
- **Video playback** ← IMPORTANT!
- Screen orientation
- Fullscreen mode
- Progress tracking
- Download features
- Push notifications
- Background playback

## Why Videos Don't Play on Localhost

**Short Answer**: Browser CORS policy blocks cross-origin video requests.

**What You'll See**:
```
🌐 LOCALHOST LIMITATION: Videos are blocked by browser CORS policy. 
This is normal! Install the mobile APK to test video playback - 
it works perfectly on mobile devices.
```

**This is expected behavior!** Not a bug.

## Development Workflow

### 1. Develop UI on Localhost
```bash
npm start
# or
npx expo start
```

**Test**:
- ✅ Screens load correctly
- ✅ Navigation works
- ✅ Search/filter functions
- ✅ Data loads from Firebase
- ✅ UI looks good

**Don't Test**:
- ❌ Video playback (will fail due to CORS)

### 2. Build APK for Video Testing
```bash
cd android
.\gradlew assembleRelease
```

**APK Location**:
```
android\app\build\outputs\apk\release\app-release.apk
```

**Test**:
- ✅ Video playback
- ✅ Live TV streams
- ✅ Movies from playlists
- ✅ Series episodes
- ✅ Screen orientation
- ✅ Fullscreen mode

### 3. Iterate
1. Make UI changes on localhost
2. Build new APK when ready
3. Test videos on mobile
4. Repeat

## Common Errors & Solutions

### Error: "CORS_BLOCKED_ON_LOCALHOST"
**Cause**: Browser security policy  
**Solution**: Test on mobile APK  
**Status**: ✅ Normal, expected behavior

### Error: "Stream requires authentication"
**Cause**: IPTV provider needs login  
**Solution**: Use Xtream Codes with credentials  
**Status**: ⚠️ Provider limitation

### Error: "Stream not found (404)"
**Cause**: URL expired or invalid  
**Solution**: Re-import playlist  
**Status**: ⚠️ Provider issue

### Error: "Network error"
**Cause**: Internet connection or server down  
**Solution**: Check connection, try again  
**Status**: ⚠️ Temporary issue

## Testing Checklist

### Before Each Release

#### Localhost Testing:
- [ ] All screens load without errors
- [ ] Navigation works smoothly
- [ ] Search returns correct results
- [ ] Filters work properly
- [ ] Playlist management functions
- [ ] User can login/signup
- [ ] Settings save correctly
- [ ] No console errors (except CORS)

#### Mobile APK Testing:
- [ ] App installs successfully
- [ ] Live TV channels play
- [ ] Movies from playlists play
- [ ] Series episodes play
- [ ] Video controls work
- [ ] Progress tracking works
- [ ] Favorites sync correctly
- [ ] Downloads work (if implemented)
- [ ] App doesn't crash
- [ ] Performance is smooth

## Performance Tips

### Localhost:
- Fast reload for UI changes
- Instant feedback
- Easy debugging
- Chrome DevTools available

### Mobile APK:
- Real device performance
- Actual video playback
- True user experience
- Battery usage testing

## Debugging

### On Localhost:
```javascript
// Console logs appear in browser
console.log('Debug info:', data);

// React DevTools available
// Network tab shows requests
// Elements tab shows DOM
```

### On Mobile:
```bash
# View Android logs
adb logcat | grep -i "ReactNativeJS"

# Or use React Native Debugger
# Or check Expo Go logs
```

## Quick Commands

### Start Development:
```bash
npm start
```

### Build APK:
```bash
cd android
.\gradlew assembleRelease
```

### Install APK on Phone:
```bash
adb install android\app\build\outputs\apk\release\app-release.apk
```

### View Logs:
```bash
adb logcat
```

## Remember

1. **Localhost = UI Development**
   - Fast iteration
   - Easy debugging
   - No video playback

2. **Mobile APK = Full Testing**
   - Real performance
   - Video playback works
   - True user experience

3. **CORS Errors = Normal on Localhost**
   - Not a bug
   - Expected behavior
   - Videos work on mobile

## Need Help?

### CORS Issues:
- Read: `CORS_LOCALHOST_LIMITATION.md`
- Solution: Test on mobile APK

### Video Not Playing on Mobile:
- Check: Stream URL is valid
- Check: Internet connection
- Check: Provider authentication
- Read: `IPTV_STREAM_ISSUES.md`

### Build Errors:
- Clean build: `.\gradlew clean`
- Rebuild: `.\gradlew assembleRelease`
- Check: Node modules updated

---

**Happy Testing!** 🚀📱
