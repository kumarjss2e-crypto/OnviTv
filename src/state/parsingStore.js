/**
 * Parsing Store (Zustand)
 * Centralized state management for playlist parsing progress and status
 */

import create from 'zustand';

/**
 * Parsing state store
 * Tracks: parsing status, progress, errors, timing
 */
export const useParsingStore = create((set, get) => ({
  // ===== STATE =====

  // Parsing lifecycle state
  parsingState: 'idle', // 'idle' | 'parsing' | 'paused' | 'completed' | 'error'
  currentPlaylistId: null,
  currentPlaylistName: null,
  currentPlaylistType: null, // 'm3u' | 'xtream'

  // Progress tracking
  progress: 0, // 0-100 percentage
  itemsProcessed: 0, // Total items processed (including failed)
  itemsSaved: 0, // Items successfully saved
  itemsFailed: 0, // Items that failed validation
  eta: null, // Estimated time to completion (milliseconds)

  // Batching info
  batchesProcessed: 0,
  batchSize: 50, // Items per batch

  // Error tracking
  error: null, // Current error message
  validationErrors: [], // Array of validation errors
  warnings: [], // Array of warnings
  lastError: null, // Previous error (for history)

  // Timing
  startedAt: null, // Timestamp when parsing started
  completedAt: null, // Timestamp when parsing completed
  pausedAt: null, // Timestamp when parsing paused
  duration: null, // Total duration (milliseconds)

  // ===== ACTIONS =====

  /**
   * Start parsing a playlist
   */
  startParsing: (playlistId, playlistName, playlistType) =>
    set({
      parsingState: 'parsing',
      currentPlaylistId: playlistId,
      currentPlaylistName: playlistName,
      currentPlaylistType: playlistType,
      progress: 0,
      itemsProcessed: 0,
      itemsSaved: 0,
      itemsFailed: 0,
      eta: null,
      batchesProcessed: 0,
      error: null,
      validationErrors: [],
      warnings: [],
      startedAt: Date.now(),
      completedAt: null,
      pausedAt: null,
      duration: null,
    }),

  /**
   * Update parsing progress
   */
  updateProgress: (progress, itemsProcessed, itemsSaved, itemsFailed, eta) =>
    set({
      progress: Math.min(100, Math.max(0, progress)),
      itemsProcessed,
      itemsSaved,
      itemsFailed,
      eta,
    }),

  /**
   * Increment batch counter
   */
  incrementBatch: () =>
    set((state) => ({
      batchesProcessed: state.batchesProcessed + 1,
    })),

  /**
   * Add warning message
   */
  addWarning: (warning) =>
    set((state) => ({
      warnings: [...state.warnings, warning],
    })),

  /**
   * Add validation error
   */
  addValidationError: (error) =>
    set((state) => ({
      validationErrors: [...state.validationErrors, error],
      itemsFailed: state.itemsFailed + 1,
    })),

  /**
   * Pause parsing
   */
  pauseParsing: () =>
    set((state) => ({
      parsingState: 'paused',
      pausedAt: Date.now(),
    })),

  /**
   * Resume parsing
   */
  resumeParsing: () =>
    set({
      parsingState: 'parsing',
      pausedAt: null,
    }),

  /**
   * Complete parsing successfully
   */
  completeParsing: () =>
    set((state) => {
      const duration = Date.now() - state.startedAt;
      return {
        parsingState: 'completed',
        progress: 100,
        completedAt: Date.now(),
        duration,
      };
    }),

  /**
   * Mark parsing as errored
   */
  errorParsing: (errorMessage) =>
    set((state) => {
      const duration = state.completedAt ? state.completedAt - state.startedAt : Date.now() - state.startedAt;
      return {
        parsingState: 'error',
        error: errorMessage,
        lastError: state.error, // Keep previous error in history
        completedAt: Date.now(),
        duration,
      };
    }),

  /**
   * Reset parsing state
   */
  resetParsing: () =>
    set({
      parsingState: 'idle',
      currentPlaylistId: null,
      currentPlaylistName: null,
      currentPlaylistType: null,
      progress: 0,
      itemsProcessed: 0,
      itemsSaved: 0,
      itemsFailed: 0,
      eta: null,
      batchesProcessed: 0,
      error: null,
      validationErrors: [],
      warnings: [],
      startedAt: null,
      completedAt: null,
      pausedAt: null,
      duration: null,
    }),

  // ===== SELECTORS / COMPUTED =====

  /**
   * Check if parsing is currently active
   */
  isActive: () => get().parsingState === 'parsing',

  /**
   * Check if parsing has error
   */
  hasError: () => get().error !== null,

  /**
   * Get human-readable status
   */
  getStatus: () => {
    const state = get();
    return {
      state: state.parsingState,
      progress: state.progress,
      itemsSaved: state.itemsSaved,
      eta: state.eta,
      duration: state.duration,
      itemsProcessed: state.itemsProcessed,
      error: state.error,
    };
  },

  /**
   * Get parsing summary
   */
  getSummary: () => {
    const state = get();
    return {
      playlistId: state.currentPlaylistId,
      playlistName: state.currentPlaylistName,
      playlistType: state.currentPlaylistType,
      status: state.parsingState,
      progress: state.progress,
      itemsProcessed: state.itemsProcessed,
      itemsSaved: state.itemsSaved,
      itemsFailed: state.itemsFailed,
      batchesProcessed: state.batchesProcessed,
      duration: state.duration,
      error: state.error,
      warningCount: state.warnings.length,
      errorCount: state.validationErrors.length,
    };
  },
}));

export default useParsingStore;
