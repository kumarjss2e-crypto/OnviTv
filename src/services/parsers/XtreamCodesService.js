/**
 * Xtream Codes Service
 * Xtream API client for fetching live channels, VOD movies, and series
 * 
 * CRITICAL: Uses sequential category fetching with 100ms delays
 * Parallel requests cause server timeouts and data loss
 */

import { normalizeURL, fetchWithFallback } from './URLProtocolHandler.js';

/**
 * Normalize Xtream server URL
 */
const normalizeXtreamUrl = (url) => {
  // Clean URL first - remove quotes, backticks, etc.
  const cleanUrl = url.trim().replace(/^[`'" ]+|[`'" ]+$/g, '').trim();
  
  // If URL already has a protocol, leave it as-is
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    // Remove trailing slash
    return cleanUrl.replace(/\/$/, '');
  }
  
  // If no protocol, try HTTP first (more compatible with many Xtream servers)
  let normalized = cleanUrl.replace(/\/$/, '');
  return `http://${normalized}`;
};

/**
 * Sleep utility for delays between requests
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch from Xtream API with retry logic and iOS-friendly timeout
 */
const fetchXtreamEndpoint = async (baseUrl, action, params, retries = 3, timeoutMs = 60000) => {
  try {
    const url = new URL(`${baseUrl}/player_api.php`);
    url.searchParams.append('action', action);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    const apiUrl = url.toString();

    // Use intelligent protocol fallback
    const response = await fetchWithFallback(apiUrl, {
      retries,
      timeout: timeoutMs,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (OnviTV)', // Some servers require User-Agent
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    const errorMsg = error?.message || String(error);
    console.error(`[XtreamCodesService] Failed to fetch ${action}: ${errorMsg}`);
    throw error;
  }
};

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
 * Parse live stream data
 */
const parseLiveStreams = (streams, categoryName) => {
  if (!Array.isArray(streams)) return [];

  return streams.map(stream => {
    const streamId = stream.stream_id || stream.id || Date.now().toString();
    const uniqueId = `xtream-live-${streamId}`;
    return {
      id: uniqueId,
      name: stream.name || 'Unknown',
      streamUrl: stream.stream_url || `${streamId}`,
      url: stream.stream_url || `${streamId}`,
      tvgId: stream.epg_channel_id || streamId,
      tvgName: stream.name,
      tvgLogo: stream.stream_icon || null,
      logo: stream.stream_icon || null,
      groupTitle: categoryName || stream.category_name || stream.category || 'Live',
      contentType: 'channel',
      type: 'channel',
    };
  });
};

/**
 * Parse VOD (movie) data
 */
const parseVODStreams = (vods, categoryName) => {
  if (!Array.isArray(vods)) return [];

  return vods.map(vod => {
    const vodId = vod.stream_id || vod.id || Date.now().toString();
    const uniqueId = `xtream-vod-${vodId}`;
    return {
      id: uniqueId,
      name: vod.name || 'Unknown',
      streamUrl: vod.stream_url || `${vodId}`,
      url: vod.stream_url || `${vodId}`,
      tvgId: vod.stream_id,
      tvgName: vod.name,
      tvgLogo: vod.stream_icon || null,
      logo: vod.stream_icon || null,
      groupTitle: categoryName || vod.category_name || vod.category || 'Movies',
      contentType: 'movie',
      type: 'movie',
    };
  });
};

/**
 * Parse series data (metadata only, episodes fetched on-demand)
 */
const parseSeries = (seriesArray, categoryName) => {
  if (!Array.isArray(seriesArray)) return [];

  return seriesArray.map(series => {
    const seriesId = series.series_id || series.id || Date.now().toString();
    const uniqueId = `xtream-series-${seriesId}`;
    return {
      id: uniqueId,
      name: series.name || 'Unknown',
      streamUrl: `${seriesId}`,
      url: `${seriesId}`,
      tvgId: series.series_id,
      tvgName: series.name,
      tvgLogo: series.cover || series.series_icon || null,
      logo: series.cover || series.series_icon || null,
      groupTitle: categoryName || series.category_name || series.category || 'Series',
      contentType: 'series',
      type: 'series',
      seriesId: series.series_id, // Store for episode fetching
      seasons: [], // Lazy load episodes
    };
  });
};

/**
 * Test Xtream connection
 */
export const testXtreamConnection = async (serverUrl, username, password) => {
  try {
    const baseUrl = normalizeXtreamUrl(serverUrl);

    const result = await fetchXtreamEndpoint(
      baseUrl,
      'get_live_categories',
      { username, password }
    );

    if (Array.isArray(result)) {
      return { success: true };
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error(`[XtreamCodesService] Connection failed:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Parse Xtream playlist
 * 
 * CRITICAL IMPLEMENTATION:
 * - Fetches categories (parallel - OK, only 3 requests)
 * - First tries to fetch ALL content at once (without category_id)
 * - If that fails, falls back to fetching per category SEQUENTIALLY with 100ms delays
 * - Returns items separated by type
 * - Series loaded WITHOUT episodes (lazy loading)
 */
export const parseXtream = async (serverUrl, username, password, onProgress) => {
  try {
    const baseUrl = normalizeXtreamUrl(serverUrl);

    let liveCategories = [];
    let vodCategories = [];
    let seriesCategories = [];

    try {
      [liveCategories, vodCategories, seriesCategories] = await Promise.all([
        fetchXtreamEndpoint(baseUrl, 'get_live_categories', { username, password }),
        fetchXtreamEndpoint(baseUrl, 'get_vod_categories', { username, password }),
        fetchXtreamEndpoint(baseUrl, 'get_series_categories', { username, password }),
      ]);

      if (!Array.isArray(liveCategories)) liveCategories = [];
      if (!Array.isArray(vodCategories)) vodCategories = [];
      if (!Array.isArray(seriesCategories)) seriesCategories = [];
    } catch (error) {
      console.error(`[XtreamCodesService] Failed to fetch categories:`, error.message);
      return { success: false, error: error.message, items: [] };
    }

    const channels = [];
    const movies = [];
    const series = [];

    // First try fetching ALL live channels without category_id
    let liveFetchedAll = false;
    try {
      const allLiveStreams = await fetchXtreamEndpoint(
        baseUrl,
        'get_live_streams',
        { username, password }
      );
      const parsedLive = parseLiveStreams(allLiveStreams, 'Live');
      if (parsedLive.length > 0) {
        channels.push(...parsedLive);
        liveFetchedAll = true;
      }
    } catch (error) {
      console.warn(`[XtreamCodesService] Failed to fetch all live channels: ${error.message}, will try per category`);
    }

    // If didn't fetch all, try per category
    if (!liveFetchedAll) {
      for (let i = 0; i < liveCategories.length; i++) {
        const category = liveCategories[i];

        try {
          const streams = await fetchXtreamEndpoint(
            baseUrl,
            'get_live_streams',
            { username, password, category_id: category.category_id }
          );

          const parsed = parseLiveStreams(streams, category.category_name);
          channels.push(...parsed);

          // Emit progress
          onProgress?.({
            phase: 'parsing',
            currentCategory: i + 1,
            totalCategories: liveCategories.length,
            itemsFound: channels.length,
            percentComplete: Math.round(((i + 1) / liveCategories.length) * 100),
          });
        } catch (error) {
          console.error(`[XtreamCodesService] Failed to fetch live category ${category.category_name}:`, error.message);
        }

        // CRITICAL: 100ms delay between requests
        if (i < liveCategories.length - 1) {
          await sleep(100);
        }
      }
    }

    // First try fetching ALL VOD movies without category_id
    let vodFetchedAll = false;
    try {
      const allVodStreams = await fetchXtreamEndpoint(
        baseUrl,
        'get_vod_streams',
        { username, password }
      );
      const parsedVod = parseVODStreams(allVodStreams, 'Movies');
      if (parsedVod.length > 0) {
        movies.push(...parsedVod);
        vodFetchedAll = true;
      }
    } catch (error) {
      console.warn(`[XtreamCodesService] Failed to fetch all VOD movies: ${error.message}, will try per category`);
    }

    // If didn't fetch all, try per category
    if (!vodFetchedAll) {
      for (let i = 0; i < vodCategories.length; i++) {
        const category = vodCategories[i];

        try {
          const streams = await fetchXtreamEndpoint(
            baseUrl,
            'get_vod_streams',
            { username, password, category_id: category.category_id }
          );

          const parsed = parseVODStreams(streams, category.category_name);
          movies.push(...parsed);

          // Emit progress
          onProgress?.({
            phase: 'parsing',
            currentCategory: i + 1,
            totalCategories: vodCategories.length,
            itemsFound: movies.length,
            percentComplete: Math.round(((i + 1) / vodCategories.length) * 100),
          });
        } catch (error) {
          console.error(`[XtreamCodesService] Failed to fetch VOD category ${category.category_name}:`, error.message);
        }

        // CRITICAL: 100ms delay between requests
        if (i < vodCategories.length - 1) {
          await sleep(100);
        }
      }
    }

    // First try fetching ALL series without category_id
    let seriesFetchedAll = false;
    try {
      const allSeriesData = await fetchXtreamEndpoint(
        baseUrl,
        'get_series',
        { username, password }
      );
      const parsedSeries = parseSeries(allSeriesData, 'Series');
      if (parsedSeries.length > 0) {
        series.push(...parsedSeries);
        seriesFetchedAll = true;
      }
    } catch (error) {
      console.warn(`[XtreamCodesService] Failed to fetch all series: ${error.message}, will try per category`);
    }

    // If didn't fetch all, try per category
    if (!seriesFetchedAll) {
      for (let i = 0; i < seriesCategories.length; i++) {
        const category = seriesCategories[i];

        try {
          const seriesData = await fetchXtreamEndpoint(
            baseUrl,
            'get_series',
            { username, password, category_id: category.category_id }
          );

          const parsed = parseSeries(seriesData, category.category_name);
          series.push(...parsed);

          // Emit progress
          onProgress?.({
            phase: 'parsing',
            currentCategory: i + 1,
            totalCategories: seriesCategories.length,
            itemsFound: series.length,
            percentComplete: Math.round(((i + 1) / seriesCategories.length) * 100),
          });
        } catch (error) {
          console.error(`[XtreamCodesService] Failed to fetch series category ${category.category_name}:`, error.message);
        }

        // CRITICAL: 100ms delay between requests
        if (i < seriesCategories.length - 1) {
          await sleep(100);
        }
      }
    }

    const totalItems = channels.length + movies.length + series.length;

    return {
      success: true,
      items: [...channels, ...movies, ...series],
      stats: {
        channels: channels.length,
        movies: movies.length,
        series: series.length,
        total: totalItems,
      },
    };
  } catch (error) {
    console.error(`[XtreamCodesService] Fatal error:`, error.message);
    return {
      success: false,
      error: error.message,
      items: [],
    };
  }
};

export default {
  testXtreamConnection,
  parseXtream,
  normalizeXtreamUrl,
};
