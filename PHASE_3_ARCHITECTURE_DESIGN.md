# PHASE 3: Architecture Design - Production-Grade IPTV System

**Date:** May 11, 2026  
**Phase:** 3 of 15  
**Status:** DESIGN SPECIFICATION (Blueprint for Phases 4-7)  
**Scope:** Complete architectural redesign of IPTV ingestion, storage, and state management

---

## EXECUTIVE SUMMARY

This document defines the new production-grade IPTV architecture that will replace all fragmented systems deleted in Phase 2. The new architecture:

- ✅ **Cross-Platform:** Works on web (IndexedDB), iOS (SQLite), Android (SQLite), Expo
- ✅ **Efficient:** Progressive loading (first 50 items appear immediately)
- ✅ **Reliable:** Automatic retry, resume, error recovery
- ✅ **Maintainable:** Clean separation of concerns, no Platform.OS guards in core logic
- ✅ **Scalable:** Unified ingestion manager handles both M3U and Xtream
- ✅ **Observable:** Structured logging with [INGESTION], [PARSING], [STORAGE], [STATE] tags

---

## PART 1: NEW FILE STRUCTURE

### Current Structure (Post-Deletion)
```
src/
├── components/       (UI components - UNTOUCHED)
├── config/          (Firebase config - UNTOUCHED)
├── context/         (State contexts - MOSTLY UNTOUCHED)
├── hooks/           (Custom hooks - UNTOUCHED)
├── navigation/      (Navigation - UNTOUCHED)
├── screens/         (App screens - UNTOUCHED)
├── services/        (Business logic - PARTIALLY REORGANIZED)
├── theme/           (Styling - UNTOUCHED)
└── utils/           (Utilities - UNTOUCHED)
```

### NEW Target Structure
```
src/
├── components/                    (UI components - UNTOUCHED)
├── config/                        (Firebase config - UNTOUCHED)
├── context/                       (React contexts - REFACTORED)
├── hooks/                         (Custom hooks - UNTOUCHED)
├── navigation/                    (Navigation - UNTOUCHED)
├── screens/                       (App screens - UNTOUCHED)
├── services/                      (Business logic layer)
│   ├── storage/                   (Platform-aware storage adapters)
│   │   ├── indexedDBStorage.js    ✅ EXISTING (web)
│   │   ├── sqliteStorage.js       ✅ EXISTING (native)
│   │   ├── memoryStorage.js       ✅ EXISTING (fallback)
│   │   └── storageFactory.js      📝 NEW (adapter selector)
│   ├── content/                   (Content services - REFACTORED)
│   │   ├── channelService.js      ✅ EXISTING (uses itemStorageService)
│   │   ├── movieService.js        ✅ EXISTING (uses itemStorageService)
│   │   ├── seriesService.js       ✅ EXISTING (uses itemStorageService)
│   │   ├── searchService.js       ✅ EXISTING (needs minor update)
│   │   ├── epgService.js          ✅ EXISTING (needs integration)
│   │   ├── metadataService.js     ✅ EXISTING (needs integration)
│   │   └── categoryService.js     ✅ EXISTING (ensure groupTitle support)
│   ├── ingestion/                 (NEW - Playlist ingestion system)
│   │   ├── m3uParsingService.js   📝 NEW (pure JS M3U parser)
│   │   ├── xtreamParsingService.js 📝 NEW (pure JS Xtream parser)
│   │   ├── ingestionManager.js    📝 NEW (orchestrator - React-independent)
│   │   ├── parsingWorker.js       📝 NEW (Web Worker for heavy parsing)
│   │   └── progressTracker.js     📝 NEW (progress state machine)
│   ├── itemStorageService.js      ✅ EXISTING (unified storage interface)
│   ├── parsingProgressService.js  ✅ EXISTING (event emitter - to be replaced by state)
│   ├── authService.js             ✅ CORE (NO CHANGES)
│   ├── subscriptionService.js     ✅ CORE (NO CHANGES)
│   ├── userService.js             ✅ CORE (NO CHANGES)
│   ├── favoritesService.js        ✅ EXISTING (update for new storage)
│   ├── watchHistoryService.js     ✅ EXISTING (update for new storage)
│   └── ... (other non-IPTV services)
├── state/                         (NEW - State management layer)
│   ├── parsingStore.js            📝 NEW (Zustand store for parsing state)
│   ├── contentStore.js            📝 NEW (Zustand store for content state)
│   ├── ingestionQueue.js          📝 NEW (Queue management for batch operations)
│   └── hooks/
│       ├── useParsingState.js     📝 NEW (React hook for parsing state)
│       ├── useContentState.js     📝 NEW (React hook for content state)
│       └── useIngestionQueue.js   📝 NEW (React hook for queue state)
├── theme/                         (Styling - UNTOUCHED)
└── utils/                         (Utilities - UNTOUCHED)
```

