/**
 * Progress Tracker
 * State machine for managing parsing progress and lifecycle
 * Used by ingestion pipelines to track and report parsing progress
 */

/**
 * Progress state machine
 * Manages: start, batch updates, pause/resume, completion, error
 */
export class ProgressTracker {
  constructor(playlistId, playlistName, playlistType) {
    this.playlistId = playlistId;
    this.playlistName = playlistName;
    this.playlistType = playlistType;

    this.state = 'idle'; // 'idle' | 'parsing' | 'paused' | 'completed' | 'error'
    this.progress = 0;
    this.itemsProcessed = 0;
    this.itemsSaved = 0;
    this.itemsFailed = 0;
    this.batchesProcessed = 0;

    this.startTime = null;
    this.lastUpdateTime = null;
    this.eta = null;

    this.listeners = {}; // event type → callback array
    this.checkpoints = []; // For resume capability
  }

  /**
   * Start parsing
   */
  start() {
    this.state = 'parsing';
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    this.progress = 0;
    this.itemsProcessed = 0;
    this.itemsSaved = 0;
    this.itemsFailed = 0;
    this.batchesProcessed = 0;

    console.log(`[PROGRESS_TRACKER] Starting parse for ${this.playlistId}`);
    this.emit('started', {
      playlistId: this.playlistId,
      playlistName: this.playlistName,
      playlistType: this.playlistType,
    });
  }

  /**
   * Update progress
   */
  updateProgress(itemsProcessed, itemsSaved, itemsFailed, totalEstimate) {
    this.itemsProcessed = itemsProcessed;
    this.itemsSaved = itemsSaved;
    this.itemsFailed = itemsFailed;

    // Calculate progress percentage
    if (totalEstimate > 0) {
      this.progress = Math.min(99, Math.round((itemsSaved / totalEstimate) * 100));
    }

    // Calculate ETA
    const elapsed = Date.now() - this.startTime;
    if (itemsSaved > 0 && totalEstimate > 0) {
      const timePerItem = elapsed / itemsSaved;
      const itemsRemaining = totalEstimate - itemsSaved;
      this.eta = Math.round(timePerItem * itemsRemaining);
    }

    this.lastUpdateTime = Date.now();

    console.log(
      `[PROGRESS_TRACKER] Progress: ${this.progress}% (${itemsSaved}/${totalEstimate}), ETA: ${this.eta}ms`
    );

    this.emit('progress', {
      progress: this.progress,
      itemsProcessed: this.itemsProcessed,
      itemsSaved: this.itemsSaved,
      itemsFailed: this.itemsFailed,
      eta: this.eta,
      elapsed,
    });
  }

  /**
   * Record batch saved
   */
  recordBatchSaved(batchSize, totalSaved) {
    this.batchesProcessed += 1;
    this.itemsSaved = totalSaved;

    console.log(
      `[PROGRESS_TRACKER] Batch ${this.batchesProcessed} saved: ${batchSize} items, total: ${totalSaved}`
    );

    this.emit('batch-saved', {
      batchNumber: this.batchesProcessed,
      batchSize,
      totalSaved,
    });

    // Create checkpoint for resume capability
    this.saveCheckpoint();
  }

  /**
   * Record parsing completed
   */
  complete() {
    this.state = 'completed';
    this.progress = 100;

    const duration = Date.now() - this.startTime;

    console.log(`[PROGRESS_TRACKER] Parse completed: ${this.itemsSaved} items in ${duration}ms`);

    this.emit('completed', {
      totalItems: this.itemsSaved,
      itemsFailed: this.itemsFailed,
      duration,
      batchesProcessed: this.batchesProcessed,
    });

    // Final checkpoint
    this.saveCheckpoint();
  }

  /**
   * Record parsing error
   */
  error(errorMessage) {
    this.state = 'error';

    const duration = Date.now() - this.startTime;

    console.error(`[PROGRESS_TRACKER] Parse error: ${errorMessage}`);

    this.emit('error', {
      error: errorMessage,
      itemsSaved: this.itemsSaved,
      duration,
      recoverable: this.itemsSaved > 0, // Can resume if at least some items saved
    });
  }

  /**
   * Pause parsing
   */
  pause() {
    const wasParsing = this.state === 'parsing';
    this.state = 'paused';

    console.log(`[PROGRESS_TRACKER] Parse paused`);

    if (wasParsing) {
      this.emit('paused', {
        itemsSaved: this.itemsSaved,
        progress: this.progress,
      });

      this.saveCheckpoint();
    }
  }

  /**
   * Resume parsing
   */
  resume() {
    if (this.state === 'paused') {
      this.state = 'parsing';

      console.log(`[PROGRESS_TRACKER] Parse resumed`);

      this.emit('resumed', {
        itemsSaved: this.itemsSaved,
      });
    }
  }

  /**
   * Save checkpoint for resume capability
   */
  saveCheckpoint() {
    const checkpoint = {
      playlistId: this.playlistId,
      state: this.state,
      itemsSaved: this.itemsSaved,
      itemsFailed: this.itemsFailed,
      progress: this.progress,
      batchesProcessed: this.batchesProcessed,
      timestamp: Date.now(),
    };

    this.checkpoints.push(checkpoint);

    // Keep only last 10 checkpoints to avoid memory bloat
    if (this.checkpoints.length > 10) {
      this.checkpoints.shift();
    }
  }

  /**
   * Get last checkpoint for resume
   */
  getLastCheckpoint() {
    return this.checkpoints.length > 0 ? this.checkpoints[this.checkpoints.length - 1] : null;
  }

  /**
   * Register event listener
   */
  on(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }

    this.listeners[eventType].push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.listeners[eventType].indexOf(callback);
      if (index > -1) {
        this.listeners[eventType].splice(index, 1);
      }
    };
  }

  /**
   * Emit event to listeners
   */
  emit(eventType, data) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[PROGRESS_TRACKER] Error in ${eventType} listener:`, error);
        }
      });
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      state: this.state,
      playlistId: this.playlistId,
      playlistName: this.playlistName,
      playlistType: this.playlistType,
      progress: this.progress,
      itemsProcessed: this.itemsProcessed,
      itemsSaved: this.itemsSaved,
      itemsFailed: this.itemsFailed,
      batchesProcessed: this.batchesProcessed,
      eta: this.eta,
      elapsed: this.startTime ? Date.now() - this.startTime : null,
    };
  }

  /**
   * Clear all listeners (cleanup)
   */
  destroy() {
    this.listeners = {};
    this.checkpoints = [];
  }
}

export default ProgressTracker;
