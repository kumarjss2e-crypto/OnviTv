# Parsing Loading Indicator - Flow Diagram

## Timeline: Adding a Playlist

```
USER ACTION                          SYSTEM STATE                    UI DISPLAY
─────────────────────────────────────────────────────────────────────────────
User fills playlist form
                                                                    [AddPlaylistScreen]
User presses "Add Playlist"
            ↓
Playlist saved to Firestore          isParsing: false              [Success Dialog]
            ↓
User presses "OK" in dialog
            ↓
Navigation.navigate('Home')           isParsing: false              [Home Screen]
            ↓
startParsing(playlistId) called       isParsing: true               [Loading bar ▓]
            ↓                         (ParseLoadingContext)         "Loading content..."
M3U URL fetch starts                  Network call in progress
            ↓
[30 second wait for M3U response]     Parsing ongoing               [Still showing bar]
            ↓
Response arrives, parsing begins      Lines being processed         [Still showing bar]
            ↓
50 items accumulated                  Batch ready
            ↓
First batch.commit() succeeds         ✅ Content saved              [Bar disappears]
            ↓                         finishParsing() called         [Home shows content]
onFirstBatchSaved() fires             listener notified
            ↓
Content renders on Home screen        progressively                 [Movies, TV shows]
            ↓
More batches arrive                   progressively                 [More content appears]
```

## Component Communication

```
AddPlaylistScreen
       │
       ├─→ startParsing(playlistId)
       │        │
       │        ↓
       └─→ backgroundParsingService.startParsing()
            │
            ├─→ createParserEngine(playlistId, onProgressUpdate, onFirstBatchSaved)
            │
            └─→ Returns listener subscription
                 │
                 ↓
       ParseLoadingContext
            │
            ├─→ addParseListener(playlistId, callback)
            │
            └─→ Stores subscription
                 │
                 ↓ (when first batch saved)
                 │
       backgroundParsingService
            │
            ├─→ notifyParseListeners(playlistId, { type: 'firstBatchSaved' })
            │
            └─→ Calls all registered listeners
                 │
                 ↓
       ParseLoadingContext (callback)
            │
            ├─→ finishParsing(playlistId)
            │
            └─→ Updates state, triggers re-render
                 │
                 ↓
       HomeScreen
            │
            ├─→ hasAnyParsing = false
            │
            └─→ Hides loading indicator
                 │
                 ↓
       Content appears
```

## State Management

```
┌─────────────────────────────────────────────┐
│        ParseLoadingContext State            │
├─────────────────────────────────────────────┤
│                                             │
│  parsingPlaylistIds: Set<string>           │
│    • Empty initially                       │
│    • playlistId added in startParsing()    │
│    • playlistId removed in finishParsing() │
│                                             │
│  hasAnyParsing: Boolean                    │
│    • Computed from parsingPlaylistIds.size│
│    • True if size > 0                      │
│    • False if size === 0                   │
│                                             │
└─────────────────────────────────────────────┘
         ↓
    Used by HomeScreen
         ↓
   {hasAnyParsing && <LoadingBar />}
```

## Event Flow for Multiple Playlists

```
Scenario: User adds 2 playlists simultaneously

Timeline:
┌─────────────────────────────────┬──────────────────┬──────────────────┐
│ Time                            │ Playlist 1       │ Playlist 2       │
├─────────────────────────────────┼──────────────────┼──────────────────┤
│ 0s:  Both playlists added       │ parsing: true    │ parsing: true    │
│                                 │                  │                  │
│ UI shows loading bar            │ hasAnyParsing=T  │                  │
├─────────────────────────────────┼──────────────────┼──────────────────┤
│ 15s: PL1 first batch ready      │ firstBatchSaved! │ parsing: true    │
│                                 │ removed from set │                  │
│ UI still shows loading bar      │                  │ hasAnyParsing=T  │
│ (because PL2 still parsing)     │                  │                  │
├─────────────────────────────────┼──────────────────┼──────────────────┤
│ 20s: PL2 first batch ready      │ ✅ done          │ firstBatchSaved! │
│                                 │                  │ removed from set │
│ UI hides loading bar            │                  │                  │
│ Content from both appears       │                  │ hasAnyParsing=F  │
└─────────────────────────────────┴──────────────────┴──────────────────┘
```

## Visual Design

```
┌─────────────────────────────────────────────────┐
│ [Spinner] Loading content...                    │  ← parsingIndicator
│ ─────────────────────────────────────────────── │  ← border line
├─────────────────────────────────────────────────┤
│                                                 │
│  [Home Header with Logo]                        │
│                                                 │
│  All Live TV  Movies  Series  Channels          │  ← Choice Chips
│                                                 │
│  [Search Bar]                                   │
│                                                 │
│  Movies                              View All   │
│  ─────────────────────────────────────────────  │
│  [Movie1] [Movie2] [Movie3] [Movie4]            │
│                                                 │
│  Series                              View All   │
│  ─────────────────────────────────────────────  │
│  [Show1] [Show2] [Show3] [Show4]                │
│                                                 │
└─────────────────────────────────────────────────┘

Colors:
• Background: rgba(147, 51, 234, 0.1)  [Light Purple]
• Border: colors.primary.purple         [Dark Purple]
• Text: colors.primary.purple           [Dark Purple]
• Spinner: colors.primary.purple        [Dark Purple]
```

## Code Hierarchy

```
App.js
 │
 └─→ <ParseLoadingProvider>  ← Provides context
      │
      ├─→ HomeScreen  ← Consumes context
      │   │
      │   └─→ {hasAnyParsing && <LoadingBar />}
      │
      └─→ AddPlaylistScreen  ← Triggers parsing
          │
          └─→ calls startParsing()
              │
              └─→ backgroundParsingService.startParsing()
                  │
                  └─→ createParserEngine()
                      │
                      └─→ First flush triggers callback
                          │
                          └─→ notifyParseListeners()
                              │
                              └─→ ParseLoadingContext hears event
                                  │
                                  └─→ finishParsing()
                                      │
                                      └─→ HomeScreen re-renders
                                          │
                                          └─→ Loading bar disappears
```

## Persistence & Cleanup

```
Memory Management:
├─ parseListeners Map stays in memory during app session
├─ Listeners only created when startParsing() called
├─ Listeners cleaned up automatically:
│  ├─ When finishParsing() called
│  ├─ Via unsubscribe function returned from addParseListener()
│
└─ No memory leaks:
   └─ Each listener tied to specific playlistId
   └─ Listeners removed when parsing completes
```

## Error Scenarios

```
Case 1: Parsing Fails (Network Error)
├─ Loading indicator remains visible
├─ User can retry from Playlist Management
├─ Manual finishParsing() needed (or timeout)

Case 2: User Deletes Playlist During Parsing
├─ Parsing service detects deletion
├─ Aborts parsing job
├─ Loading indicator remains (orphaned)
├─ Could enhance: finishParsing() on abort

Case 3: App Crashes During Parsing
├─ On restart, resumeIncompleteParses() is called
├─ Could trigger loading indicator again
├─ First batch saved → indicator disappears
└─ No user-visible issue

Case 4: No Internet Connection
├─ M3U fetch fails immediately
├─ Retry logic engages (4 attempts)
├─ Loading indicator stays visible throughout
├─ Eventually fails with error
```

## Performance Notes

- Context subscription is lightweight (just a function callback)
- Loading indicator has minimal re-render impact
- No polling or timers needed
- Event-driven approach is efficient
- Scales to multiple playlists without performance hit
