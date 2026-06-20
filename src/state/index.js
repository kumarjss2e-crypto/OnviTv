/**
 * State Management Exports
 * Central export point for all Zustand stores and custom hooks
 */

// Stores
export { useParsingStore, default as useParsingStoreDefault } from './parsingStore';
export { useContentStore, default as useContentStoreDefault } from './contentStore';

// Hooks
export { useParsingState, useParsingActions, useParsingStoreState } from './hooks/useParsingState';
export { useContentState, useContentActions, useContentStoreState } from './hooks/useContentState';

export default {
  // Stores
  useParsingStore,
  useContentStore,

  // Hooks
  useParsingState,
  useParsingActions,
  useParsingStoreState,
  useContentState,
  useContentActions,
  useContentStoreState,
};
