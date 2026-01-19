# OnviTV Platform Architecture Summary

## 🏗️ Platform Overview

**OnviTV** is a React Native IPTV streaming platform that allows users to:
- Add M3U/M3U8 playlists or Xtream Codes servers
- Browse and stream live TV channels, movies, and series
- Manage favorites, watch history, and downloads
- Support cross-platform (iOS, Android, Web)
- Multi-user with subscription tiers (free/premium/VIP)

---

## 🔄 Core Process Flow: M3U Parsing & Storage

### **1. User Adds Playlist**
```
AddPlaylistScreen
  ├─ Input: Name + M3U URL (or Xtream credentials)
  └─ Calls: addPlaylist(userId, playlistData)
       └─ Firestore: Creates document in 'playlists' collection
       └─ Returns: playlistId
```

### **2. Background M3U Parsing**
```
parseM3UPlaylist(playlistId, userId, m3uUrl)
  │
  ├─ Step 1: Fetch M3U file
  │   └─ fetchM3UFile(url) → Downloads M3U content
  │
  ├─ Step 2: Parse M3U content
  │   └─ parseM3UContent(content) → Returns {channels, movies, series}
  │   └─ Extracts from #EXTINF tags:
  │       ├─ tvg-id (EPG channel ID)
  │       ├─ tvg-name (Channel name)
  │       ├─ tvg-logo (Channel logo URL)
  │       ├─ group-title (Category)
  │       └─ Stream URL
  │
  ├─ Step 3: Clear old content (for same playlist)
  │   └─ clearPlaylistContent(playlistId)
  │   └─ Queries & deletes all items with this playlistId
  │
  ├─ Step 4: Save parsed data to Firestore
  │   └─ saveToFirestore(playlistId, userId, parsedData)
  │   └─ Splits into 500-item batches (Firestore limit)
  │   └─ saveBatch() → writes each collection
  │
  ├─ Step 5: Update playlist stats
  │   └─ updatePlaylistStats(playlistId, stats)
  │   └─ Updates: totalChannels, totalMovies, totalSeries, totalCategories
  │
  └─ Step 6: Update last fetched timestamp
      └─ updateLastFetched(playlistId, 'm3u')
```

---

## 🗄️ Firebase Collections Structure

### **1. playlists** (Parent collection)
```javascript
{
  userId,                    // User who owns this playlist
  name,                      // User-given name
  type: "m3u" | "xtream",   // Playlist source type
  isActive: boolean,         // Enable/disable playlist
  createdAt, updatedAt,
  
  // M3U-specific
  m3uConfig: {
    url: "https://...",      // M3U file URL
    lastFetched: timestamp
  },
  
  // Xtream-specific
  xtreamConfig: {
    serverUrl, username, password,
    lastFetched: timestamp,
    serverInfo: {...}
  },
  
  // Statistics
  stats: {
    totalChannels,
    totalMovies,
    totalSeries,
    totalCategories
  }
}
```

### **2. channels** (Live TV)
```javascript
{
  playlistId,                // Reference to parent playlist
  userId,                    // Reference to user
  streamId,                  // Provider's internal ID
  name,                      // Channel name
  logo,                      // Channel logo URL
  streamUrl,                 // HLS/DASH stream URL
  streamType,                // "live", "hls", "dash"
  
  // Metadata from M3U
  categoryId, categoryName,  // Channel group
  epgChannelId,              // For EPG matching
  tvgId, tvgName,            // TVG metadata
  groupTitle,                // M3U group title
  
  isAdult: boolean,
  addedAt: timestamp,
  metadata: {...}            // codec, resolution, language, etc.
}
```

### **3. movies** (VOD)
```javascript
{
  playlistId, userId,
  streamId,
  name, title,
  plot,                      // Description
  poster, backdrop,          // Image URLs
  streamUrl,                 // Video stream URL
  containerExtension,        // "mp4", "mkv", "avi"
  
  categoryId, categoryName,
  addedAt: timestamp,
  
  // Enriched metadata (fetched from TMDb on-demand)
  tmdbId, imdbId,
  rating, duration,
  genre: [],
  director, cast: [],
  releaseDate
}
```

### **4. series** (TV Series)
```javascript
{
  playlistId, userId,
  seriesId,                  // Provider's series ID
  name, title,
  plot,
  poster, backdrop,
  
  categoryId, categoryName,
  addedAt: timestamp,
  
  totalSeasons, totalEpisodes,
  
  // Optional enrichment
  tmdbId,
  rating, genre: [],
  cast: [],
  releaseDate
}
```

### **5. episodes** (Series Episodes)
```javascript
{
  seriesId,                  // Reference to parent series
  playlistId, userId,
  
  seasonNum, episodeNum,
  title,
  plot,
  streamUrl,
  containerExtension,
  duration,
  thumbnail,
  releaseDate,
  
  subtitles: [...]
}
```

