# Content Services Migration Guide

## Summary

All three content services (channel, movie, series) need to be updated to read from the **unified itemStorageService** instead of contentStorageService.

This ensures they read from the same storage destination where the parser saves data.

---

## File 1: `src/services/channelService.js`

### Change 1: Add import

**Location: Line 1**

```javascript
// ADD THIS LINE AT THE TOP:
import { itemStorageService } from './itemStorageService';
```

### Change 2: Update getChannelsByPlaylist function

**Location: Around line 25-30**

**BEFORE:**
```javascript
export const getChannelsByPlaylist = async (playlistId, categoryName = null) => {
  try {
    const channels = await contentStorageService.getChannels(playlistId);
    
    let filtered = channels;
    if (categoryName) {
      filtered = channels.filter(ch => ch.categoryName === categoryName);
    }

    console.log(`[channelService] Playlist ${playlistId}: Found ${filtered.length} channels`);
    return { success: true, data: filtered };
  } catch (error) {
    console.error('[channelService] Error getting channels:', error);
    return { success: false, error: error.message };
  }
};
```

**AFTER:**
```javascript
export const getChannelsByPlaylist = async (playlistId, categoryName = null) => {
  try {
    // Read from unified storage (same place parser saves)
    const channels = await itemStorageService.getItemsByType(playlistId, 'channel');
    
    let filtered = channels;
    if (categoryName) {
      // Note: itemStorageService uses 'groupTitle', not 'categoryName'
      filtered = channels.filter(ch => ch.groupTitle === categoryName);
    }

    console.log(`[channelService] Playlist ${playlistId}: Found ${filtered.length} channels`);
    return { success: true, data: filtered };
  } catch (error) {
    console.error('[channelService] Error getting channels:', error);
    return { success: false, error: error.message };
  }
};
```

### Change 3: Update getUserChannels function

**Location: Around line 40-55**

**BEFORE:**
```javascript
export const getUserChannels = async (userId) => {
  try {
    // Get user's playlists from Firebase (metadata only)
    const playlistsRef = collection(firestore, 'playlists');
    const playlistsQ = query(playlistsRef, where('userId', '==', userId));
    const playlistsSnapshot = await getDocs(playlistsQ);

    const channels = [];
    
    // For each playlist, get channels from AsyncStorage
    for (const playlistDoc of playlistsSnapshot.docs) {
      const playlistId = playlistDoc.id;
      const playlistChannels = await contentStorageService.getChannels(playlistId);
      
      console.log(`[channelService] Playlist ${playlistId}: Found ${playlistChannels.length} channels`);
      
      playlistChannels.forEach(channel => {
        channels.push({ 
          ...channel,
          playlistId,
        });
      });
    }

    console.log(`[channelService] Total channels across all playlists: ${channels.length}`);

    return { success: true, data: channels };
  } catch (error) {
    console.error('[channelService] Error getting user channels:', error);
    return { success: false, error: error.message };
  }
};
```

**AFTER:**
```javascript
export const getUserChannels = async (userId) => {
  try {
    // Get user's playlists from Firebase (metadata only)
    const playlistsRef = collection(firestore, 'playlists');
    const playlistsQ = query(playlistsRef, where('userId', '==', userId));
    const playlistsSnapshot = await getDocs(playlistsQ);

    const channels = [];
    
    // For each playlist, get channels from unified storage
    for (const playlistDoc of playlistsSnapshot.docs) {
      const playlistId = playlistDoc.id;
      const playlistChannels = await itemStorageService.getItemsByType(playlistId, 'channel');
      
      console.log(`[channelService] Playlist ${playlistId}: Found ${playlistChannels.length} channels`);
      
      playlistChannels.forEach(channel => {
        channels.push({ 
          ...channel,
          playlistId,
        });
      });
    }

    console.log(`[channelService] Total channels across all playlists: ${channels.length}`);

    return { success: true, data: channels };
  } catch (error) {
    console.error('[channelService] Error getting user channels:', error);
    return { success: false, error: error.message };
  }
};
```

---

## File 2: `src/services/movieService.js`

### Change 1: Add import

**Location: Line 1**

```javascript
// ADD THIS LINE AT THE TOP:
import { itemStorageService } from './itemStorageService';
```

### Change 2: Update getMoviesByPlaylist function

**Location: Around line 50-65**

