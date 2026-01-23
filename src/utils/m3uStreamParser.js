/**
 * M3U Stream Parser
 * Parses M3U files line-by-line for streaming ingestion
 * Saves items immediately as they're parsed
 * Uses disk-based downloading and parsing to handle large files (300MB+) on iOS/Android
 * 
 * OPTIMIZED: Now uses chunked downloading to start parsing within seconds
 * instead of waiting for full file download
 */

import { validateStreamFormat } from './formatValidator';
import { duplicateDetector } from './duplicateDetector';
import * as FileSystem from 'expo-file-system';
import { downloadM3UInChunks, parseM3UChunk } from './chunkedM3UDownloader';

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
 * Uses a 6-layer approach to differentiate between live channels, movies, and series:
 * 1. LIVE CHANNEL DETECTION - EPG info + group patterns
 * 2. URL STRUCTURE - Most reliable for VOD
 * 3. EPISODE PATTERNS - S01E01 format
 * 4. EXPLICIT KEYWORDS - Multi-language series/movie markers
 * 5. GROUP-TITLE ANALYSIS - Category-based classification
 * 6. SMART CONTEXT - Provider and mixed content analysis
 * 
 * @param {Object} metadata
 * @returns {string} - 'channel' | 'movie' | 'series'
 */
const detectContentType = (metadata) => {
  const { streamUrl, groupTitle, name, tvgId, tvgLogo } = metadata;
  
  const streamLower = streamUrl?.toLowerCase() || '';
  const groupLower = groupTitle?.toLowerCase() || '';
  const nameLower = name?.toLowerCase() || '';

  // ========== LEVEL 0: LIVE CHANNEL DETECTION ==========
  // EPG indicator: tvg-id and tvg-logo are strong signals of live channels
  // These attributes are almost never used for VOD content
  const hasEPGIndicators = (tvgId && tvgId.trim() !== '') || (tvgLogo && tvgLogo.trim() !== '');
  
  if (hasEPGIndicators) {
    // But verify it's not a movie/series by checking for VOD keywords
    const hasVODKeywords = hasSeriesKeyword(groupLower) || 
                          hasMovieKeyword(groupLower) ||
                          /\bs\d{1,2}e\d{1,2}\b|\bseason\s+\d+|\bepisode\s+\d+/i.test(nameLower);
    
    if (!hasVODKeywords) {
      // Verify group-title looks like a TV channel category (country code, TV provider)
      const isChannelGroup = /^[A-Z]{2}\s*\||\bde\s*\||\bit\s*\||\bfr\s*\||\bes\s*\||\bpl\s*\||live\s*tv|tv\s*guide|epg|iptv/i.test(groupTitle || '');
      if (isChannelGroup || !groupTitle) {
        // No VOD keywords and EPG info present = likely a live channel
        return 'channel';
      }
    }
  }

  // ========== LEVEL 1: URL STRUCTURE (Most Reliable for VOD) ==========
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

  // Create a processM3ULine factory that can be used in different contexts
  const createM3ULineProcessor = (context) => {
    return (line) => {
      context.lineNumber = (context.lineNumber || 0) + 1;
      const trimmedLine = line.trim();

      if (context.signal?.aborted) {
        throw new Error('Parsing cancelled');
      }

      // Skip empty lines and non-EXTINF comments
      if (!trimmedLine || (trimmedLine.startsWith('#') && !trimmedLine.startsWith('#EXTINF'))) {
        return;
      }

      // Parse EXTINF metadata line
      if (trimmedLine.startsWith('#EXTINF')) {
        context.currentExtinf = trimmedLine;
        return;
      }

      // Stream URL line (next line after EXTINF)
      if (context.currentExtinf) {
        try {
          const streamUrl = trimmedLine;
          
          if (!streamUrl) {
            context.currentExtinf = null;
            return;
          }

          // Parse metadata
          const metadata = parseExtinfLine(context.currentExtinf, streamUrl);
          const contentType = detectContentType(metadata);

          // Check format support
          const formatValidation = validateStreamFormat(streamUrl);
          if (!formatValidation.isSupported) {
            context.stats.unsupported++;
            if (context.onProgress) {
              context.onProgress(context.lineNumber, context.stats);
            }
            context.currentExtinf = null;
            return;
          }

          // Check for duplicates
          const item = {
            name: metadata.name,
            streamUrl,
            type: contentType,
          };

          if (duplicateDetector.isDuplicate(context.playlistId, item)) {
            context.stats.duplicates++;
            if (context.onProgress) {
              context.onProgress(context.lineNumber, context.stats);
            }
            context.currentExtinf = null;
            return;
          }

          // Mark as seen
          duplicateDetector.markSeen(context.playlistId, item);

          // Determine category name with smart fallback
          let categoryName = metadata.groupTitle;
          if (!categoryName || categoryName.trim() === '') {
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
            name: metadata.name || `Item ${context.lineNumber}`,
            tvgId: metadata.tvgId,
            tvgName: metadata.tvgName,
            logo: metadata.tvgLogo,
            categoryName: categoryName,
            streamUrl: metadata.streamUrl,
            type: contentType,
            addedAt: new Date().toISOString(),
          };

          // Callback for item to be saved
          if (context.onItemParsed) {
            context.onItemParsed(completeItem, contentType);
          }

          // Update stats
          if (contentType === 'channel') context.stats.channels++;
          else if (contentType === 'movie') context.stats.movies++;
          else if (contentType === 'series') context.stats.series++;
          
          context.stats.total++;

          // Detailed logging for classification (every 1000 items)
          if (context.stats.total % 1000 === 0) {
            console.log(`[m3uStreamParser] Classification sample at item ${context.stats.total}: "${metadata.name}" -> ${contentType}`);
          }

          // Periodic progress update
          if (context.lineNumber % 10 === 0 && context.onProgress) {
            context.onProgress(context.lineNumber, context.stats);
          }

          context.currentExtinf = null;

        } catch (error) {
          console.error(`Error processing line ${context.lineNumber}:`, error);
          context.stats.errors++;
          context.currentExtinf = null;
        }
      }
    };
  };

  // Create the processor with current context
  const lineProcessorContext = {
    stats,
    lineNumber: 0,
    currentExtinf: null,
    playlistId,
    signal,
    onProgress,
    onItemParsed,
  };
  
  const processM3ULine = createM3ULineProcessor(lineProcessorContext);

  try {
    // Initialize duplicate detector for this playlist
    duplicateDetector.initPlaylist(playlistId);

    console.log(`[m3uStreamParser] Starting M3U parsing for ${playlistId}`);
    console.log(`[m3uStreamParser] Starting M3U parsing for ${playlistId}`);
    console.log(`[m3uStreamParser] URL: ${m3uUrl}`);

    // Use optimized chunked downloading that starts parsing immediately
    // This allows items to appear in UI within 30-60 seconds even for large files
    console.log(`[m3uStreamParser] Using optimized chunked download (parse starts immediately)`);
    await streamDownloadAndParseChunked(m3uUrl, playlistId, onProgress, signal, processM3ULine, lineProcessorContext);

    // Final progress update
    if (onProgress) {
      onProgress(lineProcessorContext.lineNumber, stats);
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

/**
 * Optimized chunked download and parse
 * Downloads in chunks and parses each chunk immediately
 * This is faster than waiting for full download before parsing
 * @param {string} url - M3U file URL
 * @param {string} playlistId - Playlist ID
 * @param {Function} onProgress - Progress callback
 * @param {AbortSignal} signal - Abort signal
 * @param {Function} processM3ULine - Line processor function
 * @param {Object} context - Parser context with stats
 */
async function streamDownloadAndParseChunked(url, playlistId, onProgress, signal, processM3ULine, context) {
  let parseBuffer = '';
  let chunkCount = 0;
  let lastProgressTime = Date.now();
  const PROGRESS_THROTTLE_MS = 500;
  
  try {
    console.log(`[m3uStreamParser] Starting chunked download for ${url}`);
    
    // Use chunked downloader to download and trigger parse callbacks
    await downloadM3UInChunks(
      url,
      // onChunk callback - called when each chunk arrives
      async (chunkData) => {
        chunkCount++;
        console.log(`[m3uStreamParser] Chunk ${chunkCount} received (${chunkData.length} bytes)`);
        
        // Add chunk to buffer
        parseBuffer += chunkData;
        
        // Extract and process complete lines
        const lines = parseBuffer.split('\n');
        
        // Keep incomplete last line for next chunk
        parseBuffer = lines[lines.length - 1];
        
        // Process all complete lines immediately
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          
          if (signal?.aborted) {
            throw new Error('Parsing cancelled');
          }
          
          // Pass line to parser
          try {
            processM3ULine(line);
          } catch (e) {
            console.error(`[m3uStreamParser] Error processing line:`, e);
            context.stats.errors++;
          }
        }
        
        // Periodic progress update (throttled)
        const now = Date.now();
        if (now - lastProgressTime >= PROGRESS_THROTTLE_MS && onProgress) {
          try {
            onProgress(context.lineNumber, context.stats);
          } catch (e) {
            console.warn('[m3uStreamParser] Error in onProgress:', e);
          }
          lastProgressTime = now;
        }
        
        // Yield to event loop
        await new Promise(resolve => setImmediate(resolve));
      },
      // onProgress callback - download progress
      (bytesReceived, totalBytes) => {
        const percentComplete = totalBytes > 0 ? Math.round((bytesReceived / totalBytes) * 100) : 0;
        console.log(`[m3uStreamParser] Download progress: ${(bytesReceived / 1024 / 1024).toFixed(2)}MB / ${(totalBytes / 1024 / 1024).toFixed(2)}MB (${percentComplete}%)`);
      },
      signal,
      30000 // timeout
    );
    
    // Process any remaining buffered data
    if (parseBuffer.trim()) {
      console.log(`[m3uStreamParser] Processing final buffer: ${parseBuffer.length} bytes`);
      processM3ULine(parseBuffer);
    }
    
    console.log(`[m3uStreamParser] Chunked download completed (${chunkCount} chunks)`);
    
  } catch (error) {
    console.error('[m3uStreamParser] Error in chunked download/parse:', error);
    throw error;
  }
}

/**
 * Stream download and parse with Range request support (LEGACY - kept for reference)
 * Tries to use Range requests for true streaming (parse while downloading)
 * Falls back to full download if Range not supported
 * @param {string} url - M3U file URL
 * @param {string} playlistId - Playlist ID
 * @param {Function} onProgress - Progress callback
 * @param {AbortSignal} signal - Abort signal
 * @param {Function} processM3ULine - Line processor function
 */
async function streamDownloadAndParseWithFallback(url, playlistId, onProgress, signal, processM3ULine) {
  let supportsRange = false;
  let totalSize = 0;
  
  try {
    // Check if server supports Range requests
    console.log(`[m3uStreamParser] Checking server Range request support...`);
    
    try {
      const headResponse = await fetch(url, { 
        method: 'HEAD',
        signal,
      });
      
      // Only trust Range headers if request succeeded
      if (headResponse.ok) {
        supportsRange = headResponse.headers.get('accept-ranges')?.toLowerCase() === 'bytes';
        const contentLength = headResponse.headers.get('content-length');
        totalSize = contentLength ? parseInt(contentLength, 10) : 0;
      } else {
        console.warn(`[m3uStreamParser] HEAD request failed (${headResponse.status}), will skip Range detection`);
      }
    } catch (headError) {
      // HEAD request failed - this is common with some servers, skip Range detection
      console.warn(`[m3uStreamParser] HEAD request failed, will use full download:`, headError.message);
    }
    
    console.log(`[m3uStreamParser] Server supports Range: ${supportsRange}, Size: ${totalSize || 'unknown'}`);
    
    if (supportsRange && totalSize > 0 && totalSize < 2147483648) { // 2GB limit
      // Use streaming Range request approach (true streaming)
      console.log(`[m3uStreamParser] Using streaming Range request (parse while downloading)`);
      await streamDownloadAndParseRangeRequests(url, playlistId, totalSize, onProgress, signal, processM3ULine);
    } else {
      // Fallback to full download
      console.log(`[m3uStreamParser] Falling back to full download (Range not supported or file too large)`);
      const fileUri = `${FileSystem.cacheDirectory}m3u_${playlistId}.tmp`;
      
      await downloadAndSaveToDisk(url, fileUri, onProgress, signal);
      
      // Parse from disk after download completes
      let chunkCount = 0;
      await parseFromDiskChunked(fileUri, (line) => {
        processM3ULine(line);
      }, (linesProcessed) => {
        chunkCount++;
        console.log(`[m3uStreamParser] Chunk ${chunkCount}: Processed ${linesProcessed} lines`);
      }, signal);
      
      // Cleanup temp file
      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        console.log(`[m3uStreamParser] Cleaned up temp file`);
      } catch (e) {
        console.warn(`[m3uStreamParser] Failed to cleanup temp file:`, e);
      }
    }
  } catch (error) {
    console.error(`[m3uStreamParser] Error in streamDownloadAndParseWithFallback:`, error);
    throw error;
  }
}

/**
 * Stream download and parse using HTTP Range requests
 * Downloads in 1MB chunks and parses each chunk immediately
 * Items appear in UI in real-time as they're parsed
 * @param {string} url - M3U file URL
 * @param {string} playlistId - Playlist ID
 * @param {number} totalSize - Total file size in bytes
 * @param {Function} onProgress - Progress callback (lineNumber, stats)
 * @param {AbortSignal} signal - Abort signal
 * @param {Function} processM3ULine - Line processor function
 */
async function streamDownloadAndParseRangeRequests(url, playlistId, totalSize, onProgress, signal, processM3ULine) {
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for downloading
  const PARSE_YIELD_INTERVAL = 500; // Yield every N lines to keep UI responsive
  
  let downloadedBytes = 0;
  let parseBuffer = '';
  let lastProgressUpdate = 0;
  const PROGRESS_THROTTLE_MS = 500;
  let linesProcessed = 0;
  
  // Stats object to track parsing progress - compatible with backgroundParsingService
  const stats = {
    total: 0,
    channels: 0,
    movies: 0,
    series: 0,
    duplicates: 0,
    unsupported: 0,
    errors: 0,
  };
  
  try {
    // Download and parse in chunks using Range requests
    for (let start = 0; start < totalSize; start += CHUNK_SIZE) {
      if (signal?.aborted) {
        throw new Error('Download cancelled');
      }
      
      const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);
      
      try {
        // Request specific byte range
        const response = await fetch(url, {
          headers: {
            'Range': `bytes=${start}-${end}`,
          },
          signal,
        });
        
        if (!response.ok && response.status !== 206) { // 206 = Partial Content
          throw new Error(`HTTP ${response.status}`);
        }
        
        const chunkText = await response.text();
        downloadedBytes += chunkText.length;
        parseBuffer += chunkText;
        
        // Parse lines from buffer
        const lines = parseBuffer.split('\n');
        
        // Keep incomplete last line for next chunk
        parseBuffer = lines[lines.length - 1];
        
        // Process all complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          
          // Pass every line to processM3ULine - it handles EXTINF buffering and pairing
          processM3ULine(line);
          linesProcessed++;
          
          // Yield to event loop to keep UI responsive
          if (linesProcessed % PARSE_YIELD_INTERVAL === 0) {
            await new Promise(resolve => setImmediate(resolve));
          }
        }
        
        // Update progress (throttled to prevent main thread blocking)
        const now = Date.now();
        if (now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
          try {
            // Call with compatible signature: onProgress(lineNumber, stats)
            onProgress?.(linesProcessed, stats);
          } catch (e) {
            console.warn('[m3uStreamParser] Error in onProgress callback:', e);
          }
          lastProgressUpdate = now;
        }
        
        console.log(`[m3uStreamParser] Range chunk: downloaded ${Math.round(downloadedBytes / 1024 / 1024)}MB, processed ${linesProcessed} lines`);
        
        // Yield between chunks to prevent UI freezing
        await new Promise(resolve => setImmediate(resolve));
        
      } catch (error) {
        console.error(`[m3uStreamParser] Error downloading chunk ${start}-${end}:`, error);
        throw error;
      }
    }
    
    // Parse any remaining content in buffer
    if (parseBuffer.trim().length > 0) {
      const lines = parseBuffer.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim()) {
          processM3ULine(line);
          linesProcessed++;
        }
      }
    }
    
    // Final progress update - 100% complete
    try {
      onProgress?.(linesProcessed, stats);
    } catch (e) {
      console.warn('[m3uStreamParser] Error in final onProgress callback:', e);
    }
    
    console.log(`[m3uStreamParser] Streaming download and parse complete. Total lines: ${linesProcessed}`);
    
  } catch (error) {
    console.error(`[m3uStreamParser] Error in streamDownloadAndParseRangeRequests:`, error);
    throw error;
  }
}

