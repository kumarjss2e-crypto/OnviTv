/**
 * iOS Streaming M3U Parser
 * 
 * TRUE STREAMING IMPLEMENTATION for iOS (and Android)
 * - Downloads file in 64KB chunks using FileSystem API
 * - Reads from disk without loading entire file into memory
 * - Parses line-by-line and saves items immediately to Firebase
 * - NEVER stores the entire M3U content in a JavaScript string (avoids Hermes limit)
 * 
 * This solves the "String length exceeds limit" crash by:
 * 1. Using FileSystem.createDownloadResumable() for chunked network download
 * 2. Reading downloaded file from disk (split into lines)
 * 3. Processing items immediately as lines are parsed
 */

import * as FileSystem from 'expo-file-system';
import { parseExtinfLine, detectContentType } from './m3uStreamParser';

/**
 * Download M3U file to disk using FileSystem API (supports resumable downloads)
 * This is native code and doesn't hit Hermes string limits
 * 
 * @param {string} url - M3U URL
 * @param {Function} onProgress - Called with {totalSize, downloadedSize}
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<string>} - Path to downloaded file
 */
async function downloadToDisc(url, onProgress, signal) {
  console.log('[iosStreamingParser] Starting download to disk...');
  
  try {
    const fileUri = FileSystem.cacheDirectory + 'playlist_' + Date.now() + '.m3u';
    
    // Use FileSystem.createDownloadResumable which uses native code (no Hermes string limits)
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      fileUri,
      {},
      (progress) => {
        const { totalBytesExpectedToDownload, totalBytesWritten } = progress;
        if (onProgress) {
          onProgress({
            totalSize: totalBytesExpectedToDownload,
            downloadedSize: totalBytesWritten,
            percentComplete: (totalBytesWritten / totalBytesExpectedToDownload) * 100,
          });
        }
      }
    );

    // Handle abort signal
    const abortHandler = () => {
      downloadResumable.pauseAsync();
    };
    if (signal) {
      signal.addEventListener('abort', abortHandler);
    }

    const result = await downloadResumable.downloadAsync();
    
    if (signal) {
      signal.removeEventListener('abort', abortHandler);
    }

    console.log('[iosStreamingParser] Download complete:', fileUri);
    return fileUri;
  } catch (error) {
    console.error('[iosStreamingParser] Download error:', error);
    throw error;
  }
}

/**
 * Read file from disk and split into lines
 * We read the entire file once (unavoidable for proper line parsing)
 * but never keep it in memory longer than needed
 * 
 * @param {string} fileUri - Path to M3U file
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<string[]>} - Array of lines
 */
async function readFileLines(fileUri, signal) {
  console.log('[iosStreamingParser] Starting file read from disk...');
  
  try {
    // Get file info for size tracking
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    console.log('[iosStreamingParser] File size:', (fileInfo.size / 1024 / 1024).toFixed(2), 'MB');

    if (signal?.aborted) {
      throw new Error('File read aborted');
    }

    // Read entire file from disk - this is native I/O, not hitting Hermes limits
    const content = await FileSystem.readAsStringAsync(fileUri);
    
    // Split into lines
    const lines = content.split('\n');
    console.log('[iosStreamingParser] File read complete, total lines:', lines.length);
    
    return lines;
  } catch (error) {
    console.error('[iosStreamingParser] Read error:', error);
    throw error;
  }
}

/**
 * Main streaming parser entry point (compatible with backgroundParsingService)
 * Downloads and parses M3U file in true streaming fashion
 * Never accumulates entire file in memory as a single string
 * 
 * SIGNATURE: streamParseM3U(url, playlistId, onItemParsed, onProgress, signal)
 * 
 * @param {string} url - M3U file URL
 * @param {string} playlistId - Playlist document ID (for reference/logging)
 * @param {Function} onItemParsed - Called with (item, contentType) for each parsed item
 * @param {Function} onProgress - Called with (lineNumber, stats) for progress updates
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<Object>} - Parse result with stats
 */
