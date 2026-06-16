/**
 * Background Parsing Service
 * Production-ready implementation with web and native support
 * 
 * Handles M3U and Xtream playlist parsing with unified storage
 * - Native: Uses production libraries (iptv-m3u-playlist-parser, @iptv/xtream-api)
 * - Web: Uses pure JavaScript parsers (webCompatibleParserService)
 * 
 * DESIGN: Silent background parsing - no UI indicators, just stores items locally
 * Emits progress events to parsingProgressService for UI coordination
 */

import { itemStorageService } from './itemStorageService';
import { parsingProgressService } from './parsingProgressService';
import webCompatibleParserService from './webCompatibleParserService';
import { updatePlaylistStats } from './playlistService';
import { Platform } from 'react-native';

// In-memory job tracking
const activeJobs = new Map();

// Track first batch per playlist for progress events
const firstBatchEmitted = new Map();

// Track total expected items for progress calculation
const totalItemsTracked = new Map();

// Track current item count
const currentItemCount = new Map();

/**
 * Parse M3U playlist using platform-specific parser
 * - Native: Uses production library (iptv-m3u-playlist-parser)
 * - Web: Uses pure JavaScript parser (webCompatibleParserService)
 * 
 * Saves items directly to unified storage (silent operation)
 */
const parseM3UPlaylist = async (m3uUrl, playlistId, signal) => {
  try {
    console.log(`[backgroundParsingService] Fetching M3U from: ${m3uUrl}`);
    const response = await fetch(m3uUrl, { signal });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const content = await response.text();
    console.log(`[backgroundParsingService] Downloaded ${content.length} bytes, parsing...`);
    
    // Use platform-specific parser
    let tracks = [];
    
    if (Platform.OS === 'web') {
      // Web: Use pure JavaScript parser
      tracks = webCompatibleParserService.parseM3U(content);
      console.log(`[backgroundParsingService] [web] Parsed ${tracks.length} tracks using web parser`);
    } else {
      // Native: Use production library
      try {
        const { parsePlaylist } = await import('iptv-m3u-playlist-parser');
        const playlist = parsePlaylist(content);
        tracks = playlist.tracks || [];
        console.log(`[backgroundParsingService] [native] Parsed ${tracks.length} tracks using native library`);
      } catch (error) {
        console.warn('[backgroundParsingService] Native parser failed, falling back to web parser:', error);
        // Fallback to web parser if native fails
        tracks = webCompatibleParserService.parseM3U(content);
      }
    }
    
    // Initialize progress tracking
    totalItemsTracked.set(playlistId, tracks.length);
    currentItemCount.set(playlistId, 0);
    firstBatchEmitted.set(playlistId, false);
    parsingProgressService.recordTotalItems(playlistId, tracks.length);

    const stats = {
      channels: 0,
      movies: 0,
      series: 0,
      total: 0,
    };
    
    // Process each track and save to unified storage
    const itemsToSave = [];
    let batchNumber = 0;
    
    for (let i = 0; i < tracks.length; i++) {
      if (signal?.aborted) {
        console.log('[backgroundParsingService] M3U parsing aborted');
        throw new Error('Parsing cancelled');
      }
      
      const track = tracks[i];
      const streamUrl = track.streamUrl || track.url;
      
      if (!streamUrl) continue;
      
      // Detect content type
      const contentType = webCompatibleParserService.detectContentType(track);
      
      // Create item with normalized format
      const item = {
        name: track.name || 'Unknown',
        streamUrl,
        tvgId: track.tvgId || (track.tvg?.id || null),
        tvgName: track.tvgName || (track.tvg?.name || track.name),
        tvgLogo: track.tvgLogo || (track.tvg?.logo || null),
        groupTitle: track.groupTitle || (track.group || null),
      };
      
      itemsToSave.push({ item, contentType });
      
      stats.total++;
      if (contentType === 'channel') stats.channels++;
      else if (contentType === 'movie') stats.movies++;
      else if (contentType === 'series') stats.series++;
      
      // Batch save every 50 items for efficiency (more frequent progress updates)
      if (itemsToSave.length >= 50) {
        await itemStorageService.saveItemsBatch(playlistId, itemsToSave);
        batchNumber++;
        currentItemCount.set(playlistId, stats.total);
        
        // Emit first batch event for UI coordination
        if (!firstBatchEmitted.get(playlistId)) {
          firstBatchEmitted.set(playlistId, true);
          parsingProgressService.recordFirstBatchSaved(playlistId, stats.total);
        }
        
        parsingProgressService.recordBatchSaved(playlistId, batchNumber, stats.total);
        
        itemsToSave.length = 0;
      }
    }
    
    // Save remaining items
    if (itemsToSave.length > 0) {
      await itemStorageService.saveItemsBatch(playlistId, itemsToSave);
      batchNumber++;
      currentItemCount.set(playlistId, stats.total);
      
      // Emit first batch event if not already emitted
      if (!firstBatchEmitted.get(playlistId)) {
        firstBatchEmitted.set(playlistId, true);
        parsingProgressService.recordFirstBatchSaved(playlistId, stats.total);
      }
      
      parsingProgressService.recordBatchSaved(playlistId, batchNumber, stats.total);
    }
    
    console.log(`[backgroundParsingService] M3U parsing complete:`, stats);
    return stats;
    
  } catch (error) {
    console.error('[backgroundParsingService] M3U parsing error:', error);
    throw error;
  }
};

