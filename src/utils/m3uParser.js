import { firestore } from '../config/firebase';
import { 
  collection, 
  doc, 
  writeBatch,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { updatePlaylistStats, setPlaylistParsingStatus, updateLastFetched } from '../services/playlistService';
import { httpGet } from './httpClient';

/**
 * M3U Parser Utility
 * Parses M3U/M3U8 playlist files and extracts channels, movies, and series
 */

/**
 * Main function to parse M3U playlist
 * @param {string} playlistId - Firestore playlist document ID
 * @param {string} userId - User ID
 * @param {string} m3uUrl - URL to M3U file
 * @returns {Promise<Object>} - Result with success status and stats
 */
export const parseM3UPlaylist = async (playlistId, userId, m3uUrl) => {
  try {
    console.log('Starting M3U parsing for:', m3uUrl);

    // Set parsing status to true
    await setPlaylistParsingStatus(playlistId, true, { step: 'Fetching', progress: 0 });

    // Step 1: Fetch M3U file
    const m3uContent = await fetchM3UFile(m3uUrl);
    
    if (!m3uContent) {
      await setPlaylistParsingStatus(playlistId, false);
      throw new Error('Failed to fetch M3U file or file is empty');
    }

    await setPlaylistParsingStatus(playlistId, true, { step: 'Parsing', progress: 20 });

    // Step 2: Parse M3U content
    console.log('Parsing M3U content...');
    const parsedData = parseM3UContent(m3uContent);
    
    // Log parsed data summary
    const totalItems = parsedData.channels.length + parsedData.movies.length + parsedData.series.length;
    console.log('Parsed M3U data:', {
      channels: parsedData.channels.length,
      movies: parsedData.movies.length,
      series: parsedData.series.length,
      total: totalItems,
    });

    // Warn if playlist is very large
    if (totalItems > 10000) {
      console.warn(`⚠️ Large playlist detected: ${totalItems} items. This may take several minutes to save.`);
    }

    await setPlaylistParsingStatus(playlistId, true, { step: 'Cleaning up old content', progress: 40 });

    // Step 3: Clear old content FIRST before saving new content
    // This prevents us from deleting the content we just saved
    await clearPlaylistContent(playlistId);

    await setPlaylistParsingStatus(playlistId, true, { step: 'Saving content', progress: 50 });

    // Step 4: Save new content to Firestore
    const stats = await saveToFirestore(playlistId, userId, parsedData);

    await setPlaylistParsingStatus(playlistId, true, { step: 'Updating stats', progress: 90 });

    // Step 5: Update playlist stats
    console.log('Updating playlist stats:', { playlistId, stats });
    const statsResult = await updatePlaylistStats(playlistId, stats);
    console.log('Stats update result:', statsResult);

    // Step 6: Update last fetched timestamp
    await updateLastFetched(playlistId, 'm3u');
    
    // Note: Metadata enrichment happens on-demand when content is displayed
    // See MoviesScreen.js and SeriesScreen.js for batchEnrichContent usage

    // Set parsing status to false (completed)
    await setPlaylistParsingStatus(playlistId, false, { step: 'Completed', progress: 100 });

    console.log('M3U parsing completed successfully with stats:', stats);

    return {
      success: true,
      stats: stats,
    };
  } catch (error) {
    console.error('Error parsing M3U playlist:', error);
    
    // Set parsing status to false on error
    await setPlaylistParsingStatus(playlistId, false, { step: 'Failed', progress: 0 });
    
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Fetch M3U file from URL with retry logic
 * @param {string} url - M3U file URL
 * @param {number} retries - Number of retry attempts (default: 3)
 * @param {number} timeout - Request timeout in ms (default: 30000)
 * @returns {Promise<string>} - M3U file content
 */
const fetchM3UFile = async (url, retries = 3, timeout = 30000) => {
  const content = await httpGet(url, { timeout, retries });
  
  if (!content || content.trim().length === 0) {
    throw new Error('Received empty response from server');
  }
  
  console.log(`✅ Successfully fetched M3U file (${(content.length / 1024).toFixed(2)} KB)`);
  return content;
};

/**
 * Parse M3U content and extract channels, movies, and series
 * @param {string} content - M3U file content
 * @returns {Object} - Parsed channels, movies, and series
 */
const parseM3UContent = (content) => {
  console.log('Starting M3U content parsing...');
  console.log(`Content size: ${(content.length / 1024 / 1024).toFixed(2)} MB`);
  
  const channels = [];
  const movies = [];
  const series = [];
  const categories = new Set();

  let currentItem = null;
  let lineCount = 0;
  let itemCount = 0;

  try {
    // Split content into lines - use a more memory-efficient approach
    const lines = content.split('\n');
    console.log(`Total lines to parse: ${lines.length}`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      lineCount++;

      // Log progress every 1000 lines
      if (lineCount % 1000 === 0) {
        console.log(`Parsed ${lineCount} lines, found ${itemCount} items...`);
      }

      // Skip empty lines and comments (except #EXTINF)
      if (!line || (line.startsWith('#') && !line.startsWith('#EXTINF'))) {
        continue;
      }

      // Parse #EXTINF line
      if (line.startsWith('#EXTINF')) {
        try {
          currentItem = parseExtInfLine(line);
        } catch (error) {
          console.warn(`Error parsing EXTINF at line ${lineCount}:`, error.message);
          currentItem = null;
        }
      } 
      // Parse stream URL
      else if (currentItem && (line.startsWith('http://') || line.startsWith('https://'))) {
        try {
          currentItem.streamUrl = line;

          // Categorize content
          const contentType = detectContentType(currentItem);
          
          if (contentType === 'movie') {
            movies.push(currentItem);
          } else if (contentType === 'series') {
            // Try to extract episode info
            const episodeInfo = extractEpisodeInfo(currentItem.name);
            if (episodeInfo) {
              currentItem.episodeInfo = episodeInfo;
            }
            series.push(currentItem);
          } else {
            channels.push(currentItem);
          }

          // Track categories
          if (currentItem.category) {
            categories.add(currentItem.category);
          }

          itemCount++;
          currentItem = null;
        } catch (error) {
          console.warn(`Error processing item at line ${lineCount}:`, error.message);
          currentItem = null;
        }
      }
    }

    console.log('✅ M3U parsing completed successfully');
    console.log(`Total items parsed: ${itemCount}`);
    console.log(`Channels: ${channels.length}, Movies: ${movies.length}, Series: ${series.length}`);

    return {
      channels,
      movies,
      series,
      categories: Array.from(categories),
    };
  } catch (error) {
    console.error('❌ Fatal error during M3U parsing:', error);
    throw new Error(`Failed to parse M3U content: ${error.message}`);
  }
};

/**
 * Parse #EXTINF line to extract metadata
 * @param {string} line - #EXTINF line
 * @returns {Object} - Parsed metadata
 */
const parseExtInfLine = (line) => {
  const item = {
    name: '',
    logo: '',
    category: '',
    tvgId: '',
    tvgName: '',
    language: '',
    country: '',
    streamUrl: '',
  };

  try {
    // Extract attributes using regex with error handling
    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
    const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
    const groupTitleMatch = line.match(/group-title="([^"]*)"/);
    const tvgLanguageMatch = line.match(/tvg-language="([^"]*)"/);
    const tvgCountryMatch = line.match(/tvg-country="([^"]*)"/);

    if (tvgIdMatch) item.tvgId = tvgIdMatch[1];
    if (tvgNameMatch) item.tvgName = tvgNameMatch[1];
    if (tvgLogoMatch) item.logo = tvgLogoMatch[1];
    if (groupTitleMatch) item.category = groupTitleMatch[1];
    if (tvgLanguageMatch) item.language = tvgLanguageMatch[1];
    if (tvgCountryMatch) item.country = tvgCountryMatch[1];

    // Extract name (after the last comma)
    const nameMatch = line.match(/,(.+)$/);
    if (nameMatch) {
      item.name = nameMatch[1].trim();
    } else {
      // Fallback: use tvg-name or a default
      item.name = item.tvgName || 'Unnamed Channel';
    }
  } catch (error) {
    console.warn('Error parsing EXTINF line:', error.message);
    item.name = 'Unknown';
  }

  return item;
};

