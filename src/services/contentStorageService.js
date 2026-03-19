import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Content Storage Service
 * Handles storing and retrieving playlist content from AsyncStorage instead of Firebase
 * Content is stored locally with playlist ID as the key
 */

const STORAGE_KEYS = {
  CHANNELS: 'content_channels_',
  MOVIES: 'content_movies_',
  SERIES: 'content_series_',
  CONTENT_INDEX: 'content_index', // Maps playlist IDs to their content
};

/**
 * Save channels for a playlist
 */
export const saveChannels = async (playlistId, channels) => {
  try {
    const key = STORAGE_KEYS.CHANNELS + playlistId;
    const saveTime = new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3});
    await AsyncStorage.setItem(key, JSON.stringify(channels));
    console.log(`[${saveTime}] [contentStorageService] 💾 Saved ${channels.length} channels for ${playlistId}`);
  } catch (error) {
    console.error('[contentStorageService] Error saving channels:', error);
    throw error;
  }
};

/**
 * Get channels for a playlist
 */
export const getChannels = async (playlistId) => {
  try {
    const key = STORAGE_KEYS.CHANNELS + playlistId;
    const loadTime = new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3});
    const data = await AsyncStorage.getItem(key);
    if (data) {
      const channels = JSON.parse(data);
      console.log(`[${loadTime}] [contentStorageService] 📖 Loaded ${channels.length} channels for ${playlistId}`);
      return channels;
    }
    return [];
  } catch (error) {
    console.error('[contentStorageService] Error loading channels:', error);
    return [];
  }
};

/**
 * Save movies for a playlist
 */
export const saveMovies = async (playlistId, movies) => {
  try {
    const key = STORAGE_KEYS.MOVIES + playlistId;
    const saveTime = new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3});
    await AsyncStorage.setItem(key, JSON.stringify(movies));
    console.log(`[${saveTime}] [contentStorageService] 💾 Saved ${movies.length} movies for ${playlistId}`);
  } catch (error) {
    console.error('[contentStorageService] Error saving movies:', error);
    throw error;
  }
};

/**
 * Get movies for a playlist
 */
export const getMovies = async (playlistId) => {
  try {
    const key = STORAGE_KEYS.MOVIES + playlistId;
    const loadTime = new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3});
    const data = await AsyncStorage.getItem(key);
    if (data) {
      const movies = JSON.parse(data);
      console.log(`[contentStorageService] Loaded ${movies.length} movies for ${playlistId}`);
      return movies;
    }
    return [];
  } catch (error) {
    console.error('[contentStorageService] Error loading movies:', error);
    return [];
  }
};

/**
 * Save series for a playlist
 */
export const saveSeries = async (playlistId, series) => {
  try {
    const key = STORAGE_KEYS.SERIES + playlistId;
    await AsyncStorage.setItem(key, JSON.stringify(series));
    console.log(`[contentStorageService] Saved ${series.length} series for ${playlistId}`);
  } catch (error) {
    console.error('[contentStorageService] Error saving series:', error);
    throw error;
  }
};

/**
 * Get series for a playlist
 */
export const getSeries = async (playlistId) => {
  try {
    const key = STORAGE_KEYS.SERIES + playlistId;
    const data = await AsyncStorage.getItem(key);
    if (data) {
      const series = JSON.parse(data);
      console.log(`[contentStorageService] Loaded ${series.length} series for ${playlistId}`);
      return series;
    }
    return [];
  } catch (error) {
    console.error('[contentStorageService] Error loading series:', error);
    return [];
  }
};

/**
 * Clear content for a specific playlist
 */
export const clearPlaylistContent = async (playlistId) => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.CHANNELS + playlistId,
      STORAGE_KEYS.MOVIES + playlistId,
      STORAGE_KEYS.SERIES + playlistId,
    ]);
    console.log(`[contentStorageService] Cleared content for ${playlistId}`);
  } catch (error) {
    console.error('[contentStorageService] Error clearing playlist content:', error);
  }
};

/**
 * Get all playlists with content in AsyncStorage
 */
export const getAllPlaylistsWithContent = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const playlistIds = new Set();
    
    keys.forEach(key => {
      if (key.startsWith('content_channels_') || 
          key.startsWith('content_movies_') || 
          key.startsWith('content_series_')) {
        const parts = key.split('_');
        const playlistId = parts.slice(2).join('_');
        playlistIds.add(playlistId);
      }
    });
    
    console.log(`[contentStorageService] Found ${playlistIds.size} playlists with content`);
    return Array.from(playlistIds);
  } catch (error) {
    console.error('[contentStorageService] Error getting playlists with content:', error);
    return [];
  }
};

/**
 * Get total content stats across all playlists
 */
export const getContentStats = async (playlistIds) => {
  try {
    let totalChannels = 0;
    let totalMovies = 0;
    let totalSeries = 0;
    
    for (const playlistId of playlistIds) {
      const channels = await getChannels(playlistId);
      const movies = await getMovies(playlistId);
      const series = await getSeries(playlistId);
      
      totalChannels += channels.length;
      totalMovies += movies.length;
      totalSeries += series.length;
    }
    
    return {
      channels: totalChannels,
      movies: totalMovies,
      series: totalSeries,
      total: totalChannels + totalMovies + totalSeries,
    };
  } catch (error) {
    console.error('[contentStorageService] Error getting stats:', error);
    return { channels: 0, movies: 0, series: 0, total: 0 };
  }
};

export default {
  saveChannels,
  getChannels,
  saveMovies,
  getMovies,
  saveSeries,
  getSeries,
  clearPlaylistContent,
  getAllPlaylistsWithContent,
  getContentStats,
};
