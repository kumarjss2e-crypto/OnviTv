/**
 * JavaScript Bridge for Native M3U Streaming Parser
 * 
 * Wraps the native iOS Swift module that uses URLSession.bytes()
 * for true streaming M3U parsing without downloading entire file
 * 
 * Falls back to JavaScript implementation if native module unavailable
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

let M3UStreamParserModule = null;
let eventEmitter = null;
let initAttempted = false;
let nativeModuleEnabled = false; // DISABLED: Causing crash on app startup

// Lazy-load native module only when explicitly requested via test
// This prevents crashes during app initialization
const initializeNativeModule = () => {
  if (initAttempted) {
    return M3UStreamParserModule;
  }

  initAttempted = true;

  // DISABLED: Native module is crashing the app on startup
  // You can enable via: setNativeModuleEnabled(true) in test component
  if (!nativeModuleEnabled) {
    console.log('[nativeM3UParser] Native module disabled (crashing on startup). Using JavaScript parser.');
    return null;
  }

  try {
    console.log('[nativeM3UParser] Attempting to initialize native module...');
    M3UStreamParserModule = NativeModules.M3UStreamParser;
    if (M3UStreamParserModule) {
      eventEmitter = new NativeEventEmitter(M3UStreamParserModule);
      console.log('[nativeM3UParser] ✓ Native module initialized successfully');
    } else {
      console.warn('[nativeM3UParser] Native module M3UStreamParser not found in NativeModules');
      console.warn('[nativeM3UParser] Available modules:', Object.keys(NativeModules).join(', '));
    }
  } catch (error) {
    console.error('[nativeM3UParser] ✗ Error initializing native module:', error.message);
    console.error('[nativeM3U Parser] Stack:', error.stack);
    M3UStreamParserModule = null;
  }

  return M3UStreamParserModule;
};

// Export function to enable native module for testing only
export const setNativeModuleEnabled = (enabled) => {
  nativeModuleEnabled = enabled;
  if (enabled) {
    initAttempted = false; // Reset so it initializes on next call
  }
};

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
  // Lazy-load native module only when called
  const module = initializeNativeModule();
  const emitter = eventEmitter;
  
  if (!module || !emitter) {
    throw new Error('Native M3UStreamParser module not available');
  }

  return new Promise((resolve, reject) => {
    // Set up event listeners
    const channelSubscription = emitter.addListener(
      'onChannelFound',
      (channel) => {
        if (callbacks?.onChannel) {
          callbacks.onChannel(channel);
        }
      }
    );

    const progressSubscription = emitter.addListener(
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
 * Tries native module first, falls back to JavaScript parser on failure
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
  // Lazy-load native module only when called
  const module = initializeNativeModule();
  
  // Check if native module is available on iOS
  if (Platform.OS !== 'ios' || !module) {
    console.log('[nativeM3UParser] Native module not available or not on iOS, using JavaScript parser');
    
    // Import and use JavaScript parser as fallback
    try {
      const { default: streamParseM3U } = await import('./iosStreamingParser');
      return streamParseM3U(url, playlistId, onItemParsed, onProgress, signal);
    } catch (importError) {
      console.error('[nativeM3UParser] Failed to import JavaScript parser:', importError);
      throw importError;
    }
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
    
    // Try to fall back to JavaScript parser on error
    console.log('[nativeM3UParser] Attempting fallback to JavaScript parser...');
    try {
      const { default: streamParseM3U } = await import('./iosStreamingParser');
      return streamParseM3U(url, playlistId, onItemParsed, onProgress, signal);
    } catch (fallbackError) {
      console.error('[nativeM3UParser] Fallback failed:', fallbackError);
      stats.errors++;
      return {
        success: false,
        error: error.message,
        stats,
        totalTimeMs: Date.now() - startTime,
      };
    }
  }
}

export default parseM3UStreamNative;
