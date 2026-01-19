/**
 * M3U Stream Parser
 * Parses M3U files line-by-line for streaming ingestion
 * Saves items immediately as they're parsed
 */

import { validateStreamFormat } from './formatValidator';
import { duplicateDetector } from './duplicateDetector';

/**
 * Parse individual #EXTINF line
 * Example: #EXTINF:-1 tvg-id="123" tvg-name="CNN" tvg-logo="url" group-title="News","CNN HD"
 * @param {string} line - The #EXTINF line
 * @param {string} streamUrl - The stream URL from next line
 * @returns {Object} - Parsed metadata
 */
const parseExtinfLine = (line, streamUrl) => {
  const metadata = {
    name: '',
    tvgId: null,
    tvgName: null,
    tvgLogo: null,
    groupTitle: null,
    streamUrl,
    duration: -1,
  };

  try {
    // Extract duration
    const durationMatch = line.match(/#EXTINF:(-?\d+)/);
    if (durationMatch) {
      metadata.duration = parseInt(durationMatch[1]);
    }

    // Extract tvg-id
    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
    if (tvgIdMatch) metadata.tvgId = tvgIdMatch[1];

    // Extract tvg-name
    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
    if (tvgNameMatch) metadata.tvgName = tvgNameMatch[1];

    // Extract tvg-logo
    const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
    if (tvgLogoMatch) metadata.tvgLogo = tvgLogoMatch[1];

    // Extract group-title
    const groupMatch = line.match(/group-title="([^"]*)"/);
    if (groupMatch) metadata.groupTitle = groupMatch[1];

    // Extract channel/item name (after last comma)
    const nameMatch = line.match(/,(.*)$/);
    if (nameMatch) {
      metadata.name = nameMatch[1].trim();
    }

    return metadata;
  } catch (error) {
    console.error('Error parsing EXTINF line:', error);
    return metadata;
  }
};

/**
 * Detect content type based on metadata
 * Uses a multi-layered approach to handle different M3U formats:
 * 1. URL structure (most reliable)
 * 2. Episode patterns in name
 * 3. Explicit series/movie markers in name & group
 * 4. Smart group-title analysis with context
 * 
 * @param {Object} metadata
 * @returns {string} - 'channel' | 'movie' | 'series'
 */
const detectContentType = (metadata) => {
  const { streamUrl, groupTitle, name } = metadata;
  
  const streamLower = streamUrl?.toLowerCase() || '';
  const groupLower = groupTitle?.toLowerCase() || '';
  const nameLower = name?.toLowerCase() || '';

  // ========== LEVEL 1: URL STRUCTURE (Most Reliable) ==========
  // Series-specific URLs
  if (streamLower.includes('/series/') || 
      streamLower.includes('/tvshow/') || 
      streamLower.includes('/tvseries/') ||
      streamLower.includes('/season/') ||
      streamLower.includes('/episode/')) {
    return 'series';
  }

  // Movie-specific URLs
  if (streamLower.includes('/movie/') || 
      streamLower.includes('/movies/') || 
      streamLower.includes('/film/') ||
      streamLower.includes('/films/')) {
    return 'movie';
  }

  // ========== LEVEL 2: EPISODE PATTERNS (Very Reliable) ==========
  // S01E01, Season 1 Episode 1, etc.
  if (/\bs\d{1,2}e\d{1,2}\b|\bseason\s+\d+\s+episode|\bepisode\s+\d+/i.test(nameLower)) {
    return 'series';
  }

  // ========== LEVEL 3: EXPLICIT KEYWORDS IN NAME ==========
  // Series keywords (multi-language support)
  const seriesNameKeywords = [
    'web series', 'webseries', 'miniseries', 'miniserie', 'series', 'staffel',
    'temporada',  // Spanish
    'saison',     // French
    'stagione',   // Italian
    'serie',      // Spanish/Italian for series (not just season)
  ];
  if (seriesNameKeywords.some(keyword => nameLower.includes(keyword))) {
    // But exclude if it looks like a provider or category name
    const isProvider = /netflix|amazon|hulu|disney|apple|prime|hbo|paramount|warner|max/i.test(nameLower);
    if (!isProvider) {
      return 'series';
    }
  }

  // Movie keywords (multi-language support)
  const movieNameKeywords = [
    'movie', 'movies', 'film', 'filme', 'films',
    'cinema', 'pelicula', 'peliculas',  // Spanish
    'cinéma', 'film',                   // French
    'christmas movies', 'xmas movies',
    'true crime',
    'western', 'westernfilme',
    'blockbuster'
  ];
  if (movieNameKeywords.some(keyword => nameLower.includes(keyword))) {
    return 'movie';
  }

  // ========== LEVEL 4: GROUP-TITLE ANALYSIS ==========
  // Check for explicit movie groups (filme/film ONLY, no series keywords)
  if ((groupLower.includes('film') || groupLower.includes('filme') || groupLower.includes('movie')) && 
      !hasSeriesKeyword(groupLower)) {
    return 'movie';
  }

  // Check for explicit series groups
  // Must have series keyword AND NOT have film/movie keywords
  if (hasSeriesKeyword(groupLower) && !hasMovieKeyword(groupLower)) {
    return 'series';
  }

  // ========== LEVEL 5: SMART GROUP CONTEXT ==========
  // If group has "shows", "programs", "tv", "channels" - likely series
  if (/\bshows\b|\bprogrammes\b|\bprogramas\b|\btvshow|\btv-show|\btelenovela/.test(groupLower)) {
    return 'series';
  }

  // If group is mixed or generic - analyze context
  if (groupTitle && groupTitle.length > 0) {
    // Mixed genre groups with both films and series - default to channel
    if ((groupLower.includes('film') || groupLower.includes('movie')) && 
        (groupLower.includes('series') || groupLower.includes('serien'))) {
      return 'channel';
    }
  }

  // ========== DEFAULT: CHANNEL ==========
  // Unknown content is typically a live channel or VOD provider entry
  return 'channel';
};

