# Integration Checklist & File Replacement Guide

## 📋 Step-by-Step Integration

### Step 1: Backup Current Files
```bash
# Backup existing files before replacement
cp src/services/playlistService.js src/services/playlistService.js.backup
cp src/screens/HomeScreen.js src/screens/HomeScreen.js.backup
```

### Step 2: Replace playlistService.js
**Current Status:** ❌ OLD file still in use  
**Action Required:** Replace with updated version

```bash
# Option A: Direct replacement (recommended)
cp src/services/playlistService-updated.js src/services/playlistService.js

# Option B: Keep both for gradual migration
# Update imports in AddPlaylistScreen to use:
# import { addPlaylist } from '../services/playlistService-updated';
```

**What Changed:**
- ✅ `addPlaylist()` now returns immediately (no parsing)
- ✅ Initializes progress tracker on creation
- ✅ New `getPlaylistProgress()` helper
- ✅ New `getPlaylistContent()` for subcollections
- ❌ Removed all parsing logic (moved to backgroundParsingService)

### Step 3: Update HomeScreen.js
**Current Status:** ❌ OLD version without listeners  
**Action Required:** Either replace OR integrate listener code

#### Option A: Full Replacement (Recommended)
```bash
cp src/screens/HomeScreen-streaming.js src/screens/HomeScreen.js
```
- Clean slate
- All listener code integrated
- Real-time updates working
- Progress indicator included

#### Option B: Integrate Listener Code (Keep Current)
If you want to keep your current HomeScreen customizations:

1. Add imports at top:
```javascript
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
```

2. Add state for progress tracking:
```javascript
const [parsingPlaylists, setParsingPlaylists] = useState({});
const [unsubscribers, setUnsubscribers] = useState([]);
```

3. Add useEffect to setup listeners (after existing useEffect):
```javascript
useEffect(() => {
  if (!user) return;

  const setupListeners = async () => {
    try {
      // Get user's playlists
      const playlistsQuery = query(
        collection(db, 'playlists'),
        where('userId', '==', user.uid)
      );

      const unsubPlaylistsList = onSnapshot(playlistsQuery, (snapshot) => {
        const playlists = [];
        snapshot.forEach(doc => {
          playlists.push({ id: doc.id, ...doc.data() });
        });

        // Setup listeners for each playlist
        setupContentListeners(playlists);
        setupProgressListeners(playlists);
      });

      setUnsubscribers(prev => [...prev, unsubPlaylistsList]);
    } catch (error) {
      console.error('Error setting up listeners:', error);
    }
  };

  setupListeners();

  // Cleanup
  return () => {
    unsubscribers.forEach(unsub => {
      try {
        unsub();
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    });
  };
}, [user]);
```

4. Add listener setup functions:
```javascript
const setupContentListeners = (playlists) => {
  const newUnsubscribers = [];
  
  playlists.forEach(playlist => {
    ['channels', 'movies', 'series'].forEach(contentType => {
      try {
        const contentQuery = query(
          collection(db, `playlists/${playlist.id}/${contentType}`)
        );

        const unsub = onSnapshot(contentQuery, (snapshot) => {
          const items = [];
          snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
          });

          setAllContent(prev => ({
            ...prev,
            [contentType]: items,
          }));
        });

        newUnsubscribers.push(unsub);
      } catch (error) {
        console.error(`Error setting up ${contentType} listener:`, error);
      }
    });
  });

  setUnsubscribers(newUnsubscribers);
};

const setupProgressListeners = (playlists) => {
  playlists.forEach(playlist => {
    try {
      const progressRef = doc(db, `playlists/${playlist.id}/meta/progress`);
      
      const unsub = onSnapshot(progressRef, (snapshot) => {
        if (snapshot.exists()) {
          const progress = snapshot.data();
          setParsingPlaylists(prev => ({
            ...prev,
            [playlist.id]: {
              isParsing: progress.status === 'parsing',
              status: progress.status,
              channels: progress.channels || 0,
              movies: progress.movies || 0,
              series: progress.series || 0,
              error: progress.error,
            },
          }));
        }
      });

      setUnsubscribers(prev => [...prev, unsub]);
    } catch (error) {
      console.error('Error setting up progress listener:', error);
    }
  });
};
```

5. Add parsing indicator in render:
```javascript
{parsingStatus && (
  <View style={styles.parsingIndicator}>
    <ActivityIndicator size="small" color={colors.primary.purple} />
    <Text style={styles.parsingText}>
      Fetching content ({parsingStatus.channels + parsingStatus.movies + parsingStatus.series} items)
    </Text>
  </View>
)}
```

---

### Step 4: Verify AddPlaylistScreen.js Updates
**Current Status:** ✅ ALREADY UPDATED

Verify the file has these changes:
```javascript
// ✅ Should have this import
import { backgroundParsingService } from '../services/backgroundParsingService';

// ✅ Should NOT have these old imports (removed)
// ❌ import { parseM3UPlaylist } from '../utils/m3uParser';
// ❌ import { fetchXtreamPlaylist } from '../services/xtreamAPI';

// ✅ Should have this in handleSavePlaylist():
if (result.success) {
  CustomAlert.alert(
    'Success',
    `Playlist "${playlistData.name}" added! Content is being fetched in the background.`,
    [{
      text: 'OK',
      onPress: () => {
        navigation.navigate('Home');  // ← Immediate nav, no wait
      },
    }]
  );

  // ✅ Should start parsing in background
  setImmediate(async () => {
    try {
      await backgroundParsingService.startParsing(result.playlistId, playlistData);
    } catch (error) {
      console.error('Error starting background parsing:', error);
    }
  });
}
```

