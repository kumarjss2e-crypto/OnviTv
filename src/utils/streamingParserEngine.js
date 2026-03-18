/**
 * Streaming Parser Engine
 * Core orchestration for parsing and batching AsyncStorage writes
 * Accumulates items and writes to AsyncStorage every 50 items
 * Uses unique item IDs to prevent duplicates on resume
 */

import contentStorageService from '../services/contentStorageService';

const BATCH_SIZE = 50; // Flush to AsyncStorage every 50 items

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
 * Handles item accumulation and batch writes to AsyncStorage via contentStorageService
 * @param {string} playlistId
 * @param {Function} onProgressUpdate - Called when progress updates
 * @param {Function} onFirstBatchSaved - Called when first batch is successfully saved
 * @returns {Object} - Parser engine with methods
 */
export const createParserEngine = (playlistId, onProgressUpdate, onFirstBatchSaved) => {
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
   * Write accumulated items to AsyncStorage
   * DUPLICATE PREVENTION: Uses unique item IDs (tvgId or content hash) to merge with existing items
   * On resume, items with same ID will replace existing items instead of creating duplicates.
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

      try {
        // For AsyncStorage, we need to:
        // 1. Load existing items
        // 2. Merge new items with existing (by unique ID)
        // 3. Save back to AsyncStorage

        // Load existing channels
        const existingChannels = await contentStorageService.getChannels(playlistId);
        const channelsMap = {};
        existingChannels.forEach(ch => {
          const id = generateUniqueItemId(ch);
          channelsMap[id] = ch;
        });
        
        // Merge new channels
        let channelsUpdated = 0;
        for (const item of accumulator.channels) {
          const uniqueId = generateUniqueItemId(item);
          channelsMap[uniqueId] = item; // Replace/insert
          channelsUpdated++;
          writeCount++;
        }
        
        // Save merged channels
        const mergedChannels = Object.values(channelsMap);
        await contentStorageService.saveChannels(playlistId, mergedChannels);

        // Load existing movies
        const existingMovies = await contentStorageService.getMovies(playlistId);
        const moviesMap = {};
        existingMovies.forEach(mv => {
          const id = generateUniqueItemId(mv);
          moviesMap[id] = mv;
        });
        
        // Merge new movies
        let moviesUpdated = 0;
        for (const item of accumulator.movies) {
          const uniqueId = generateUniqueItemId(item);
          moviesMap[uniqueId] = item; // Replace/insert
          moviesUpdated++;
          writeCount++;
        }
        
        // Save merged movies
        const mergedMovies = Object.values(moviesMap);
        await contentStorageService.saveMovies(playlistId, mergedMovies);

        // Load existing series
        const existingSeries = await contentStorageService.getSeries(playlistId);
        const seriesMap = {};
        existingSeries.forEach(sr => {
          const id = generateUniqueItemId(sr);
          seriesMap[id] = sr;
        });
        
        // Merge new series
        let seriesUpdated = 0;
        for (const item of accumulator.series) {
          const uniqueId = generateUniqueItemId(item);
          seriesMap[uniqueId] = item; // Replace/insert
          seriesUpdated++;
          writeCount++;
        }
        
        // Save merged series
        const mergedSeries = Object.values(seriesMap);
        await contentStorageService.saveSeries(playlistId, mergedSeries);

        console.log(`[streamingParserEngine] Batch write details: Channels ${channelsUpdated}, Movies ${moviesUpdated}, Series ${seriesUpdated} (using unique IDs for duplicate prevention on resume)`);
        console.log(`[streamingParserEngine] ✅ Batch committed: ${writeCount} items written total`);

        // Get actual saved stats
        const actualStats = {
          channels: mergedChannels.length,
          movies: mergedMovies.length,
          series: mergedSeries.length,
        };

        console.log(`[streamingParserEngine] Actual saved stats from AsyncStorage: Channels: ${actualStats.channels}, Movies: ${actualStats.movies}, Series: ${actualStats.series}`);

        // Call callback on first batch saved
        if (!firstBatchSaved && onFirstBatchSaved) {
          firstBatchSaved = true;
          console.log(`[streamingParserEngine] First batch saved, calling onFirstBatchSaved callback`);
          onFirstBatchSaved();
        }

        // Reset accumulator
        accumulator.channels = [];
        accumulator.movies = [];
        accumulator.series = [];

        if (onProgressUpdate) {
          // Call with actual stats from AsyncStorage
          onProgressUpdate({
            itemsSaved: writeCount,
            totalWritten: writeCount,
            channels: actualStats.channels,
            movies: actualStats.movies,
            series: actualStats.series,
          });
        }
      } catch (error) {
        console.error('[streamingParserEngine] Error flushing batch:', error);
        throw error;
      }
    }).catch((error) => {
      console.error('[streamingParserEngine] Error in flush queue:', error);
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

      // Get actual counts from AsyncStorage
      const actualChannels = await contentStorageService.getChannels(playlistId);
      const actualMovies = await contentStorageService.getMovies(playlistId);
      const actualSeries = await contentStorageService.getSeries(playlistId);
      
      const actualStats = {
        channels: actualChannels.length,
        movies: actualMovies.length,
        series: actualSeries.length,
      };

      console.log(`[streamingParserEngine] 📊 Final stats from AsyncStorage - Channels: ${actualStats.channels}, Movies: ${actualStats.movies}, Series: ${actualStats.series}`);
      console.log(`[streamingParserEngine] ✅ Parsing finalized and saved to AsyncStorage`);
      console.log(`[streamingParserEngine] 🎉 PARSE FINALIZATION COMPLETE!`);
      console.log(`[streamingParserEngine] Final stats:`, {
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
      console.error('[streamingParserEngine] Error finalizing parse:', error);
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
      
      // Get actual counts from AsyncStorage
      const actualChannels = await contentStorageService.getChannels(playlistId);
      const actualMovies = await contentStorageService.getMovies(playlistId);
      const actualSeries = await contentStorageService.getSeries(playlistId);
      
      const actualStats = {
        totalChannels: actualChannels.length,
        totalMovies: actualMovies.length,
        totalSeries: actualSeries.length,
      };

      console.log(`[streamingParserEngine] Parse cancelled. Saved content: Channels: ${actualStats.totalChannels}, Movies: ${actualStats.totalMovies}, Series: ${actualStats.totalSeries}`);

      accumulator.channels = [];
      accumulator.movies = [];
      accumulator.series = [];
      writeCount = 0;
      flushQueue = Promise.resolve();

    } catch (error) {
      console.error('[streamingParserEngine] Error cancelling parse:', error);
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
