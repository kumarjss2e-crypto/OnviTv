/**
 * Streaming Parser Engine
 * Core orchestration for parsing and batching Firestore writes
 * Accumulates items and writes to subcollections every 50 items
 */

import { db } from '../config/firebase';
import { collection, writeBatch, doc, updateDoc, setDoc } from 'firebase/firestore';

const BATCH_SIZE = 50; // Write to Firestore every 50 items

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

      // Write channels
      for (const item of accumulator.channels) {
        const docRef = doc(channelsRef);
        batch.set(docRef, item);
        writeCount++;
      }

      // Write movies
      for (const item of accumulator.movies) {
        const docRef = doc(moviesRef);
        batch.set(docRef, item);
        writeCount++;
      }

      // Write series
      for (const item of accumulator.series) {
        const docRef = doc(seriesRef);
        batch.set(docRef, item);
        writeCount++;
      }

      // Update progress tracker with setDoc (merge) to handle non-existent docs
      const progressRef = doc(db, `playlists/${playlistId}/meta/progress`);
      batch.set(progressRef, {
        lastWriteTime: new Date().toISOString(),
        totalItemsWritten: writeCount,
        channels: accumulator.channels.length,
        movies: accumulator.movies.length,
        series: accumulator.series.length,
      }, { merge: true });

      // Update playlist stats in real-time (using set with merge instead of update)
      const playlistStatsRef = doc(db, `playlists/${playlistId}`);
      batch.set(playlistStatsRef, {
        stats: {
          totalChannels: stats.channels,
          totalMovies: stats.movies,
          totalSeries: stats.series,
        },
        lastUpdated: new Date().toISOString(),
      }, { merge: true });

      // Commit batch
      await batch.commit();
      console.log(`[streamingParserEngine] ✅ Batch committed: ${writeCount} items written total (Stats: Channels: ${stats.channels}, Movies: ${stats.movies}, Series: ${stats.series})`);

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
        onProgressUpdate({
          itemsSaved: writeCount,
          totalWritten: writeCount,
          channels: stats.channels,
          movies: stats.movies,
          series: stats.series,
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
        while (true) {
          // Wait for current queue to complete before checking accumulator
          await flushQueue;
          
          const currentBatchSize = accumulator.channels.length + accumulator.movies.length + accumulator.series.length;
          console.log(`[streamingParserEngine] Flushing batch, items remaining: ${currentBatchSize}`);
          
          if (currentBatchSize > 0) {
            // Add this flush to the queue
            await flushBatch();
          } else {
            // No more items to flush
            break;
          }
        }
      }

      console.log(`[streamingParserEngine] Waiting for all queued flushes to complete...`);
      await flushQueue;
      console.log(`[streamingParserEngine] All flushes complete, total written: ${writeCount}`);

      // Update progress to completed (but don't update playlist stats here - let caller handle that)
      const progressRef = doc(db, `playlists/${playlistId}/meta/progress`);
      await updateDoc(progressRef, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        totalItemsWritten: writeCount,
      });

      return {
        success: true,
        totalItemsWritten: writeCount,
        stats: {
          channels: stats.channels,
          movies: stats.movies,
          series: stats.series,
        },
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
      
      const playlistRef = doc(db, `playlists/${playlistId}`);
      
      // Save final stats before cancellation so we don't lose count of what was parsed
      await updateDoc(playlistRef, {
        isParsing: false,
        parseStatus: 'cancelled',
        stats: {
          totalChannels: stats.channels,
          totalMovies: stats.movies,
          totalSeries: stats.series,
        },
        lastUpdated: new Date().toISOString(),
      });

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