### Folder Migration Plan

**Phase 4 Actions:**
1. Create `/src/services/storage/storageFactory.js` - Smart adapter selector
2. Create `/src/services/ingestion/` folder structure
3. Create `/src/state/` folder structure
4. Migrate/create 8 new ingestion and state files

**Phase 5-6 Actions:**
1. Implement M3U parsing service
2. Implement Xtream parsing service
3. Implement ingestion manager

**Phase 7-8 Actions:**
1. Implement Zustand stores
2. Implement custom hooks
3. Refactor screens to use new state

---

## PART 2: STORAGE LAYER (UNIFIED INTERFACE)

### Architecture Principle
**Single unified interface** (`itemStorageService.js`) that **routes to platform-specific adapters** at runtime.

### Current Implementation ✅
```
itemStorageService.js exports {
  saveItemsBatch(playlistId, items) → Routes to:
    Platform.OS === 'web' → indexedDBStorage
    Platform.OS === 'ios'/'android' → sqliteStorage
    Emergency → memoryStorage

  getPlaylistItems(playlistId) → Same routing
  getItemsByType(playlistId, type) → Same routing
  searchItems(query) → Same routing
  ... (8 more functions with same pattern)
}
```

### New Enhancement: storageFactory.js 📝

**Purpose:** Centralize adapter selection logic

```javascript
// src/services/storage/storageFactory.js

import { Platform } from 'react-native';
import indexedDBStorage from './indexedDBStorage';
import sqliteStorage from './sqliteStorage';
import memoryStorage from './memoryStorage';

/**
 * Smart storage adapter selector
 * Returns the appropriate storage implementation for current platform
 */
export const getStorageAdapter = () => {
  try {
    if (Platform.OS === 'web') {
      console.log('[STORAGE_FACTORY] Selecting IndexedDB adapter for web');
      return indexedDBStorage;
    }
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      console.log('[STORAGE_FACTORY] Selecting SQLite adapter for native');
      return sqliteStorage;
    }

    // Expo or unknown platform
    console.log('[STORAGE_FACTORY] Using SQLite for Expo environment');
    return sqliteStorage;
  } catch (error) {
    console.error('[STORAGE_FACTORY] Error selecting adapter, falling back to memory:', error);
    return memoryStorage;
  }
};

/**
 * Test storage connectivity (for debugging)
 */
export const testStorageConnection = async () => {
  try {
    const adapter = getStorageAdapter();
    const testKey = '__storage_test_' + Date.now();
    
    await adapter.saveItemsBatch('__test__', [{
      id: testKey,
      playlistId: '__test__',
      name: 'Storage Test',
      streamUrl: 'test://storage',
      contentType: 'test',
    }]);
    
    const result = await adapter.getPlaylistItems('__test__');
    
    await adapter.clearPlaylistItems('__test__');
    
    console.log('[STORAGE_FACTORY] ✅ Storage connection test passed');
    return { success: true, adapter: getStorageAdapter().constructor.name };
  } catch (error) {
    console.error('[STORAGE_FACTORY] ❌ Storage connection test failed:', error);
    return { success: false, error: error.message };
  }
};
```

### Storage Data Model

**Database Schema (Consistent across all adapters):**

