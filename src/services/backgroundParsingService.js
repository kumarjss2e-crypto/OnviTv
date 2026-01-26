/**
 * Background Parsing Service
 * Manages parsing jobs with resume capability and network retry logic
 * Handles concurrent playlist parsing
 */

import { Platform } from 'react-native';
import parseM3UStreamNative from '../utils/nativeM3UParser';
import streamParseM3U from '../utils/iosStreamingParser';
import { streamParseXtream } from '../utils/xtreamStreamParser';
import { createParserEngine } from '../utils/streamingParserEngine';
import { db } from '../config/firebase';
import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs, increment, writeBatch, FieldPath } from 'firebase/firestore';

// In-memory job tracking
const activeJobs = new Map(); // playlistId -> {abortController, engine, stats}
const networkRetries = new Map(); // playlistId -> retryCount (resets on app restart)
const MAX_RETRIES_PER_SESSION = 4;
const RETRY_DELAY_BASE = 2000; // 2 seconds base delay
const NETWORK_CHECK_INTERVAL = 5000; // Check network every 5 seconds

// Callback system for listening to parsing events
const parseListeners = new Map(); // playlistId -> Set of callbacks

const addParseListener = (playlistId, callback) => {
  if (!parseListeners.has(playlistId)) {
    parseListeners.set(playlistId, new Set());
  }
  parseListeners.get(playlistId).add(callback);
  
  return () => {
    // Return unsubscribe function
    const listeners = parseListeners.get(playlistId);
    if (listeners) {
      listeners.delete(callback);
    }
  };
};

const notifyParseListeners = (playlistId, event) => {
  const listeners = parseListeners.get(playlistId);
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[backgroundParsingService] Error in parse listener:', error);
      }
    });
  }
};

/**
 * Check if device has network connectivity
 * @returns {Promise<boolean>}
 */