/**
 * Check if string contains series keywords (multi-language)
 */
const hasSeriesKeyword = (text) => {
  const seriesKeywords = [
    'serien',    // German
    'serie',     // German/Spanish/Italian (series)
    'series',    // English
    'seriale',   // Polish
    'seriali',   // Italian
    'serials',   // English
    'telenovela',// Spanish/Portuguese
    'dramaturgia',// Russian
    'сериал',    // Russian (seriall)
  ];
  return seriesKeywords.some(keyword => text.includes(keyword));
};

/**
 * Check if string contains movie keywords (multi-language)
 */
const hasMovieKeyword = (text) => {
  const movieKeywords = [
    'filme',     // German
    'film',      // German/French
    'films',     // English
    'movie',     // English
    'movies',    // English
    'pelicula',  // Spanish
    'peliculas', // Spanish
    'cinema',    // General
  ];
  return movieKeywords.some(keyword => text.includes(keyword));
};

/**
 * Stream-parse M3U file line by line
 * @param {string} m3uUrl - URL to M3U file
 * @param {string} playlistId - Playlist ID for tracking
 * @param {Function} onItemParsed - Callback when item is parsed: (item, type, isDuplicate) => void
 * @param {Function} onProgress - Callback for progress: (lineNumber, stats) => void
 * @param {AbortSignal} signal - For cancellation
 * @returns {Promise<Object>} - Final stats
 */