### **6. Other Collections**
- **categories**: Groups of channels/movies (for organization)
- **favorites**: User's favorited items (movies, channels, series)
- **watchHistory**: Playback progress and viewing history
- **downloads**: Offline downloaded content metadata
- **epg**: Electronic Program Guide data
- **parentalControls**: PIN and age restrictions
- **catchup**: Catch-up TV functionality

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ADDS PLAYLIST                            │
│                   (AddPlaylistScreen)                            │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ↓ addPlaylist(userId, playlistData)
    ┌─────────────────────────┐
    │  Firestore playlists    │
    │  Create document        │
    │  (returns playlistId)   │
    └────────┬────────────────┘
             │
             ↓ parseM3UPlaylist() [Background]
    ┌────────────────────────────────────────────────────────┐
    │  STEP 1: Fetch M3U                                     │
    │  └─ downloadFile from URL                              │
    └────────┬─────────────────────────────────────────────┘
             │
             ↓
    ┌────────────────────────────────────────────────────────┐
    │  STEP 2: Parse M3U Content                             │
    │  ├─ Extract channels from #EXTINF tags                 │
    │  ├─ Extract movies from metadata                       │
    │  └─ Extract series from metadata                       │
    │  Returns: {channels[], movies[], series[]}             │
    └────────┬─────────────────────────────────────────────┘
             │
             ↓
    ┌────────────────────────────────────────────────────────┐
    │  STEP 3: Clear Old Content                             │
    │  └─ Delete old channels/movies/series for this playlist│
    │     (query where playlistId == X)                      │
    └────────┬─────────────────────────────────────────────┘
             │
             ↓
    ┌────────────────────────────────────────────────────────┐
    │  STEP 4: Save to Firestore                             │
    │  ├─ saveBatch('channels', [...], playlistId, userId)   │
    │  ├─ saveBatch('movies', [...], playlistId, userId)     │
    │  ├─ saveBatch('series', [...], playlistId, userId)     │
    │  └─ writeBatch() in 500-item chunks                    │
    │                                                         │
    │  Creates documents in:                                 │
    │  ├─ channels/{id}                                      │
    │  ├─ movies/{id}                                        │
    │  └─ series/{id}                                        │
    └────────┬─────────────────────────────────────────────┘
             │
             ↓
    ┌────────────────────────────────────────────────────────┐
    │  STEP 5: Update Playlist Stats                         │
    │  └─ updatePlaylistStats(playlistId, {                  │
    │       totalChannels: 100,                              │
    │       totalMovies: 50,                                 │
    │       totalSeries: 25,                                 │
    │       totalCategories: 10                              │
    │     })                                                 │
    │  └─ Updates: playlists/{playlistId}.stats              │
    └────────┬─────────────────────────────────────────────┘
             │
             ↓
    ┌────────────────────────────────────────────────────────┐
    │  STEP 6: Update Last Fetched                           │
    │  └─ updateLastFetched(playlistId, 'm3u')               │
    │  └─ Updates: playlists/{playlistId}.m3uConfig          │
    │                   .lastFetched                         │
    └────────┬─────────────────────────────────────────────┘
             │
             ↓ ✅ Parsing Complete
```

---

## 🛠️ Key Services & Utilities

### **M3U Parser** (`src/utils/m3uParser.js`)
- `parseM3UPlaylist()` - Main entry point
- `fetchM3UFile()` - Downloads M3U file
- `parseM3UContent()` - Parses #EXTINF tags
- `clearPlaylistContent()` - Deletes old items
- `saveToFirestore()` - Batch saves to Firebase
- `saveBatch()` - Firestore batch writer (500 item chunks)

### **Playlist Service** (`src/services/playlistService.js`)
- `addPlaylist()` - Create new playlist
- `getUserPlaylists()` - Fetch user's playlists
- `getPlaylist()` - Get single playlist
- `updatePlaylist()` - Update playlist info
- `deletePlaylist()` - Delete entire playlist + content
- `updatePlaylistStats()` - Update stats document
- `setPlaylistParsingStatus()` - Set parsing status/progress
- `updateLastFetched()` - Update last fetch timestamp

### **Xtream API Service** (`src/services/xtreamAPI.js`)
- `fetchXtreamPlaylist()` - Fetch from Xtream server
- Handles server authentication
- Fetches categories, channels, VOD, series

---

## 💾 Data Storage Strategy

### **Hot Data** (In Firestore)
- User profile & preferences
- Playlists metadata
- Parsed content (channels, movies, series)
- User stats & history
- EPG data

### **Cold Data** (In Firebase Storage)
- User avatars
- Downloaded videos
- Cached M3U files
- EPG XML files

### **Batch Operations**
- Writing uses `writeBatch()` for atomic updates
- Max 500 operations per batch (Firestore limit)
- Large playlists split across multiple batches
- Each batch is a transaction

---

## 🎯 Key Architectural Patterns

### **1. Lazy Parsing**
- M3U file parsed in background after user adds it
- User can navigate away while parsing happens
- Real-time progress updates via `setPlaylistParsingStatus()`

### **2. Collection-Per-Content-Type**
- Separate collections for channels, movies, series
- Easier querying by content type
- Clear separation of concerns

### **3. Playlist Ownership**
- Every content item has `playlistId` + `userId`
- Allows multi-user, multi-playlist support
- Easy deletion: delete all items with `playlistId == X`

### **4. Metadata Enrichment On-Demand**
- Basic metadata stored from M3U
- Rich metadata (TMDb) fetched when user views content
- Reduces initial parsing time
- References: MoviesScreen, SeriesScreen `batchEnrichContent()`

### **5. Stats Tracking**
- `playlists.stats` contains totals
- Updated after each parsing
- Used for UI display (e.g., "100 channels, 50 movies")

---

## 🔐 Authentication & User Context

- **Auth Service**: `src/context/AuthContext.js`
- Firebase Auth (email, Google, etc.)
- `user.uid` used as userId in all operations
- Multi-device sync via userId reference

---

## ⚡ Performance Considerations

1. **Batch Writing**: 500-item chunks to avoid Firestore timeouts
2. **Large Playlists**: 10,000+ items may take minutes
3. **Query Optimization**: Indexed on userId + playlistId
4. **Parsing Progress**: Real-time updates prevent UI hanging
5. **Lazy Loading**: Content metadata enriched on-demand

---

Now I'm ready for your refactoring!

Tell me:
1. **What aspects** do you want to refactor?
2. **What are the goals?** (Performance, maintainability, scalability, architecture?)
3. **What are the constraints?** (Keep existing data? Breaking changes?)
4. **New features or fixes** you want to include?