const hasNetworkConnection = async () => {
  try {
    // On web, check navigator.onLine as a quick fallback
    if (typeof window !== 'undefined' && 'onLine' in navigator) {
      if (!navigator.onLine) return false;
      
      // If navigator says we're online, assume we have connection on web
      // (avoid CORS issues with HEAD requests to external sites)
      return true;
    }
    
    // For non-web environments, try to reach a resource
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
 * Wait for network recovery with exponential backoff
 * @param {string} playlistId
 * @param {AbortSignal} signal
 * @returns {Promise<boolean>} - true if network recovered, false if aborted
 */
const waitForNetworkRecovery = async (playlistId, signal) => {
  let attempts = 0;
  const maxAttempts = 30; // Wait up to 2.5 minutes

  while (attempts < maxAttempts) {
    if (signal?.aborted) return false;

    if (await hasNetworkConnection()) {
      console.log('Network recovered');
      return true;
    }

    attempts++;
    const delayMs = NETWORK_CHECK_INTERVAL;
    console.log(`No network. Waiting ${delayMs}ms before retry (${attempts}/${maxAttempts})`);

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return false;
};

/**
 * Calculate exponential backoff delay
 * @param {number} retryCount
 * @returns {number} - Delay in milliseconds
 */
const getRetryDelay = (retryCount) => {
  return RETRY_DELAY_BASE * Math.pow(2, retryCount - 1);
};

/**
 * Initialize progress tracker document
 * @param {string} playlistId
 * @param {Object} playlistData
 * @param {boolean} isResume - Whether this is a resume of incomplete parse
 * @returns {Promise<void>}
 */
const initProgressTracker = async (playlistId, playlistData, isResume = false) => {
  try {
    // IMPORTANT: Set parseStatus on main playlist document FIRST
    // This ensures that if the app crashes, we can detect incomplete parses on restart
    const playlistRef = doc(db, 'playlists', playlistId);
    await updateDoc(playlistRef, {
      parseStatus: 'parsing',
      isParsing: true,
      updatedAt: new Date().toISOString(),
    }).catch(err => console.error('[backgroundParsingService] Error setting parseStatus:', err));

    const progressRef = doc(db, `playlists/${playlistId}/meta/progress`);
    
    // If resuming, fetch existing progress instead of resetting to 0
    if (isResume) {
      const existingProgress = await getDoc(progressRef);
      if (existingProgress.exists()) {
        const existingData = existingProgress.data();
        console.log('[backgroundParsingService] Resuming with existing progress:', existingData);
        
        // NOTE: Parser will re-parse from line 0, but unique ID + merge mode prevents duplicates:
        // - Items with same tvgId or content hash will update existing docs instead of creating new ones
        // - Stats are calculated from actual database counts, not accumulated
        // - This makes resume operations idempotent - can safely restart without data corruption
        
        // Just update status, keep existing counts
        await setDoc(progressRef, {
          ...existingData,
          status: 'parsing',
          resumedAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        }, { merge: true });
        return;
      }
    }
    
    // First-time parsing - initialize with zeros
    await setDoc(progressRef, {
      status: 'parsing',
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      lineNumber: 0,
      itemsProcessed: 0,
      itemsSaved: 0,
      channels: 0,
      movies: 0,
      series: 0,
      duplicates: 0,
      unsupported: 0,
      errors: 0,
      networkRetries: 0,
      parsingSource: playlistData.type, // 'm3u' or 'xtream'
    }, { merge: true });

  } catch (error) {
    console.error('Error initializing progress tracker:', error);
  }
};

/**
 * Update progress tracker
 * @param {string} playlistId
 * @param {Object} updates
 * @returns {Promise<void>}
 */
const updateProgress = async (playlistId, updates) => {
  try {
    // Update progress sub-document
    const progressRef = doc(db, `playlists/${playlistId}/meta/progress`);
    // Use set with merge to create document if it doesn't exist
    await setDoc(progressRef, {
      ...updates,
      lastUpdatedAt: new Date().toISOString(),
    }, { merge: true });

    // IMPORTANT: Don't update main playlist stats here - they should only be updated:
    // 1. In real-time by the streaming engine during batch flushes (stats.channels, stats.movies, stats.series are cumulative)
    // 2. At final completion with accurate final stats
    // Updating on every progress call causes stale/incorrect stats to be cached
  } catch (error) {
    console.error('Error updating progress:', error);
  }
};

/**
 * Find incomplete playlists for resume
 * @returns {Promise<Array>} - Array of playlist objects to resume
 */
const findIncompleteParses = async () => {
  try {
    const q = query(
      collection(db, 'playlists'),
      where('parseStatus', '==', 'parsing')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

  } catch (error) {
    console.error('Error finding incomplete parses:', error);
    return [];
  }
};

/**
 * Normalize and extract URL from playlist data
 * Handles both old format (m3uUrl key) and new format (m3uConfig object)
 */
const normalizePlaylistUrl = (playlistData) => {
  let m3uUrl = playlistData.m3uUrl;
  
  // If m3uUrl not found, try m3uConfig structure
  if (!m3uUrl && playlistData.m3uConfig?.url) {
    m3uUrl = playlistData.m3uConfig.url;
  }
  
  // Normalize URL - fix encoding issues
  if (m3uUrl) {
    const originalUrl = m3uUrl;
    m3uUrl = m3uUrl
      .replace(/&amp;/g, '&')
      .replace(/&#38;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .trim();
    
    if (originalUrl !== m3uUrl) {
      console.warn(`[backgroundParsingService] URL was corrupted, normalized:`, {
        before: originalUrl.substring(0, 80) + (originalUrl.length > 80 ? '...' : ''),
        after: m3uUrl.substring(0, 80) + (m3uUrl.length > 80 ? '...' : ''),
      });
    }
  }
  
  return m3uUrl;
};

/**
 * Start parsing a playlist
 * @param {string} playlistId
 * @param {Object} playlistData
 * @returns {Promise<Object>} - Parsing result
 */
const startParsing = async (playlistId, playlistData) => {
  try {
    console.log(`[backgroundParsingService] Starting parse for playlist: ${playlistId}`);
    console.log(`[backgroundParsingService] Playlist type: ${playlistData?.type}`);
    console.log(`[backgroundParsingService] Playlist name: ${playlistData?.name}`);
    console.log(`[backgroundParsingService] Playlist data keys:`, Object.keys(playlistData || {}));
    
    // Verify we have data
    if (!playlistData) {
      throw new Error('Playlist data is null or undefined');
    }
    
    // Check if we have the required URL/credentials
    if (playlistData.type === 'm3u') {
      // Normalize M3U URL - handles both m3uUrl and m3uConfig.url formats
      const normalizedUrl = normalizePlaylistUrl(playlistData);
      playlistData.m3uUrl = normalizedUrl;
      
      console.log(`[backgroundParsingService] M3U URL provided: ${playlistData.m3uUrl ? 'YES' : 'NO'}`);
      console.log(`[backgroundParsingService] Full M3U URL: ${playlistData.m3uUrl}`);
      if (!playlistData.m3uUrl) {
        throw new Error(`M3U URL is missing from playlist data. Available keys: ${Object.keys(playlistData).join(', ')}`);
      }
    } else if (playlistData.type === 'xtream') {
      console.log(`[backgroundParsingService] Xtream Server URL provided: ${playlistData.serverUrl ? 'YES' : 'NO'}`);
      console.log(`[backgroundParsingService] Full Xtream Server URL: ${playlistData.serverUrl}`);
      if (!playlistData.serverUrl) {
        throw new Error(`Xtream server URL is missing from playlist data. Available keys: ${Object.keys(playlistData).join(', ')}`);
      }
    }
    
    // Check if already parsing
    if (activeJobs.has(playlistId)) {
      console.warn(`[backgroundParsingService] Playlist ${playlistId} is already parsing`);
      return { success: false, error: 'Already parsing' };
    }

    // Initialize progress tracker
    console.log(`[backgroundParsingService] Initializing progress tracker...`);
    
    // Check if this is a resume (progress document already exists)
    const progressRef = doc(db, `playlists/${playlistId}/meta/progress`);
    const existingProgress = await getDoc(progressRef);
    const isResume = existingProgress.exists();
    
    await initProgressTracker(playlistId, playlistData, isResume);
    console.log(`[backgroundParsingService] Progress tracker initialized (isResume: ${isResume})`);

    // Create abort controller for this job
    const abortController = new AbortController();
    
    // Create onFirstBatchSaved callback
    const onFirstBatchSaved = () => {
      console.log(`[backgroundParsingService] First batch saved for ${playlistId}, notifying listeners`);
      notifyParseListeners(playlistId, { type: 'firstBatchSaved', playlistId });
    };
    
    const engine = createParserEngine(playlistId, (stats) => {
      // Update progress with actual saved stats from Firestore (already updated by engine)
      updateProgress(playlistId, {
        channels: stats.channels,
        movies: stats.movies,
        series: stats.series,
        itemsSaved: stats.totalWritten,
      });
    }, onFirstBatchSaved);

    // Store job reference
    activeJobs.set(playlistId, {
      abortController,
      engine,
      startTime: new Date(),
    });

    // Initialize network retry count for this session
    if (!networkRetries.has(playlistId)) {
      networkRetries.set(playlistId, 0);
    }

    // Determine parser based on playlist type
    let parseFunction;
    let parseArgs;

    if (playlistData.type === 'xtream') {
      parseFunction = streamParseXtream;
      parseArgs = [
        playlistData.serverUrl,
        playlistData.username,
        playlistData.password,
        playlistId,
      ];
    } else {
      // Default to M3U
      // Use native streaming parser on iOS for better performance
      // Fall back to JavaScript parser on Android/Web
      if (Platform.OS === 'ios') {
        console.log('[backgroundParsingService] Using native iOS streaming parser');
        parseFunction = parseM3UStreamNative;
      } else {
        console.log('[backgroundParsingService] Using JavaScript streaming parser');
        parseFunction = streamParseM3U;
      }
      parseArgs = [playlistData.m3uUrl, playlistId];
    }

    // Define callbacks
    const onItemParsed = async (item, contentType) => {
      const job = activeJobs.get(playlistId);
      if (job && !job.abortController.signal.aborted) {
        // Check if playlist still exists before writing
        try {
          const playlistRef = doc(db, 'playlists', playlistId);
          const playlistSnap = await getDoc(playlistRef);
          if (!playlistSnap.exists()) {
            console.log(`[backgroundParsingService] Playlist ${playlistId} was deleted, stopping parsing`);
            job.abortController.abort();
            return;
          }
        } catch (error) {
          console.error('[backgroundParsingService] Error checking playlist existence:', error);
          // Continue anyway, might be temporary network issue
        }
        
        await job.engine.addItem(item, contentType);
      }
    };

    let lastProgressLog = 0;
    const onProgress = async (lineNumber, stats) => {
      // Check if playlist still exists
      try {
        const playlistRef = doc(db, 'playlists', playlistId);
        const playlistSnap = await getDoc(playlistRef);
        if (!playlistSnap.exists()) {
          console.log(`[backgroundParsingService] Playlist ${playlistId} was deleted, stopping parsing`);
          const job = activeJobs.get(playlistId);
          if (job) {
            job.abortController.abort();
          }
          return;
        }
      } catch (error) {
        console.error('[backgroundParsingService] Error checking playlist existence:', error);
        // Continue anyway
      }

      // Log progress every 50 items
      if (lineNumber % 50 === 0) {
        console.log(`[backgroundParsingService] Progress - Line: ${lineNumber}, Total parsed: ${stats.total}, Channels: ${stats.channels}, Movies: ${stats.movies}, Series: ${stats.series}`);
      }

      // Update progress tracker with parsed counts (not saved stats - those are updated by engine callback)
      await updateProgress(playlistId, {
        lineNumber,
        itemsProcessed: stats.total,
        duplicates: stats.duplicates,
        unsupported: stats.unsupported,
        errors: stats.errors,
      });
    };

    // Execute parsing with retry logic
    let lastError;
    let retryCount = networkRetries.get(playlistId) || 0;

    console.log(`[backgroundParsingService] Starting parser execution (${playlistData.type.toUpperCase()})`);

    while (retryCount < MAX_RETRIES_PER_SESSION) {
      try {
        if (abortController.signal.aborted) {
          console.log(`[backgroundParsingService] Parsing aborted for ${playlistId}`);
          throw new Error('Parsing cancelled');
        }

        console.log(`[backgroundParsingService] Calling ${playlistData.type} parser for ${playlistId}...`);
        // Call parser
        const parserStats = await parseFunction(
          ...parseArgs,
          onItemParsed,
          onProgress,
          abortController.signal
        );

        console.log(`[backgroundParsingService] Parser completed. Stats:`, parserStats);

        // Finalize
        console.log(`[backgroundParsingService] Finalizing parse...`);
        await engine.finalize();
        console.log(`[backgroundParsingService] Parse finalized successfully`);

        // Get actual saved stats from engine (not parser, which includes filtered items)
        const engineStats = engine.getStats();
        console.log(`[backgroundParsingService] Engine stats (actual saved):`, engineStats);

        // Update playlist document with final stats from engine (only items actually saved)
        console.log(`[backgroundParsingService] Updating playlist document with final stats...`);
        await updateDoc(doc(db, 'playlists', playlistId), {
          stats: {
            totalChannels: engineStats.channels || 0,
            totalMovies: engineStats.movies || 0,
            totalSeries: engineStats.series || 0,
          },
          parseStatus: 'completed',
          isParsing: false,
          lastParseDate: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        }).catch(err => console.error('[backgroundParsingService] Error updating playlist stats:', err));

        // Success
        activeJobs.delete(playlistId);
        networkRetries.delete(playlistId);

        console.log(`[backgroundParsingService] ✅ Parsing completed successfully for ${playlistId}`);
        return {
          success: true,
          stats: engineStats,
          duration: new Date() - activeJobs.get(playlistId)?.startTime,
        };

      } catch (error) {
        lastError = error;

        // Check if it's a network error
        if (
          error.message.includes('network') ||
          error.message.includes('fetch') ||
          error.message.includes('ERR_INTERNET_DISCONNECTED')
        ) {
          retryCount++;
          networkRetries.set(playlistId, retryCount);

          if (retryCount < MAX_RETRIES_PER_SESSION) {
            console.log(`Network error, retrying (${retryCount}/${MAX_RETRIES_PER_SESSION})`);

            await updateProgress(playlistId, {
              networkRetries: retryCount,
              lastError: error.message,
            });

            // Wait for network recovery
            const recovered = await waitForNetworkRecovery(playlistId, abortController.signal);
            if (!recovered) {
              throw new Error('Parsing cancelled during network recovery wait');
            }

            // Continue to next retry iteration
            continue;

          } else {
            console.error('Max retries exceeded');
            break;
          }

        } else {
          // Non-network error, don't retry
          throw error;
        }
      }
    }

    // Failed after retries
    activeJobs.delete(playlistId);

    console.error(`[backgroundParsingService] ❌ Parsing failed for ${playlistId}:`, lastError?.message);

    // Notify listeners that parsing failed (to hide loading indicator)
    notifyParseListeners(playlistId, { type: 'parseFailed', playlistId, error: lastError?.message });

    // Get partial stats from engine before cleanup
    const partialStats = engine.getStats();
    
    // Update playlist with partial stats (in case some items were parsed before error)
    const playlistRef = doc(db, 'playlists', playlistId);
    await updateDoc(playlistRef, {
      isParsing: false,
      parseStatus: 'partial',
      lastError: lastError?.message,
      stats: {
        totalChannels: partialStats.channels,
        totalMovies: partialStats.movies,
        totalSeries: partialStats.series,
      },
      lastUpdated: new Date().toISOString(),
    }).catch(err => console.error('Error updating playlist stats:', err));

    await updateProgress(playlistId, {
      status: 'error',
      error: lastError?.message,
    });

    return {
      success: false,
      error: lastError?.message,
      retriesExhausted: true,
    };

  } catch (error) {
    console.error('[backgroundParsingService] Error in startParsing:', error);
    activeJobs.delete(playlistId);

    // Notify listeners that parsing failed
    notifyParseListeners(playlistId, { type: 'parseFailed', playlistId, error: error.message });

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Cancel parsing for a playlist
 * @param {string} playlistId
 * @returns {Promise<void>}
 */
const cancelParsing = async (playlistId) => {
  const job = activeJobs.get(playlistId);
  if (job) {
    job.abortController.abort();
    await job.engine.cancel();
    activeJobs.delete(playlistId);
  }
};

/**
 * Resume incomplete parses on app startup
 * @returns {Promise<Array>} - Array of resumed job results
 */
const resumeIncompleteParses = async () => {
  try {
    const incompletePlaylists = await findIncompleteParses();
    console.log(`Found ${incompletePlaylists.length} incomplete parses to resume`);

    // MIGRATION: Fix any corrupted URLs in the database
    await migrateCorruptedUrls(incompletePlaylists);

    const results = [];
    for (const playlist of incompletePlaylists) {
      try {
        // Normalize playlist data to ensure m3uUrl/serverUrl are properly extracted
        let m3uUrl = normalizePlaylistUrl(playlist);
        
        const normalizedData = {
          ...playlist,
          m3uUrl,
          serverUrl: playlist.xtreamConfig?.serverUrl,
          username: playlist.xtreamConfig?.username,
          password: playlist.xtreamConfig?.password,
        };
        
        console.log(`[backgroundParsingService] Resuming parse for: ${playlist.id}, normalized m3uUrl:`, normalizedData.m3uUrl ? 'present' : 'MISSING');
        
        const result = await startParsing(playlist.id, normalizedData);
        results.push(result);
      } catch (error) {
        console.error(`Error resuming playlist ${playlist.id}:`, error);
      }
    }

    return results;

  } catch (error) {
    console.error('Error resuming incomplete parses:', error);
    return [];
  }
};

/**
 * Migration: Fix corrupted URLs in the database (HTML entity encoding)
 * Scans all playlists for &amp; entities and updates them with proper & characters
 */
const migrateCorruptedUrls = async (playlists) => {
  try {
    console.log(`[backgroundParsingService] Running URL corruption migration...`);
    
    let fixedCount = 0;
    const updates = []; // Store updates to apply directly instead of batch
    
    for (const playlist of playlists) {
      // Check M3U URL
      if (playlist.m3uConfig?.url) {
        const originalUrl = playlist.m3uConfig.url;
        const cleanedUrl = originalUrl
          .replace(/&amp;/g, '&')
          .replace(/&#38;/g, '&')
          .trim();
        
        if (originalUrl !== cleanedUrl) {
          console.log(`[backgroundParsingService] Fixing corrupted M3U URL in playlist ${playlist.id}`);
          const playlistRef = doc(db, 'playlists', playlist.id);
          updates.push(
            updateDoc(playlistRef, {
              'm3uConfig.url': cleanedUrl,
            })
          );
          fixedCount++;
        }
      }
      
      // Check Xtream server URL
      if (playlist.xtreamConfig?.serverUrl) {
        const originalUrl = playlist.xtreamConfig.serverUrl;
        const cleanedUrl = originalUrl
          .replace(/&amp;/g, '&')
          .replace(/&#38;/g, '&')
          .trim();
        
        if (originalUrl !== cleanedUrl) {
          console.log(`[backgroundParsingService] Fixing corrupted Xtream URL in playlist ${playlist.id}`);
          const playlistRef = doc(db, 'playlists', playlist.id);
          updates.push(
            updateDoc(playlistRef, {
              'xtreamConfig.serverUrl': cleanedUrl,
            })
          );
          fixedCount++;
        }
      }
    }
    
    if (fixedCount > 0) {
      // Wait for all updates to complete
      await Promise.all(updates);
      console.log(`[backgroundParsingService] Migration complete: Fixed ${fixedCount} corrupted URLs in database`);
    } else {
      console.log(`[backgroundParsingService] Migration complete: No corrupted URLs found`);
    }
    
  } catch (error) {
    console.error('[backgroundParsingService] Error during URL migration:', error);
    // Don't throw - migration failure shouldn't block app startup
  }
};


/**
 * Get active parsing jobs
 * @returns {Array} - Array of active job IDs
 */
const getActiveJobs = () => Array.from(activeJobs.keys());

/**
 * Get job status
 * @param {string} playlistId
 * @returns {Object|null}
 */
const getJobStatus = (playlistId) => {
  const job = activeJobs.get(playlistId);
  if (!job) return null;

  return {
    playlistId,
    startTime: job.startTime,
    duration: new Date() - job.startTime,
    stats: job.engine.getStats(),
  };
};

export const backgroundParsingService = {
  startParsing,
  cancelParsing,
  resumeIncompleteParses,
  getActiveJobs,
  getJobStatus,
  hasNetworkConnection,
  addParseListener,
  MAX_RETRIES_PER_SESSION,
};

export default backgroundParsingService;
