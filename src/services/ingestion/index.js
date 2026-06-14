/**
 * Ingestion Pipeline Exports
 * Central export point for playlist ingestion services
 */

// Progress tracking
export { default as ProgressTracker } from './progressTracker';

// Parsing services
export * as m3uParsingService from './m3uParsingService';
export * as xtreamParsingService from './xtreamParsingService';

// Orchestrator
export * as ingestionManager from './ingestionManager';

export default {
  // Phase 4: Foundation ✅
  ProgressTracker,

  // Phase 5: M3U Parser ✅
  m3uParsingService,

  // Phase 6: Xtream Parser ✅
  xtreamParsingService,

  // Phase 7: Manager ✅
  ingestionManager,
};