```javascript
{
  id: 'unique_item_id',                    // MD5(playlistId + streamUrl)
  playlistId: 'playlist_uuid',              // Playlist identifier
  
  // Metadata (M3U and Xtream compatible)
  name: 'Channel/Movie/Series Name',
  streamUrl: 'http://stream.url/video',
  tvgId: 'tvg-id-123',                     // TV guide ID
  tvgName: 'Channel Name (tvg)',
  tvgLogo: 'http://logo.url/logo.png',
  groupTitle: 'Group/Category',             // Unified field for grouping
  
  // Classification
  contentType: 'channel' | 'movie' | 'series',  // Determined from M3U group-title or Xtream category
  
  // Metadata enrichment (populated by metadataService)
  tmdbId: 'tmdb_123',
  imdbId: 'tt1234567',
  description: 'Content description',
  duration: 5400,
  posterUrl: 'http://poster.url',
  
  // Tracking
  savedAt: 1715425200000,                  // Timestamp (milliseconds)
  syncedAt: 1715425200000,                 // Last sync timestamp
  watched: false,                          // Watch tracking
  watchedAt: null,
  progress: 0,                             // Watch progress (0-1000 for 0-100%)
  
  // Metadata sources
  sources: {
    m3u: true,
    xtream: false,
    tmdb: false,
  },
}
```

### Storage Guarantees

- ✅ Atomic transactions (batch saves all-or-nothing)
- ✅ Indexed queries (fast filtering by contentType, groupTitle)
- ✅ Composite indexes (playlistId + contentType for efficient retrieval)
- ✅ Consistent schema across all platforms
- ✅ No data loss on partial failures (rollback on error)

---

## PART 3: INGESTION PIPELINES (Core Rebuild)

### Architecture Overview

```
                    USER ADDS PLAYLIST
                           ↓
                 ┌─────────────────────┐
                 │ ingestionManager.js │
                 │  (React-Independent)│
                 └─────────────────────┘
                      ↙      ↖
            ┌──────────────────────────┐
            │   Type Detection Logic   │
            └──────────────────────────┘
                 ↙              ↖
      M3U DETECTED       XTREAM DETECTED
            ↓                    ↓
   ┌─────────────────┐  ┌──────────────────────┐
   │ M3U PIPELINE    │  │ XTREAM PIPELINE      │
   │                 │  │                      │
   │ 1. Fetch M3U    │  │ 1. Test Credentials  │
   │ 2. Parse lines  │  │ 2. Fetch categories  │
   │ 3. Extract meta │  │ 3. Fetch items       │
   │ 4. Type detect  │  │ 4. Map to schema     │
   │ 5. Save batch   │  │ 5. Enrich metadata   │
   │ 6. Progress     │  │ 6. Save batch        │
   │ 7. Notify       │  │ 7. Progress          │
   └─────────────────┘  │ 8. Notify            │
                        └──────────────────────┘
                               ↓
              ┌────────────────────────────┐
              │  progressTracker.js State  │
              │  (Updates React UI via     │
              │   state management)        │
              └────────────────────────────┘
                        ↓
              [ UI shows progress ]
```

### Pipeline 1: M3U Ingestion (m3uParsingService.js 📝)

**Responsibility:** Parse M3U files and extract structured data

**Input:** M3U file URL or raw content
```
#EXTM3U
#EXTINF:-1 tvg-id="ch1" tvg-name="Channel 1" tvg-logo="http://logo.url" group-title="Sports","Channel 1"
http://stream.url/channel1.m3u8
#EXTINF:-1 tvg-id="ch2" tvg-name="Channel 2" tvg-logo="http://logo2.url" group-title="News","Channel 2"
http://stream.url/channel2.m3u8
```

**Processing Steps:**
1. Fetch M3U from URL (with timeout, retry logic)
2. Parse line-by-line:
   - Extract EXTINF attributes (tvg-id, tvg-name, tvg-logo, group-title)
   - Extract display name from EXTINF value
   - Read next line for stream URL
3. Content type detection:
   - 'Sports', 'Movies', 'Series' → categorize accordingly
   - Default: 'channel'
4. Generate unique ID: `MD5(playlistId + streamUrl)`
5. Batch saving every 50 items (progressive loading)
6. Emit progress events

**Output:**
```javascript
{
  success: true,
  itemsProcessed: 1500,
  itemsSaved: 1500,
  categories: ['Sports', 'News', 'Entertainment'],
  contentTypeCounts: {
    channel: 1200,
    movie: 200,
    series: 100,
  },
  duration: 4500, // milliseconds
  errors: [],
}
```

**Error Handling:**
- Network timeout → Retry 3 times with exponential backoff
- Malformed line → Log warning, skip line, continue parsing
- Parse error → Resume from last good line
- Storage error → Rollback batch, emit error event

