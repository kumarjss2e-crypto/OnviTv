# Parsing Progress Service - Quick Reference Guide

## Overview

The **parsingProgressService** tracks playlist parsing progress and emits events as content is being fetched and saved locally.

This enables the UI to:
- Know when initial content is ready (wait ~1-5 seconds)
- Navigate with confidence that some items exist
- Monitor parsing status in real-time
- Handle errors gracefully

---

## Basic Usage

### In AddPlaylistScreen.js (Already Implemented)

```javascript
import { parsingProgressService } from '../services/parsingProgressService';

// After starting parsing background job:
try {
  // Wait for first batch to be saved (max 10 seconds)
  await parsingProgressService.waitForFirstBatch(playlistId, 10000);
  
  // Now safe to navigate - some content exists locally
  navigation.navigate('Home');
} catch (timeout) {
  // Timeout is OK - parsing still runs in background
  console.warn('First batch timeout, navigating anyway');
  navigation.navigate('Home');
}
```

---

## API Reference

### Events

#### `firstBatchReady`
Emitted when first batch (usually 100+ items) is saved to database.

```javascript
parsingProgressService.on('firstBatchReady', (data) => {
  console.log(`Playlist ${data.playlistId} has ${data.itemCount} items saved`);
  // data: { playlistId, itemCount, timestamp }
});
```

#### `batchSaved`
Emitted after each batch is saved (optional - for detailed progress).

```javascript
parsingProgressService.on('batchSaved', (data) => {
  console.log(`Batch ${data.batchNumber}: ${data.totalItemsSoFar} items total`);
  // data: { playlistId, batchNumber, totalItemsSoFar }
});
```

#### `parsingComplete`
Emitted when all parsing finishes successfully.

```javascript
parsingProgressService.on('parsingComplete', (data) => {
  console.log(`✓ Done!`, data.stats);
  // data: { playlistId, stats: { channels: X, movies: Y, series: Z }, timestamp }
});
```

#### `parsingError`
Emitted if parsing fails.

```javascript
parsingProgressService.on('parsingError', (data) => {
  console.error(`✗ Error:`, data.error.message);
  // data: { playlistId, error, timestamp }
});
```

---

### Methods

#### `waitForFirstBatch(playlistId, timeoutMs = 10000)`
**Blocks until first batch is saved, or timeout.**

```javascript
try {
  const data = await parsingProgressService.waitForFirstBatch('playlist_123', 10000);
  console.log(`First batch ready: ${data.itemCount} items`);
} catch (error) {
  // Timeout or error - OK to navigate anyway
  console.warn('Timeout:', error.message);
}
```

**Returns:** `{ playlistId, itemCount, timestamp }`  
**Throws:** `Error` if timeout or parsing fails

---

#### `waitForCompletion(playlistId, timeoutMs = 300000)`
**Blocks until all parsing completes.**

```javascript
try {
  const data = await parsingProgressService.waitForCompletion('playlist_123', 60000);
  console.log(`✓ All done!`, data.stats);
} catch (error) {
  console.error('Parsing error:', error.message);
}
```

**Returns:** `{ playlistId, stats, timestamp }`  
**Throws:** `Error` if timeout or parsing fails

---

#### `getProgress(playlistId)`
**Get current progress for a playlist.**

```javascript
const progress = parsingProgressService.getProgress('playlist_123');
console.log(progress);
// Output: { 
//   status: 'parsing', 
//   itemsSaved: 450, 
//   firstBatchReady: true,
//   batchNumber: 4,
//   totalItemsSoFar: 450 
// }
```

**Returns:** Progress object or `undefined` if not found

---

#### `getAllProgress()`
**Get all active parsing jobs.**

```javascript
const allProgress = parsingProgressService.getAllProgress();
Object.entries(allProgress).forEach(([playlistId, progress]) => {
  console.log(`${playlistId}: ${progress.status}`);
});
// Output:
// playlist_1: parsing
// playlist_2: complete
// playlist_3: error
```

**Returns:** Object with playlistId as keys

---

#### `isAnyParsingActive()`
**Check if any playlist is currently parsing.**

```javascript
if (parsingProgressService.isAnyParsingActive()) {
  console.log('Some playlists are still parsing');
}
```

**Returns:** `true` if any parsing in progress, `false` otherwise

---

#### `clear(playlistId)`
**Clear progress for specific playlist.**

```javascript
parsingProgressService.clear('playlist_123');
```

---

#### `clearAll()`
**Clear all progress tracking.**

```javascript
parsingProgressService.clearAll();
```

---

## Progress Object Structure

```javascript
{
  status: 'parsing' | 'complete' | 'error',
  
  // Set when first batch saves
  itemsSaved: 100,
  firstBatchTime: 1704067234000,
  firstBatchReady: true,
  
  // Updated after each batch
  batchNumber: 5,
  totalItemsSoFar: 450,
  lastBatchTime: 1704067240000,
  
  // Set when parsing completes
  stats: {
    channels: 250,
    movies: 150,
    series: 50,
    total: 450
  },
  completedAt: 1704067280000,
  
  // Set on error
  error: 'Network timeout',
  errorAt: 1704067290000
}
```