/**
 * Detect content type (channel, movie, or series)
 * @param {Object} item - Parsed item
 * @returns {string} - Content type
 */
const detectContentType = (item) => {
  const name = item.name.toLowerCase();
  const category = item.category.toLowerCase();
  const url = item.streamUrl.toLowerCase();

  // Check for movie indicators
  const movieKeywords = ['movie', 'film', 'cinema', 'vod', 'peliculas', 'filmes'];
  const isMovie = movieKeywords.some(keyword => 
    category.includes(keyword) || name.includes(keyword) || url.includes('/movie/')
  );

  if (isMovie) {
    return 'movie';
  }

  // Check for series/episode indicators (S01E01, 1x01, etc.)
  const episodePattern = /s\d+e\d+|season\s*\d+|episode\s*\d+|\d+x\d+/i;
  const hasEpisodeInfo = episodePattern.test(name) || episodePattern.test(url);
  
  // Check for series keywords
  const seriesKeywords = ['series', 'show', 'tv show', 'serie'];
  const hasSeriesKeyword = seriesKeywords.some(keyword => 
    category.includes(keyword) || url.includes('/series/')
  );

  if (hasEpisodeInfo || hasSeriesKeyword) {
    return 'series';
  }

  // Default to channel (live TV)
  return 'channel';
};

