/**
 * Streaming Parser Engine
 * Core orchestration for parsing and batching Firestore writes
 * Accumulates items and writes to subcollections every 50 items
 * Uses unique item IDs as Firestore document IDs to prevent duplicates on resume
 */

import { db } from '../config/firebase';
import { collection, writeBatch, doc, updateDoc, setDoc, getDocs, query } from 'firebase/firestore';

const BATCH_SIZE = 50; // Write to Firestore every 50 items

/**
 * Simple hash function for creating consistent IDs
 * @param {string} str
 * @returns {string}
 */
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * Generate a unique ID for an item based on its content
 * Uses tvgId if available, otherwise creates a hash from critical fields
 * @param {Object} item - The item object
 * @returns {string} - Unique identifier safe for use as Firestore document ID
 */
const generateUniqueItemId = (item) => {
  // Prefer tvgId if available and non-empty
  if (item.tvgId && typeof item.tvgId === 'string' && item.tvgId.trim()) {
    // Sanitize tvgId to be safe as Firestore document ID (alphanumeric, dash, underscore only)
    return item.tvgId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 255);
  }

  // For items without tvgId, create hash from critical identifying fields
  const hashInput = JSON.stringify({
    name: item.name,
    streamUrl: item.streamUrl,
    tvgLogo: item.tvgLogo,
    groupTitle: item.groupTitle,
  });

  // Create hash and use with prefix to ensure uniqueness
  const hash = simpleHash(hashInput);
  return `item_${hash}`;
};

/**
 * Create streaming parser engine
 * Handles item accumulation and batch writes to Firestore subcollections
 * @param {string} playlistId
 * @param {Function} onProgressUpdate - Called when progress updates
 * @param {Function} onFirstBatchSaved - Called when first batch is successfully saved
 * @returns {Object} - Parser engine with methods
 */