**BEFORE:**
```javascript
export const getMoviesByPlaylist = async (playlistId, limitCount = 20) => {
  try {
    const movies = await contentStorageService.getMovies(playlistId);
    
    // Apply limit if specified
    const limited = limitCount ? movies.slice(0, limitCount) : movies;
    console.log(`[movieService] Playlist ${playlistId}: Found ${limited.length} movies`);
    
    return { success: true, data: limited };
  } catch (error) {
    asyncLog.error('movieService: Get by playlist error', { error: error.message, playlistId });
    return { success: false, error: error.message };
  }
};
```

**AFTER:**
```javascript
export const getMoviesByPlaylist = async (playlistId, limitCount = 20) => {
  try {
    // Read from unified storage (same place parser saves)
    const movies = await itemStorageService.getItemsByType(playlistId, 'movie');
    
    // Apply limit if specified
    const limited = limitCount ? movies.slice(0, limitCount) : movies;
    console.log(`[movieService] Playlist ${playlistId}: Found ${limited.length} movies`);
    
    return { success: true, data: limited };
  } catch (error) {
    asyncLog.error('movieService: Get by playlist error', { error: error.message, playlistId });
    return { success: false, error: error.message };
  }
};
```

### Change 3: Update getUserMovies function

**Location: Around line 75-95**

**BEFORE:**
```javascript
export const getUserMovies = async (userId) => {
  try {
    // Query all playlists for this user from Firebase (metadata only)
    const playlistsRef = collection(firestore, 'playlists');
    const playlistsQ = query(playlistsRef, where('userId', '==', userId));
    const playlistsSnapshot = await getDocs(playlistsQ);

    const movies = [];
    
    // For each playlist, get movies from AsyncStorage
    for (const playlistDoc of playlistsSnapshot.docs) {
      const playlistId = playlistDoc.id;
      const playlistMovies = await contentStorageService.getMovies(playlistId);
      
      console.log(`[movieService] Playlist ${playlistId}: Found ${playlistMovies.length} movies`);
      
      playlistMovies.forEach(movie => {
        movies.push({ 
          ...movie,
          playlistId,
        });
      });
    }

    console.log(`[movieService] Total movies across all playlists: ${movies.length}`);

    return { success: true, data: movies };
  } catch (error) {
    asyncLog.error('movieService: Get user movies error', { error: error.message, userId });
    return { success: false, error: error.message };
  }
};
```

**AFTER:**
```javascript
export const getUserMovies = async (userId) => {
  try {
    // Query all playlists for this user from Firebase (metadata only)
    const playlistsRef = collection(firestore, 'playlists');
    const playlistsQ = query(playlistsRef, where('userId', '==', userId));
    const playlistsSnapshot = await getDocs(playlistsQ);

    const movies = [];
    
    // For each playlist, get movies from unified storage
    for (const playlistDoc of playlistsSnapshot.docs) {
      const playlistId = playlistDoc.id;
      const playlistMovies = await itemStorageService.getItemsByType(playlistId, 'movie');
      
      console.log(`[movieService] Playlist ${playlistId}: Found ${playlistMovies.length} movies`);
      
      playlistMovies.forEach(movie => {
        movies.push({ 
          ...movie,
          playlistId,
        });
      });
    }

    console.log(`[movieService] Total movies across all playlists: ${movies.length}`);

    return { success: true, data: movies };
  } catch (error) {
    asyncLog.error('movieService: Get user movies error', { error: error.message, userId });
    return { success: false, error: error.message };
  }
};
```

---

## File 3: `src/services/seriesService.js`

### Change 1: Add import

**Location: Line 1**

```javascript
// ADD THIS LINE AT THE TOP:
import { itemStorageService } from './itemStorageService';
```

### Change 2: Update getSeriesByPlaylist function

**Location: Around line 50-65 (find this function)**

**BEFORE:**
```javascript
export const getSeriesByPlaylist = async (playlistId, limitCount = 20) => {
  try {
    const series = await contentStorageService.getSeries(playlistId);
    
    // Apply limit if specified
    const limited = limitCount ? series.slice(0, limitCount) : series;
    console.log(`[seriesService] Playlist ${playlistId}: Found ${limited.length} series`);
    
    return { success: true, data: limited };
  } catch (error) {
    asyncLog.error('seriesService: Get by playlist error', { error: error.message, playlistId });
    return { success: false, error: error.message };
  }
};
```

**AFTER:**
```javascript
export const getSeriesByPlaylist = async (playlistId, limitCount = 20) => {
  try {
    // Read from unified storage (same place parser saves)
    const series = await itemStorageService.getItemsByType(playlistId, 'series');
    
    // Apply limit if specified
    const limited = limitCount ? series.slice(0, limitCount) : series;
    console.log(`[seriesService] Playlist ${playlistId}: Found ${limited.length} series`);
    
    return { success: true, data: limited };
  } catch (error) {
    asyncLog.error('seriesService: Get by playlist error', { error: error.message, playlistId });
    return { success: false, error: error.message };
  }
};
```