/**
 * Extract episode info from name (S01E01, 1x01, etc.)
 * @param {string} name - Item name
 * @returns {Object|null} - Episode info or null
 */
const extractEpisodeInfo = (name) => {
  // Pattern: S01E01 or s01e01
  let match = name.match(/s(\d+)e(\d+)/i);
  if (match) {
    return {
      seasonNumber: parseInt(match[1]),
      episodeNumber: parseInt(match[2]),
      seriesName: name.replace(/s\d+e\d+/i, '').trim(),
    };
  }

  // Pattern: 1x01
  match = name.match(/(\d+)x(\d+)/);
  if (match) {
    return {
      seasonNumber: parseInt(match[1]),
      episodeNumber: parseInt(match[2]),
      seriesName: name.replace(/\d+x\d+/, '').trim(),
    };
  }

  // Pattern: Season 1 Episode 1
  match = name.match(/season\s*(\d+)\s*episode\s*(\d+)/i);
  if (match) {
    return {
      seasonNumber: parseInt(match[1]),
      episodeNumber: parseInt(match[2]),
      seriesName: name.replace(/season\s*\d+\s*episode\s*\d+/i, '').trim(),
    };
  }

  return null;
};

/**
 * Clear existing content for a playlist using batch deletes
 * @param {string} playlistId - Playlist ID
 */
const clearPlaylistContent = async (playlistId) => {
  try {
    console.log('Clearing existing content for playlist:', playlistId);

    // Delete in batches (Firestore batch limit is 500)
    const BATCH_SIZE = 500;

    // Clear channels
    await deleteBatch('channels', playlistId, BATCH_SIZE);

    // Clear movies
    await deleteBatch('movies', playlistId, BATCH_SIZE);

    // Clear series
    await deleteBatch('series', playlistId, BATCH_SIZE);

    console.log('Existing content cleared');
  } catch (error) {
    console.error('Error clearing playlist content:', error);
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

    // If we deleted less than batchSize, we're done
    if (batchCount < batchSize) {
      hasMore = false;
    }
  }

  if (deletedCount > 0) {
    console.log(`Total deleted from ${collectionName}: ${deletedCount}`);
  }
};

/**
 * Save parsed data to Firestore
 * @param {string} playlistId - Playlist ID
 * @param {string} userId - User ID
 * @param {Object} parsedData - Parsed channels, movies, series
 * @returns {Promise<Object>} - Stats
 */
const saveToFirestore = async (playlistId, userId, parsedData) => {
  try {
    console.log('Saving to Firestore...');

    // Save in batches (Firestore batch limit is 500)
    const BATCH_SIZE = 500;

    // Save channels
    await saveBatch(
      'channels',
      parsedData.channels,
      playlistId,
      userId,
      BATCH_SIZE
    );

    // Save movies
    await saveBatch(
      'movies',
      parsedData.movies,
      playlistId,
      userId,
      BATCH_SIZE
    );

    // Save series
    await saveBatch(
      'series',
      parsedData.series,
      playlistId,
      userId,
      BATCH_SIZE
    );

    const stats = {
      totalChannels: parsedData.channels.length,
      totalMovies: parsedData.movies.length,
      totalSeries: parsedData.series.length,
      totalCategories: parsedData.categories.length,
    };

    console.log('Data saved to Firestore:', stats);

    return stats;
  } catch (error) {
    console.error('Error saving to Firestore:', error);
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
        data.epgChannelId = item.tvgId || null;
        data.isLive = true;
      } else if (collectionName === 'movies') {
        data.title = item.name;
        data.poster = item.logo;
        data.year = null;
        data.rating = null;
        data.duration = null;
        data.description = '';
      } else if (collectionName === 'series') {
        data.title = item.name;
        data.poster = item.logo;
        data.seasons = [];
        // Store episode info if available
        if (item.episodeInfo) {
          data.episodeInfo = item.episodeInfo;
        }
      }

      batch.set(docRef, data);
    });

    await batch.commit();
    console.log(`Saved batch ${i / batchSize + 1} for ${collectionName}`);
  }
};

export default {
  parseM3UPlaylist,
  fetchM3UFile,
  parseM3UContent,
};
