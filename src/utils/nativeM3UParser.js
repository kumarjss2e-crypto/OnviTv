/**
 * JavaScript Bridge for Native M3U Streaming Parser
 * 
 * Wraps the native iOS Swift module that uses URLSession.bytes()
 * for true streaming M3U parsing without downloading entire file
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const M3UStreamParserModule = NativeModules.M3UStreamParser;
const eventEmitter = new NativeEventEmitter(M3UStreamParserModule);

/**
 * Parse M3U file using native streaming
 * Returns promise that resolves when parsing completes
 * 
 * @param {string} url - M3U file URL
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.onChannel - Called with (channel) for each parsed item
 * @param {Function} callbacks.onProgress - Called with (parsed, estimated) for progress
 * @param {Function} callbacks.onError - Called with (error) on error
 * @param {AbortSignal} signal - Abort signal to cancel parsing
 * @returns {Promise<Object>} - Parse result with stats
 */
export async function parseM3UStream(url, callbacks, signal) {
  if (Platform.OS !== 'ios') {
    throw new Error('M3U streaming parser only available on iOS');
  }

  if (!M3UStreamParserModule) {
    throw new Error('Native M3UStreamParser module not available');
  }

  return new Promise((resolve, reject) => {
    // Set up event listeners
    const channelSubscription = eventEmitter.addListener(
      'onChannelFound',
      (channel) => {
        if (callbacks?.onChannel) {
          callbacks.onChannel(channel);
        }
      }
    );

    const progressSubscription = eventEmitter.addListener(
      'onProgress',
      ({ current, total }) => {
        if (callbacks?.onProgress) {
          callbacks.onProgress(current, total);
        }
      }
    );

    const errorSubscription = eventEmitter.addListener(
      'onError',
      (error) => {
        cleanup();
        if (callbacks?.onError) {
          callbacks.onError(error);
        }
        reject(new Error(error));
      }
    );

    const completeSubscription = eventEmitter.addListener(
      'onComplete',
      () => {
        cleanup();
      }
    );

    // Handle abort signal
    const abortHandler = () => {
      console.log('[nativeM3UParser] Parsing aborted');
      cleanup();
      reject(new Error('Parsing aborted'));
    };

    if (signal) {
      signal.addEventListener('abort', abortHandler);
    }

    // Clean up listeners
    const cleanup = () => {
      channelSubscription?.remove?.();
      progressSubscription?.remove?.();
      errorSubscription?.remove?.();
      completeSubscription?.remove?.();
      if (signal) {
        signal.removeEventListener('abort', abortHandler);
      }
    };

    // Call native parser
    M3UStreamParserModule.parseM3U(url, null)
      .then((result) => {
        cleanup();
        resolve(result);
      })
      .catch((error) => {
        cleanup();
        reject(error);
      });
  });
}

/**
 * Parse M3U stream with backgroundParsingService compatible interface
 * 
 * SIGNATURE: parseM3UStreamNative(url, playlistId, onItemParsed, onProgress, signal)
 * Matches the interface expected by backgroundParsingService
 * 
 * @param {string} url - M3U file URL
 * @param {string} playlistId - Playlist ID (for logging)
 * @param {Function} onItemParsed - Called with (item, contentType) for each parsed item
 * @param {Function} onProgress - Called with (lineNumber, stats) for progress updates
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<Object>} - Parse result
 */
export async function parseM3UStreamNative(
  url,
  playlistId,
  onItemParsed,
  onProgress,
  signal
) {
  if (Platform.OS !== 'ios') {
    // Fall back to JavaScript parser on Android/Web
    console.log('[nativeM3UParser] Platform is not iOS, native parser unavailable');
    throw new Error('Native parser only available on iOS');
  }

  console.log('[nativeM3UParser] Starting native M3U stream parse');
  console.log('[nativeM3UParser] Playlist ID:', playlistId);
  console.log('[nativeM3UParser] URL:', url);

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

  let lineNumber = 0;

  try {
    const result = await parseM3UStream(
      url,
      {
        onChannel: (channel) => {
          lineNumber++;

          // Update stats
          stats.total++;
          switch (channel.type) {
            case 'channel':
              stats.channels++;
              break;
            case 'movie':
              stats.movies++;
              break;
            case 'series':
              stats.series++;
              break;
            default:
              stats.unsupported++;
          }

          // Report progress every 100 items
          if (lineNumber % 100 === 0 && onProgress) {
            onProgress(lineNumber, { ...stats });
          }

          // Convert native channel to app item format
          const item = {
            name: channel.name || '',
            url: channel.url,
            tvgId: channel.tvgId,
            tvgName: channel.tvgName,
            tvgLogo: channel.tvgLogo,
            group: channel.group,
            type: channel.type,
            duration: channel.duration,
          };

          // Call app's item callback
          if (onItemParsed) {
            onItemParsed(item, channel.type);
          }
        },
        onProgress: (parsed, estimated) => {
          // Native module reports progress separately if needed
        },
        onError: (error) => {
          console.error('[nativeM3UParser] Stream error:', error);
          stats.errors++;
        },
      },
      signal
    );

    // Final stats from native module
    if (result?.stats) {
      stats.total = result.stats.total || stats.total;
      stats.channels = result.stats.channels || stats.channels;
      stats.movies = result.stats.movies || stats.movies;
      stats.series = result.stats.series || stats.series;
      stats.parseTimeMs = result.stats.durationMs || 0;
    }

    console.log('[nativeM3UParser] Parse complete:', stats);

    return {
      success: true,
      stats,
      totalTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[nativeM3UParser] Parse error:', error);
    stats.errors++;

    return {
      success: false,
      error: error.message,
      stats,
      totalTimeMs: Date.now() - startTime,
    };
  }
}

export default parseM3UStreamNative;