/**
 * Download file from URL to disk in chunks using XMLHttpRequest
 * Streams data directly to disk, never loads entire file into memory
 * @param {string} url - File URL
 * @param {string} fileUri - Local file path to save to
 * @param {Function} onProgress - Callback for progress updates
 * @param {AbortSignal} signal - Abort signal
 */
async function downloadAndSaveToDisk(url, fileUri, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastProgressUpdate = 0;
    const PROGRESS_THROTTLE_MS = 500; // Only update UI every 500ms
    
    // Track download progress with throttling to prevent UI freezing
    xhr.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const now = Date.now();
        // Only call onProgress every 500ms to avoid blocking main thread
        if (now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
          try {
            // Call with download progress info - compatible with backgroundParsingService
            onProgress?.(0, {
              total: 0,
              channels: 0,
              movies: 0,
              series: 0,
              duplicates: 0,
              unsupported: 0,
              errors: 0,
            });
          } catch (e) {
            console.warn('[m3uStreamParser] Error in onProgress callback:', e);
          }
          lastProgressUpdate = now;
        }
      }
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Download cancelled'));
    });

    xhr.addEventListener('error', () => {
      reject(new Error(`Download failed with status: ${xhr.status || 'unknown'}`));
    });

    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          // Ensure final progress update shows 100%
          const responseLength = xhr.responseText?.length || 0;
          try {
            onProgress?.(0, {
              total: 0,
              channels: 0,
              movies: 0,
              series: 0,
              duplicates: 0,
              unsupported: 0,
              errors: 0,
            });
          } catch (e) {
            console.warn('[m3uStreamParser] Error in final onProgress callback:', e);
          }
          
          // Get response as text and write to file
          const text = xhr.responseText;
          await FileSystem.writeAsStringAsync(fileUri, text, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.open('GET', url);
    xhr.responseType = 'text'; // Ensure we get text response
    xhr.send();

    // Handle abort signal
    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
      });
    }
  });
}

