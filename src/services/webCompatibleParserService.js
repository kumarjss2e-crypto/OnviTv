/**
 * Web-Compatible Parser Service
 * Pure JavaScript M3U and Xtream parsers that work on all platforms
 * 
 * Replaces platform-specific libraries:
 * - iptv-m3u-playlist-parser (Node.js only)
 * - @iptv/xtream-api (Node.js only)
 * 
 * This implementation works on iOS, Android, and Web (browser)
 */

import { Platform } from 'react-native';

/**
 * Parse M3U format playlist
 * 
 * M3U Format:
 * #EXTM3U
 * #EXTINF:-1 tvg-id="1" tvg-name="Channel 1" tvg-logo="..." group-title="Group",Channel 1
 * http://stream.url
 * #EXTINF:-1 tvg-id="2" tvg-name="Movie 1" group-title="Movies",Movie 1
 * http://movie.stream.url
 */
export const parseM3U = (content) => {
  console.log(`[webCompatibleParserService] Parsing M3U content (${content.length} bytes)`);
  
  const tracks = [];
  const lines = content.split('\n');
  
  let currentTrack = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and M3U header
    if (!line || line === '#EXTM3U') {
      continue;
    }
    
    // Parse EXTINF line (metadata)
    if (line.startsWith('#EXTINF:')) {
      // Extract duration (usually -1 for streams)
      const parts = line.substring(8).split(',');
      const duration = parts[0].trim();
      const name = parts.slice(1).join(',').trim();
      
      // Parse attributes: tvg-id="..." tvg-name="..." etc
      const attributes = parseM3UAttributes(line);
      
      currentTrack = {
        duration,
        name: attributes.tvgName || name || 'Unknown',
        streamUrl: null,
        tvgId: attributes.tvgId || null,
        tvgName: attributes.tvgName || name || null,
        tvgLogo: attributes.tvgLogo || null,
        groupTitle: attributes.groupTitle || null,
      };
      
      // Get stream URL from next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !nextLine.startsWith('#')) {
          currentTrack.streamUrl = nextLine;
          
          // Validate URL
          if (isValidUrl(currentTrack.streamUrl)) {
            tracks.push(currentTrack);
          }
          
          currentTrack = null;
        }
      }
    }
  }
  
  console.log(`[webCompatibleParserService] Parsed ${tracks.length} tracks from M3U`);
  return tracks;
};

/**
 * Parse M3U attributes like tvg-id="123" tvg-name="Name" etc
 */
const parseM3UAttributes = (line) => {
  const attributes = {
    tvgId: null,
    tvgName: null,
    tvgLogo: null,
    groupTitle: null,
  };
  
  // Extract quoted values
  const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
  if (tvgIdMatch) attributes.tvgId = tvgIdMatch[1];
  
  const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
  if (tvgNameMatch) attributes.tvgName = tvgNameMatch[1];
  
  const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
  if (tvgLogoMatch) attributes.tvgLogo = tvgLogoMatch[1];
  
  const groupTitleMatch = line.match(/group-title="([^"]*)"/);
  if (groupTitleMatch) attributes.groupTitle = groupTitleMatch[1];
  
  return attributes;
};

/**
 * Validate URL
 */
