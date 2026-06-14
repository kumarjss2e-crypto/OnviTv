/**
 * Parsing Progress Service
 * 
 * Tracks parsing progress and emits events
 * Enables UI to wait for progress milestones before navigating
 * 
 * Decoupled from UI - works across navigation and component lifecycle
 * Module-level singleton - survives navigation, component unmounting
 * 
 * Note: Custom EventEmitter-like implementation (not Node.js events module)
 * for React Native Web compatibility
 */

/**
 * Simple EventEmitter-like implementation for React Native Web
 * Supports on(), once(), emit(), removeListener()
 */
class SimpleEventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
    return this;
  }

  once(event, handler) {
    const onceWrapper = (...args) => {
      handler(...args);
      this.removeListener(event, onceWrapper);
    };
    this.on(event, onceWrapper);
    return this;
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
    return true;
  }

  removeListener(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
    return this;
  }

  removeAllListeners(event) {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
    return this;
  }

  setMaxListeners(n) {
    // No-op for compatibility
    return this;
  }
}

class ParsingProgressService extends SimpleEventEmitter {
  constructor() {
    super();
    this.progress = new Map(); // playlistId -> { status, itemsSaved, timestamps, etc }
  }

  /**
   * Record total items to be parsed as soon as known
   */
  recordTotalItems(playlistId, totalItems) {
    const existing = this.progress.get(playlistId) || {};
    this.progress.set(playlistId, {
      ...existing,
      status: 'parsing',
      totalItems,
      itemsSaved: 0,
      progressStarted: Date.now(),
    });
    console.log(`[ParsingProgressService] Total items for ${playlistId}: ${totalItems}`);
    this.emit('totalItemsSet', { playlistId, totalItems, timestamp: Date.now() });
  }
  
  /**
   * Record when first batch of items is successfully saved
   * Called by backgroundParsingService after first saveItemsBatch completes
   */
  recordFirstBatchSaved(playlistId, itemCount) {
    const existing = this.progress.get(playlistId) || {};
    this.progress.set(playlistId, {
      ...existing,
      status: 'parsing',
      itemsSaved: itemCount,
      firstBatchTime: Date.now(),
      firstBatchReady: true,
    });
    
    console.log(`[ParsingProgressService] ✓ First batch ready: ${itemCount} items for ${playlistId}`);
    this.emit('firstBatchReady', { playlistId, itemCount, timestamp: Date.now() });
  }

  /**
   * Record batch save progress during parsing
   */
  recordBatchSaved(playlistId, batchNumber, totalItemsSoFar) {
    const existing = this.progress.get(playlistId) || {};
    this.progress.set(playlistId, {
      ...existing,
      status: 'parsing',
      batchNumber,
      totalItemsSoFar,
      lastBatchTime: Date.now(),
    });
    
    this.emit('batchSaved', { playlistId, batchNumber, totalItemsSoFar });
  }

  /**
   * Record parsing completion with final stats
   */
  recordParsingComplete(playlistId, stats) {
    const existing = this.progress.get(playlistId) || {};
    this.progress.set(playlistId, {
      ...existing,
      status: 'complete',
      stats,
      completedAt: Date.now(),
    });
    
    console.log(`[ParsingProgressService] ✓ Parsing complete: ${playlistId}`, stats);
    this.emit('parsingComplete', { playlistId, stats, timestamp: Date.now() });
  }

  /**
   * Record parsing error
   */
  recordParsingError(playlistId, error) {
    const existing = this.progress.get(playlistId) || {};
    this.progress.set(playlistId, {
      ...existing,
      status: 'error',
      error: error?.message || String(error),
      errorAt: Date.now(),
    });
    
    console.error(`[ParsingProgressService] ✗ Parsing error for ${playlistId}:`, error);
    this.emit('parsingError', { playlistId, error, timestamp: Date.now() });
  }

  /**
   * Wait for first batch to be saved (blocking call)
   * Resolves when first batch is saved, or rejects on timeout
   * 
   * Used by AddPlaylistScreen to delay navigation
   */
  waitForFirstBatch(playlistId, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener('firstBatchReady', handler);
        reject(new Error(`First batch timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const handler = (data) => {
        if (data.playlistId === playlistId) {
          clearTimeout(timeout);
          this.removeListener('firstBatchReady', handler);
          resolve(data);
        }
      };

      // Check if already ready (in case event fired before listener added)
      const existing = this.progress.get(playlistId);
      if (existing?.firstBatchReady) {
        clearTimeout(timeout);
        resolve(existing);
        return;
      }

      // Add listener for future event
      this.on('firstBatchReady', handler);
    });
  }

  /**
   * Wait for parsing to complete
   */
  waitForCompletion(playlistId, timeoutMs = 300000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener('parsingComplete', completeHandler);
        this.removeListener('parsingError', errorHandler);
        reject(new Error(`Parsing timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const completeHandler = (data) => {
        if (data.playlistId === playlistId) {
          clearTimeout(timeout);
          this.removeListener('parsingComplete', completeHandler);
          this.removeListener('parsingError', errorHandler);
          resolve(data);
        }
      };

      const errorHandler = (data) => {
        if (data.playlistId === playlistId) {
          clearTimeout(timeout);
          this.removeListener('parsingComplete', completeHandler);
          this.removeListener('parsingError', errorHandler);
          reject(data.error);
        }
      };

      // Check if already complete or errored
      const existing = this.progress.get(playlistId);
      if (existing?.status === 'complete') {
        clearTimeout(timeout);
        resolve(existing);
        return;
      }
      if (existing?.status === 'error') {
        clearTimeout(timeout);
        reject(new Error(existing.error));
        return;
      }

      // Add listeners for future events
      this.on('parsingComplete', completeHandler);
      this.on('parsingError', errorHandler);
    });
  }

  /**
   * Get current progress for a playlist
   */
  getProgress(playlistId) {
    return this.progress.get(playlistId);
  }

  /**
   * Get all active parsing jobs
   */
  getAllProgress() {
    return Array.from(this.progress.entries()).reduce((acc, [id, progress]) => {
      acc[id] = progress;
      return acc;
    }, {});
  }

  /**
   * Clear progress for a playlist
   */
  clear(playlistId) {
    this.progress.delete(playlistId);
  }

  /**
   * Clear all progress
   */
  clearAll() {
    this.progress.clear();
  }

  /**
   * Check if any parsing is active
   */
  isAnyParsingActive() {
    for (const progress of this.progress.values()) {
      if (progress.status === 'parsing') return true;
    }
    return false;
  }
}

// Export singleton instance
export const parsingProgressService = new ParsingProgressService();

export default parsingProgressService;
