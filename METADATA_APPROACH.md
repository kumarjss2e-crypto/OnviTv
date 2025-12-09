# New Metadata Approach - External API Integration

## Problem Statement

Previously, the app relied on metadata stored in Firebase during M3U/Xtream playlist import. This caused issues:
- ❌ M3U playlists often have minimal or no metadata
- ❌ Missing posters, descriptions, ratings
- ❌ No episode information for series
- ❌ Unable to properly test with public IPTV playlists
- ❌ Poor user experience with incomplete information

## New Solution: External Metadata APIs

### Architecture Overview

```
┌─────────────────┐
│  Import Phase   │
│  (M3U/Xtream)   │
│                 │
│ Store ONLY:     │
│ - Title         │
│ - Stream URL    │
│ - Category      │
│ - Basic Info    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Firebase      │
│   (Minimal)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Display Phase   │
│ (Screens)       │
│                 │
│ Fetch from:     │
│ - TMDb API      │
│ - Cache in FB   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rich Metadata  │
│                 │
│ - HD Posters    │
│ - Descriptions  │
│ - Ratings       │
│ - Cast/Crew     │
│ - Episodes      │
└─────────────────┘
```

## Implementation Details

### 1. Metadata Service (`src/services/metadataService.js`)

**Features:**
- Search movies by title/year
- Search TV series by title/year
- Get season episodes with full details
- Automatic caching (30-day TTL)
- Batch enrichment for lists

**API Used:** TMDb (The Movie Database)
- Free tier: 40 requests/10 seconds
- Unlimited total requests
- High-quality images
- Comprehensive metadata

### 2. Updated Screens

#### MoviesScreen.js
```javascript
// Before: Display basic Firebase data
const movies = await getUserMovies(userId);
setItems(movies);

// After: Enrich with TMDb metadata
const movies = await getUserMovies(userId);
const enriched = await batchEnrichContent(movies, 'movie');
setItems(enriched);
```

#### SeriesDetailScreen.js
```javascript
// Before: Only Xtream API episodes
const episodes = await getSeriesEpisodes(seriesId);

// After: TMDb metadata first, fallback to Xtream
if (series.tmdbId) {
  const episodes = await getSeasonEpisodes(tmdbId, seasonNumber);
  // Rich metadata: thumbnails, descriptions, ratings per episode
}
```

### 3. Caching Strategy

**First Request:**
1. Check Firebase `metadata` collection
2. If not found or expired (>30 days), fetch from TMDb
3. Cache result in Firebase
4. Return enriched data

**Subsequent Requests:**
1. Return cached data from Firebase
2. No API calls needed
3. Fast response time

**Benefits:**
- ✅ Stays within API limits
- ✅ Fast performance
- ✅ Offline capability (cached data)
- ✅ Cost-effective

## Data Flow Example

### Movie Import & Display

```javascript
// 1. IMPORT (M3U Parser)
{
  id: "movie_123",
  title: "Inception",
  streamUrl: "http://example.com/inception.mp4",
  userId: "user_abc",
  playlistId: "playlist_xyz"
}

// 2. DISPLAY (MoviesScreen)
// Automatically enriched with:
{
  id: "movie_123",
  title: "Inception",
  streamUrl: "http://example.com/inception.mp4",
  // ... original data ...
  
  // TMDb enrichment:
  poster: "https://image.tmdb.org/t/p/w500/poster.jpg",
  backdrop: "https://image.tmdb.org/t/p/original/backdrop.jpg",
  plot: "A thief who steals corporate secrets...",
  rating: "8.8",
  year: 2010,
  genre: "Action, Sci-Fi, Thriller",
  runtime: 148,
  cast: [...],
  tmdbId: 27205,
  source: "tmdb",
  fetchedAt: "2025-11-03T08:00:00Z"
}
```

### Series with Episodes