/**
 * Parse Xtream playlist using platform-specific implementation
 * - Native: Uses production library (@iptv/xtream-api)
 * - Web: Uses pure JavaScript Xtream client (webCompatibleParserService)
 * 
 * Saves items directly to unified storage (silent operation)
 */
const parseXtreamPlaylist = async (serverUrl, username, password, playlistId, signal) => {
  try {
    console.log(`[backgroundParsingService] Connecting to Xtream server: ${serverUrl}`);
    
    // Always use the webCompatibleParserService (we fixed it to fetch all content at once)
    const tracks = await webCompatibleParserService.parseXtream(serverUrl, username, password, signal);
    console.log(`[backgroundParsingService] Fetched ${tracks.length} items`);
    
    // Initialize progress tracking
    totalItemsTracked.set(playlistId, tracks.length);
    currentItemCount.set(playlistId, 0);
    firstBatchEmitted.set(playlistId, false);
    parsingProgressService.recordTotalItems(playlistId, tracks.length);

    const stats = {
      channels: 0,
      movies: 0,
      series: 0,
      total: 0,
    };
    
    // Process tracks and save to unified storage
    const itemsToSave = [];
    let batchNumber = 0;
    
    for (let i = 0; i < tracks.length; i++) {
      if (signal?.aborted) {
        console.log('[backgroundParsingService] Xtream parsing aborted');
        throw new Error('Parsing cancelled');
      }
      
      const track = tracks[i];
      
      if (!track.streamUrl) continue;
      
      // Detect content type
      const contentType = webCompatibleParserService.detectContentType(track);
      
      const item = {
        name: track.name || 'Unknown',
        streamUrl: track.streamUrl,
        tvgId: track.tvgId || null,
        tvgName: track.tvgName || track.name,
        tvgLogo: track.tvgLogo || null,
        groupTitle: track.groupTitle || null,
      };
      
      itemsToSave.push({ item, contentType });
      
      stats.total++;
      if (contentType === 'channel') stats.channels++;
      else if (contentType === 'movie') stats.movies++;
      else if (contentType === 'series') stats.series++;
      
      // Batch save every 50 items
      if (itemsToSave.length >= 50) {
        await itemStorageService.saveItemsBatch(playlistId, itemsToSave);
        batchNumber++;
        currentItemCount.set(playlistId, stats.total);
        
        // Emit first batch event for UI coordination
        if (!firstBatchEmitted.get(playlistId)) {
          firstBatchEmitted.set(playlistId, true);
          parsingProgressService.recordFirstBatchSaved(playlistId, stats.total);
        }
        
        parsingProgressService.recordBatchSaved(playlistId, batchNumber, stats.total);
        
        itemsToSave.length = 0;
      }
    }
    
    // Save remaining items
    if (itemsToSave.length > 0) {
      await itemStorageService.saveItemsBatch(playlistId, itemsToSave);
      batchNumber++;
      currentItemCount.set(playlistId, stats.total);
      
      // Emit first batch event if not already emitted
      if (!firstBatchEmitted.get(playlistId)) {
        firstBatchEmitted.set(playlistId, true);
        parsingProgressService.recordFirstBatchSaved(playlistId, stats.total);
      }
      
      parsingProgressService.recordBatchSaved(playlistId, batchNumber, stats.total);
    }
    
    console.log(`[backgroundParsingService] Xtream parsing complete:`, stats);
    return stats;
    
  } catch (error) {
    console.error('[backgroundParsingService] Xtream parsing error:', error);
    throw error;
  }
};

/**
 * Fetch channels from Xtream native client
 */
const fetchXtreamChannels = async (client) => {
  const channels = [];
  const categories = await client.getChannelCategories();
  
  for (const category of categories) {
    const streams = await client.getChannels({ categoryId: category.category_id });
    
    streams.forEach(stream => {
      channels.push({
        name: stream.name || 'Unknown',
        streamUrl: stream.url,
        tvgId: stream.epg_channel_id || null,
        tvgName: stream.name,
        tvgLogo: stream.stream_icon || null,
        groupTitle: category.category_name || 'Uncategorized',
      });
    });
  }
  
  return channels;
};