### Pipeline 2: Xtream Ingestion (xtreamParsingService.js 📝)

**Responsibility:** Fetch and parse Xtream API responses

**Input:** Xtream credentials (url, username, password)
```javascript
{
  url: 'http://xtream.provider.com',
  username: 'user123',
  password: 'pass456',
}
```

**Processing Steps:**
1. Test credentials via `/player_api.php?action=get_live_categories`
2. For each category:
   - Fetch live streams via `/player_api.php?action=get_live_streams&category_id=X`
   - Fetch VOD items via `/player_api.php?action=get_vod_streams&category_id=X`
   - Fetch series via `/player_api.php?action=get_series&category_id=X`
3. Map Xtream fields to normalized schema:
   ```javascript
   // Xtream → Normalized
   {
     stream_id: → id,
     name: → name,
     stream_url: → streamUrl,
     logo: → tvgLogo,
     category: → groupTitle,
     category_id: → (internal routing),
     added: → savedAt,
   }
   ```
4. Content type detection from category name
5. Batch saving every 50 items
6. Emit progress events

**Output:**
```javascript
{
  success: true,
  itemsProcessed: 5000,
  itemsSaved: 4950, // Some may fail validation
  contentTypeCounts: {
    channel: 3000,
    movie: 1500,
    series: 450,
  },
  categoriesFetched: 25,
  duration: 12000,
  errors: ['Invalid stream_id: 123', 'Missing logo for stream 456'],
}
```

**Error Handling:**
- Invalid credentials → Fail immediately with clear error
- API rate limit → Implement backoff strategy
- Missing fields → Use defaults, continue
- Partial fetch failure → Resume from last successful category

### Pipeline Orchestration (ingestionManager.js 📝)

**Responsibility:** Coordinate M3U and Xtream pipelines, manage lifecycle

**Key Methods:**

```javascript
// Start parsing process
async startParsing(playlistId, playlistData) {
  // 1. Type detection (m3u vs xtream)
  // 2. Validate credentials/URL
  // 3. Clear previous cache
  // 4. Initialize progress tracker
  // 5. Call appropriate pipeline
  // 6. Monitor for errors/timeouts
  // 7. Emit completion/error event
}

// Resume interrupted parsing
async resumeIncompleteParses() {
  // Called on app startup
  // Check for playlists in 'parsing' state
  // Resume from saved checkpoint
}

// Cancel ongoing parsing
async cancelParsing(playlistId) {
  // Stop current pipeline
  // Mark as 'paused'
  // Don't delete partial results
}

// Get current parsing status
async getParsingStatus(playlistId) {
  // Returns: { state, progress, itemsProcessed, eta }
}
```

**Platform Independence:**
- No `Platform.OS` checks in ingestionManager
- Storage routing handled by itemStorageService
- Progress events are platform-agnostic

---

## PART 4: STATE MANAGEMENT (Zustand)

### Why Zustand?

| Aspect | Redux Toolkit | Zustand | Decision |
|--------|---|---|---|
| Learning Curve | Steep | Gentle | ✅ Zustand |
| Bundle Size | ~10KB | ~2KB | ✅ Zustand |
| React Native Support | ✅ | ✅ | Tie |
| Boilerplate | Lots | Minimal | ✅ Zustand |
| Async Handling | RTK Query | Native | ✅ Zustand |
| DevTools | Complex | Simple | ✅ Zustand |

### State Structure

#### Store 1: Parsing State (parsingStore.js 📝)