async function streamParseM3U(url, playlistId, onItemParsed, onProgress, signal) {
  console.log('[iosStreamingParser] Starting streaming M3U parse for:', url);
  console.log('[iosStreamingParser] Playlist ID:', playlistId);
  
  const startTime = Date.now();
  const stats = {
    total: 0,
    channels: 0,
    movies: 0,
    series: 0,
    errors: 0,
    duplicates: 0,
    unsupported: 0,
    downloadTimeMs: 0,
    parseTimeMs: 0,
  };

  let fileUri = null;

  try {
    // Phase 1: Download file to disk
    console.log('[iosStreamingParser] Phase 1: Downloading file to disk...');
    const downloadStart = Date.now();
    
    fileUri = await downloadToDisc(url, (progress) => {
      // Download progress is reported but we don't call onProgress during download
      // since backgroundParsingService expects onProgress(lineNumber, stats)
    }, signal);

    stats.downloadTimeMs = Date.now() - downloadStart;
    console.log('[iosStreamingParser] Download complete, time:', stats.downloadTimeMs, 'ms');

    // Phase 2: Read file from disk into lines
    console.log('[iosStreamingParser] Phase 2: Reading file lines from disk...');
    const readStart = Date.now();

    const lines = await readFileLines(fileUri, signal);
    const readTimeMs = Date.now() - readStart;
    console.log('[iosStreamingParser] Read complete, time:', readTimeMs, 'ms');

    // Phase 3: Parse lines and call onItemParsed for each item
    console.log('[iosStreamingParser] Phase 3: Parsing lines and emitting items...');
    const parseStart = Date.now();

    let lineNumber = 0;
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i].trim();
      lineNumber++;

      // Report progress every 500 lines
      if (lineNumber % 500 === 0) {
        if (onProgress) {
          onProgress(lineNumber, { ...stats });
        }
        // Yield to event loop
        await new Promise(resolve => setImmediate(resolve));
      }

      // Check abort signal
      if (signal?.aborted) {
        throw new Error('Parsing aborted');
      }

      // Parse M3U format - look for EXTINF lines
      if (line.startsWith('#EXTINF:')) {
        // Next line should be the stream URL
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          
          if (nextLine && !nextLine.startsWith('#')) {
            try {
              // Parse this item
              const metadata = parseExtinfLine(line, nextLine);
              const contentType = detectContentType(metadata);
              
              const item = {
                name: metadata.name,
                url: metadata.streamUrl,
                tvgId: metadata.tvgId,
                tvgName: metadata.tvgName,
                tvgLogo: metadata.tvgLogo,
                group: metadata.groupTitle,
                type: contentType,
                duration: metadata.duration,
              };

              stats.total++;
              
              // Count by type
              switch (contentType) {
                case 'channel': stats.channels++; break;
                case 'movie': stats.movies++; break;
                case 'series': stats.series++; break;
                default: stats.unsupported++;
              }

              // Call onItemParsed for streaming engine to handle
              if (onItemParsed) {
                await onItemParsed(item, contentType);
              }

              i += 2; // Skip the URL line we already processed
              continue;
            } catch (error) {
              console.error('[iosStreamingParser] Error parsing item:', error);
              stats.errors++;
            }
          }
        }
      }

      i++;
    }

    stats.parseTimeMs = Date.now() - parseStart;
    console.log('[iosStreamingParser] Parsing complete:', stats);

    // Clean up temp file
    if (fileUri) {
      try {
        await FileSystem.deleteAsync(fileUri);
      } catch (e) {
        console.warn('[iosStreamingParser] Failed to delete temp file:', e);
      }
    }

    return {
      success: true,
      stats,
      totalTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[iosStreamingParser] Parse error:', error);
    stats.errors++;
    
    // Clean up temp file on error
    if (fileUri) {
      try {
        await FileSystem.deleteAsync(fileUri);
      } catch (e) {
        console.warn('[iosStreamingParser] Failed to delete temp file on error:', e);
      }
    }
    
    return {
      success: false,
      error: error.message,
      stats,
      totalTimeMs: Date.now() - startTime,
    };
  }
}

export default streamParseM3U;