**If not found:** You need to apply the changes shown in STREAMING_PARSER_IMPLEMENTATION.md section "8. AddPlaylistScreen.js"

---

### Step 5: Verify App.js Updates
**Current Status:** ✅ ALREADY UPDATED

Verify the file has these changes:
```javascript
// ✅ Should have this import at top
import { backgroundParsingService } from './src/services/backgroundParsingService';

// ✅ Should have this in useEffect:
useEffect(() => {
  // ... ads initialization code ...
  
  // Resume incomplete parsing jobs on startup
  console.log('[App:useEffect] Resuming incomplete parsing jobs...');
  backgroundParsingService.resumeIncompleteParses()
    .then(results => {
      console.log('[App:useEffect] Resume complete. Results:', results);
    })
    .catch(error => {
      console.error('[App:useEffect] Error resuming incomplete parses:', error);
    });
}, []);
```

**If not found:** You need to apply the changes shown in STREAMING_PARSER_IMPLEMENTATION.md section "10. App.js"

---

## 🗂️ New Utility Files (No Changes Needed)

These are **NEW files** - just added, not modified:
- ✅ `src/utils/formatValidator.js`
- ✅ `src/utils/duplicateDetector.js`
- ✅ `src/utils/m3uStreamParser.js`
- ✅ `src/utils/xtreamStreamParser.js`
- ✅ `src/utils/streamingParserEngine.js`
- ✅ `src/services/backgroundParsingService.js`

**No action needed** - they're ready to use.

---

## 🔄 Import Updates

### If You Keep Old playlistService.js
Update imports in any files that use it:

```javascript
// OLD (if keeping -updated as separate file):
// import { addPlaylist } from '../services/playlistService-updated';

// NEW (after replacing):
import { addPlaylist } from '../services/playlistService';
```

### If You Create Custom HomeScreen
Add these imports:
```javascript
import { onSnapshot, doc, collection, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
```

---

## ✅ Integration Checklist

- [ ] **Backup** current `playlistService.js` and `HomeScreen.js`
- [ ] **Replace** `src/services/playlistService.js`
- [ ] **Replace** `src/screens/HomeScreen.js` OR **Integrate** listener code
- [ ] **Verify** `AddPlaylistScreen.js` has:
  - [ ] Import `backgroundParsingService`
  - [ ] Call `backgroundParsingService.startParsing()`
  - [ ] Navigate home immediately after save
- [ ] **Verify** `App.js` has:
  - [ ] Import `backgroundParsingService`
  - [ ] Call `resumeIncompleteParses()` in useEffect
- [ ] **Test** adding M3U playlist
- [ ] **Test** adding Xtream playlist
- [ ] **Test** content appears in 30 seconds
- [ ] **Test** resume (kill app mid-parse)
- [ ] **Test** network error recovery

---

## 🚀 Post-Integration

### Run Tests
```bash
# Clear app cache (mobile)
# Reinstall app from build

# OR (web)
npm start
```

### Monitor First Run
1. Open app
2. Go to Add Playlist
3. Add test M3U or Xtream
4. Watch console logs:
   ```
   [App:useEffect] Resuming incomplete parsing jobs...
   [backgroundParsingService] Starting parsing for playlist...
   [m3uStreamParser] Fetching chunk...
   ```
5. Check Firestore:
   - New `playlists/{id}/channels/` subcollection created
   - Progress tracker updating in real-time
   - Items appearing as parsed

### Verify Firestore Structure
```
playlists/
  playlistA/
    {metadata with isParsing: true}
    channels/
      {channel docs appearing}
    movies/
      {movie docs appearing}
    series/
      {series docs appearing}
    meta/
      progress: {status: 'parsing', channels: 50, ...}
```

---

## ❌ Old Code to Remove

These should NOT be imported anymore:
```javascript
// ❌ Remove these imports
import { parseM3UPlaylist } from '../utils/m3uParser';
import { fetchXtreamPlaylist } from '../services/xtreamAPI';

// ❌ These functions are deprecated
parseM3UPlaylist()
fetchXtreamPlaylist()
```

You can keep the old files as reference, but don't use them.

---

## 📞 Troubleshooting Integration

### "Module not found: backgroundParsingService"
- Verify `src/services/backgroundParsingService.js` exists
- Check import path matches your structure
- Verify no typos in filename

### "Parsing never starts"
- Check AddPlaylistScreen has `backgroundParsingService` import
- Check `setImmediate` call in `handleSavePlaylist`
- Check console logs for errors

### "Content not showing up"
- Check Firestore has subcollections created
- Check HomeScreen has listener code
- Verify `useEffect` with listeners is running
- Check Firestore rules allow reads/writes

### "App crashes on startup"
- Check `App.js` useEffect is correct
- Verify `resumeIncompleteParses()` exists in service
- Check console for specific error
- Verify `playlistService` is the updated version

---

## 🎯 Success Indicators

✅ **Integration Complete When:**
- [ ] Add playlist → navigates home immediately
- [ ] "Fetching content..." indicator appears
- [ ] Content appears within 30 seconds
- [ ] Progress tracker updates in real-time
- [ ] Kill app, reopen → parsing resumes
- [ ] Airplane mode → shows retry, recovers
- [ ] Firestore has proper subcollection structure

**You're done! 🎉**
