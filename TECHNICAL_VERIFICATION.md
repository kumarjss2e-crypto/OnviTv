# Technical Verification & Debugging Guide

## Architecture Verification Checklist

### 1. Parser Changes Verification

**File: `src/services/backgroundParsingService.js`**

```
✓ Import statements updated:
  - import { itemStorageService } from './itemStorageService';
  - import webCompatibleParserService from './webCompatibleParserService';
  
✓ Platform guards removed:
  - NO "if (Platform.OS === 'web') return;" in startParsing()
  - NO "if (Platform.OS === 'web') return;" in parseM3UPlaylist()
  - NO "if (Platform.OS === 'web') return;" in parseXtreamPlaylist()
  
✓ Storage changed:
  - All saveItemsBatch() calls use itemStorageService
  - NOT localDatabaseService
  
✓ Web parser used:
  - Uses webCompatibleParserService.parseM3U() on web
  - Uses webCompatibleParserService.parseXtream() on web
  - Falls back to production libraries on native
```

**Verify in code:**
```bash
# Check for removed guards
grep -n "Platform.OS === 'web'" src/services/backgroundParsingService.js
# Should return: (no results)

# Check for itemStorageService usage
grep -n "itemStorageService" src/services/backgroundParsingService.js
# Should return: Multiple matches for saveItemsBatch()

# Check for web parser usage
grep -n "webCompatibleParserService" src/services/backgroundParsingService.js
# Should return: Multiple matches for parseM3U and parseXtream
```

---

### 2. Storage Layer Verification

**Files created:**
```
✓ src/services/itemStorageService.js          (150 lines)
✓ src/services/storage/indexedDBStorage.js    (250 lines)
✓ src/services/storage/sqliteStorage.js       (100 lines)
✓ src/services/storage/memoryStorage.js       (100 lines)
✓ src/services/webCompatibleParserService.js  (400 lines)
```

**Verify files exist:**
```bash
ls -la src/services/itemStorageService.js
ls -la src/services/storage/indexedDBStorage.js
ls -la src/services/storage/sqliteStorage.js
ls -la src/services/storage/memoryStorage.js
ls -la src/services/webCompatibleParserService.js
```

**Expected output:**
```
-rw-r--r--  1 user  staff  5000 May 11 23:59 src/services/itemStorageService.js
-rw-r--r--  1 user  staff  8000 May 11 23:59 src/services/storage/indexedDBStorage.js
...
```

---

### 3. Content Services Verification

**Files to be updated:**
- `src/services/channelService.js`
- `src/services/movieService.js`
- `src/services/seriesService.js`

**Verify changes:**
```bash
# Check channelService uses itemStorageService
grep -n "itemStorageService" src/services/channelService.js
# Should return: 1 import + multiple getItemsByType() calls

# Check channelService NOT using contentStorageService
grep -n "contentStorageService.getChannels" src/services/channelService.js
# Should return: (no results - all changed to itemStorageService)

# Same for movieService
grep -n "contentStorageService.getMovies" src/services/movieService.js
# Should return: (no results)

# Same for seriesService
grep -n "contentStorageService.getSeries" src/services/seriesService.js
# Should return: (no results)
```

---

## Runtime Verification

### Step 1: Check Import Resolution

**Console test:**
```javascript
// In your App.js or similar, add:
import { itemStorageService } from './src/services/itemStorageService';
import webCompatibleParserService from './src/services/webCompatibleParserService';

console.log('✓ itemStorageService imported:', typeof itemStorageService);
console.log('✓ webCompatibleParserService imported:', typeof webCompatibleParserService);
```

**Expected output:**
```
✓ itemStorageService imported: object
✓ webCompatibleParserService imported: object
```

### Step 2: Test Web Parsing Flow

**On web browser, add M3U playlist and check console:**

