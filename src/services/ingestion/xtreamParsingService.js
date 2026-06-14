/**
 * Xtream Parsing Service
 * Parses Xtream Code API playlists for live channels, VOD, and series
 * Pure JavaScript - works on web, iOS, Android
 */

import * as itemStorageService from '../itemStorageService';
import ProgressTracker from './progressTracker';

const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const API_TIMEOUT_MS = 30000;

/**
 * Simple hash function for generating unique IDs
 */
const generateSimpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
};

/**
 * Generate unique content ID from playlist ID and stream identifier
 */
const generateContentId = (playlistId, identifier) => {
  const combined = `${playlistId}:${identifier}`;
  return generateSimpleHash(combined);
};

/**
 * Test Xtream API connection and validate credentials
 */
const testXtreamConnection = async (apiUrl, username, password, retries = MAX_RETRIES) => {
  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`[PARSING_XTREAM] Testing connection (attempt ${attempt + 1}/${retries}): ${apiUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      // Normalize API URL
      const normalizedUrl = apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;
      const testUrl = `${normalizedUrl}player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_categories`;

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log(`[PARSING_XTREAM] ✓ Connection successful`);

      return { success: true, data };
    } catch (error) {
      lastError = error;
      const backoffMs = Math.pow(2, attempt) * RETRY_DELAY_MS;

      console.warn(
        `[PARSING_XTREAM] ✗ Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${backoffMs}ms...`
      );

      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw new Error(`Failed to connect to Xtream API after ${retries} attempts: ${lastError.message}`);
};

/**
 * Fetch data from Xtream API with retry logic
 */
const fetchXtreamData = async (apiUrl, username, password, action, retries = MAX_RETRIES) => {
  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const normalizedUrl = apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;
      const requestUrl = `${normalizedUrl}player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=${action}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return data;
    } catch (error) {
      lastError = error;
      const backoffMs = Math.pow(2, attempt) * RETRY_DELAY_MS;

      console.warn(
        `[PARSING_XTREAM] ✗ Fetch ${action} (attempt ${attempt + 1}/${retries}) failed: ${error.message}. Retrying in ${backoffMs}ms...`
      );

      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw new Error(`Failed to fetch ${action} after ${retries} attempts: ${lastError.message}`);
};

/**
 * Parse live stream data from Xtream API
 */
const parseXtreamLiveStreams = (data, playlistId, playlistName) => {
  const items = [];
  const warnings = [];
  const errors = [];

  if (!Array.isArray(data)) {
    errors.push('Expected array of live streams');
    return { items, warnings, errors };
  }

  data.forEach((stream, index) => {
    try {
      if (!stream.name || !stream.stream_id) {
        warnings.push(`Stream ${index} missing name or stream_id`);
        return;
      }

      const contentId = generateContentId(playlistId, `live:${stream.stream_id}`);

      items.push({
        id: contentId,
        playlistId,
        name: stream.name.trim(),
        url: `${stream.stream_id}`, // Will be resolved to full URL by app
        type: 'channel',
        tvgId: stream.stream_id,
        tvgName: stream.name,
        logo: stream.stream_icon || null,
        groupTitle: stream.category_name || 'Live',
        epgChannelId: stream.epg_channel_id || null,
        streamType: 'live',
        addedAt: Date.now(),
      });
    } catch (error) {
      errors.push(`Parse error at stream ${index}: ${error.message}`);
    }
  });

  return { items, warnings, errors };
};

/**
 * Parse VOD (movie) data from Xtream API
 */
const parseXtreamVOD = (data, playlistId, playlistName) => {
  const items = [];
  const warnings = [];
  const errors = [];

  if (!Array.isArray(data)) {
    errors.push('Expected array of VOD');
    return { items, warnings, errors };
  }

  data.forEach((vod, index) => {
    try {
      if (!vod.name || !vod.stream_id) {
        warnings.push(`VOD ${index} missing name or stream_id`);
        return;
      }

      const contentId = generateContentId(playlistId, `vod:${vod.stream_id}`);

      items.push({
        id: contentId,
        playlistId,
        name: vod.name.trim(),
        url: `${vod.stream_id}`, // Will be resolved to full URL by app
        type: 'movie',
        tvgId: vod.stream_id,
        tvgName: vod.name,
        logo: vod.stream_icon || null,
        groupTitle: vod.category_name || 'Movies',
        vodReleaseDate: vod.release_date || null,
        vodDescription: vod.description || null,
        streamType: 'vod',
        addedAt: Date.now(),
      });
    } catch (error) {
      errors.push(`Parse error at VOD ${index}: ${error.message}`);
    }
  });

  return { items, warnings, errors };
};