### Change 3: Update getUserSeries function

**Location: Around line 75-95**

**BEFORE:**
```javascript
export const getUserSeries = async (userId) => {
  try {
    // Query all playlists for this user from Firebase (metadata only)
    const playlistsRef = collection(firestore, 'playlists');
    const playlistsQ = query(playlistsRef, where('userId', '==', userId));
    const playlistsSnapshot = await getDocs(playlistsQ);

    const series = [];
    
    // For each playlist, get series from AsyncStorage
    for (const playlistDoc of playlistsSnapshot.docs) {
      const playlistId = playlistDoc.id;
      const playlistSeries = await contentStorageService.getSeries(playlistId);
      
      console.log(`[seriesService] Playlist ${playlistId}: Found ${playlistSeries.length} series`);
      
      playlistSeries.forEach(show => {
        series.push({ 
          ...show,
          playlistId,
        });
      });
    }

    console.log(`[seriesService] Total series across all playlists: ${series.length}`);

    return { success: true, data: series };
  } catch (error) {
    asyncLog.error('seriesService: Get user series error', { error: error.message, userId });
    return { success: false, error: error.message };
  }
};
```

**AFTER:**
```javascript
export const getUserSeries = async (userId) => {
  try {
    // Query all playlists for this user from Firebase (metadata only)
    const playlistsRef = collection(firestore, 'playlists');
    const playlistsQ = query(playlistsRef, where('userId', '==', userId));
    const playlistsSnapshot = await getDocs(playlistsQ);

    const series = [];
    
    // For each playlist, get series from unified storage
    for (const playlistDoc of playlistsSnapshot.docs) {
      const playlistId = playlistDoc.id;
      const playlistSeries = await itemStorageService.getItemsByType(playlistId, 'series');
      
      console.log(`[seriesService] Playlist ${playlistId}: Found ${playlistSeries.length} series`);
      
      playlistSeries.forEach(show => {
        series.push({ 
          ...show,
          playlistId,
        });
      });
    }

    console.log(`[seriesService] Total series across all playlists: ${series.length}`);

    return { success: true, data: series };
  } catch (error) {
    asyncLog.error('seriesService: Get user series error', { error: error.message, userId });
    return { success: false, error: error.message };
  }
};
```

---

## Key Changes Summary

| Service | Change | From | To |
|---------|--------|------|-----|
| channelService | Import | contentStorageService | itemStorageService |
| channelService | getChannelsByPlaylist | getChannels() | getItemsByType(..., 'channel') |
| channelService | getUserChannels | getChannels() | getItemsByType(..., 'channel') |
| movieService | Import | contentStorageService | itemStorageService |
| movieService | getMoviesByPlaylist | getMovies() | getItemsByType(..., 'movie') |
| movieService | getUserMovies | getMovies() | getItemsByType(..., 'movie') |
| seriesService | Import | contentStorageService | itemStorageService |
| seriesService | getSeriesByPlaylist | getSeries() | getItemsByType(..., 'series') |
| seriesService | getUserSeries | getSeries() | getItemsByType(..., 'series') |

---

## Important Notes

1. **Field Name Change:** 
   - contentStorageService uses `categoryName`
   - itemStorageService uses `groupTitle`
   - Updated in channelService filter logic

2. **Data Structure Remains Same:**
   - All items still have: name, streamUrl, tvgId, tvgName, tvgLogo, groupTitle, contentType
   - No change to Home screen or other UI components

3. **Error Handling:**
   - Same error handling maintained
   - Same async patterns
   - Same logging for debugging

4. **Backward Compatibility:**
   - These changes only affect data retrieval
   - No breaking changes to external APIs
   - Home screen will work identically

---

## Testing After Changes

1. **Add M3U playlist**
   - Should parse (no more "Skipping parsing")
   - Should show channels on Home screen
   - Should persist after reload

2. **Add Xtream playlist**
   - Should fetch channels/movies/series
   - Should show on Home screen
   - Should persist after reload

3. **Check DevTools (Web)**
   - IndexedDB → onvitv_db → playlist_items
   - Should see your parsed content stored there

4. **Verify console logs**
   - Should see: `[itemStorageService] Saved X items`
   - Should NOT see: `[contentStorageService]` errors
