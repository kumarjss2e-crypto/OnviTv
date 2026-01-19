/**
 * Xtream Stream Parser
 * Parses Xtream Codes API responses incrementally
 * Saves items as categories are fetched
 */

import { validateStreamFormat } from './formatValidator';
import { duplicateDetector } from './duplicateDetector';

/**
 * Build Xtream API URL
 * @param {string} serverUrl - Server URL
 * @param {string} username - Username
 * @param {string} password - Password
 * @param {string} action - API action (get_live_categories, get_live_streams, etc.)
 * @returns {string} - Full API URL
 */
const buildXtreamUrl = (serverUrl, username, password, action, extra = '') => {
  // Remove trailing slash
  let url = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
  
  // Determine protocol if missing
  if (!url.startsWith('http')) {
    url = `http://${url}`;
  }

  return `${url}/player_api.php?username=${username}&password=${password}&action=${action}${extra}`;
};

/**
 * Fetch from Xtream API with error handling
 * @param {string} url - API URL
 * @param {AbortSignal} signal
 * @returns {Promise<Object>} - JSON response
 */
const fetchXtreamApi = async (url, signal) => {
  try {
    const response = await fetch(url, { signal });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Xtream API error:', error);
    throw error;
  }
};

/**
 * Build stream URL for Xtream
 * @param {string} serverUrl
 * @param {string} username
 * @param {string} password
 * @param {string} streamId
 * @param {string} type - 'live' | 'movie' | 'series'
 * @returns {string}
 */
const buildStreamUrl = (serverUrl, username, password, streamId, type) => {
  let url = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
  if (!url.startsWith('http')) {
    url = `http://${url}`;
  }

  if (type === 'live') {
    return `${url}/live/${username}/${password}/${streamId}.ts`;
  } else if (type === 'movie') {
    return `${url}/movie/${username}/${password}/${streamId}.${getFileExtension(streamId)}`;
  } else if (type === 'series') {
    return `${url}/series/${username}/${password}/${streamId}.${getFileExtension(streamId)}`;
  }
  
  return '';
};

/**
 * Get file extension from stream ID or default
 * @param {string} streamId
 * @returns {string}
 */
const getFileExtension = (streamId) => {
  // Try to extract extension if present
  const parts = streamId.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toLowerCase();
  }
  return 'mp4'; // Default
};

/**
 * Stream-parse Xtream API
 * Fetches categories, then streams content incrementally
 * @param {string} serverUrl
 * @param {string} username
 * @param {string} password
 * @param {string} playlistId
 * @param {Function} onItemParsed - Callback: (item, type) => void
 * @param {Function} onProgress - Callback: (message, stats) => void
 * @param {AbortSignal} signal
 * @returns {Promise<Object>} - Final stats
 */
export const streamParseXtream = async (
  serverUrl,
  username,
  password,
  playlistId,
  onItemParsed,
  onProgress,
  signal
) => {
  const stats = {
    channels: 0,
    movies: 0,
    series: 0,
    duplicates: 0,
    unsupported: 0,
    errors: 0,
    total: 0,
  };

  try {
    duplicateDetector.initPlaylist(playlistId);

    // Step 1: Get live categories
    if (onProgress) onProgress('Fetching live categories...', stats);
    
    const liveCategories = await fetchXtreamApi(
      buildXtreamUrl(serverUrl, username, password, 'get_live_categories'),
      signal
    );

    // Step 2: Fetch live streams from each category
    if (Array.isArray(liveCategories)) {
      for (const category of liveCategories) {
        if (signal?.aborted) throw new Error('Parsing cancelled');

        if (onProgress) {
          onProgress(`Fetching channels from ${category.category_name}...`, stats);
        }

        try {
          const streams = await fetchXtreamApi(
            buildXtreamUrl(
              serverUrl,
              username,
              password,
              'get_live_streams',
              `&category_id=${category.category_id}`
            ),
            signal
          );

          if (Array.isArray(streams)) {
            for (const stream of streams) {
              if (signal?.aborted) throw new Error('Parsing cancelled');

              try {
                const streamUrl = buildStreamUrl(serverUrl, username, password, stream.stream_id, 'live');
                const formatValidation = validateStreamFormat(streamUrl);

                if (!formatValidation.isSupported) {
                  stats.unsupported++;
                  continue;
                }

                const item = {
                  name: stream.name,
                  streamUrl,
                  type: 'channel',
                };

                if (duplicateDetector.isDuplicate(playlistId, item)) {
                  stats.duplicates++;
                  continue;
                }

                duplicateDetector.markSeen(playlistId, item);

                const completeItem = {
                  name: stream.name || `Channel ${stream.stream_id}`,
                  tvgId: stream.stream_id,
                  logo: stream.stream_icon || null,
                  categoryName: category.category_name,
                  streamUrl,
                  type: 'channel',
                  addedAt: new Date().toISOString(),
                };

                if (onItemParsed) {
                  onItemParsed(completeItem, 'channel');
                }

                stats.channels++;
                stats.total++;

              } catch (error) {
                console.error('Error processing stream:', error);
                stats.errors++;
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching category ${category.category_name}:`, error);
          stats.errors++;
        }
      }
    }

    // Step 3: Get VOD categories
    if (onProgress) onProgress('Fetching VOD categories...', stats);
    
    const vodCategories = await fetchXtreamApi(
      buildXtreamUrl(serverUrl, username, password, 'get_vod_categories'),
      signal
    );

    // Step 4: Fetch movies from each VOD category
    if (Array.isArray(vodCategories)) {
      for (const category of vodCategories) {
        if (signal?.aborted) throw new Error('Parsing cancelled');

        if (onProgress) {
          onProgress(`Fetching movies from ${category.category_name}...`, stats);
        }

        try {
          const movies = await fetchXtreamApi(
            buildXtreamUrl(
              serverUrl,
              username,
              password,
              'get_vod_streams',
              `&category_id=${category.category_id}`
            ),
            signal
          );

          if (Array.isArray(movies)) {
            for (const movie of movies) {
              if (signal?.aborted) throw new Error('Parsing cancelled');

              try {
                const streamUrl = buildStreamUrl(serverUrl, username, password, movie.stream_id, 'movie');
                const formatValidation = validateStreamFormat(streamUrl);

                if (!formatValidation.isSupported) {
                  stats.unsupported++;
                  continue;
                }

                const item = {
                  name: movie.name,
                  streamUrl,
                  type: 'movie',
                };

                if (duplicateDetector.isDuplicate(playlistId, item)) {
                  stats.duplicates++;
                  continue;
                }

                duplicateDetector.markSeen(playlistId, item);

                const completeItem = {
                  name: movie.name || `Movie ${movie.stream_id}`,
                  streamUrl,
                  poster: movie.stream_icon || null,
                  categoryName: category.category_name,
                  type: 'movie',
                  addedAt: new Date().toISOString(),
                };

                if (onItemParsed) {
                  onItemParsed(completeItem, 'movie');
                }

                stats.movies++;
                stats.total++;

              } catch (error) {
                console.error('Error processing movie:', error);
                stats.errors++;
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching VOD category ${category.category_name}:`, error);
          stats.errors++;
        }
      }
    }

    if (onProgress) onProgress('Parsing complete', stats);

    duplicateDetector.clearPlaylist(playlistId);
    return stats;

  } catch (error) {
    console.error('Error streaming Xtream:', error);
    duplicateDetector.clearPlaylist(playlistId);
    throw error;
  }
};

export default {
  streamParseXtream,
};