```javascript
import create from 'zustand';

export const useParsingStore = create((set, get) => ({
  // State
  parsingState: 'idle', // 'idle' | 'parsing' | 'paused' | 'completed' | 'error'
  currentPlaylistId: null,
  progress: 0, // 0-100
  itemsProcessed: 0,
  itemsSaved: 0,
  eta: null, // milliseconds
  error: null,
  startedAt: null,
  completedAt: null,
  
  // State schema (for debugging/logging)
  validationErrors: [],
  warnings: [],
  
  // Actions
  startParsing: (playlistId, playlistData) => set({
    parsingState: 'parsing',
    currentPlaylistId: playlistId,
    progress: 0,
    itemsProcessed: 0,
    itemsSaved: 0,
    error: null,
    startedAt: Date.now(),
    completedAt: null,
  }),
  
  updateProgress: (progress, itemsProcessed, itemsSaved, eta) => set({
    progress: Math.min(100, progress),
    itemsProcessed,
    itemsSaved,
    eta,
  }),
  
  pauseParsing: () => set({ parsingState: 'paused' }),
  
  resumeParsing: () => set({ parsingState: 'parsing' }),
  
  completeParsing: () => set({
    parsingState: 'completed',
    progress: 100,
    completedAt: Date.now(),
  }),
  
  errorParsing: (error) => set({
    parsingState: 'error',
    error: error.message,
    completedAt: Date.now(),
  }),
  
  reset: () => set({
    parsingState: 'idle',
    currentPlaylistId: null,
    progress: 0,
    itemsProcessed: 0,
    itemsSaved: 0,
    eta: null,
    error: null,
    startedAt: null,
    completedAt: null,
    validationErrors: [],
    warnings: [],
  }),
  
  // Selectors
  isActive: () => get().parsingState === 'parsing',
  eta: () => get().eta,
}));
```

#### Store 2: Content State (contentStore.js 📝)

```javascript
import create from 'zustand';

export const useContentStore = create((set, get) => ({
  // State
  playlists: {},           // playlistId → { id, name, type, itemCount, ... }
  selectedPlaylistId: null,
  
  // Cached content for current playlist
  content: {
    channels: [],
    movies: [],
    series: [],
  },
  
  contentFilter: {
    type: 'all', // 'all' | 'channel' | 'movie' | 'series'
    searchQuery: '',
    groupTitle: null, // Filter by category
  },
  
  contentLoading: false,
  contentError: null,
  
  // Actions
  setPlaylists: (playlists) => set({ playlists }),
  
  selectPlaylist: (playlistId) => set({
    selectedPlaylistId: playlistId,
    content: { channels: [], movies: [], series: [] },
    contentFilter: { type: 'all', searchQuery: '', groupTitle: null },
  }),
  
  loadContent: async (playlistId) => {
    set({ contentLoading: true, contentError: null });
    try {
      // Load channels, movies, series from storage
      const channels = await itemStorageService.getItemsByType(playlistId, 'channel');
      const movies = await itemStorageService.getItemsByType(playlistId, 'movie');
      const series = await itemStorageService.getItemsByType(playlistId, 'series');
      
      set({
        content: { channels, movies, series },
        contentLoading: false,
      });
    } catch (error) {
      set({
        contentError: error.message,
        contentLoading: false,
      });
    }
  },
  
  setFilterType: (type) => set((state) => ({
    contentFilter: { ...state.contentFilter, type },
  })),
  
  setSearchQuery: (query) => set((state) => ({
    contentFilter: { ...state.contentFilter, searchQuery: query },
  })),
  
  // Selectors
  getFilteredContent: () => {
    const state = get();
    const { type, searchQuery, groupTitle } = state.contentFilter;
    const { channels, movies, series } = state.content;
    
    let filtered = [];
    if (type === 'all' || type === 'channel') filtered = [...filtered, ...channels];
    if (type === 'all' || type === 'movie') filtered = [...filtered, ...movies];
    if (type === 'all' || type === 'series') filtered = [...filtered, ...series];
    
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (groupTitle) {
      filtered = filtered.filter(item => item.groupTitle === groupTitle);
    }
    
    return filtered;
  },
}));
```

#### Custom Hooks for Components (hooks/useParsingState.js 📝)

```javascript
import { useParsingStore } from '../state/parsingStore';

/**
 * Custom hook for components to access parsing state
 * Auto-subscribes to relevant store slices
 */
export const useParsingState = () => {
  const parsingState = useParsingStore((state) => state.parsingState);
  const progress = useParsingStore((state) => state.progress);
  const itemsProcessed = useParsingStore((state) => state.itemsProcessed);
  const itemsSaved = useParsingStore((state) => state.itemsSaved);
  const eta = useParsingStore((state) => state.eta);
  const error = useParsingStore((state) => state.error);
  const isActive = useParsingStore((state) => state.isActive());
  
  return {
    parsingState,
    progress,
    itemsProcessed,
    itemsSaved,
    eta,
    error,
    isActive,
  };
};

export const useParsingActions = () => {
  return {
    startParsing: useParsingStore((state) => state.startParsing),
    pauseParsing: useParsingStore((state) => state.pauseParsing),
    resumeParsing: useParsingStore((state) => state.resumeParsing),
    cancelParsing: useParsingStore((state) => state.cancelParsing),
  };
};
```