/**
 * Parse Series data from Xtream API
 */
const parseXtreamSeries = (data, playlistId, playlistName) => {
  const items = [];
  const warnings = [];
  const errors = [];

  if (!Array.isArray(data)) {
    errors.push('Expected array of series');
    return { items, warnings, errors };
  }

  data.forEach((series, index) => {
    try {
      if (!series.name || !series.series_id) {
        warnings.push(`Series ${index} missing name or series_id`);
        return;
      }

      const contentId = generateContentId(playlistId, `series:${series.series_id}`);

      items.push({
        id: contentId,
        playlistId,
        name: series.name.trim(),
        url: `${series.series_id}`, // Will be resolved to full URL by app
        type: 'series',
        tvgId: series.series_id,
        tvgName: series.name,
        logo: series.series_icon || null,
        groupTitle: series.category_name || 'Series',
        seriesReleaseDate: series.release_date || null,
        seriesDescription: series.plot || null,
        seriesSeasons: series.seasons || 0,
        streamType: 'series',
        addedAt: Date.now(),
      });
    } catch (error) {
      errors.push(`Parse error at series ${index}: ${error.message}`);
    }
  });

  return { items, warnings, errors };
};

/**
 * Main Xtream parsing function
 */
export const parseXtream = async (
  playlistId,
  playlistName,
  apiUrl,
  username,
  password,
  options = {}
) => {
  const {
    onProgress = null, // Callback for progress updates
    retries = MAX_RETRIES,
    batchSize = BATCH_SIZE,
    includeTypes = ['live', 'vod', 'series'], // Which content types to fetch
  } = options;

  console.log(
    `[PARSING_XTREAM] Starting parse for playlist: ${playlistName} (${includeTypes.join(', ')})`
  );

  // Initialize progress tracker
  const tracker = new ProgressTracker(playlistId, playlistName, 'xtream');

  try {
    // Start tracking
    tracker.start();

    // Test API connection first
    console.log(`[PARSING_XTREAM] Testing Xtream API connection...`);
    try {
      await testXtreamConnection(apiUrl, username, password, retries);
    } catch (error) {
      tracker.error(error.message);
      return {
        success: false,
        error: error.message,
        itemsProcessed: 0,
        itemsSaved: 0,
        itemsFailed: 0,
        duration: Date.now() - tracker.startTime,
      };
    }

    // Collect all items from requested types
    const allItems = [];
    const allWarnings = [];
    const allErrors = [];
    const categories = new Set();
    const contentTypeCounts = {
      channel: 0,
      movie: 0,
      series: 0,
    };

    // Fetch live channels
    if (includeTypes.includes('live')) {
      try {
        console.log(`[PARSING_XTREAM] Fetching live channels...`);
        const liveData = await fetchXtreamData(apiUrl, username, password, 'get_live_streams', retries);
        const { items, warnings, errors } = parseXtreamLiveStreams(liveData, playlistId, playlistName);

        allItems.push(...items);
        allWarnings.push(...warnings);
        allErrors.push(...errors);

        items.forEach((item) => {
          categories.add(item.groupTitle);
          contentTypeCounts.channel++;
        });

        console.log(`[PARSING_XTREAM] ✓ Fetched ${items.length} live channels`);
      } catch (error) {
        const msg = `Failed to fetch live channels: ${error.message}`;
        console.warn(`[PARSING_XTREAM] ⚠ ${msg}`);
        allWarnings.push(msg);
      }
    }

    // Fetch VOD (movies)
    if (includeTypes.includes('vod')) {
      try {
        console.log(`[PARSING_XTREAM] Fetching VOD (movies)...`);
        const vodData = await fetchXtreamData(apiUrl, username, password, 'get_vod_streams', retries);
        const { items, warnings, errors } = parseXtreamVOD(vodData, playlistId, playlistName);

        allItems.push(...items);
        allWarnings.push(...warnings);
        allErrors.push(...errors);

        items.forEach((item) => {
          categories.add(item.groupTitle);
          contentTypeCounts.movie++;
        });

        console.log(`[PARSING_XTREAM] ✓ Fetched ${items.length} VOD movies`);
      } catch (error) {
        const msg = `Failed to fetch VOD: ${error.message}`;
        console.warn(`[PARSING_XTREAM] ⚠ ${msg}`);
        allWarnings.push(msg);
      }
    }

    // Fetch Series
    if (includeTypes.includes('series')) {
      try {
        console.log(`[PARSING_XTREAM] Fetching series...`);
        const seriesData = await fetchXtreamData(apiUrl, username, password, 'get_series', retries);
        const { items, warnings, errors } = parseXtreamSeries(seriesData, playlistId, playlistName);

        allItems.push(...items);
        allWarnings.push(...warnings);
        allErrors.push(...errors);

        items.forEach((item) => {
          categories.add(item.groupTitle);
          contentTypeCounts.series++;
        });

        console.log(`[PARSING_XTREAM] ✓ Fetched ${items.length} series`);
      } catch (error) {
        const msg = `Failed to fetch series: ${error.message}`;
        console.warn(`[PARSING_XTREAM] ⚠ ${msg}`);
        allWarnings.push(msg);
      }
    }

    const totalItems = allItems.length;
    console.log(
      `[PARSING_XTREAM] Collected ${totalItems} items (${allWarnings.length} warnings, ${allErrors.length} errors)`
    );

    if (totalItems === 0) {
      tracker.complete();
      return {
        success: true,
        itemsProcessed: 0,
        itemsSaved: 0,
        itemsFailed: 0,
        categories: Array.from(categories),
        contentTypeCounts,
        duration: Date.now() - tracker.startTime,
        warnings: allWarnings,
        errors: allErrors,
      };
    }

    // Process items in batches
    let itemsSaved = 0;

    for (let batchStart = 0; batchStart < allItems.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, allItems.length);
      const batch = allItems.slice(batchStart, batchEnd);

      try {
        // Save batch to storage
        await itemStorageService.saveItemsBatch(playlistId, batch);

        itemsSaved = batchEnd;

        // Record batch in progress tracker
        tracker.recordBatchSaved(batch.length, itemsSaved);

        // Call progress callback if provided
        if (onProgress) {
          onProgress({
            phase: 'saving',
            progress: Math.round((itemsSaved / totalItems) * 100),
            percentComplete: Math.round((itemsSaved / totalItems) * 100),
            itemsProcessed: itemsSaved,
            itemsSaved,
            itemsTotal: totalItems,
            totalItems: totalItems,
            batchNumber: Math.ceil(itemsSaved / batchSize),
            totalBatches: Math.ceil(totalItems / batchSize),
          });
        }

        console.log(
          `[PARSING_XTREAM] Batch ${Math.ceil(itemsSaved / batchSize)}: Saved ${batch.length} items (${itemsSaved}/${totalItems})`
        );
      } catch (error) {
        console.error(`[PARSING_XTREAM] Failed to save batch at index ${batchStart}:`, error);

        // Continue with next batch even if this one fails
        batch.forEach(() => {
          tracker.itemsFailed++;
        });
      }
    }

    // Complete parsing
    tracker.complete();

    const duration = Date.now() - tracker.startTime;

    console.log(`[PARSING_XTREAM] ✓ Parse complete: ${itemsSaved} items saved in ${duration}ms`);

    return {
      success: true,
      itemsProcessed: totalItems,
      itemsSaved,
      itemsFailed: allErrors.length,
      categories: Array.from(categories),
      contentTypeCounts,
      duration,
      warnings: allWarnings,
      errors: allErrors,
    };
  } catch (error) {
    tracker.error(error.message);

    console.error(`[PARSING_XTREAM] ✗ Fatal error during parsing:`, error);

    return {
      success: false,
      error: error.message,
      itemsProcessed: 0,
      itemsSaved: 0,
      itemsFailed: 0,
      duration: Date.now() - tracker.startTime,
    };
  }
};

export default {
  parseXtream,
};