const isValidUrl = (str) => {
  try {
    if (str.startsWith('http://') || str.startsWith('https://')) {
      new URL(str);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Xtream API Client - Pure JavaScript Implementation
 * 
 * Xtream API Endpoints:
 * GET /player_api.php?username={user}&password={pass}&action=get_live_categories
 * GET /player_api.php?username={user}&password={pass}&action=get_live_streams&category_id={id}
 * GET /player_api.php?username={user}&password={pass}&action=get_vod_categories
 * GET /player_api.php?username={user}&password={pass}&action=get_vod_streams&category_id={id}
 * GET /player_api.php?username={user}&password={pass}&action=get_series_categories
 * GET /player_api.php?username={user}&password={pass}&action=get_series&category_id={id}
 */

/**
 * Authenticate with Xtream server and fetch all content
 */
export const parseXtream = async (serverUrl, username, password, signal) => {
  console.log(`[webCompatibleParserService] Connecting to Xtream server: ${serverUrl}`);
  
  const baseUrl = normalizeXtreamUrl(serverUrl);
  
  try {
    // Test authentication
    const authTest = await fetchXtreamAPI(
      baseUrl,
      'get_live_categories',
      { username, password },
      signal
    );
    
    if (!authTest || Array.isArray(authTest) === false) {
      throw new Error('Authentication failed or invalid server response');
    }
    
    console.log('[webCompatibleParserService] Authentication successful');
    
    // Fetch all content in parallel
    const [channels, movies, series] = await Promise.all([
      fetchXtreamChannels(baseUrl, username, password, signal),
      fetchXtreamMovies(baseUrl, username, password, signal),
      fetchXtreamSeries(baseUrl, username, password, signal),
    ]);
    
    const allTracks = [
      ...channels,
      ...movies,
      ...series,
    ];
    
    console.log(`[webCompatibleParserService] Fetched ${allTracks.length} items from Xtream`);
    
    return allTracks;
    
  } catch (error) {
    console.error('[webCompatibleParserService] Xtream parsing error:', error);
    throw error;
  }
};

/**
 * Fetch channels from Xtream
 */
const fetchXtreamChannels = async (baseUrl, username, password, signal) => {
  try {
    console.log('[webCompatibleParserService] Fetching Xtream channels...');
    
    // First try to fetch ALL channels at once without category_id
    try {
      const allStreams = await fetchXtreamAPI(
        baseUrl,
        'get_live_streams',
        { username, password },
        signal
      );
      
      if (Array.isArray(allStreams) && allStreams.length > 0) {
        console.log(`[webCompatibleParserService] ✅ Successfully fetched ${allStreams.length} channels at once!`);
        
        const channels = allStreams.map(stream => ({
          name: stream.name,
          streamUrl: generateXtreamStreamUrl(baseUrl, stream.stream_id, username, password, 'live'),
          tvgId: `xtream_${stream.stream_id}`,
          tvgName: stream.name,
          tvgLogo: stream.stream_icon || null,
          groupTitle: stream.category_name || stream.category || 'Live',
        }));
        
        console.log(`[webCompatibleParserService] Fetched ${channels.length} channels`);
        return channels;
      }
    } catch (allStreamsError) {
      console.warn('[webCompatibleParserService] Failed to fetch all channels at once, falling back to per-category fetch:', allStreamsError.message);
    }
    
    // If that fails, fall back to per-category fetch
    const categories = await fetchXtreamAPI(
      baseUrl,
      'get_live_categories',
      { username, password },
      signal
    );
    
    if (!Array.isArray(categories)) {
      console.warn('[webCompatibleParserService] No channel categories found');
      return [];
    }
    
    const channels = [];
    
    // Fetch channels for each category
    for (const category of categories) {
      const streams = await fetchXtreamAPI(
        baseUrl,
        'get_live_streams',
        { username, password, category_id: category.category_id },
        signal
      );
      
      if (Array.isArray(streams)) {
        streams.forEach(stream => {
          channels.push({
            name: stream.name,
            streamUrl: generateXtreamStreamUrl(baseUrl, stream.stream_id, username, password, 'live'),
            tvgId: `xtream_${stream.stream_id}`,
            tvgName: stream.name,
            tvgLogo: stream.stream_icon || null,
            groupTitle: category.category_name || 'Live',
          });
        });
      }
      
      // Throttle to avoid overwhelming server
      await sleep(100);
    }
    
    console.log(`[webCompatibleParserService] Fetched ${channels.length} channels`);
    return channels;
    
  } catch (error) {
    console.error('[webCompatibleParserService] Error fetching channels:', error);
    return [];
  }
};

/**
 * Fetch movies from Xtream
 */
const fetchXtreamMovies = async (baseUrl, username, password, signal) => {
  try {
    console.log('[webCompatibleParserService] Fetching Xtream movies...');
    
    // First try to fetch ALL movies at once without category_id
    try {
      const allStreams = await fetchXtreamAPI(
        baseUrl,
        'get_vod_streams',
        { username, password },
        signal
      );
      
      if (Array.isArray(allStreams) && allStreams.length > 0) {
        console.log(`[webCompatibleParserService] ✅ Successfully fetched ${allStreams.length} movies at once!`);
        
        const movies = allStreams.map(stream => ({
          name: stream.name,
          streamUrl: generateXtreamStreamUrl(baseUrl, stream.stream_id, username, password, 'movie'),
          tvgId: `xtream_${stream.stream_id}`,
          tvgName: stream.name,
          tvgLogo: stream.stream_icon || null,
          groupTitle: stream.category_name || stream.category || 'Movies',
        }));
        
        console.log(`[webCompatibleParserService] Fetched ${movies.length} movies`);
        return movies;
      }
    } catch (allStreamsError) {
      console.warn('[webCompatibleParserService] Failed to fetch all movies at once, falling back to per-category fetch:', allStreamsError.message);
    }
    
    // If that fails, fall back to per-category fetch
    const categories = await fetchXtreamAPI(
      baseUrl,
      'get_vod_categories',
      { username, password },
      signal
    );
    
    if (!Array.isArray(categories)) {
      console.warn('[webCompatibleParserService] No movie categories found');
      return [];
    }
    
    const movies = [];
    
    // Fetch movies for each category
    for (const category of categories) {
      const streams = await fetchXtreamAPI(
        baseUrl,
        'get_vod_streams',
        { username, password, category_id: category.category_id },
        signal
      );
      
      if (Array.isArray(streams)) {
        streams.forEach(stream => {
          movies.push({
            name: stream.name,
            streamUrl: generateXtreamStreamUrl(baseUrl, stream.stream_id, username, password, 'movie'),
            tvgId: `xtream_${stream.stream_id}`,
            tvgName: stream.name,
            tvgLogo: stream.stream_icon || null,
            groupTitle: category.category_name || 'Movies',
          });
        });
      }
      
      // Throttle to avoid overwhelming server
      await sleep(100);
    }
    
    console.log(`[webCompatibleParserService] Fetched ${movies.length} movies`);
    return movies;
    
  } catch (error) {
    console.error('[webCompatibleParserService] Error fetching movies:', error);
    return [];
  }
};

/**
 * Fetch series from Xtream
 */
const fetchXtreamSeries = async (baseUrl, username, password, signal) => {
  try {
    console.log('[webCompatibleParserService] Fetching Xtream series...');
    
    // First try to fetch ALL series at once without category_id
    try {
      const allStreams = await fetchXtreamAPI(
        baseUrl,
        'get_series',
        { username, password },
        signal
      );
      
      if (Array.isArray(allStreams) && allStreams.length > 0) {
        console.log(`[webCompatibleParserService] ✅ Successfully fetched ${allStreams.length} series at once!`);
        
        const series = allStreams.map(stream => ({
          name: stream.name,
          streamUrl: generateXtreamStreamUrl(baseUrl, stream.series_id, username, password, 'series'),
          tvgId: `xtream_${stream.series_id}`,
          tvgName: stream.name,
          tvgLogo: stream.cover || null,
          groupTitle: stream.category_name || stream.category || 'Series',
        }));
        
        console.log(`[webCompatibleParserService] Fetched ${series.length} series`);
        return series;
      }
    } catch (allStreamsError) {
      console.warn('[webCompatibleParserService] Failed to fetch all series at once, falling back to per-category fetch:', allStreamsError.message);
    }
    
    // If that fails, fall back to per-category fetch
    const categories = await fetchXtreamAPI(
      baseUrl,
      'get_series_categories',
      { username, password },
      signal
    );
    
    if (!Array.isArray(categories)) {
      console.warn('[webCompatibleParserService] No series categories found');
      return [];
    }
    
    const series = [];
    
    // Fetch series for each category
    for (const category of categories) {
      const streams = await fetchXtreamAPI(
        baseUrl,
        'get_series',
        { username, password, category_id: category.category_id },
        signal
      );
      
      if (Array.isArray(streams)) {
        streams.forEach(stream => {
          series.push({
            name: stream.name,
            streamUrl: generateXtreamStreamUrl(baseUrl, stream.series_id, username, password, 'series'),
            tvgId: `xtream_${stream.series_id}`,
            tvgName: stream.name,
            tvgLogo: stream.cover || null,
            groupTitle: category.category_name || 'Series',
          });
        });
      }
      
      // Throttle to avoid overwhelming server
      await sleep(100);
    }
    
    console.log(`[webCompatibleParserService] Fetched ${series.length} series`);
    return series;
    
  } catch (error) {
    console.error('[webCompatibleParserService] Error fetching series:', error);
    return [];
  }
};

/**
 * Make API request to Xtream server
 * Includes CORS proxy fallback for web platform
 */
const fetchXtreamAPI = async (baseUrl, action, params, signal) => {
  try {
    const url = new URL(`${baseUrl}/player_api.php`);
    url.searchParams.append('action', action);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    const urlString = url.toString();
    
    // Try direct fetch first
    try {
      const response = await fetch(urlString, {
        method: 'GET',
        signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (directError) {
      // On web, CORS might block Xtream API
      // Users can switch to M3U playlists as workaround
      console.error('[webCompatibleParserService] Fetch failed:', directError.message);
      throw directError;
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[webCompatibleParserService] Request cancelled');
      throw error;
    }
    console.error('[webCompatibleParserService] API request error:', error);
    throw error;
  }
};

/**
 * Generate Xtream stream URL
 */
const generateXtreamStreamUrl = (baseUrl, streamId, username, password, type) => {
  // Format: http://server/movie|series|live/username/password/streamId.mkv
  const streamType = type === 'live' ? 'live' : type === 'series' ? 'series' : 'movie';
  return `${baseUrl}/${streamType}/${username}/${password}/${streamId}.mkv`;
};

/**
 * Normalize Xtream server URL
 * Remove trailing slash and protocol-less URLs
 */
const normalizeXtreamUrl = (url) => {
  let normalized = url.trim();
  
  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `http://${normalized}`;
  }
  
  // Remove trailing slash
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  
  return normalized;
};

/**
 * Sleep utility (throttle requests)
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Detect content type based on stream characteristics
 * 
 * Returns: 'channel' | 'movie' | 'series'
 */
export const detectContentType = (track) => {
  const name = (track.name || '').toLowerCase();
  const group = (track.groupTitle || '').toLowerCase();
  
  // Based on group title
  if (group.includes('movie')) return 'movie';
  if (group.includes('series') || group.includes('tv show')) return 'series';
  if (group.includes('live') || group.includes('channel')) return 'channel';
  
  // Based on name patterns
  if (name.includes('season') || name.includes('ep ') || name.includes('episode')) return 'series';
  if (name.includes('movie') || name.includes('film')) return 'movie';
  
  // Default to channel (most common for M3U)
  return 'channel';
};

export default {
  parseM3U,
  parseXtream,
  detectContentType,
};
