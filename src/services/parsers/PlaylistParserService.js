
/**
 * Playlist Parser Service
 * Simple parsing without chunking
 */

import M3UParser from './M3UParser';
import XtreamCodesService from './XtreamCodesService';

/**
 * Parse M3U playlist
 */
export const parseM3U = async (m3uUrl, onProgress) => {
  try {
    console.log('[PlaylistParserService] parseM3U starting with:', m3uUrl);
    const result = await M3UParser.parseM3U(m3uUrl);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        itemsProcessed: 0,
        items: [],
        stats: { channels: 0, movies: 0, series: 0, total: 0 },
      };
    }

    const items = result.items;
    console.log('[PlaylistParserService] parseM3U got', items.length, 'items');

    const channels = items.filter(item => item.contentType === 'channel' || item.type === 'channel');
    const movies = items.filter(item => item.contentType === 'movie' || item.type === 'movie');
    const seriesItems = items.filter(item => item.contentType === 'series' || item.type === 'series');

    console.log('[PlaylistParserService] parseM3U stats:', {
      channels: channels.length,
      movies: movies.length,
      series: seriesItems.length,
      total: items.length,
    });

    return {
      success: true,
      itemsProcessed: items.length,
      items: items,
      stats: {
        channels: channels.length,
        movies: movies.length,
        series: seriesItems.length,
        total: items.length,
      },
    };
  } catch (error) {
    console.error('[PlaylistParserService] M3U parse error:', error);
    return {
      success: false,
      error: error.message,
      itemsProcessed: 0,
      items: [],
      stats: { channels: 0, movies: 0, series: 0, total: 0 },
    };
  }
};

/**
 * Parse Xtream playlist
 */
export const parseXtream = async (serverUrl, username, password, onProgress) => {
  try {
    console.log('[PlaylistParserService] parseXtream starting');
    const result = await XtreamCodesService.parseXtream(
      serverUrl,
      username,
      password,
      onProgress
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        itemsProcessed: 0,
        items: [],
        stats: { channels: 0, movies: 0, series: 0, total: 0 },
      };
    }

    console.log('[PlaylistParserService] parseXtream got', result.items.length, 'items');
    return {
      success: true,
      itemsProcessed: result.items.length,
      items: result.items,
      stats: result.stats,
    };
  } catch (error) {
    console.error('[PlaylistParserService] Xtream parse error:', error);
    return {
      success: false,
      error: error.message,
      itemsProcessed: 0,
      items: [],
      stats: { channels: 0, movies: 0, series: 0, total: 0 },
    };
  }
};

/**
 * Main parsing orchestrator
 */
export const parsePlaylist = async (playlistData, onProgress) => {
  try {
    if (playlistData.type === 'xtream') {
      return await parseXtream(
        playlistData.serverUrl,
        playlistData.username,
        playlistData.password,
        onProgress
      );
    } else {
      return await parseM3U(
        playlistData.url || playlistData.m3uUrl,
        onProgress
      );
    }
  } catch (error) {
    console.error('[PlaylistParserService] Parse error:', error);
    return {
      success: false,
      error: error.message,
      itemsProcessed: 0,
      items: [],
      stats: { channels: 0, movies: 0, series: 0, total: 0 },
    };
  }
};

export default {
  parsePlaylist,
  parseM3U,
  parseXtream,
};