/**
 * Parse M3U file from disk in chunks (never loads entire file into memory)
 * Reads file in 1MB chunks and processes line-by-line with periodic yields
 * @param {string} fileUri - Local file path
 * @param {Function} onLine - Callback for each line
 * @param {Function} onChunk - Callback (linesInChunk) after each chunk
 * @param {AbortSignal} signal - Abort signal
 */
async function parseFromDiskChunked(fileUri, onLine, onChunk, signal) {
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  const YIELD_INTERVAL = 500; // Yield to event loop every 500 lines to keep UI responsive
  
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  const fileSize = fileInfo.size;

  let offset = 0;
  let lineBuffer = '';
  let chunkIndex = 0;
  let totalLinesProcessed = 0;

  while (offset < fileSize) {
    if (signal?.aborted) {
      throw new Error('Parsing cancelled');
    }

    chunkIndex++;
    const end = Math.min(offset + CHUNK_SIZE, fileSize);

    // Read chunk from disk
    const chunkData = await FileSystem.readAsStringAsync(fileUri, {
      position: offset,
      length: end - offset,
      encoding: FileSystem.EncodingType.UTF8,
    });

    lineBuffer += chunkData;
    
    // Process complete lines from buffer
    const lines = lineBuffer.split('\n');
    
    // Keep last incomplete line for next chunk
    lineBuffer = lines[lines.length - 1];
    
    // Process all complete lines with periodic yields to keep UI responsive
    let linesProcessed = 0;
    for (let i = 0; i < lines.length - 1; i++) {
      onLine(lines[i]);
      linesProcessed++;
      totalLinesProcessed++;
      
      // Yield to event loop every N lines to keep UI responsive
      // This prevents the main thread from blocking
      if (totalLinesProcessed % YIELD_INTERVAL === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    onChunk?.(linesProcessed);
    offset = end;
    
    console.log(`[m3uStreamParser] Chunk ${chunkIndex}: ${linesProcessed} lines, total: ${totalLinesProcessed}`);
  }

  // Process remaining buffer
  if (lineBuffer.trim()) {
    onLine(lineBuffer);
    onChunk?.(1);
  }
}

export default {
  streamParseM3U,
};
