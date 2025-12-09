import { firestore } from '../config/firebase';
import { 
  collection, 
  doc, 
  writeBatch,
  query,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { updatePlaylistStats, setPlaylistParsingStatus, updateLastFetched } from './playlistService';
import { httpGetJSON } from '../utils/httpClient';

/**
 * Xtream Codes API Service
 * Handles authentication and data fetching from Xtream Codes servers
 */

/**
 * Main function to fetch and parse Xtream playlist
 * @param {string} playlistId - Firestore playlist document ID
 * @param {string} userId - User ID
 * @param {Object} xtreamConfig - Xtream configuration (serverUrl, username, password)
 * @returns {Promise<Object>} - Result with success status and stats
 */
export const fetchXtreamPlaylist = async (playlistId, userId, xtreamConfig) => {
  try {
    const { serverUrl, username, password } = xtreamConfig;
    console.log('Starting Xtream fetch for:', serverUrl);

    // Set parsing status to true
    await setPlaylistParsingStatus(playlistId, true, { step: 'Authenticating', progress: 0 });

    // Step 1: Authenticate and get server info
    const authData = await authenticate(serverUrl, username, password);
    
    if (!authData.success) {
      await setPlaylistParsingStatus(playlistId, false);
      throw new Error(authData.error || 'Authentication failed');
    }

    await setPlaylistParsingStatus(playlistId, true, { step: 'Fetching live streams', progress: 20 });

    // Step 2: Fetch live streams (channels)
    const liveStreams = await getLiveStreams(serverUrl, username, password);

    await setPlaylistParsingStatus(playlistId, true, { step: 'Fetching VOD', progress: 40 });

    // Step 3: Fetch VOD (movies)
    const vodStreams = await getVODStreams(serverUrl, username, password);

    await setPlaylistParsingStatus(playlistId, true, { step: 'Fetching series', progress: 60 });

    // Step 4: Fetch series
    const seriesStreams = await getSeriesStreams(serverUrl, username, password);

    console.log('Xtream data fetched:', {
      channels: liveStreams.length,
      movies: vodStreams.length,
      series: seriesStreams.length,
    });

    await setPlaylistParsingStatus(playlistId, true, { step: 'Cleaning up old content', progress: 70 });

    // Step 5: Clear old content FIRST before saving new content
    await clearXtreamContent(playlistId);

    await setPlaylistParsingStatus(playlistId, true, { step: 'Saving content', progress: 75 });

    // Step 6: Save to Firestore
    const stats = await saveXtreamToFirestore(playlistId, userId, {
      channels: liveStreams,
      movies: vodStreams,
      series: seriesStreams,
    });

    await setPlaylistParsingStatus(playlistId, true, { step: 'Updating stats', progress: 95 });

    // Step 7: Update playlist stats
    await updatePlaylistStats(playlistId, stats);

    // Step 8: Update last fetched timestamp
    await updateLastFetched(playlistId, 'xtream');

    // Set parsing status to false (completed)
    await setPlaylistParsingStatus(playlistId, false, { step: 'Completed', progress: 100 });

    console.log('Xtream parsing completed successfully');

    return {
      success: true,
      stats: stats,
    };
  } catch (error) {
    console.error('Error fetching Xtream playlist:', error);
    
    // Set parsing status to false on error
    await setPlaylistParsingStatus(playlistId, false, { step: 'Failed', progress: 0 });
    
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Authenticate with Xtream server
 * @param {string} serverUrl - Server URL
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} - Authentication result
 */
const authenticate = async (serverUrl, username, password) => {
  try {
    const url = `${serverUrl}/player_api.php?username=${username}&password=${password}`;
    
    const data = await httpGetJSON(url, { timeout: 15000, retries: 2 });
    
    if (data.user_info && data.user_info.auth === 1) {
      return {
        success: true,
        serverInfo: data.server_info,
        userInfo: data.user_info,
      };
    } else {
      return {
        success: false,
        error: 'Invalid credentials',
      };
    }
  } catch (error) {
    console.error('Authentication error:', error);
    
    let errorMessage = 'Authentication failed';
    if (error.message.includes('timed out')) {
      errorMessage = 'Connection timeout - Server took too long to respond';
    } else if (error.message.includes('Network request failed')) {
      errorMessage = 'Cannot connect to server - Check URL or try a different server';
    } else {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Get live streams (channels)
 * @param {string} serverUrl - Server URL
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Array>} - Array of live streams
 */
const getLiveStreams = async (serverUrl, username, password) => {
  try {
    const url = `${serverUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
    
    const data = await httpGetJSON(url, { timeout: 15000, retries: 2 });
    
    // Map Xtream data to our structure
    return data.map(stream => ({
      name: stream.name,
      streamUrl: `${serverUrl}/live/${username}/${password}/${stream.stream_id}.${stream.container_extension || 'ts'}`,
      logo: stream.stream_icon || '',
      category: stream.category_name || 'Uncategorized',
      tvgId: stream.epg_channel_id || '',
      tvgName: stream.name,
      streamId: stream.stream_id,
      streamType: stream.stream_type || 'live',
      epgChannelId: stream.epg_channel_id || null,
    }));
  } catch (error) {
    console.error('Error fetching live streams:', error);
    return [];
  }
};

/**
 * Get VOD streams (movies)
 * @param {string} serverUrl - Server URL
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Array>} - Array of VOD streams
 */
const getVODStreams = async (serverUrl, username, password) => {
  try {
    const url = `${serverUrl}/player_api.php?username=${username}&password=${password}&action=get_vod_streams`;
    
    const data = await httpGetJSON(url, { timeout: 15000, retries: 2 });
    
    // Map Xtream data to our structure
    return data.map(stream => ({
      title: stream.name,
      name: stream.name,
      streamUrl: `${serverUrl}/movie/${username}/${password}/${stream.stream_id}.${stream.container_extension || 'mp4'}`,
      poster: stream.stream_icon || stream.cover || '',
      logo: stream.stream_icon || stream.cover || '',
      category: stream.category_name || 'Uncategorized',
      streamId: stream.stream_id,
      rating: stream.rating || null,
      year: stream.releasedate ? new Date(stream.releasedate).getFullYear() : null,
      duration: stream.duration || null,
      description: stream.plot || '',
    }));
  } catch (error) {
    console.error('Error fetching VOD streams:', error);
    return [];
  }
};

/**
 * Get series streams
 * @param {string} serverUrl - Server URL
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Array>} - Array of series
 */
const getSeriesStreams = async (serverUrl, username, password) => {
  try {
    const url = `${serverUrl}/player_api.php?username=${username}&password=${password}&action=get_series`;
    
    const data = await httpGetJSON(url, { timeout: 15000, retries: 2 });
    
    // Map Xtream data to our structure
    return data.map(series => ({
      title: series.name,
      name: series.name,
      poster: series.cover || '',
      logo: series.cover || '',
      category: series.category_name || 'Uncategorized',
      seriesId: series.series_id,
      rating: series.rating || null,
      year: series.releaseDate ? new Date(series.releaseDate).getFullYear() : null,
      plot: series.plot || '',
      cast: series.cast || '',
      director: series.director || '',
      genre: series.genre || '',
      seasons: [], // Will be populated when user selects the series
      // Store Xtream credentials for later episode fetching
      xtreamServer: serverUrl,
      xtreamUsername: username,
      xtreamPassword: password,
    }));
  } catch (error) {
    console.error('Error fetching series:', error);
    return [];
  }
};

/**
 * Get series info with episodes (on-demand)
 * @param {string} serverUrl - Server URL
 * @param {string} username - Username
 * @param {string} password - Password
 * @param {string} seriesId - Series ID from Xtream
 * @returns {Promise<Object>} - Series info with episodes
 */
export const getSeriesInfo = async (serverUrl, username, password, seriesId) => {
  try {
    const url = `${serverUrl}/player_api.php?username=${username}&password=${password}&action=get_series_info&series_id=${seriesId}`;
    
    const data = await httpGetJSON(url, { timeout: 15000, retries: 2 });
    
    // Parse episodes from seasons
    const episodes = [];
    if (data.episodes) {
      Object.keys(data.episodes).forEach(seasonNum => {
        const seasonEpisodes = data.episodes[seasonNum];
        seasonEpisodes.forEach(ep => {
          episodes.push({
            id: `${seriesId}_S${seasonNum}_E${ep.episode_num}`, // Unique ID for tracking
            seasonNumber: parseInt(seasonNum),
            episodeNumber: parseInt(ep.episode_num),
            title: ep.title || `Episode ${ep.episode_num}`,
            name: ep.title || `Episode ${ep.episode_num}`,
            streamUrl: `${serverUrl}/series/${username}/${password}/${ep.id}.${ep.container_extension || 'mp4'}`,
            thumbnail: ep.info?.movie_image || data.info?.cover || '',
            duration: ep.info?.duration || null,
            description: ep.info?.plot || '',
            rating: ep.info?.rating || null,
            releaseDate: ep.info?.releasedate || null,
          });
        });
      });
    }
    
    return {
      success: true,
      totalSeasons: Object.keys(data.episodes || {}).length,
      episodes: episodes,
      info: data.info || {},
    };
  } catch (error) {
    console.error('Error fetching series info:', error);
    return {
      success: false,
      error: error.message,
      episodes: [],
    };
  }
};

/**
 * Clear existing Xtream content for a playlist
 * @param {string} playlistId - Playlist ID
 */
const clearXtreamContent = async (playlistId) => {
  try {
    console.log('Clearing existing Xtream content for playlist:', playlistId);

    const BATCH_SIZE = 500;

    // Clear channels
    await deleteBatch('channels', playlistId, BATCH_SIZE);

    // Clear movies
    await deleteBatch('movies', playlistId, BATCH_SIZE);

    // Clear series
    await deleteBatch('series', playlistId, BATCH_SIZE);

    console.log('Existing Xtream content cleared');
  } catch (error) {
    console.error('Error clearing Xtream content:', error);
    throw error;
  }
};

/**
 * Delete documents in batches
 * @param {string} collectionName - Collection name
 * @param {string} playlistId - Playlist ID
 * @param {number} batchSize - Batch size
 */
const deleteBatch = async (collectionName, playlistId, batchSize) => {
  const collectionRef = collection(firestore, collectionName);
  const q = query(collectionRef, where('playlistId', '==', playlistId));
  
  let deletedCount = 0;
  let hasMore = true;

  while (hasMore) {
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      if (deletedCount === 0) {
        console.log(`No items to delete from ${collectionName}`);
      }
      hasMore = false;
      break;
    }

    const batch = writeBatch(firestore);
    let batchCount = 0;

    snapshot.docs.forEach((docSnapshot) => {
      if (batchCount < batchSize) {
        batch.delete(docSnapshot.ref);
        batchCount++;
      }
    });

    await batch.commit();
    deletedCount += batchCount;
    console.log(`Deleted ${deletedCount} items from ${collectionName}`);

    if (batchCount < batchSize) {
      hasMore = false;
    }
  }

  if (deletedCount > 0) {
    console.log(`Total deleted from ${collectionName}: ${deletedCount}`);
  }
};

/**
 * Save Xtream data to Firestore
 * @param {string} playlistId - Playlist ID
 * @param {string} userId - User ID
 * @param {Object} xtreamData - Xtream channels, movies, series
 * @returns {Promise<Object>} - Stats
 */
const saveXtreamToFirestore = async (playlistId, userId, xtreamData) => {
  try {
    console.log('Saving Xtream data to Firestore...');

    const BATCH_SIZE = 500;

    // Save channels
    await saveBatch(
      'channels',
      xtreamData.channels,
      playlistId,
      userId,
      BATCH_SIZE
    );

    // Save movies
    await saveBatch(
      'movies',
      xtreamData.movies,
      playlistId,
      userId,
      BATCH_SIZE
    );

    // Save series
    await saveBatch(
      'series',
      xtreamData.series,
      playlistId,
      userId,
      BATCH_SIZE
    );

    const stats = {
      totalChannels: xtreamData.channels.length,
      totalMovies: xtreamData.movies.length,
      totalSeries: xtreamData.series.length,
      totalCategories: getUniqueCategories(xtreamData),
    };

    console.log('Xtream data saved to Firestore:', stats);

    return stats;
  } catch (error) {
    console.error('Error saving Xtream data to Firestore:', error);
    throw error;
  }
};

/**
 * Save items in batches to Firestore
 * @param {string} collectionName - Collection name
 * @param {Array} items - Items to save
 * @param {string} playlistId - Playlist ID
 * @param {string} userId - User ID
 * @param {number} batchSize - Batch size
 */
const saveBatch = async (collectionName, items, playlistId, userId, batchSize) => {
  const collectionRef = collection(firestore, collectionName);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = writeBatch(firestore);
    const batchItems = items.slice(i, i + batchSize);

    batchItems.forEach(item => {
      const docRef = doc(collectionRef);
      const data = {
        playlistId,
        userId,
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add collection-specific fields
      if (collectionName === 'channels') {
        data.isLive = true;
      }

      batch.set(docRef, data);
    });

    await batch.commit();
    console.log(`Saved batch ${i / batchSize + 1} for ${collectionName}`);
  }
};

/**
 * Get unique categories count
 * @param {Object} xtreamData - Xtream data
 * @returns {number} - Unique categories count
 */
const getUniqueCategories = (xtreamData) => {
  const categories = new Set();
  
  xtreamData.channels.forEach(item => {
    if (item.category) categories.add(item.category);
  });
  
  xtreamData.movies.forEach(item => {
    if (item.category) categories.add(item.category);
  });
  
  xtreamData.series.forEach(item => {
    if (item.category) categories.add(item.category);
  });
  
  return categories.size;
};

export default {
  fetchXtreamPlaylist,
  authenticate,
  getLiveStreams,
  getVODStreams,
  getSeriesStreams,
};
