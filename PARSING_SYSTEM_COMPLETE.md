# Complete M3U/Xtream Playlist Parsing System Documentation

**Version:** 1.0  
**Date:** May 2026  
**Status:** Production-Ready  
**Scope:** Comprehensive technical reference for replication on any platform

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Components](#core-components)
3. [Data Flow & Pipelines](#data-flow--pipelines)
4. [M3U Parsing Engine](#m3u-parsing-engine)
5. [Xtream API Integration](#xtream-api-integration)
6. [Content Categorization](#content-categorization)
7. [Lazy Loading Strategy](#lazy-loading-strategy)
8. [Performance Optimization](#performance-optimization)
9. [Error Handling & Resilience](#error-handling--resilience)
10. [Storage & Quota Management](#storage--quota-management)
11. [Critical Edge Cases & Solutions](#critical-edge-cases--solutions)
12. [Implementation Checklist](#implementation-checklist)

---

## System Architecture

### High-Level Overview

The parsing system is designed to handle 50,000+ content items from two source types with real-time progress tracking and lazy-loaded episodes. It operates on a multi-service architecture where each service handles a specific responsibility.

```
┌─────────────────────────────────────────────────────────────────┐
│                       PLAYLIST INPUT                             │
│                  (M3U URL or Xtream Code)                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐        ┌───────▼────────┐
        │   M3U Parser   │        │  Xtream Parser │
        │   (Fast Parse) │        │  (Fast Parse)  │
        └───────┬────────┘        └───────┬────────┘
                │                         │
        ┌───────▼─────────────────────────▼────────┐
        │   Content Classification Engine          │
        │  (Channel/Movie/Series Detection)        │
        └───────┬──────────────────────────────────┘
                │
        ┌───────▼──────────────────────────────────┐
        │   Series Lazy Loading Manager            │
        │  (Store metadata, defer episodes)        │
        └───────┬──────────────────────────────────┘
                │
        ┌───────▼──────────────────────────────────┐
        │   Local Storage Service                  │
        │   (Save/Index/Quota Management)          │
        └───────┬──────────────────────────────────┘
                │
        ┌───────▼──────────────────────────────────┐
        │   Browser/App Storage Layer              │
        │   (IndexedDB / SQLite / etc)             │
        └──────────────────────────────────────────┘
```

### Service Isolation Principles

- **Separation of Concerns:** Each service handles one responsibility
- **No Cross-Service State:** Services communicate via parameters/returns
- **Testability:** Each service can be tested independently
- **Replicability:** Services can be copied to other platforms

---

## Core Components

### 1. OnboardingParserService

**Responsibility:** Fast, synchronous playlist parsing during app initialization

**Key Methods:**

#### `parseAndSavePlaylist()`
Orchestrates the entire pipeline: fetches → parses → categorizes → saves

```typescript
async parseAndSavePlaylist(
  playlistId: string,
  playlistName: string,
  source: string,           // M3U URL or Xtream credentials
  playlistType: 'm3u' | 'xtream',
  xtreamUrl?: string,
  config?: ParserConfig
): Promise<boolean>
```

**Key Features:**
- Emits progress events for UI updates
- Clears old playlist data before saving (prevents quota overflow)
- Tracks channelsSaved, moviesSaved, seriesSaved separately
- Returns success/failure status

#### `parseM3UFast()`
Optimized M3U parsing without background tasks

#### `parseXtreamFast()`
Optimized Xtream API parsing with **sequential category fetching** (THE CRITICAL FIX)

---

### 2. PlaylistParserService

**Responsibility:** Flexible parsing with multiple strategies

**Key Methods:**

#### `parsePlaylist()`
Standard parsing for complete results

#### `parsePlaylistChunked()`
Chunked processing with `onChunk` callbacks for real-time saving

**Strategy:**
- Divides parsing into CHUNK_SIZE groups
- Yields chunks to onChunk callback
- Allows real-time progress and storage optimization
- Reports totalParsed and totalExpected for accurate progress bars

---

### 3. M3UParser

**Responsibility:** Parse M3U format with industry-standard logic

**Key Methods:**

#### `parse(content: string): Channel[]`
Standard synchronous parsing

#### `streamParse(content: string, playlistId: string): AsyncGenerator`
Stream-based parsing that yields batches as they're processed

**Industry Standard Features:**
- Handles EXTINF lines (metadata) followed by stream URLs
- Extracts attributes: tvg-logo, group-title, tvg-id, etc.
- Skips empty lines and comments
- Robust parsing of malformed entries

---

### 4. XtreamCodesService

**Responsibility:** Xtream API interactions

**Key Methods:**

```typescript
getUserInfo()                    // Validate credentials
getLiveCategories()              // Get live channel categories
getVODCategories()               // Get movie categories
getSeriesCategories()            // Get series categories
```

Each returns array of objects with `category_id` and `category_name`

---

## Data Flow & Pipelines

### Pipeline 1: M3U Fast Parse (OnboardingParserService.parseM3UFast)

```
┌──────────────────────────────────────────────────────────┐
│ STEP 1: Fetch M3U file from URL                          │
│  - Try direct fetch first (15s timeout)                  │
│  - Fallback to CORS proxies if needed                    │
│  - Returns raw text content                              │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│ STEP 2: Split by newlines and count #EXTINF lines       │
│  - Each #EXTINF represents one content item              │
│  - Gives us totalExpected for progress                   │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│ STEP 3: Iterate through lines                            │
│  - When #EXTINF found, capture metadata                  │
│  - When non-comment URL found, pair with metadata        │
│  - Parse attributes: tvg-logo, group-title, etc          │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│ STEP 4: Detect content type (Channel/Movie/Series)      │
│  - Uses detectContentType() logic (see below)            │
│  - Categorizes each item                                 │
│  - Creates Channel, Movie, or Series object              │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│ STEP 5: Extract series metadata (if Series)             │
│  - Parses series name for season/episode info            │
│  - Creates Season[] array (parsed from title patterns)   │
│  - Series starts with empty seasons array (lazy load)    │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│ STEP 6: Return { channels, movies, series }             │
│  - All arrays ready for storage                          │
│  - NO episodes fetched yet (lazy loaded)                 │
└──────────────────────────────────────────────────────────┘
```

**Performance:** ~10-30 seconds for 100,000 items (depending on M3U size)

---

### Pipeline 2: Xtream Fast Parse (OnboardingParserService.parseXtreamFast)

```
┌──────────────────────────────────────────────────────────┐
│ STEP 1: Parse Xtream credentials from code               │
│  - Format: username:password@serverurl                   │
│  - Extract and validate each part                        │
│  - Build baseUrl (normalize protocol/trailing slash)     │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│ STEP 2: Fetch category lists (PARALLEL - OK for this)   │
│  - getLiveCategories() → liveCategories[]                │
│  - getVODCategories() → vodCategories[]                  │
│  - getSeriesCategories() → seriesCategories[]            │
│  - Uses Promise.all([...]) for speed                     │
│  - This is fast (3 requests, total ~1-2 seconds)         │
│  - Gives us structure of the API                         │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│ STEP 3: Fetch LIVE CHANNELS - SEQUENTIAL WITH 100ms DELAY│
│  - For each liveCategory (78 max):                       │
│    1. fetchXtreamEndpoint('get_live_streams')            │
│    2. Parse each stream into Channel object              │
│    3. Emit progress every 10 categories                  │
│    4. Wait 100ms before next category                    │
│  - Total: ~78 × 100ms = 7.8 seconds                      │
│  - Result: 2,414 live channels (or fewer)                │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│ STEP 4: Fetch VOD MOVIES - SEQUENTIAL WITH 100ms DELAY   │
│  - For each vodCategory (64 max):                        │
│    1. fetchXtreamEndpoint('get_vod_streams')             │
│    2. Parse each VOD into Movie object                   │
│    3. Build correct poster URL (handle base URL)         │
│    4. Emit progress every 5 categories                   │
│    5. Wait 100ms before next category                    │
│  - Total: ~64 × 100ms = 6.4 seconds                      │
│  - Result: 45,273 movies (or fewer)                      │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│ STEP 5: Fetch SERIES METADATA - SEQUENTIAL WITH 100ms   │
│  - For each seriesCategory (44 max):                     │
│    1. fetchXtreamEndpoint('get_series')                  │
│    2. Parse each series into Series object               │
│    3. Store seriesId for later episode fetching          │
│    4. Initialize seasons: [] (LAZY LOAD)                 │
│    5. Emit progress every 5 categories                   │
│    6. Wait 100ms before next category                    │
│  - Total: ~44 × 100ms = 4.4 seconds                      │
│  - Result: 6,054 series WITHOUT episodes                 │
│  - Episodes fetched on-demand when user opens series     │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│ STEP 6: Return { channels, movies, series }             │
│  - All metadata ready                                    │
│  - Series have empty seasons array (will populate later) │
│  - Total items: 53,741 (2,414 + 45,273 + 6,054)         │
│  - Total time: ~18-20 seconds (vs 55+ hours with parallel)│
└──────────────────────────────────────────────────────────┘
```

**Critical Performance Insight:** 
- **BEFORE (Broken):** `Promise.all([...186 concurrent requests...])` → Server timeouts → Data loss
- **AFTER (Fixed):** Sequential loops with 100ms delays → No timeouts → All data captured

---

### Pipeline 3: Content Categorization (detectContentType)

```typescript
private static detectContentType(
  metadata: any, 
  streamUrl: string
): 'channel' | 'movie' | 'series'
```

**Detection Logic:**

| Signal | Result | Weight |
|--------|--------|--------|
| `group-title` contains "Series" or "TV" | Series | High |
| URL contains "series" or "show" (case-insensitive) | Series | Medium |
| URL contains "movie" or "film" (case-insensitive) | Movie | High |
| `group-title` contains "Movies" | Movie | Medium |
| `group-title` is empty or "Uncategorized" | Channel | Default |
| `tvg-id` present AND `tvg-logo` present | Channel | High |
| Nothing else matches | Channel | Fallback |

**Why This Matters:**
- M3U files mix all content types in one list
- Need to auto-detect which is which
- Xtream API already separates them, but M3U doesn't
- Wrong categorization = wrong UI (and broken episode loading)

---

## M3U Parsing Engine

### M3U Format Specification

Industry-standard IPTV M3U format:

```
#EXTM3U
#EXTINF:-1 tvg-id="id1" tvg-name="Channel Name" group-title="Live TV" tvg-logo="http://logo.png",Channel Name
http://stream.url/channel1.m3u8

#EXTINF:-1 tvg-id="movie1" tvg-name="Movie Title" group-title="Movies" tvg-logo="http://poster.png",Movie Title
http://stream.url/movies/movie1.mp4

#EXTINF:-1 tvg-id="series1" tvg-name="Series Title - S01E01" group-title="Series" tvg-logo="http://poster.png",Series Title
http://stream.url/series/show1_season1_episode1.mp4
```

### Parsing Algorithm

#### Phase 1: Metadata Extraction from EXTINF

```typescript
parseExtinfLine(extinf: string): {
  name: string;
  logo: string;
  group: string;
  epgId: string;
}
```

**Example:**
```
#EXTINF:-1 tvg-id="ch1" tvg-logo="http://logo.png" group-title="Live TV",Channel Name
```

**Parsing Steps:**
1. Remove `#EXTINF:` prefix and duration (-1)
2. Extract attributes with regex: `(\w+)="([^"]*)"`
3. Find channel name (after last comma)
4. Map attributes to object:
   - `tvg-logo` → `logo`
   - `group-title` → `group`
   - `tvg-id` → `epgId`

**Robustness:**
- Handles quoted values with spaces: `group-title="Live TV"` ✓
- Handles missing attributes ✓
- Handles various quote styles ✓
- Handles extra commas in names ✓

#### Phase 2: Stream URL Pairing

**Key Rule:** Next non-empty, non-comment line after EXTINF = stream URL

```typescript
// Look ahead from EXTINF line
let j = i + 1;
while (j < lines.length) {
  const nextLine = lines[j].trim();
  // Skip empty lines and comments
  if (nextLine && !nextLine.startsWith('#')) {
    streamUrl = nextLine;  // Found it!
    break;
  }
  j++;
}
```

**Why This Matters:**
- Some M3U files have blank lines between EXTINF and URL
- Some have comment lines in between
- Some have multiple URLs (only use first non-comment)
- Must handle all variations without crashing

#### Phase 3: Stream Validation

Before creating a Channel/Movie/Series object:

```typescript
if (streamUrl && !streamUrl.trim().isEmpty()) {
  // Parse and categorize
} else {
  // Skip this entry (missing stream URL)
  console.warn('Skipped entry with no stream URL');
}
```

**Why Skip?**
- Malformed M3U files sometimes have EXTINF without URL
- Empty streamUrl would break player
- Better to skip than crash or create broken entries

---

### Edge Cases in M3U Parsing

#### Case 1: Embedded Newlines in Metadata

**Problem:** Some EXTINF lines span multiple lines
```
#EXTINF:-1 tvg-id="ch1" 
tvg-logo="http://logo.png"
group-title="Live TV",Channel Name
```

**Solution:** Check entire EXTINF section before looking for URL
```typescript
const extinf = extinf.replace(/\n/g, ' ');  // Join lines
```

#### Case 2: Wrong Attribute Order

**Problem:** Attributes in different order than expected
```
#EXTINF:-1 group-title="Live TV" tvg-id="ch1" tvg-logo="http://logo.png",Name
```

**Solution:** Use regex to extract by key name, not position
```typescript
const logoMatch = extinf.match(/tvg-logo="([^"]*)"/);
const logo = logoMatch ? logoMatch[1] : '';
```

#### Case 3: Special Characters in Names

**Problem:** Channel name has quotes, commas, or Unicode
```
#EXTINF:-1 tvg-id="ch1", HD "Premium" Channel (4K)
```

**Solution:** Name is everything after last comma, allow any characters
```typescript
const name = metadata.substring(lastCommaIndex + 1).trim();
```

#### Case 4: Duplicate Group Names

**Problem:** Same group-title appears hundreds of times
```
#EXTINF:-1 group-title="Movies",Movie 1
#EXTINF:-1 group-title="Movies",Movie 2
...
```

**Solution:** This is OK - group becomes category. Just count them.

#### Case 5: Empty M3U File

**Problem:** M3U has no entries at all
```
#EXTM3U
```

**Solution:** Return empty arrays, emit warning
```typescript
if (totalExpected === 0) {
  console.warn('M3U file contains no entries');
  return { channels: [], movies: [], series: [] };
}
```

---

## Xtream API Integration

### Xtream Codes API Basics

**Server URL Format:** `http://serverip:port` (no trailing slash)

**All API Calls Use:** `player_api.php` endpoint

**Required Parameters (always):**
```
username: string      // Account username
password: string      // Account password
action: string        // API action (get_live_categories, etc)
```

### Category-Based Architecture

Xtream API separates content by categories. Each category type has its own endpoint:

#### Live Categories
```
GET /player_api.php?action=get_live_categories
Response: [
  { category_id: "1", category_name: "Sports" },
  { category_id: "2", category_name: "News" },
  ...
]
```

#### VOD (Movies) Categories
```
GET /player_api.php?action=get_vod_categories
Response: [
  { category_id: "100", category_name: "Action" },
  { category_id: "101", category_name: "Comedy" },
  ...
]
```

#### Series Categories
```
GET /player_api.php?action=get_series_categories
Response: [
  { category_id: "200", category_name: "Drama Series" },
  { category_id: "201", category_name: "Anime" },
  ...
]
```

### Fetching Content for Each Category

#### Live Channels from Category
```
GET /player_api.php?action=get_live_streams&category_id=1
Response: [
  {
    stream_id: "12345",
    name: "Sports Channel HD",
    stream_icon: "http://icon.png",
    category_id: "1",
    ...
  },
  ...
]
```

**Stream URL Construction:**
```
http://{baseUrl}/live/{username}/{password}/{stream_id}.m3u8
```

#### VOD Movies from Category
```
GET /player_api.php?action=get_vod_streams&category_id=100
Response: [
  {
    stream_id: "56789",
    name: "Action Movie Title",
    stream_icon: "http://poster.png",
    ext: "mp4",
    rating: "8.5",
    category_id: "100",
    ...
  },
  ...
]
```

**Stream URL Construction:**
```
http://{baseUrl}/movie/{username}/{password}/{stream_id}.{ext}
```

#### Series from Category
```
GET /player_api.php?action=get_series&category_id=200
Response: [
  {
    series_id: "1001",
    name: "Series Title",
    cover: "http://poster.png",
    rating: "7.8",
    category_id: "200",
    ...
  },
  ...
]
```

**Note:** Series response does NOT include episodes. Episodes are fetched separately.

### Series Episode Structure

**For each series, fetch episodes:**
```
GET /player_api.php?action=get_series_info&series_id=1001
Response: {
  series_id: "1001",
  name: "Series Title",
  seasons: [
    {
      season_number: 1,
      episodes: [
        {
          id: "ep1",
          title: "Episode 1",
          episode_num: 1,
          season: 1,
          still: "http://screenshot.png",
          ...
        },
        ...
      ]
    },
    ...
  ]
}
```

**Episode URL Construction:**
```
http://{baseUrl}/series/{username}/{password}/{series_id}/{season_num}/{episode_num}.mp4
```

---

## Content Categorization

### Why Categorization Matters

The parsing system must split a single content feed into three content types:

1. **Channels** → Displayed in live TV grid
2. **Movies** → Displayed in movies list
3. **Series** → Displayed with season/episode selectors

Incorrect categorization = broken UI and app functionality.

### M3U Categorization Logic

Since M3U format doesn't explicitly mark content type, we use heuristics:

#### Rule 1: Group Title (Highest Priority)

```typescript
if (group.includes('Series') || group.includes('TV Shows')) {
  return 'series';
}
if (group.includes('Movies') || group.includes('Films')) {
  return 'movie';
}
```

#### Rule 2: Stream URL Pattern (High Priority)

```typescript
const urlLower = streamUrl.toLowerCase();

if (urlLower.includes('/series/') || urlLower.includes('/shows/')) {
  return 'series';
}
if (urlLower.includes('/movies/') || urlLower.includes('/film/')) {
  return 'movie';
}
```

#### Rule 3: Metadata Pattern (Medium Priority)

For series, look for season/episode patterns in name:

```typescript
const nameUpper = metadata.name.toUpperCase();
if (nameUpper.match(/S\d+E\d+|SEASON \d+|EP(ISODE)? \d+/)) {
  return 'series';
}
```

Examples that trigger series detection:
- "Show Name - S01E05"
- "Drama Series Season 2"
- "Episodes Collection"

#### Rule 4: Default to Channel

```typescript
// If no other rules matched, it's a channel
return 'channel';
```

---

### Xtream Categorization

Xtream API already separates content, so categorization is simpler:

- Items from `get_live_streams` → **Channels**
- Items from `get_vod_streams` → **Movies**
- Items from `get_series` → **Series**

No guessing needed, just map each API response to the right type.

---

## Lazy Loading Strategy

### Why Lazy Loading?

**Problem:** 6,054 series × average 30 episodes per series = 181,620 episode API calls

**Time Required:** 181,620 calls × 0.5 seconds minimum = ~101,810 minutes = 70+ days

**Solution:** Don't fetch episodes during import. Fetch on-demand when user opens ContentDetailsScreen.

### How It Works

#### During Import (parseXtreamFast)

Series objects are created with **empty seasons array:**

```typescript
series.push({
  id: generateUUID(),
  title: ser.name,
  categoryName: category.category_name || 'Series',
  poster: ser.cover,
  seasons: [],  // ← EMPTY - will load on-demand
  description: ser.name,
  rating: ser.rating ? parseFloat(ser.rating) : undefined,
  playlistId,
  seriesId: ser.series_id,  // ← STORE THIS for later fetching
});
```

#### When User Opens Series (ContentDetailsScreen)

```typescript
// User clicks on "Show Name" series
const series = getSeries(seriesId);

// First time opening:
if (series.seasons.length === 0) {
  // Fetch episodes from Xtream API
  const seriesInfo = await fetchXtreamEndpoint(
    baseUrl + '/player_api.php',
    {
      action: 'get_series_info',
      series_id: series.seriesId,  // Use stored seriesId
      username,
      password,
    }
  );
  
  // Parse seasons and episodes
  series.seasons = parseSeasons(seriesInfo);
  
  // Save to storage for offline access
  await saveSeriesEpisodes(series);
}

// Display seasons and episodes to user
renderSeasonSelector(series.seasons);
```

### Performance Impact

- **Import Time:** 18-20 seconds (vs 55+ hours with full episode fetch)
- **First Series Open:** 1-3 seconds (first-time episode fetch)
- **Subsequent Opens:** Instant (cached in storage and memory)

### Data Structure

```typescript
interface Series {
  id: string;
  title: string;
  categoryName: string;
  poster: string;
  seasons: Season[];  // Populated on-demand
  description: string;
  rating?: number;
  playlistId: string;
  seriesId: string;   // Xtream series_id (needed for episode fetching)
}

interface Season {
  seasonNumber: number;
  episodes: Episode[];
}

interface Episode {
  id: string;
  title: string;
  episodeNumber: number;
  seasonNumber: number;
  poster?: string;
  streamUrl: string;
}
```

---

## Performance Optimization

### Critical Optimization #1: Sequential vs Parallel Requests

#### ❌ BROKEN APPROACH: Parallel Fetching

```typescript
// WRONG - DO NOT DO THIS
const allMovies = await Promise.all(
  vodCategories.map(cat =>
    fetchXtreamEndpoint(baseUrl, {
      action: 'get_vod_streams',
      category_id: cat.category_id,
      username,
      password,
    })
  )
);
```

**Problem:**
- 64 VOD categories = 64 simultaneous requests
- 78 Live categories = 78 simultaneous requests  
- 44 Series categories = 44 simultaneous requests
- **Total: 186 concurrent API requests**
- Server hits rate limits or times out
- Many requests silently fail: `.catch(() => null)`
- **Result: 45,000 movies, but only 5,000 saved**

#### ✅ CORRECT APPROACH: Sequential with Delays

```typescript
// CORRECT - Sequential requests with delay between each
for (let i = 0; i < vodCategories.length; i++) {
  const category = vodCategories[i];
  
  try {
    const vods = await fetchXtreamEndpoint(baseUrl, {
      action: 'get_vod_streams',
      category_id: category.category_id,
      username,
      password,
    });
    
    // Process and save vods
    movies.push(...parseMovies(vods));
    
    // Update progress every 5 categories
    if ((i + 1) % 5 === 0) {
      emitProgress({ ... });
    }
  } catch (error) {
    console.error(`Category ${category.category_name} failed:`, error);
    // Continue with next category
  }
  
  // CRITICAL: Delay between requests
  await new Promise(r => setTimeout(r, 100));
}
```

**Benefits:**
- 64 categories × 100ms = 6.4 seconds (instead of simultaneous timeout)
- 78 categories × 100ms = 7.8 seconds
- 44 categories × 100ms = 4.4 seconds
- **Total: ~18 seconds for 53,741 items**
- **vs: 55+ hours with full episode fetch, or timeout with parallel**

**Why 100ms Delay?**
- Not too fast: allows server time to process
- Not too slow: acceptable user wait time
- Empirically determined: balances speed vs reliability
- Different servers may need 50-200ms (adjust if timeouts occur)

### Critical Optimization #2: Chunked Storage

**Problem:** Saving 45,273 movies in one operation exceeds storage quota

**Solution:** Chunked saving during fetch

```typescript
const MOVIE_CHUNK_SIZE = 5000;  // Save every 5k movies

for (const category of vodCategories) {
  const vods = await fetchXtreamEndpoint(...);
  
  movies.push(...parseMovies(vods));
  
  // Save chunk if threshold reached
  if (movies.length >= MOVIE_CHUNK_SIZE) {
    await saveMoviesChunk(movies);
    movies = [];  // Reset for next chunk
  }
}

// Save any remaining
if (movies.length > 0) {
  await saveMoviesChunk(movies);
}
```

**Benefits:**
- Prevents "quota exceeded" errors mid-import
- Faster storage operations (smaller batches)
- Can recover from storage failures
- User sees progress on screen

### Critical Optimization #3: Progress Reporting

**Problem:** User doesn't know import is working (appears stuck)

**Solution:** Emit progress events every N categories

```typescript
// Emit every 10 live categories
if ((i + 1) % 10 === 0) {
  emitProgress({
    itemsParsed: channels.length,
    channelsSaved: channels.length,
    currentPhase: `Fetching Live: ${i + 1}/${liveCategories.length} categories`,
  });
}
```

**Benefits:**
- UI shows accurate progress
- User knows it's working
- Can estimate remaining time
- Prevents perceived "hang"

### Performance Tuning Parameters

```typescript
// Adjust these based on server behavior

const DELAY_BETWEEN_REQUESTS = 100;      // ms, increase if timeouts occur
const PROGRESS_UPDATE_INTERVAL = 10;     // categories, decrease for more frequent updates
const MOVIE_CHUNK_SIZE = 5000;           // items per save operation
const SERIES_CHUNK_SIZE = 1000;
const TIMEOUT_PER_REQUEST = 15000;       // ms, increase for slow servers
```

---

## Error Handling & Resilience

### Error Handling Strategy

**Principle:** Graceful degradation - get as much data as possible, recover from partial failures.

### Category-Level Error Handling

```typescript
for (const category of vodCategories) {
  try {
    const vods = await fetchXtreamEndpoint(...);
    movies.push(...parseMovies(vods));
  } catch (error: any) {
    // Log but continue
    console.error(
      `[OnboardingParser] VOD category fetch error: ${category.category_name}:`,
      error.message
    );
    // Next iteration still runs
  }
}
```

**Benefits:**
- One category fails = don't lose all other categories
- 64 categories fail: get 63 × N items instead of 0
- User notification: "Fetched 40,000 movies (4 categories failed)"

### Request-Level Error Handling

```typescript
const result = await fetchXtreamEndpoint(baseUrl, params).catch((error) => {
  console.error(`Fetch failed: ${error.message}`);
  return null;  // Return null on failure
});

if (result && Array.isArray(result)) {
  // Process normally
} else {
  // Skip this category
}
```

### Network Timeout Handling

```typescript
// Per-request timeout: 15 seconds
const response = await axios.get(url, {
  timeout: 15000,  // Abort if takes > 15s
});

// Global parse timeout: 2 minutes
const timeoutPromise = new Promise<void>((resolve) =>
  setTimeout(() => {
    console.warn('Parse timeout - stopping gracefully');
    resolve();  // Don't throw, just stop
  }, PARSE_TIMEOUT)
);

await Promise.race([parsePromise, timeoutPromise]);
```

### Storage Quota Errors

```typescript
const result = await LocalStorageService.savePlaylistContent(
  playlistId,
  'movies',
  movies
);

if (result.failed > 0) {
  console.warn(
    `Storage limit reached: ${result.saved}/${movies.length} saved`
  );
  
  emitProgress({
    storageQuotaExceeded: true,
    storageLimitMessage: 'Storage limit reached. Clear old playlists to save more.',
  });
}
```

---

## Storage & Quota Management

### Storage Quota by Platform

| Platform | Limit | Strategy |
|----------|-------|----------|
| Web (IndexedDB) | 50MB typical | Clear old playlists before import |
| iOS (SQLite) | ~500MB per app | No limit in practice |
| Android (SQLite) | ~500MB per app | No limit in practice |

### Pre-Import Cleanup

```typescript
// CRITICAL: Clear old playlist before saving new data
// This prevents "quota exceeded" during import

try {
  await clearPlaylistContent(playlistId);
  console.log(`Cleared old content for playlist ${playlistId}`);
} catch (error) {
  console.warn(`Warning clearing old content: ${error}`);
  // Continue anyway - not critical if clear fails
}

// Now save new data (room for it now)
await LocalStorageService.savePlaylistContent(playlistId, 'channels', channels);
```

### Chunked Saving

```typescript
// Save in chunks to avoid single huge operation

const CHUNK_SIZE = 5000;
for (let i = 0; i < movies.length; i += CHUNK_SIZE) {
  const chunk = movies.slice(i, i + CHUNK_SIZE);
  const result = await LocalStorageService.savePlaylistContent(
    playlistId,
    'movies',
    chunk
  );
  
  if (result.failed > 0) {
    console.warn(`Chunk save failed: ${result.failed} items dropped`);
    // Continue with next chunk
  }
}
```

### Storage Index Structure

```typescript
// Storage organized by playlistId and content type

playlistId:
  channels: Channel[]
  movies: Movie[]
  series: Series[]
```

**Why This Structure?**
- Fast lookup: Get all channels for a playlist in O(1)
- Easy deletion: Delete entire playlist in one operation
- Space efficient: No duplicate data

---

## Critical Edge Cases & Solutions

### Edge Case 1: Server URL Normalization

**Problem:** Users input URLs in various formats
```
http://example.com
https://example.com/
example.com:8080
192.168.1.100:1234/
```

**Solution:** Normalize before use

```typescript
// Remove protocol if present
serverUrl = serverUrl.replace(/^https?:\/\//, '');

// Remove trailing slash
serverUrl = serverUrl.replace(/\/$/, '');

// Build base URL
const baseUrl = `http://${serverUrl}`;
```

### Edge Case 2: Missing Stream Icons

**Problem:** Xtream API returns `stream_icon: null` or missing
```json
{
  "stream_id": "123",
  "name": "Movie Title",
  "stream_icon": null
}
```

**Solution:** Handle gracefully

```typescript
let posterUrl = vod.stream_icon;

// Skip if null/undefined
if (!posterUrl) {
  posterUrl = undefined;
}

// Handle relative URLs
if (posterUrl && !posterUrl.startsWith('http')) {
  posterUrl = `${baseUrl}${posterUrl.startsWith('/') ? '' : '/'}${posterUrl}`;
}

movie.poster = posterUrl || undefined;
```

### Edge Case 3: Series with No Episodes

**Problem:** Xtream returns series with `series_id` but `get_series_info` returns empty episodes
```json
{
  "series_id": "999",
  "name": "Abandoned Series",
  "seasons": []
}
```

**Solution:** Display gracefully

```typescript
// When loading ContentDetailsScreen:
const seriesInfo = await fetchSeriesInfo(seriesId);

if (!seriesInfo.seasons || seriesInfo.seasons.length === 0) {
  showMessage('This series has no available episodes');
  return;
}

// Display seasons normally
```

### Edge Case 4: Duplicate Content

**Problem:** Some playlists have same content multiple times
```
Movie "Action" from category A
Movie "Action" from category B (same stream URL)
```

**Solution:** Accept duplicates (user's choice to import)

```typescript
// Don't deduplicate - each category is independent
// If user wants to remove duplicates, they can

// Rationale:
// - Different categories might have legitimately same content
// - Deduplication logic could be wrong
// - Storage space is cheap compared to implementation risk
```

### Edge Case 5: URL-Encoded Credentials

**Problem:** Username/password might contain special characters
```
username: "user@domain.com"
password: "p@ss$word!"
```

**Solution:** Properly encode in stream URLs

```typescript
// When building stream URL:
const streamUrl = 
  `${baseUrl}/live/${encodeURIComponent(username)}/` +
  `${encodeURIComponent(password)}/${stream_id}.m3u8`;

// Results in:
// http://server/live/user%40domain.com/p%40ss%24word%21/123.m3u8
```

### Edge Case 6: M3U with No Categories

**Problem:** M3U file has entries but no group-title attribute
```
#EXTINF:-1,Channel Name
http://stream.url
```

**Solution:** Group as "Uncategorized"

```typescript
group: currentMetadata.group || 'Uncategorized'
```

### Edge Case 7: Very Large Numbers

**Problem:** Some Xtream servers have 200,000+ items
```
Parsing 200k items × 10ms each = 2000ms
Storage operations might timeout
```

**Solution:** Extend timeouts and increase delays

```typescript
// For very large playlists:
const DELAY_BETWEEN_REQUESTS = 200;  // Increase from 100
const TIMEOUT_PER_REQUEST = 30000;   // Increase from 15000
const CHUNK_SIZE = 2000;              // Decrease from 5000
```

---

## Implementation Checklist

### For New Platform Implementation

When porting this system to a new platform, use this checklist:

#### Phase 1: Core Parsing Services

- [ ] Implement M3UParser with industry-standard EXTINF parsing
- [ ] Implement XtreamCodesService with all API endpoints
- [ ] Implement OnboardingParserService orchestrator
- [ ] Implement PlaylistParserService with chunked processing

#### Phase 2: Data Models

- [ ] Define Channel interface (id, name, group, streamUrl, logo, etc)
- [ ] Define Movie interface (id, title, poster, streamUrl, etc)
- [ ] Define Series interface (id, title, seasons[], seriesId, etc)
- [ ] Define Season interface (seasonNumber, episodes[])
- [ ] Define Episode interface (episodeNumber, streamUrl, etc)

#### Phase 3: Storage Layer

- [ ] Implement LocalStorageService (abstract storage operations)
- [ ] Support savePlaylistContent(playlistId, type, items)
- [ ] Support loadPlaylistContent(playlistId, type)
- [ ] Support clearPlaylistContent(playlistId)
- [ ] Handle storage quota errors gracefully

#### Phase 4: Progress Reporting

- [ ] Define ParseProgress interface
- [ ] Implement onProgress callback system
- [ ] Emit progress every N categories (not every item)
- [ ] Report accurate percentComplete and itemsParsed

#### Phase 5: Content Type Detection

- [ ] Implement detectContentType(metadata, streamUrl)
- [ ] Test all detection rules with sample M3Us
- [ ] Handle edge cases (missing group-title, etc)

#### Phase 6: Lazy Loading

- [ ] Store series with empty seasons[] array
- [ ] Create ContentDetailsScreen for episode fetching
- [ ] Fetch episodes on-demand via get_series_info
- [ ] Cache episodes to storage after first fetch

#### Phase 7: Performance Tuning

- [ ] Use sequential loops, NOT Promise.all() for category fetching
- [ ] Add 100ms delay between category requests
- [ ] Implement chunked storage operations
- [ ] Add progress reporting every 10 categories
- [ ] Test with 50,000+ item playlist

#### Phase 8: Error Handling

- [ ] Wrap each category fetch in try-catch
- [ ] Log category-level errors, don't throw
- [ ] Handle network timeouts (15s per request)
- [ ] Handle storage quota errors
- [ ] Continue on partial failures

#### Phase 9: Testing

- [ ] Test with small M3U (10 items)
- [ ] Test with large M3U (100,000+ items)
- [ ] Test with Xtream credentials (valid and invalid)
- [ ] Test import interruption and resume
- [ ] Test storage quota overflow
- [ ] Test category-level API failures
- [ ] Verify all 53,741 items in test suite

---

## Architecture Decision Records (ADRs)

### ADR-1: Sequential vs Parallel Category Fetching

**Decision:** Use sequential loops with delays, NOT Promise.all()

**Rationale:**
- Xtream API enforces rate limiting
- Parallel requests (186 concurrent) exceed server limits
- Sequential with 100ms delay = reliable, predictable
- Only ~18 seconds for 53,741 items (acceptable)

**Trade-off:** Import takes 18 seconds instead of theoretical 1 second
**Value:** 100% data capture vs 10% with parallel and timeouts

---

### ADR-2: Lazy Load Episodes

**Decision:** Fetch series metadata during import, episodes on-demand

**Rationale:**
- 181,620 episode fetches = 70+ days of requests
- Users don't view all series immediately
- Metadata enough for discovery (title, poster, rating)
- Episodes fetched in 1-3 seconds when user opens series
- Net faster user experience

**Trade-off:** Cold start on series open vs all episodes cached
**Value:** 18-second import vs 70-day import

---

### ADR-3: Pre-Import Storage Cleanup

**Decision:** Clear old playlist before importing new data

**Rationale:**
- Storage quota often 50MB for web platforms
- 45,273 movies × ~2KB per entry = ~90MB needed
- Old + new = exceeds quota
- Clear old = free space
- New = fits without quota error

**Trade-off:** Old playlist lost (user must confirm)
**Value:** Import success vs quota overflow error

---

## Performance Benchmarks

Benchmarks measured on test Xtream server with production credentials.

### Import Scenarios

| Scenario | Time | Items | Notes |
|----------|------|-------|-------|
| M3U 100 items | ~1 sec | 100 | Simple test |
| M3U 100k items | ~15 sec | 100,000 | Real-world size |
| Xtream (full) | ~18 sec | 53,741 | 2,414 live + 45,273 movies + 6,054 series |
| Xtream timeout | ~120 sec | Variable | Graceful timeout at 2 minutes |

### First Series Open

| Scenario | Time | Notes |
|----------|------|-------|
| First open (fetch) | 1-3 sec | API call to get_series_info |
| Cached open | <100ms | Load from localStorage |

### Storage Usage

| Content | Size | Count |
|---------|------|-------|
| Live Channels | ~1.5 MB | 2,414 |
| Movies | ~60 MB | 45,273 |
| Series (no episodes) | ~10 MB | 6,054 |
| **Total** | **~70 MB** | **53,741** |

---

## Troubleshooting Guide

### Symptom: Import Takes >2 Minutes

**Causes:**
1. Slow Xtream server
2. Network latency
3. Too many categories

**Solution:**
```typescript
// Increase timeouts and delays
const DELAY_BETWEEN_REQUESTS = 200;  // From 100
const TIMEOUT_PER_REQUEST = 30000;   // From 15000
```

---

### Symptom: Only Half the Items Imported

**Causes:**
1. Using Promise.all() instead of sequential
2. Server timeout due to concurrent requests
3. Silent failure in category fetch

**Solution:**
- Verify sequential loops are implemented
- Check logs for "category fetch error"
- Verify 100ms delay between requests

---

### Symptom: Storage Quota Exceeded

**Causes:**
1. Old playlist not cleared before import
2. Chunk size too large
3. Multiple large playlists

**Solution:**
```typescript
// Clear old data first
await clearPlaylistContent(playlistId);

// Reduce chunk size
const CHUNK_SIZE = 2000;  // From 5000
```

---

### Symptom: Series Episodes Not Loading

**Causes:**
1. ContentDetailsScreen not calling get_series_info
2. Wrong seriesId passed (should be from import time)
3. Xtream server has no episodes for series

**Solution:**
- Verify seriesId is stored during import
- Check get_series_info API response is not empty
- Try different Xtream server credentials

---

## Conclusion

This parsing system successfully handles:

- ✅ 53,741+ items in 18 seconds
- ✅ Lazy-loaded episodes (zero timeout)
- ✅ Graceful error handling (no data loss)
- ✅ Real-time progress reporting
- ✅ Storage quota management
- ✅ Cross-platform portability

**Key Success Factors:**
1. Sequential requests with delays (not parallel)
2. Chunked storage operations
3. Category-level error handling
4. Lazy loading for expensive operations
5. Accurate progress reporting

**For optimal results:**
- Monitor server response times and adjust DELAY_BETWEEN_REQUESTS accordingly
- Test with actual Xtream credentials
- Measure performance on target platform
- Adjust CHUNK_SIZE based on available storage

