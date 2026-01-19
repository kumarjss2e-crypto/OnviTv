# Content Classification Fix - Live Channels vs Movies

## Problem Identified
Live channels with group titles containing "Movie" (e.g., "Movie Channels") were being misclassified as movies instead of staying as live channels. This caused:
- Movie Channels appearing in the Movies choice chip
- No actual movies showing in Movies section
- Content appearing in wrong categories

## Root Cause
The `detectContentType()` function in both M3U parsers was checking for movie keywords in the **group-title/category field**, which incorrectly classified:
- "Movie Channels" group → classified as movie ❌
- "Action Movie Channels" group → classified as movie ❌
- Any channel in a category with "movie" in the name → classified as movie ❌

## Solution Implemented

### Changes Made

#### 1. **src/utils/m3uStreamParser.js** (Modern streaming parser)
**Before:**
```javascript
// Checked group-title for movie keywords (TOO BROAD)
if (groupLower.includes('movie') || groupLower.includes('film') || 
    groupLower.includes('cinema') || groupLower.includes('movies') || 
    groupLower.includes('filme') || groupLower.includes('aktion') || 
    groupLower.includes('drama') || groupLower.includes('komödie')) {
  return 'movie';
}
```

**After:**
```javascript
// Only check URL path for movie indicators (SAFE)
if (streamLower.includes('/movie') || streamLower.includes('/movies') || 
    streamLower.includes('movie?') || streamLower.includes('film')) {
  return 'movie';
}

// Check name for explicit patterns like "Movie: Avatar" (SAFE)
if (/^\s*movie:\s+/i.test(nameLower) || /^\s*film:\s+/i.test(nameLower)) {
  return 'movie';
}

// DEFAULT: Everything else is channel (SAFE DEFAULT)
return 'channel';
```

#### 2. **src/utils/m3uParser.js** (Legacy parser)
**Before:**
```javascript
// Checked category for movie keywords (TOO BROAD)
const movieKeywords = ['movie', 'film', 'cinema', 'vod', 'peliculas', 'filmes'];
const isMovie = movieKeywords.some(keyword => 
  category.includes(keyword) || name.includes(keyword) || url.includes('/movie/')
);
```

**After:**
```javascript
// Only check URL path for reliable indicators (SAFE)
const movieUrlPatterns = ['/movie', '/movies', '/vod/'];
const isMovieUrl = movieUrlPatterns.some(pattern => url.includes(pattern));

// Check for explicit name patterns (SAFE)
const isExplicitMovie = /^\s*movie:\s+|^\s*film:\s+/i.test(name);

if (isMovieUrl || isExplicitMovie) {
  return 'movie';
}

// DEFAULT: Channel (SAFE)
return 'channel';
```

## Detection Priority (Updated)

### Series (Highest Priority)
1. ✅ URL contains `/series/`, `/tvshow/`, or `/tv/`
2. ✅ Name matches episode pattern: `S01E01`, `1x01`, `Season`, `Episode`
3. ✅ Group title contains series keywords: `series`, `show`, `tvshow`, `serial`

### Movies (Middle Priority)
1. ✅ URL contains `/movie`, `/movies`, or `/vod/` paths
2. ✅ Name starts with `Movie:` or `Film:` prefix (explicit pattern)
3. ❌ Group title (removed - too broad)
4. ❌ Generic keywords like `drama`, `action` (removed - too broad)

### Channels (Lowest Priority - Default)
- ✅ Everything else defaults to channel (safest for IPTV)
- This includes "Movie Channels" since it lacks explicit movie indicators

## Impact

### Correct Behavior - NEW
```
Group: "Movie Channels"
Name: "HBO"
URL: "http://stream.provider.com/live/hbo"

Classification: 🟢 CHANNEL (correct)
Reason: URL doesn't contain /movie, group title alone insufficient
```

```
Group: "Movies"
Name: "Avatar (2009)"
URL: "http://stream.provider.com/movie/avatar"

Classification: 🟢 MOVIE (correct)
Reason: URL contains /movie path
```

```
Group: "Series"
Name: "Breaking Bad S01E01"
URL: "http://stream.provider.com/series/breaking-bad"

Classification: 🟢 SERIES (correct)
Reason: URL contains /series AND name has S01E01 pattern
```

## Data Cleanup

### For Existing Misclassified Content
If you have existing playlists that were parsed before this fix, you may see misclassified items. Here's how to fix:

#### Option 1: Re-parse the Playlist (Recommended)
1. Go to Playlist Management
2. Delete the affected playlist
3. Re-add the M3U URL
4. Let it re-parse with the new classification logic
5. New items will be correctly classified

#### Option 2: Firestore Cleanup Script (Manual)
To move misclassified items:
```javascript
// Example: Move items from movies that should be channels
const playlistId = 'YOUR_PLAYLIST_ID';
const moviesRef = collection(firestore, `playlists/${playlistId}/movies`);
const channelsRef = collection(firestore, `playlists/${playlistId}/channels`);

// Query movies that look like channels (contains "HD", "Channel", etc.)
const snapshot = await getDocs(moviesRef);
snapshot.forEach(async (doc) => {
  const item = doc.data();
  
  // If it looks like a channel (not a real movie)
  if (!item.streamUrl?.includes('/movie') && 
      !item.name?.includes(':') &&
      item.categoryName?.includes('Channel')) {
    
    // Add to channels subcollection
    await setDoc(doc(channelsRef, doc.id), item);
    
    // Remove from movies
    await deleteDoc(doc.ref);
  }
});
```

## Testing After Fix

### Verify M3U Parsing
1. Add a new M3U playlist with mixed content
2. Check that:
   - ✅ Live channels appear in "Live TV" tab
   - ✅ Movies appear in "Movies" tab
   - ✅ Series appear in their own sections
3. Verify no channels in movies section

### Verify Display
1. Open HomeScreen
2. Check "All" view:
   - ✅ "Movies" chip shows actual movies
   - ✅ "Series" chip shows actual series
   - ✅ "Live TV" chip shows all channels
3. Check individual tabs:
   - ✅ Movies tab shows only actual movies
   - ✅ Series tab shows only actual series
   - ✅ Live TV tab shows all channels

## Files Modified
- ✅ `src/utils/m3uStreamParser.js` - Modern parser
- ✅ `src/utils/m3uParser.js` - Legacy parser

## Key Takeaway
**Classification now prioritizes URL path structure** (most reliable indicator) and **explicit name patterns** (safe and clear), rather than **broad group title keywords** that could match any category containing those words.

This prevents false positives while maintaining accuracy for real movies and series.
