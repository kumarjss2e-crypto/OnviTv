/**
 * useParsingState Hook
 * Custom hook to access parsing state and actions from components
 */

import { useCallback } from 'react';
import useParsingStore from '../parsingStore';

/**
 * Hook for reading parsing state
 * Components subscribe to relevant store slices
 */
export const useParsingState = () => {
  const parsingState = useParsingStore((state) => state.parsingState);
  const progress = useParsingStore((state) => state.progress);
  const itemsProcessed = useParsingStore((state) => state.itemsProcessed);
  const itemsSaved = useParsingStore((state) => state.itemsSaved);
  const itemsFailed = useParsingStore((state) => state.itemsFailed);
  const eta = useParsingStore((state) => state.eta);
  const error = useParsingStore((state) => state.error);
  const currentPlaylistName = useParsingStore((state) => state.currentPlaylistName);
  const batchesProcessed = useParsingStore((state) => state.batchesProcessed);
  const duration = useParsingStore((state) => state.duration);

  const isActive = useCallback(() => useParsingStore.getState().isActive(), []);
  const hasError = useCallback(() => useParsingStore.getState().hasError(), []);
  const getStatus = useCallback(() => useParsingStore.getState().getStatus(), []);
  const getSummary = useCallback(() => useParsingStore.getState().getSummary(), []);

  return {
    // State
    parsingState,
    progress,
    itemsProcessed,
    itemsSaved,
    itemsFailed,
    eta,
    error,
    currentPlaylistName,
    batchesProcessed,
    duration,

    // Computed
    isActive,
    hasError,
    getStatus,
    getSummary,
  };
};

/**
 * Hook for parsing actions
 * Components can dispatch actions to parsing store
 */
export const useParsingActions = () => {
  const startParsing = useParsingStore((state) => state.startParsing);
  const updateProgress = useParsingStore((state) => state.updateProgress);
  const pauseParsing = useParsingStore((state) => state.pauseParsing);
  const resumeParsing = useParsingStore((state) => state.resumeParsing);
  const completeParsing = useParsingStore((state) => state.completeParsing);
  const errorParsing = useParsingStore((state) => state.errorParsing);
  const resetParsing = useParsingStore((state) => state.resetParsing);
  const addWarning = useParsingStore((state) => state.addWarning);
  const addValidationError = useParsingStore((state) => state.addValidationError);
  const incrementBatch = useParsingStore((state) => state.incrementBatch);

  return {
    startParsing,
    updateProgress,
    pauseParsing,
    resumeParsing,
    completeParsing,
    errorParsing,
    resetParsing,
    addWarning,
    addValidationError,
    incrementBatch,
  };
};

/**
 * Combined hook for state and actions (convenience)
 */
export const useParsingStoreState = () => ({
  ...useParsingState(),
  ...useParsingActions(),
});

export default useParsingState;
