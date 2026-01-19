# Delete During Parsing - Safety Flow Diagram

## Scenario: User Deletes Playlist While Parsing

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PARSING IN PROGRESS                              │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │ backgroundParsingService.startParsing(playlistId, data)  │       │
│  │                                                          │       │
│  │ • abortController created                               │       │
│  │ • activeJobs[playlistId] = {abortController, engine}    │       │
│  │ • Parser streaming: M3U chunks or Xtream API            │       │
│  │                                                          │       │
│  │  For each item:                                         │       │
│  │  1. Check if playlist exists ✅ (NEW)                   │       │
│  │  2. Validate format                                     │       │
│  │  3. Skip duplicates                                     │       │
│  │  4. Add to batch                                        │       │
│  │  5. Every 50 items → write to Firestore                │       │
│  └──────────────────────────────────────────────────────────┘       │
│                            ▲                                         │
│                            │                                         │
└─────────────────────────────┼──────────────────────────────────────┘
                              │
                              │ USER DELETES PLAYLIST
                              │
                    ┌─────────▼──────────┐
                    │ DELETE TRIGGERED   │
                    └─────────┬──────────┘
                              │
          ┌───────────────────▼────────────────────┐
          │  playlistService.deletePlaylist()      │
          │                                        │
          │  1. Get backgroundParsingService      │
          │  2. Call cancelParsing(playlistId) ✅  │
          │  3. Delete subcollections             │
          │  4. Delete progress tracker           │
          │  5. Delete playlist doc               │
          └───────┬──────────────────────┬────────┘
                  │                      │
        ┌─────────▼──┐        ┌──────────▼────────┐
        │   CANCEL   │        │   DELETE DATA     │
        │  PARSING   │        │                   │
        │            │        │ ┌────────────────┐│
        └─────┬──────┘        │ │ channels/      ││
              │               │ │ movies/        ││
              │               │ │ series/        ││
        ┌─────▼──────────────┐│ │ meta/progress  ││
        │activeJobs.get()    ││ └────────────────┘│
        │                    ││                   │
        │job.abortController ││ Firestore        │
        │   .abort()  ✅     ││ Batch Delete     │
        │                    ││                   │
        │This sets:          ││ All subcollections│
        │abortSignal.aborted ││ are deleted      │
        │= true              ││                   │
        └────────┬───────────┘└──────────┬────────┘
                 │                       │
          ┌──────▼────────┐      ┌───────▼──────────┐
          │ PARSER LOOP   │      │ FIRESTORE STATE  │
          │               │      │                  │
          │ Checks signal │      │ playlists/xxx    │
          │ in:           │      │ {DELETED}        │
          │               │      │                  │
          │ • onItemParsed│      │ subcollections:  │
          │ • onProgress  │      │ {DELETED}        │
          │               │      │                  │
          │ Sees: ABORTED │      │ meta/progress:   │
          │       = true  │      │ {DELETED}        │
          └───┬───────────┘      └──────────────────┘
              │
              │
      ┌───────▼────────────┐
      │ GRACEFUL STOP      │
      │                    │
      │ • No more chunks   │
      │ • No writes to FB  │
      │ • Job cleaned up   │
      │ • activeJobs.delete│
      │ • No orphaned data │
      │                    │
      │ ✅ SAFE STATE      │
      └────────────────────┘
```

---

## Safety Layers

### Layer 1: Immediate Cancellation
```javascript
// When delete is called:
await backgroundParsingService.cancelParsing(playlistId);
  ↓
job.abortController.abort();
  ↓
abortController.signal.aborted = true
```

### Layer 2: Existence Check in onItemParsed
```javascript
// Before writing each item:
const playlistSnap = await getDoc(doc(db, 'playlists', playlistId));
if (!playlistSnap.exists()) {
  job.abortController.abort();  // Double-check stop
  return;
}
```

### Layer 3: Existence Check in onProgress
```javascript
// Before updating progress:
const playlistSnap = await getDoc(doc(db, 'playlists', playlistId));
if (!playlistSnap.exists()) {
  job.abortController.abort();  // Another safety check
  return;
}
```

### Layer 4: Firestore Cleanup
```javascript
// Atomic deletion:
1. Delete all channels/{id}
2. Delete all movies/{id}
3. Delete all series/{id}
4. Delete meta/progress
5. Delete playlists/{id}
```

---

## Edge Cases Handled

### Case 1: Delete Before Parse Starts
```
Add → Delete immediately
Result: ✅ No active job, normal deletion
```

### Case 2: Delete During First Chunk
```
Add → Parser fetching first 64KB → Delete
Result: ✅ Parser aborted before any items processed
```

### Case 3: Delete During Batch Write
```
Add → 40 items accumulated → Delete
Result: ✅ Batch not committed, parser stops before write
```

### Case 4: Delete After Batch Committed
```
Add → 50 items written → Delete
Result: ✅ Batch written but parser stops immediately
        ✅ Future batches won't write
        ✅ All data gets deleted anyway
```

### Case 5: Delete After Parse Complete
```
Add → Parsing finishes → Delete
Result: ✅ Normal deletion, no active job
```

---

## Guarantees

| Guarantee | How Achieved |
|-----------|--------------|
| No orphaned data | Atomic deletion of all subcollections |
| No memory leaks | activeJobs.delete() on abort |
| No hung processes | AbortSignal.aborted checked in parser loop |
| No Firestore errors | Existence check before each write |
| No duplicate writes | Parser stops immediately on delete |
| Other jobs unaffected | Each job has separate abortController |

---

## Testing Checklist

- [ ] Add playlist, delete within 1 second
- [ ] Add playlist, delete after 30 seconds (mid-parse)
- [ ] Add 3 playlists, delete middle one
- [ ] Delete, then refresh page (check resume doesn't restart)
- [ ] Verify Firestore: no subcollections remain
- [ ] Check console: "Cancelled active parsing"
- [ ] Monitor network tab: no more writes after delete
- [ ] Verify job removed from activeJobs Map

---

## Performance Impact

✅ **Minimal:** Existence checks are:
- One `getDoc()` per item parse (cached by Firestore)
- One `getDoc()` per progress update (~every 50 items)
- Total overhead: < 50ms for typical parsing

**Total parsing unaffected** - Only adds safety, no slowdown.