---

## PART 5: PROGRESSIVE LOADING STRATEGY

### Goal
First 50 items appear immediately, rest load in background. Users don't wait for full parse.

### Implementation

#### Step 1: Batch Parsing
```javascript
// In m3uParsingService.js and xtreamParsingService.js
const BATCH_SIZE = 50;

while (hasMoreItems) {
  const batch = extractNextBatch(BATCH_SIZE);
  
  if (batch.length > 0) {
    // Save to storage immediately
    await itemStorageService.saveItemsBatch(playlistId, batch);
    
    // Notify store
    useParsingStore.getState().updateProgress(
      currentProgress,
      itemsProcessed,
      itemsSaved,
      eta
    );
    
    // Emit UI update event
    parsingProgressService.emit('batch-saved', {
      batchSize: batch.length,
      totalSaved: itemsSaved,
    });
  }
  
  // Yield to event loop (prevents UI blocking on web)
  await new Promise(resolve => setTimeout(resolve, 10));
}
```

#### Step 2: UI Shows First Batch Immediately
```javascript
// In ChannelsScreen, MoviesScreen, etc.
const ChannelsScreen = ({ route }) => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const { parsingState } = useParsingState();
  
  useEffect(() => {
    const loadInitialContent = async () => {
      // Get first 50 items from storage immediately
      const initial = await itemStorageService.getItemsByType(playlistId, 'channel', 0, 50);
      setChannels(initial);
      setLoading(false);
    };
    
    loadInitialContent();
  }, [playlistId]);
  
  // Listen for new batches being saved
  useEffect(() => {
    const unsubscribe = parsingProgressService.on('batch-saved', async () => {
      // Load next batch
      const updated = await itemStorageService.getItemsByType(playlistId, 'channel');
      setChannels(updated);
    });
    
    return unsubscribe;
  }, []);
  
  return (
    <FlatList
      data={channels}
      renderItem={({ item }) => <ChannelCard channel={item} />}
      ListHeaderComponent={() =>
        parsingState === 'parsing' ? (
          <ProgressBar progress={progress} label="Loading more channels..." />
        ) : null
      }
    />
  );
};
```

#### Step 3: Background Batch Loading
- Parsing service continues fetching and saving batches
- UI updates reactively as batches arrive
- Users see content immediately while more loads

### Progressive Loading Timeline

```
Time 0ms:   User opens ChannelsScreen
             → Query storage for first 50 items
             → Display them immediately

Time 50ms:  First batch loaded (M3U: line 1-50 parsed)
             → Save to storage
             → UI gets update event
             → Display count: 50

Time 100ms: Parsing continues in background
             → Batch 2 (items 51-100) saved

Time 150ms: Batch 3 (items 101-150) saved
             → UI updates with new count

...continue until done...

Time 5000ms: All 1500 items processed
             → UI shows loading complete
             → No progress bar anymore
```

---

## PART 6: ERROR HANDLING & RESILIENCE

### Error Classification

| Category | Example | Action | Recovery |
|----------|---------|--------|----------|
| **Network** | Timeout fetching M3U | Retry 3x, exponential backoff | Resume from last line |
| **Validation** | Invalid stream URL | Log warning, skip item | Continue parsing |
| **Storage** | IndexedDB quota exceeded | Switch to memory adapter | Save remaining items |
| **Parsing** | Malformed EXTINF line | Log error, skip line | Continue parsing |
| **Authentication** | Invalid Xtream credentials | Fail immediately | Show error to user |

### Retry Strategy

```javascript
const retryWithBackoff = async (operation, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`[INGESTION] Retry ${attempt}/${maxRetries} after ${delayMs}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
};
```

### Checkpointing (Resume Capability)

```javascript
// Save parsing checkpoint every 100 items
const checkpoint = {
  playlistId,
  parseType: 'm3u' | 'xtream',
  currentLine: 450, // For M3U
  lastSuccessfulItem: 449,
  itemsSavedSoFar: 449,
  startedAt: timestamp,
  pausedAt: timestamp,
  resumeToken: 'base64-encoded-state',
};