```
Expected logs:
[AddPlaylistScreen] Starting background parsing...
[backgroundParsingService] Fetching M3U from: [URL]
[backgroundParsingService] Downloaded XXXX bytes, parsing...
[webCompatibleParserService] Parsing M3U content (XXXX bytes)
[webCompatibleParserService] Parsed XXX tracks from M3U
[itemStorageService] Initialized IndexedDB storage for web
[itemStorageService] Saved 100 items in batch

AFTER ~5 seconds:
[channelService] Playlist XXXXX: Found 100 channels
```

**NOT expected:**
```
✗ [backgroundParsingService] Skipping parsing on web
✗ [contentStorageService] Saved X channels
✗ [AsyncStorage] (errors)
```

### Step 3: Test IndexedDB Storage (Web Only)

**In browser DevTools:**

1. Open DevTools (F12)
2. Go to Application tab
3. Expand IndexedDB → onvitv_db → playlist_items
4. Should see: list of parsed items with columns: id, playlistId, name, streamUrl, contentType, etc.

**If empty:**
- Check console for errors
- Verify indexedDBStorage.js is creating object store
- Check network tab to see if M3U downloaded

### Step 4: Test SQLite Storage (Native Only)

**On native (iOS/Android):**

After adding playlist, check for:
- No errors in Xcode console
- No "Falling back to in-memory storage" messages
- Content appears on Home screen within 2-5 seconds

---

## Debug Logging Additions

### If Parsing Not Starting

Add this to backgroundParsingService.js startParsing():
```javascript
console.log('=== PARSING START DEBUG ===');
console.log('playlistId:', playlistId);
console.log('playlistData type:', playlistData.type);
console.log('Platform:', Platform.OS);
console.log('activeJobs size before:', activeJobs.size);
console.log('activeJobs has playlistId:', activeJobs.has(playlistId));
console.log('=== END DEBUG ===');
```

### If Storage Not Saving

Add this to itemStorageService.js saveItemsBatch():
```javascript
console.log('=== STORAGE SAVE DEBUG ===');
console.log('Platform:', Platform.OS);
console.log('Items count:', items.length);
console.log('playlistId:', playlistId);
console.log('Storage impl type:', typeof storageImpl);
console.log('=== END DEBUG ===');
```

### If Content Not Retrieving

Add this to channelService.js getChannelsByPlaylist():
```javascript
console.log('=== RETRIEVAL DEBUG ===');
console.log('playlistId:', playlistId);
console.log('itemStorageService type:', typeof itemStorageService);
console.log('Storage result length:', channels.length);
console.log('First item:', channels[0]);
console.log('=== END DEBUG ===');
```

---

## Expected vs Actual Behavior Matrix

### Web Platform

| Action | Expected | Actual | Status |
|--------|----------|--------|--------|
| Add M3U | Parse immediately | [check] | ✓ |
| Parser uses | JavaScript parser | [check] | ✓ |
| Storage uses | IndexedDB | [check] | ✓ |
| Navigation | Immediate | [check] | ✓ |
| Content shows | Yes, progressive | [check] | ✓ |
| Persist reload | Yes | [check] | ✓ |

### Native Platform

| Action | Expected | Actual | Status |
|--------|----------|--------|--------|
| Add M3U | Parse immediately | [check] | ✓ |
| Parser uses | Prod library (fallback JS) | [check] | ✓ |
| Storage uses | SQLite | [check] | ✓ |
| Navigation | After 1-5s (first batch wait) | [check] | ✓ |
| Content shows | Yes, progressive | [check] | ✓ |
| Persist restart | Yes | [check] | ✓ |

---

## Common Issues & Solutions

### Issue 1: "itemStorageService is not a function"

**Cause:** Using default export instead of named export

**Fix:**
```javascript
// WRONG:
import itemStorageService from './itemStorageService';

// CORRECT:
import { itemStorageService } from './itemStorageService';
```

### Issue 2: "Cannot read property 'saveItemsBatch' of undefined"

