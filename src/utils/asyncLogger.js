/**
 * Asynchronous Logger
 * Non-blocking logging system that queues logs and processes them in background
 * Improves UI performance by not blocking the main thread during logging
 */

class AsyncLogger {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxQueueSize = 1000; // Prevent memory issues
    this.enabled = true;
  }

  /**
   * Add log to queue and trigger processing
   */
  _log(level, message, data = {}) {
    if (!this.enabled) return;

    // Prevent queue overflow
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('[AsyncLogger] Queue full, dropping oldest logs');
      this.queue.shift();
    }

    this.queue.push({
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      time: Date.now(),
    });

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process queued logs asynchronously
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const logItem = this.queue.shift();

      // Process in next tick (non-blocking)
      await new Promise(resolve => setTimeout(resolve, 0));

      // Format and output log
      const prefix = `[${logItem.level.toUpperCase()}]`;
      const timeStr = logItem.timestamp;
      
      if (logItem.level === 'error' || logItem.level === 'critical') {
        console.error(prefix, logItem.message, logItem.data);
      } else if (logItem.level === 'warn') {
        console.warn(prefix, logItem.message, logItem.data);
      } else {
        console.log(prefix, logItem.message, logItem.data);
      }
    }

    this.processing = false;
  }

  /**
   * Info level logging (non-blocking)
   */
  info(message, data = {}) {
    this._log('info', message, data);
  }

  /**
   * Warning level logging (non-blocking)
   */
  warn(message, data = {}) {
    this._log('warn', message, data);
  }

  /**
   * Error level logging (non-blocking)
   */
  error(message, data = {}) {
    this._log('error', message, data);
  }

  /**
   * Debug level logging (non-blocking)
   */
  debug(message, data = {}) {
    this._log('debug', message, data);
  }

  /**
   * Critical error logging (synchronous - for crashes)
   * Use this for errors that need immediate logging before potential crash
   */
  critical(message, data = {}) {
    console.error('[CRITICAL]', message, data);
    // Also add to queue for consistency
    this._log('critical', message, data);
  }

  /**
   * Flush all pending logs immediately (synchronous)
   * Useful before app closes or critical operations
   */
  flush() {
    while (this.queue.length > 0) {
      const logItem = this.queue.shift();
      const prefix = `[${logItem.level.toUpperCase()}]`;
      
      if (logItem.level === 'error' || logItem.level === 'critical') {
        console.error(prefix, logItem.message, logItem.data);
      } else if (logItem.level === 'warn') {
        console.warn(prefix, logItem.message, logItem.data);
      } else {
        console.log(prefix, logItem.message, logItem.data);
      }
    }
  }

  /**
   * Clear all pending logs
   */
  clear() {
    this.queue = [];
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Get queue size (for monitoring)
   */
  getQueueSize() {
    return this.queue.length;
  }
}

// Create singleton instance
export const asyncLog = new AsyncLogger();

// Export class for testing
export { AsyncLogger };