// On app restart, check for incomplete parses
async resumeIncompleteParses() {
  const incomplete = await storage.getIncompleteParses();
  
  for (const parse of incomplete) {
    // Resume from checkpoint
    await ingestionManager.resumeFromCheckpoint(parse);
  }
}
```

---

## PART 7: LOGGING STRATEGY

### Structured Logging Tags

All ingestion code uses these tags for consistent, debuggable logs:

```
[INGESTION]     - ingestionManager.js
[PARSING_M3U]   - m3uParsingService.js
[PARSING_XTREAM]- xtreamParsingService.js
[STORAGE]       - Storage layer operations
[STATE]         - State management updates
[PROGRESS]      - Progress events
```

### Example Log Flow

```
[INGESTION] 🚀 Starting parse for playlist_uuid...
[INGESTION] 📋 Detected type: m3u
[INGESTION] 🔄 Loading M3U from http://stream.url/playlist.m3u8
[PARSING_M3U] 📖 Fetched 50KB file
[PARSING_M3U] 🔍 Parsing line by line...
[PARSING_M3U] ✅ Line 1: Channel 1 (Sports)
[PARSING_M3U] ✅ Line 2: Channel 2 (News)
...
[PARSING_M3U] ⚠️ Line 25: Invalid URL, skipping
[PARSING_M3U] ✅ Parsed 50 items
[STORAGE] 💾 Saving batch 1 (50 items)
[STORAGE] ✅ Batch 1 saved to IndexedDB
[PROGRESS] 📊 Progress: 50/1500 (3%), ETA: 45s
[STATE] 🔄 Updated parsing store: progress=3%
...continue...
[PARSING_M3U] ✅ Parsing complete: 1500 items total
[STORAGE] 💾 Saving final batch (final 50 items)
[INGESTION] ✅ Parse complete! 1500 items in 45s
[STATE] ✅ Updated parsing store: completed=true
[PROGRESS] 🎉 Parse finished
```

---

## PART 8: API CONTRACTS

### ingestionManager.startParsing(playlistId, playlistData)

**Input:**
```javascript
{
  playlistId: 'uuid-v4',
  type: 'm3u' | 'xtream',
  
  // For M3U:
  url: 'http://example.com/playlist.m3u8',
  
  // For Xtream:
  serverUrl: 'http://xtream.provider.com',
  username: 'user',
  password: 'pass',
}
```

**Output:**
```javascript
// Event sequence:
1. emit('parsing-started', { playlistId, estimatedItems: 1500 })
2. emit('batch-saved', { batchNumber: 1, itemsInBatch: 50, totalSaved: 50 })
3. emit('progress', { progress: 3, eta: 47000, itemsProcessed: 50 })
4. ... (more batches)
5. emit('parsing-completed', { totalItems: 1500, duration: 45000 })

// Or on error:
emit('parsing-error', { playlistId, error: 'Network timeout', recoverable: true })
```

### itemStorageService Methods

```javascript
// Save batch atomically
saveItemsBatch(playlistId, items: Array<Item>) → Promise<number> (items saved)

// Retrieve all items for playlist
getPlaylistItems(playlistId, offset?: 0, limit?: 1000) → Promise<Array<Item>>

// Filter by content type
getItemsByType(playlistId, type: 'channel'|'movie'|'series', offset?: 0, limit?: 1000) → Promise<Array<Item>>

// Search across playlist
searchItems(playlistId, query: string) → Promise<Array<Item>>

// Get all groups/categories
getGroupTitles(playlistId) → Promise<Array<string>>

// Get items by group
getItemsByGroup(playlistId, groupTitle: string) → Promise<Array<Item>>

// Statistics
countPlaylistItems(playlistId) → Promise<number>
getItemStats(playlistId) → Promise<{ channels, movies, series, groups }>

