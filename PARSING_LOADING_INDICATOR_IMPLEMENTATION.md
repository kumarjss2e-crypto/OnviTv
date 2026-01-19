# M3U Parsing Loading Indicator Implementation

## Problem
Users were navigated to the Home screen immediately after adding a playlist, with no content visible and no indication that the system was loading content. The 30-second wait for the M3U response created a poor UX where users thought nothing was happening.

## Solution
Implemented a progress loading indicator that:
1. **Appears immediately** when a user adds a playlist and parsing starts
2. **Shows a subtle purple bar** with "Loading content..." message at the top of Home screen
3. **Disappears automatically** once the first batch of items is successfully saved to Firestore
4. **Reappears if multiple playlists** are being parsed simultaneously

## Implementation Details

### 1. Created New Context: `ParseLoadingContext.js`
**File**: `src/context/ParseLoadingContext.js`

- Tracks which playlists are currently in the initial "waiting for M3U response" state
- Subscribes to parse events from backgroundParsingService
- Automatically removes loading indicator when first batch is saved
- Provides `useParseLoading()` hook for components

**Key Methods**:
- `startParsing(playlistId)` - Called when parsing begins
- `finishParsing(playlistId)` - Called when first batch is saved
- `isPlaylistParsing(playlistId)` - Check if specific playlist is loading
- `hasAnyParsing` - Check if ANY playlist is loading (for UI indicator)

### 2. Updated `streamingParserEngine.js`
**Changes**: Added `onFirstBatchSaved` callback parameter

```javascript
export const createParserEngine = (playlistId, onProgressUpdate, onFirstBatchSaved)
```

- When the first batch is successfully committed to Firestore, the callback fires
- This callback notifies listeners that content has started appearing
- Prevents duplicate callbacks via `firstBatchSaved` boolean flag

**In flushBatch() method**: After batch.commit() succeeds, calls `onFirstBatchSaved()` if it's the first flush

### 3. Updated `backgroundParsingService.js`
**Changes**: Added event listener/subscription system

**New Code**:
```javascript
const parseListeners = new Map(); // playlistId -> Set of callbacks
const addParseListener = (playlistId, callback) => { ... }
const notifyParseListeners = (playlistId, event) => { ... }
```

- When first batch is saved, emits event: `{ type: 'firstBatchSaved', playlistId }`
- Passes `onFirstBatchSaved` callback to createParserEngine
- Exported `addParseListener` in service export

**Flow**:
```
streamingParserEngine.js (first flush succeeds)
  → onFirstBatchSaved() callback fires
  → Calls notifyParseListeners()
  → ParseLoadingContext callback triggered
  → finishParsing() removes loading indicator
```

### 4. Updated `AddPlaylistScreen.js`
**Changes**: Integrated with ParseLoadingContext

- Imported `useParseLoading()` hook
- Calls `startParsing(playlistId)` before parsing starts (in the setTimeout after dialog)
- This registers the playlist with the context and subscribes to parsing events

### 5. Updated `App.js`
**Changes**: Added ParseLoadingProvider wrapper

- Imported `ParseLoadingProvider`
- Wrapped entire app with provider (after ToastProvider, before closing divs)
- Ensures loading context is available to all screens

```javascript
<ToastProvider>
  <ParseLoadingProvider>
    <GestureHandlerRootView>
      {/* Navigation */}
    </GestureHandlerRootView>
  </ParseLoadingProvider>
</ToastProvider>
```

### 6. Updated `HomeScreen.js`
**Changes**: Added UI loading indicator

**Added to JSX** (after StatusBar, before Header):
```javascript
{hasAnyParsing && (
  <View style={styles.parsingIndicator}>
    <ActivityIndicator size="small" color={colors.primary.purple} />
    <Text style={styles.parsingText}>Loading content...</Text>
  </View>
)}
```

**Added Styles**:
```javascript
parsingIndicator: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  backgroundColor: 'rgba(147, 51, 234, 0.1)',  // Light purple
  borderBottomWidth: 1,
  borderBottomColor: colors.primary.purple,
  gap: spacing.md,
},
parsingText: {
  fontSize: fontSizes.sm,
  color: colors.primary.purple,
  fontWeight: '500',
},
```

## User Experience Flow

1. **User adds playlist** → Success dialog shown
2. **User presses OK** → Navigated to Home screen
3. **Loading indicator appears** immediately at top (purple bar with spinner + "Loading content...")
4. **30 seconds pass** (M3U file is being downloaded/parsed)
5. **First batch commits to Firestore** → ParseLoadingContext notified
6. **Loading indicator disappears** → Home screen shows content
7. **Content populates progressively** as more batches are saved

## Benefits

✅ **Clear feedback** - Users know the system is working
✅ **Non-blocking** - Users can scroll/interact while content loads
✅ **Minimal UI** - Subtle indicator, doesn't distract
✅ **Automatic cleanup** - No manual dismissal needed
✅ **Multiple playlists** - Handles concurrent parsing
✅ **Responsive** - Only shows when actually parsing (not during normal loading)

## Testing Checklist

- [ ] Add a new playlist with M3U URL
- [ ] Verify loading indicator appears immediately
- [ ] Wait for first batch to save (~5 seconds after response arrives)
- [ ] Verify indicator disappears automatically
- [ ] Verify content appears and populates progressively
- [ ] Test with multiple playlists being added simultaneously
- [ ] Test on both iOS and Android (if available)
- [ ] Test on web

## Files Modified

1. `src/context/ParseLoadingContext.js` - **NEW FILE**
2. `src/services/backgroundParsingService.js` - Added listener system
3. `src/utils/streamingParserEngine.js` - Added onFirstBatchSaved callback
4. `src/screens/AddPlaylistScreen.js` - Call startParsing()
5. `App.js` - Wrap with ParseLoadingProvider
6. `src/screens/HomeScreen.js` - Display loading indicator

## Notes

- The indicator uses the existing purple theme color for consistency
- Event system is generic and can be extended for other parsing events
- Listener cleanup happens automatically via unsubscribe function
- No changes to parsing logic or data flow