export const createParserEngine = (playlistId, onProgressUpdate, onFirstBatchSaved) => {
  let batch = writeBatch(db);
  let writeCount = 0;
  let isFlushInProgress = false;
  let flushQueue = Promise.resolve(); // Queue for pending flushes
  let firstBatchSaved = false; // Track if first batch has been saved
  
  // Track stats
  let stats = {
    channels: 0,
    movies: 0,
    series: 0,
  };
  
  const accumulator = {
    channels: [],
    movies: [],
    series: [],
  };

  /**
   * Add item to appropriate bucket
   * @param {Object} item - Complete item object with all metadata
   * @param {string} contentType - 'channel' | 'movie' | 'series'
   */
  const addItem = async (item, contentType) => {
    // Convert singular contentType to plural bucket name
    let bucketName;
    if (contentType === 'channel') bucketName = 'channels';
    else if (contentType === 'movie') bucketName = 'movies';
    else if (contentType === 'series') bucketName = 'series';
    else {
      throw new Error(`Unknown content type: ${contentType}`);
    }

    if (!accumulator[bucketName]) {
      throw new Error(`Accumulator missing bucket: ${bucketName}`);
    }

    accumulator[bucketName].push(item);
    
    // Track stat
    if (contentType === 'channel') stats.channels++;
    else if (contentType === 'movie') stats.movies++;
    else if (contentType === 'series') stats.series++;

    // Check if we need to flush batch
    const totalItems = accumulator.channels.length + accumulator.movies.length + accumulator.series.length;
    
    if (totalItems >= BATCH_SIZE) {
      console.log(`[streamingParserEngine] Triggering flush: ${totalItems} items accumulated (>= ${BATCH_SIZE})`);
      // Trigger flush in background (don't await to avoid blocking parser)
      flushBatch().catch(error => {
        console.error('[streamingParserEngine] Error during background flush:', error);
      });
    }
  };

  /**
   * Write accumulated items to Firestore
   * DUPLICATE PREVENTION: Uses unique item IDs (tvgId or content hash) as document IDs
   * with merge mode. On resume, items with same ID will update existing docs instead of
   * creating duplicates. This ensures resume operations are idempotent.
   * @returns {Promise<void>}
   */
  const flushBatch = async () => {
    // Chain this flush to the queue - wait for previous flush to complete
    return flushQueue = flushQueue.then(async () => {
      const totalItems = accumulator.channels.length + accumulator.movies.length + accumulator.series.length;
      
      // If nothing to flush, just return
      if (totalItems === 0) {
        return;
      }

      console.log(`[streamingParserEngine] Flushing batch for ${playlistId}: ${totalItems} items (Channels: ${accumulator.channels.length}, Movies: ${accumulator.movies.length}, Series: ${accumulator.series.length})`);

      const playlistRef = doc(db, 'playlists', playlistId);
      const channelsRef = collection(playlistRef, 'channels');
      const moviesRef = collection(playlistRef, 'movies');
      const seriesRef = collection(playlistRef, 'series');

      // Write channels with unique IDs to prevent duplicates on resume
      let channelsUpdated = 0;
      for (const item of accumulator.channels) {
        const uniqueId = generateUniqueItemId(item);
        const docRef = doc(channelsRef, uniqueId);
        // Use merge to update if exists, insert if new (prevents duplicate data)
        batch.set(docRef, item, { merge: true });
        writeCount++;
        channelsUpdated++;
      }

      // Write movies with unique IDs to prevent duplicates on resume
      let moviesUpdated = 0;
      for (const item of accumulator.movies) {
        const uniqueId = generateUniqueItemId(item);
        const docRef = doc(moviesRef, uniqueId);
        // Use merge to update if exists, insert if new (prevents duplicate data)
        batch.set(docRef, item, { merge: true });
        writeCount++;
        moviesUpdated++;
      }

      // Write series with unique IDs to prevent duplicates on resume
      let seriesUpdated = 0;
      for (const item of accumulator.series) {
        const uniqueId = generateUniqueItemId(item);
        const docRef = doc(seriesRef, uniqueId);
        // Use merge to update if exists, insert if new (prevents duplicate data)
        batch.set(docRef, item, { merge: true });
        writeCount++;
        seriesUpdated++;
      }

      console.log(`[streamingParserEngine] Batch write details: Channels ${channelsUpdated}, Movies ${moviesUpdated}, Series ${seriesUpdated} (using unique IDs for duplicate prevention on resume)`);

      // Commit batch FIRST
      await batch.commit();
      console.log(`[streamingParserEngine] ✅ Batch committed: ${writeCount} items written total`);

      // THEN count ACTUAL items in database to get accurate stats (not accumulated counters)
      const channelsSnap = await getDocs(query(collection(db, `playlists/${playlistId}/channels`)));
      const moviesSnap = await getDocs(query(collection(db, `playlists/${playlistId}/movies`)));
      const seriesSnap = await getDocs(query(collection(db, `playlists/${playlistId}/series`)));
      
      const actualStats = {
        channels: channelsSnap.size,
        movies: moviesSnap.size,
        series: seriesSnap.size,
      };

      console.log(`[streamingParserEngine] Actual saved stats from Firestore: Channels: ${actualStats.channels}, Movies: ${actualStats.movies}, Series: ${actualStats.series}`);

      // Update progress tracker with ACTUAL saved stats (not accumulated counters)
      const progressRef = doc(db, `playlists/${playlistId}/meta/progress`);
      await setDoc(progressRef, {
        lastWriteTime: new Date().toISOString(),
        totalItemsWritten: writeCount,
        channels: actualStats.channels,
        movies: actualStats.movies,
        series: actualStats.series,
      }, { merge: true });

      // Update playlist stats with ACTUAL counts from database
      const playlistStatsRef = doc(db, `playlists/${playlistId}`);
      await setDoc(playlistStatsRef, {
        stats: {
          totalChannels: actualStats.channels,
          totalMovies: actualStats.movies,
          totalSeries: actualStats.series,
        },
        lastUpdated: new Date().toISOString(),
      }, { merge: true });

      // Call callback on first batch saved
      if (!firstBatchSaved && onFirstBatchSaved) {
        firstBatchSaved = true;
        console.log(`[streamingParserEngine] First batch saved, calling onFirstBatchSaved callback`);
        onFirstBatchSaved();
      }

      // Create new batch BEFORE resetting accumulators
      const newBatch = writeBatch(db);
      
      // Reset accumulator
      accumulator.channels = [];
      accumulator.movies = [];
      accumulator.series = [];
      
      // Assign the new batch
      batch = newBatch;

      if (onProgressUpdate) {
        // Call with ACTUAL stats from Firestore, not accumulated counters
        onProgressUpdate({
          itemsSaved: writeCount,
          totalWritten: writeCount,
          channels: actualStats.channels,
          movies: actualStats.movies,
          series: actualStats.series,
        });
      }
    }).catch((error) => {
      console.error('Error flushing batch:', error);
      throw error;
    });
  };

  /**
   * Finalize parsing - write any remaining items
   * @returns {Promise<Object>} - Final write stats
   */
  const finalize = async () => {
    try {
      // Wait a moment for any in-flight addItem calls to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const totalRemaining = accumulator.channels.length + accumulator.movies.length + accumulator.series.length;
      
      console.log(`[streamingParserEngine] Finalizing: ${totalRemaining} items remaining in accumulator`);
      console.log(`[streamingParserEngine] Accumulator state:`, {
        channels: accumulator.channels.length,
        movies: accumulator.movies.length,
        series: accumulator.series.length,
        totalStats: stats,
        writeCount,
      });
      
      if (totalRemaining > 0) {
        console.log(`[streamingParserEngine] Flushing final ${totalRemaining} items...`);
        // Flush all remaining items in batches of 50
        // Wait for the queue before checking accumulator in the loop
        let finalFlushCount = 0;
        while (true) {
          // Wait for current queue to complete before checking accumulator
          await flushQueue;
          
          const currentBatchSize = accumulator.channels.length + accumulator.movies.length + accumulator.series.length;
          console.log(`[streamingParserEngine] Final flush iteration ${finalFlushCount + 1}, items remaining: ${currentBatchSize}`);
          
          if (currentBatchSize > 0) {
            // Add this flush to the queue
            console.log(`[streamingParserEngine] Executing final flush batch with ${currentBatchSize} items`);
            await flushBatch();
            finalFlushCount++;
          } else {
            // No more items to flush
            console.log(`[streamingParserEngine] ✅ All final flush batches complete (${finalFlushCount} batches)`);
            break;
          }
        }
      }

      console.log(`[streamingParserEngine] Waiting for all queued flushes to complete...`);
      await flushQueue;
      console.log(`[streamingParserEngine] ✅ All flushes complete, total written: ${writeCount}`);

      // Get actual counts from database
      const channelsSnap = await getDocs(query(collection(db, `playlists/${playlistId}/channels`)));
      const moviesSnap = await getDocs(query(collection(db, `playlists/${playlistId}/movies`)));
      const seriesSnap = await getDocs(query(collection(db, `playlists/${playlistId}/series`)));
      
      const actualStats = {
        channels: channelsSnap.size,
        movies: moviesSnap.size,
        series: seriesSnap.size,
      };

      console.log(`[streamingParserEngine] 📊 Final stats from database - Channels: ${actualStats.channels}, Movies: ${actualStats.movies}, Series: ${actualStats.series}`);

      // Update progress to completed with actual stats
      const progressRef = doc(db, `playlists/${playlistId}/meta/progress`);
      await updateDoc(progressRef, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        totalItemsWritten: writeCount,
      });
      console.log(`[streamingParserEngine] ✅ Progress document updated to 'completed'`);

      // Update playlist document with final accurate stats
      const playlistStatsRef = doc(db, `playlists/${playlistId}`);
      await setDoc(playlistStatsRef, {
        stats: {
          totalChannels: actualStats.channels,
          totalMovies: actualStats.movies,
          totalSeries: actualStats.series,
        },
        lastUpdated: new Date().toISOString(),
      }, { merge: true });
      console.log(`[streamingParserEngine] ✅ Playlist stats updated with final counts`);
      console.log(`[streamingParserEngine] 🎉 PARSE FINALIZATION COMPLETE!`);
      console.log(`[streamingParserEngine] Final stats written to playlist document:`, {
        totalChannels: actualStats.channels,
        totalMovies: actualStats.movies,
        totalSeries: actualStats.series,
        totalWritten: writeCount,
      });

      return {
        success: true,
        totalItemsWritten: writeCount,
        stats: actualStats,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('Error finalizing parse:', error);
      
      // Mark as error state
      try {
        const playlistRef = doc(db, `playlists/${playlistId}`);
        await updateDoc(playlistRef, {
          isParsing: false,
          parseStatus: 'error',
          lastError: error.message,
        });
      } catch (updateError) {
        console.error('Error updating playlist status:', updateError);
      }

      throw error;
    }
  };

  /**
   * Cancel parsing and cleanup
   * @returns {Promise<void>}
   */
  const cancel = async () => {
    try {
      // Wait for any in-flight flushes to complete
      await flushQueue;
      
      // Get actual counts from database
      const channelsSnap = await getDocs(query(collection(db, `playlists/${playlistId}/channels`)));
      const moviesSnap = await getDocs(query(collection(db, `playlists/${playlistId}/movies`)));
      const seriesSnap = await getDocs(query(collection(db, `playlists/${playlistId}/series`)));
      
      const actualStats = {
        totalChannels: channelsSnap.size,
        totalMovies: moviesSnap.size,
        totalSeries: seriesSnap.size,
      };

      const playlistRef = doc(db, `playlists/${playlistId}`);
      
      // Save actual stats before cancellation
      await setDoc(playlistRef, {
        isParsing: false,
        parseStatus: 'cancelled',
        stats: actualStats,
        lastUpdated: new Date().toISOString(),
      }, { merge: true });

      accumulator.channels = [];
      accumulator.movies = [];
      accumulator.series = [];
      batch = writeBatch(db);
      writeCount = 0;
      flushQueue = Promise.resolve();

    } catch (error) {
      console.error('Error cancelling parse:', error);
      throw error;
    }
  };

  /**
   * Get current stats
   * @returns {Object}
   */
  const getStats = () => ({
    channels: stats.channels,
    movies: stats.movies,
    series: stats.series,
    total: stats.channels + stats.movies + stats.series,
    totalWritten: writeCount,
  });

  return {
    addItem,
    flushBatch,
    finalize,
    cancel,
    getStats,
  };
};

export default {
  createParserEngine,
  BATCH_SIZE,
};