```javascript
// 1. IMPORT
{
  id: "series_456",
  title: "Breaking Bad",
  streamUrl: "http://example.com/bb/",
  totalSeasons: 5
}

// 2. DISPLAY (SeriesDetailScreen)
// Series enriched:
{
  title: "Breaking Bad",
  poster: "...",
  backdrop: "...",
  plot: "A high school chemistry teacher...",
  rating: "9.5",
  totalSeasons: 5,
  totalEpisodes: 62,
  tmdbId: 1396
}

// 3. EPISODES (Season 1)
[
  {
    episodeNumber: 1,
    seasonNumber: 1,
    title: "Pilot",
    plot: "Diagnosed with terminal cancer...",
    airDate: "2008-01-20",
    rating: "8.9",
    thumbnail: "https://image.tmdb.org/t/p/w500/ep1.jpg",
    runtime: 58
  },
  // ... more episodes
]
```

## Setup Instructions

### Step 1: Get TMDb API Key
1. Create account at https://www.themoviedb.org/
2. Go to Settings → API
3. Request API key (free, instant approval)
4. Copy API Key (v3 auth)

### Step 2: Add to App
```javascript
// src/services/metadataService.js
const TMDB_API_KEY = 'your_api_key_here';
```

### Step 3: Test
```javascript
// Test movie search
const metadata = await searchMovieMetadata('Inception', 2010);
console.log(metadata);

// Test series search
const series = await searchSeriesMetadata('Breaking Bad');
console.log(series);

// Test episodes
const episodes = await getSeasonEpisodes(1396, 1); // Breaking Bad S01
console.log(episodes);
```

## Benefits of New Approach

### For Development
- ✅ Works with ANY M3U playlist
- ✅ No manual metadata entry needed
- ✅ Easy testing with public playlists
- ✅ Rich, accurate data

### For Users
- ✅ Beautiful HD posters and backdrops
- ✅ Detailed descriptions and plots
- ✅ Accurate ratings from millions of users
- ✅ Episode thumbnails and descriptions
- ✅ Cast and crew information
- ✅ Release dates and runtime

### For Performance
- ✅ Fast imports (no metadata fetching)
- ✅ Cached results (30-day TTL)
- ✅ Batch processing for lists
- ✅ Stays within API limits

## Migration Path

### Existing Data
- Old content in Firebase still works
- Gradually enriched as users view content
- No data loss or migration needed

### New Imports
- Immediate enrichment on display
- Cached for future views
- Consistent experience

## Alternative APIs

### If TMDb doesn't work:

**OMDb API**
- URL: http://www.omdbapi.com/
- Free: 1,000 requests/day
- Simpler but less data

**TVMaze API**
- URL: https://www.tvmaze.com/api
- No API key needed
- Great for TV series

**Implementation:**
Just swap the API calls in `metadataService.js`

## Testing

### Test with Public Playlists
```javascript
// IPTV-ORG playlists
https://iptv-org.github.io/iptv/countries/us.m3u
https://iptv-org.github.io/iptv/categories/movies.m3u
https://iptv-org.github.io/iptv/categories/series.m3u

// These now work perfectly!
// Metadata fetched from TMDb on display
```

### Verify Enrichment
```javascript
// Check console logs:
// "[MoviesScreen] Movies enriched with metadata"
// "[SeriesDetailScreen] Fetching episode metadata from TMDb"
```

## Future Enhancements

1. **Multi-language support** - TMDb supports 39 languages
2. **Cast & Crew** - Show actors, directors, etc.
3. **Recommendations** - "Similar movies/series"
4. **Trailers** - YouTube trailer links
5. **Reviews** - User reviews from TMDb
6. **Images Gallery** - Multiple posters/backdrops

## Conclusion

This new approach solves the metadata problem by:
- Separating import from display
- Using professional metadata APIs
- Caching for performance
- Working with any playlist source

**Result:** Rich, beautiful content display regardless of source quality! 🎉