// Cleanup
clearPlaylistItems(playlistId) → Promise<void>
deletePlaylist(playlistId) → Promise<void>
```

---

## PART 9: MIGRATION PLAN (Phases 4-7)

### Phase 4: Foundation (Storage Layer Enhancement)
1. Create `src/services/storage/storageFactory.js`
2. Add `src/state/` folder structure
3. Add `src/services/ingestion/` folder structure
4. Update imports in itemStorageService to use storageFactory

**Deliverable:** Clean storage layer with smart adapter selection

### Phase 5: M3U Pipeline Implementation
1. Create `src/services/ingestion/m3uParsingService.js`
2. Implement line-by-line M3U parsing
3. Implement batch saving logic
4. Implement progress tracking
5. Add comprehensive error handling

**Deliverable:** M3U playlists parse correctly on all platforms

### Phase 6: Xtream Pipeline Implementation
1. Create `src/services/ingestion/xtreamParsingService.js`
2. Implement API credential validation
3. Implement category and stream fetching
4. Implement metadata mapping
5. Add comprehensive error handling

**Deliverable:** Xtream playlists parse correctly on all platforms

### Phase 7: Ingestion Manager & State Management
1. Create `src/services/ingestion/ingestionManager.js` (orchestrator)
2. Create `src/services/ingestion/progressTracker.js` (state machine)
3. Create `src/state/parsingStore.js` (Zustand store)
4. Create `src/state/contentStore.js` (Zustand store)
5. Create `src/state/hooks/` (custom hooks)
6. Update screens to use new state management
7. Implement progressive loading UI updates

**Deliverable:** Complete ingestion system with state management and progressive loading

### Phase 8: Integration & Testing
1. Verify both M3U and Xtream pipelines work
2. Test progressive loading on web, iOS, Android
3. Test error handling and recovery
4. Performance optimization
5. Cross-platform testing

**Deliverable:** Production-ready IPTV ingestion system

---

## PART 10: SUCCESS CRITERIA

### Functional Requirements ✅
- [ ] M3U playlists parse completely on web
- [ ] M3U playlists parse completely on iOS
- [ ] M3U playlists parse completely on Android
- [ ] Xtream playlists parse completely on web
- [ ] Xtream playlists parse completely on iOS
- [ ] Xtream playlists parse completely on Android
- [ ] First 50 items appear within 500ms
- [ ] Progressive loading shows in UI
- [ ] All content retrievable from storage
- [ ] All platforms show same content for same playlist

### Performance Requirements ✅
- [ ] M3U parse: < 10 seconds for 1500 items
- [ ] Xtream parse: < 20 seconds for 5000 items
- [ ] First batch visible: < 500ms
- [ ] No UI blocking during parsing
- [ ] Memory usage < 50MB during parsing

### Quality Requirements ✅
- [ ] Zero broken imports
- [ ] No Platform.OS guards in parsing/storage logic
- [ ] 100% TypeScript compatible (JSDoc comments)
- [ ] Comprehensive error messages
- [ ] Structured logging for debugging
- [ ] Resume capability after interruption

### User Experience Requirements ✅
- [ ] Instant feedback when adding playlist
- [ ] Progress bar shows real progress
- [ ] Content appears incrementally
- [ ] Clear error messages on failure
- [ ] Retry automatically on network error
- [ ] No data loss on interruption

---

## IMPLEMENTATION CHECKLIST

- [ ] Phase 4: Storage layer enhancement (storageFactory.js)
- [ ] Phase 5: M3U parsing service
- [ ] Phase 6: Xtream parsing service
- [ ] Phase 7: Ingestion manager
- [ ] Phase 7: State management (Zustand)
- [ ] Phase 7: Custom hooks for components
- [ ] Phase 8: Progressive loading UI
- [ ] Phase 8: Error handling & recovery
- [ ] Phase 8: Cross-platform testing
- [ ] Phase 8: Performance optimization

---

## CONCLUSION

This architecture provides:

1. **Clean separation of concerns:** Parsing, storage, state management are independent
2. **Cross-platform compatibility:** No Platform.OS guards in core logic
3. **Progressive user experience:** Content appears immediately, more loads in background
4. **Resilience:** Automatic retry, resume, error recovery
5. **Maintainability:** Structured code, clear responsibilities, comprehensive logging
6. **Scalability:** Can handle 10,000+ items without performance degradation

**Next Phase:** PHASE 4 - Foundation Implementation (storageFactory.js, folder structure, state setup)

---

**Prepared by:** IPTV Architecture Rebuild (15-Phase Specification)  
**Status:** PHASE 3 COMPLETE - Architecture designed, ready for Phase 4 implementation  
**Timestamp:** May 11, 2026