**Cause:** itemStorageService not initialized

**Fix:** Ensure itemStorageService.js exports the object correctly:
```javascript
export const itemStorageService = {
  initializeStorage,
  saveItemsBatch,
  // ... other methods
};

export default itemStorageService;
```

### Issue 3: "IndexedDB not available"

**Cause:** Browser doesn't support IndexedDB (very rare)

**Solution:** Falls back to in-memory storage automatically
Check console: "Fell back to in-memory storage"

### Issue 4: "All playlists still showing 0 content"

**Checklist:**
- [ ] backgroundParsingService.js updated? (No Platform.OS === 'web' guards)
- [ ] channelService/movieService/seriesService updated? (Using itemStorageService)
- [ ] New files created? (itemStorageService, indexedDBStorage, etc.)
- [ ] Console shows parsing happening? (Check logs)
- [ ] Storage logs appear? (Check "Saved X items" message)

### Issue 5: "Parsing works but content disappears after navigation"

**Cause:** Services reading from different storage than parser writes

**Fix:**
1. Verify all services import itemStorageService
2. Verify all services use getItemsByType()
3. Verify parser saves to itemStorageService

---

## Performance Verification

### Expected Performance

**Web M3U Parsing:**
- Download: 1-3 seconds (depends on M3U file size)
- Parse: 0.5-2 seconds
- Save to IndexedDB: 0.5-1 second
- **Total first batch:** 2-5 seconds

**Web Xtream Parsing:**
- Authenticate: 1-2 seconds
- Fetch categories: 0.5 seconds
- Fetch first batch (100 items): 2-3 seconds
- Save to IndexedDB: 0.5-1 second
- **Total first batch:** 4-7 seconds

**Native Parsing:**
- Similar to web, but may be faster due to native execution
- SQLite saves typically faster than IndexedDB

### Metrics to Monitor

```javascript
// Add timing logs to backgroundParsingService.js:
const startTime = Date.now();
// ... parsing code ...
const duration = Date.now() - startTime;
console.log(`[backgroundParsingService] Parsing took ${duration}ms`);
```

**Expected durations:**
- M3U: 2-5 seconds
- Xtream: 4-10 seconds
- If > 15 seconds: Check network, file size, server response time

---

## Database Content Verification

### Web (IndexedDB)

```javascript
// In DevTools console, paste this:
const dbRequest = indexedDB.open('onvitv_db');
dbRequest.onsuccess = function() {
  const db = dbRequest.result;
  const tx = db.transaction('playlist_items', 'readonly');
  const store = tx.objectStore('playlist_items');
  const getAllRequest = store.getAll();
  getAllRequest.onsuccess = function() {
    console.log('IndexedDB contents:', getAllRequest.result);
    console.log('Total items:', getAllRequest.result.length);
  };
};
```

### Native (SQLite)

```javascript
// In React Native debugger console:
import { localDatabaseService } from './src/services/localDatabaseService';
const items = await localDatabaseService.getPlaylistItems('YOUR_PLAYLIST_ID');
console.log('SQLite contents:', items);
console.log('Total items:', items.length);
```

---

## Final Checklist Before Declaring Success

- [ ] Web M3U parsing works (content appears)
- [ ] Web Xtream parsing works (content appears)
- [ ] Native M3U parsing works (no regressions)
- [ ] Native Xtream parsing works (no regressions)
- [ ] Content persists on web after reload
- [ ] Content persists on native after restart
- [ ] IndexedDB shows stored data (web only)
- [ ] SQLite shows stored data (native only)
- [ ] No platform-specific guards in parsing code
- [ ] All services use itemStorageService
- [ ] Console shows proper logging
- [ ] Navigation timing correct (immediate on web, 1-5s on native)
- [ ] First batch event fires (~100 items)
- [ ] Parsing completion event fires

✅ **When all items are checked, web parsing is production-ready!**