---

## Common Patterns

### Pattern 1: Wait for Content, Then Navigate

```javascript
const handleSavePlaylist = async () => {
  // ... save to Firestore ...
  
  // Start parsing
  backgroundParsingService.startParsing(playlistId, data);
  
  // Wait for initial content
  try {
    await parsingProgressService.waitForFirstBatch(playlistId, 10000);
  } catch (e) {
    console.warn('Slow to start, but continuing...');
  }
  
  // Navigate - some items already exist
  navigation.navigate('Home');
};
```

### Pattern 2: Monitor Progress in Real-Time

```javascript
const [progress, setProgress] = useState(null);

useEffect(() => {
  const handleBatchSaved = (data) => {
    if (data.playlistId === currentPlaylistId) {
      setProgress(data);
    }
  };
  
  parsingProgressService.on('batchSaved', handleBatchSaved);
  return () => parsingProgressService.removeListener('batchSaved', handleBatchSaved);
}, []);

return (
  <View>
    {progress && (
      <Text>{progress.totalItemsSoFar} items fetched...</Text>
    )}
  </View>
);
```

### Pattern 3: Handle Parsing Errors

```javascript
useEffect(() => {
  const handleError = (data) => {
    if (data.playlistId === playlistId) {
      Toast.show({
        type: 'error',
        text1: 'Parsing Failed',
        text2: data.error.message
      });
    }
  };
  
  parsingProgressService.on('parsingError', handleError);
  return () => parsingProgressService.removeListener('parsingError', handleError);
}, []);
```

### Pattern 4: Show Parse Progress

```javascript
const [parseStatus, setParseStatus] = useState('idle');

useEffect(() => {
  const handleFirstBatch = (data) => {
    setParseStatus(`${data.itemCount} items loaded`);
  };
  
  const handleComplete = (data) => {
    setParseStatus(`✓ ${data.stats.total} items`);
  };
  
  parsingProgressService.on('firstBatchReady', handleFirstBatch);
  parsingProgressService.on('parsingComplete', handleComplete);
  
  return () => {
    parsingProgressService.removeListener('firstBatchReady', handleFirstBatch);
    parsingProgressService.removeListener('parsingComplete', handleComplete);
  };
}, []);

return <Text>{parseStatus}</Text>;
```

---

## Timing Expectations

### M3U Parsing

```
t=0s:    startParsing() called
t=0.1s:  Download M3U file (depends on size/network)
t=0.5s:  Parse M3U entries
t=1s:    First 100 items saved ← firstBatchReady event
t=5s:    All 1000 items saved ← parsingComplete event
```

### Xtream Parsing

```
t=0s:    startParsing() called
t=0.5s:  Authenticate with server
t=1s:    Fetch channel categories
t=2s:    Fetch first batch of channels/movies/series
t=3s:    First 100 items saved ← firstBatchReady event
t=10s:   All 500+ items saved ← parsingComplete event
```

**Timeout Behavior:**
- First batch should arrive within 5-10 seconds
- If > 10s, `waitForFirstBatch()` times out but parsing continues
- Safe to navigate - even if no items yet, parsing will complete in background

---

## Debugging

### Enable Detailed Logging

```javascript
// In parsingProgressService.js, all console.logs already included:
console.log(`[ParsingProgressService] ✓ First batch ready: ${itemCount} items`);
console.error(`[ParsingProgressService] ✗ Parsing error...`);

// In backgroundParsingService.js:
console.log(`[backgroundParsingService] Saved 100 items in batch (SQLite)`);
```

### Monitor in Chrome DevTools

```javascript
// In console:
parsingProgressService.getAllProgress()
// Returns: { playlist_123: { status: 'parsing', ... }, ... }

parsingProgressService.getProgress('playlist_123')
// Returns: { status: 'parsing', itemsSaved: 450, ... }
```

### Check Active Jobs

```javascript
backgroundParsingService.getActiveJobs()
// Returns: [
//   { id: 'playlist_1', duration: 5000 },
//   { id: 'playlist_2', duration: 2000 }
// ]
```

---

## Performance Notes

- ✅ Non-blocking - doesn't freeze UI
- ✅ EventEmitter - memory efficient
- ✅ Timeout prevents hanging forever
- ✅ Continues in background after navigation
- ⚠️ Max 10s delay for first batch (network-dependent)
- ⚠️ Large playlists (10K+ items) may take 30+ seconds total

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| **No firstBatchReady event** | Network timeout or parsing error | Check console logs, verify URL/credentials |
| **Navigation not delayed** | Timeout occurring (>10s) | Normal behavior - parsing continues anyway |
| **Parsing stops after navigation** | App crashed or hot-reload | Check error logs, restart app |
| **Memory increasing** | Very large playlist | Normal - batching limits to ~100 items in memory |
| **Duplicate items in DB** | Race condition | Check for duplicate playlist additions |

---

## Related Services

- **backgroundParsingService** - Actual parsing logic
- **localDatabaseService** - Storage (SQLite/in-memory)
- **playlistService** - Firebase operations

---

## Version Info

- Service added: v1.9.9
- Status: Production-ready
- Tested on: iOS, Android, Web