/**
 * Fetch movies from Xtream native client
 */
const fetchXtreamMovies = async (client) => {
  const movies = [];
  const categories = await client.getMovieCategories();
  
  for (const category of categories) {
    const vods = await client.getMovies({ categoryId: category.category_id });
    
    vods.forEach(vod => {
      movies.push({
        name: vod.name || 'Unknown',
        streamUrl: vod.url,
        tvgId: null,
        tvgName: vod.name,
        tvgLogo: vod.cover || null,
        groupTitle: category.category_name || 'Movies',
      });
    });
  }
  
  return movies;
};

/**
 * Fetch series from Xtream native client
 */
const fetchXtreamSeries = async (client) => {
  const series = [];
  const categories = await client.getShowCategories();
  
  for (const category of categories) {
    const shows = await client.getShows({ categoryId: category.category_id });
    
    shows.forEach(show => {
      series.push({
        name: show.name || 'Unknown',
        streamUrl: show.url,
        tvgId: null,
        tvgName: show.name,
        tvgLogo: show.cover || null,
        groupTitle: category.category_name || 'Series',
      });
    });
  }
  
  return series;
};

/**
 * Detect content type from track metadata
 * (Delegates to webCompatibleParserService for consistency)
 */
const detectContentType = (track) => {
  return webCompatibleParserService.detectContentType(track);
};

/**
 * Start parsing a playlist (runs in background silently)
 * Works on all platforms: iOS, Android, Web
 */
const startParsing = async (playlistId, playlistData) => {
  try {
    if (!playlistData) {
      throw new Error('Playlist data is required');
    }
    
    // Check if already parsing
    if (activeJobs.has(playlistId)) {
      console.warn(`[backgroundParsingService] Playlist ${playlistId} already parsing`);
      return;
    }
    
    const abortController = new AbortController();
    activeJobs.set(playlistId, { startTime: new Date(), abortController });
    
    console.log(`[backgroundParsingService] Starting parsing for ${playlistId} on ${Platform.OS}`);
    
    // Clear old items for this playlist
    await itemStorageService.clearPlaylistItems(playlistId);
    
    let stats = {};
    
    // Route to correct parser
    if (playlistData.type === 'xtream') {
      stats = await parseXtreamPlaylist(
        playlistData.serverUrl,
        playlistData.username,
        playlistData.password,
        playlistId,
        abortController.signal
      );
    } else {
      // For M3U, use the m3uUrl if provided, otherwise try url
      const m3uUrl = playlistData.m3uUrl || playlistData.url;
      stats = await parseM3UPlaylist(
        m3uUrl,
        playlistId,
        abortController.signal
      );
    }
    
    activeJobs.delete(playlistId);
    console.log(`[backgroundParsingService] Parsing complete for ${playlistId}:`, stats);
    
    // Update Firestore with stats using correct keys
    await updatePlaylistStats(playlistId, {
      totalChannels: stats.channels,
      totalMovies: stats.movies,
      totalSeries: stats.series,
      totalItems: stats.total,
    });
    
    // Emit completion event for any UI listeners
    parsingProgressService.recordParsingComplete(playlistId, stats);
    
    return { success: true, stats };
    
  } catch (error) {
    console.error(`[backgroundParsingService] Parsing error for ${playlistId}:`, error);
    activeJobs.delete(playlistId);
    
    // Emit error event for any UI listeners
    parsingProgressService.recordParsingError(playlistId, error);
    
    throw error;
  }
};

/**
 * Cancel parsing
 */
const cancelParsing = (playlistId) => {
  const job = activeJobs.get(playlistId);
  if (job) {
    job.abortController.abort();
    activeJobs.delete(playlistId);
    return true;
  }
  return false;
};

/**
 * Get active jobs
 */
const getActiveJobs = () => {
  return Array.from(activeJobs.entries()).map(([id, job]) => ({
    id,
    duration: new Date() - job.startTime,
  }));
};

/**
 * Network check
 */
const hasNetworkConnection = async () => {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Resume incomplete parsing jobs from Firebase
 * Called on app startup to resume any playlists that were being parsed
 * Works on all platforms
 */
const resumeIncompleteParses = async () => {
  try {
    console.log('[backgroundParsingService] Checking for incomplete parses...');
    
    // This would query Firebase for playlists with status='parsing'
    // TODO: Once playlists collection is set up with status field,
    // query for status='parsing' and call startParsing for each
    
    return [];
    
  } catch (error) {
    console.error('[backgroundParsingService] Error resuming incomplete parses:', error);
    return [];
  }
};

// Export service
export const backgroundParsingService = {
  startParsing,
  cancelParsing,
  getActiveJobs,
  hasNetworkConnection,
  resumeIncompleteParses,
};

export default backgroundParsingService;