export const streamParseM3U = async (m3uUrl, playlistId, onItemParsed, onProgress, signal) => {
  const stats = {
    channels: 0,
    movies: 0,
    series: 0,
    duplicates: 0,
    unsupported: 0,
    errors: 0,
    total: 0,
  };

  let lineNumber = 0;
  let currentExtinf = null;
  let buffer = '';
  let byteOffset = 0;

  try {
    // Initialize duplicate detector for this playlist
    duplicateDetector.initPlaylist(playlistId);

    console.log(`[m3uStreamParser] Starting M3U parsing for ${playlistId}`);
    console.log(`[m3uStreamParser] URL: ${m3uUrl}`);

    // Fetch file as stream using native fetch (works on web, iOS with ATS, Android)
    const response = await fetch(m3uUrl, {
      signal,
      method: 'GET',
      headers: {
        'Accept': 'application/x-mpegURL, text/plain',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log(`[m3uStreamParser] Fetch successful, starting to parse...`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (signal?.aborted) {
        reader.cancel();
        throw new Error('Parsing cancelled');
      }

      if (value) {
        buffer += decoder.decode(value, { stream: !done });

        // Process complete lines in buffer
        const lines = buffer.split('\n');
        
        // Keep last incomplete line in buffer
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          lineNumber++;
          const trimmedLine = line.trim();

          if (signal?.aborted) {
            throw new Error('Parsing cancelled');
          }

          // Yield to event loop every 100 lines to prevent blocking UI
          if (i % 100 === 0 && i > 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }

          // Skip empty lines and non-EXTINF comments
          if (!trimmedLine || (trimmedLine.startsWith('#') && !trimmedLine.startsWith('#EXTINF'))) {
            continue;
          }

          // Parse EXTINF metadata line
          if (trimmedLine.startsWith('#EXTINF')) {
            currentExtinf = trimmedLine;
            continue;
          }

          // Stream URL line (next line after EXTINF)
          if (currentExtinf) {
            try {
              const streamUrl = trimmedLine;
              
              if (!streamUrl) {
                currentExtinf = null;
                continue;
              }

              // Parse metadata
              const metadata = parseExtinfLine(currentExtinf, streamUrl);
              const contentType = detectContentType(metadata);

              // Check format support
              const formatValidation = validateStreamFormat(streamUrl);
              if (!formatValidation.isSupported) {
                stats.unsupported++;
                if (onProgress) {
                  onProgress(lineNumber, stats);
                }
                currentExtinf = null;
                continue;
              }

              // Check for duplicates
              const item = {
                name: metadata.name,
                streamUrl,
                type: contentType,
              };

              if (duplicateDetector.isDuplicate(playlistId, item)) {
                stats.duplicates++;
                if (onProgress) {
                  onProgress(lineNumber, stats);
                }
                currentExtinf = null;
                continue;
              }

              // Mark as seen
              duplicateDetector.markSeen(playlistId, item);

              // Determine category name with smart fallback
              let categoryName = metadata.groupTitle;
              if (!categoryName || categoryName.trim() === '') {
                // Try to extract from URL path for movies/series
                const urlLower = streamUrl.toLowerCase();
                if (urlLower.includes('/movie')) {
                  categoryName = 'Movies';
                } else if (urlLower.includes('/series')) {
                  categoryName = 'Series';
                } else {
                  categoryName = 'Other';
                }
              }

              // Build complete item
              const completeItem = {
                name: metadata.name || `Item ${lineNumber}`,
                tvgId: metadata.tvgId,
                tvgName: metadata.tvgName,
                logo: metadata.tvgLogo,
                categoryName: categoryName,
                streamUrl: metadata.streamUrl,
                type: contentType,
                addedAt: new Date().toISOString(),
              };

              // Callback for item to be saved
              if (onItemParsed) {
                onItemParsed(completeItem, contentType);
              }

              // Update stats
              if (contentType === 'channel') stats.channels++;
              else if (contentType === 'movie') stats.movies++;
              else if (contentType === 'series') stats.series++;
              
              stats.total++;

              // Detailed logging for classification (every 1000 items)
              if (stats.total % 1000 === 0) {
                console.log(`[m3uStreamParser] Classification sample at item ${stats.total}: "${metadata.name}" -> ${contentType} (group: "${metadata.groupTitle}")`);
              }

              // Periodic progress update
              if (lineNumber % 10 === 0 && onProgress) {
                onProgress(lineNumber, stats);
              }

              currentExtinf = null;

            } catch (error) {
              console.error(`Error processing line ${lineNumber}:`, error);
              stats.errors++;
              currentExtinf = null;
            }
          }
        }
      }
    }

    // Final progress update
    if (onProgress) {
      onProgress(lineNumber, stats);
    }

    console.log(`[m3uStreamParser] ✅ M3U parsing completed. Channels: ${stats.channels}, Movies: ${stats.movies}, Series: ${stats.series}, Total: ${stats.total}`);

    // Clear duplicate tracker
    duplicateDetector.clearPlaylist(playlistId);

    return stats;

  } catch (error) {
    console.error('[m3uStreamParser] ❌ Error streaming M3U:', error);
    duplicateDetector.clearPlaylist(playlistId);
    throw error;
  }
};

export default {
  streamParseM3U,
};
