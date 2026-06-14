/**
 * Ingestion Manager
 * Orchestrates M3U and Xtream parsing with Zustand state integration
 * Single entry point for all playlist ingestion
 */

import * as m3uParsingService from './m3uParsingService';
import * as xtreamParsingService from './xtreamParsingService';
import ProgressTracker from './progressTracker';

/**
 * Detect playlist type from configuration
 */
const detectPlaylistType = (config) => {
  if (config.type === 'm3u' || config.type === 'M3U') {
    return 'm3u';
  }

  if (config.type === 'xtream' || config.type === 'XTREAM') {
    return 'xtream';
  }

  // Auto-detect from URL or credentials
  if (config.url && config.url.toLowerCase().endsWith('.m3u')) {
    return 'm3u';
  }

  if (config.xtreamUsername && config.xtreamPassword) {
    return 'xtream';
  }

  if (config.xtreamUrl) {
    return 'xtream';
  }

  // Default to M3U if unclear
  return 'm3u';
};

/**
 * Validate playlist configuration
 */
const validatePlaylistConfig = (config) => {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid playlist configuration: must be an object');
  }

  if (!config.id) {
    throw new Error('Playlist config missing required field: id');
  }

  if (!config.name) {
    throw new Error('Playlist config missing required field: name');
  }

  const type = detectPlaylistType(config);

  if (type === 'm3u') {
    if (!config.url) {
      throw new Error('M3U playlist config missing required field: url');
    }
  }

  if (type === 'xtream') {
    if (!config.xtreamUrl) {
      throw new Error('Xtream playlist config missing required field: xtreamUrl');
    }

    if (!config.xtreamUsername) {
      throw new Error('Xtream playlist config missing required field: xtreamUsername');
    }

    if (!config.xtreamPassword) {
      throw new Error('Xtream playlist config missing required field: xtreamPassword');
    }
  }

  return type;
};

/**
 * Parse M3U playlist
 */
const parseM3UPlaylist = async (config, options = {}) => {
  console.log(`[INGESTION_MANAGER] Parsing M3U playlist: ${config.name}`);

  try {
    const result = await m3uParsingService.parseM3U(
      config.id,
      config.name,
      config.url,
      {
        onProgress: options.onProgress,
        retries: options.retries || 3,
        batchSize: options.batchSize || 50,
      }
    );

    return result;
  } catch (error) {
    console.error(`[INGESTION_MANAGER] M3U parsing failed:`, error);

    return {
      success: false,
      error: error.message,
      itemsProcessed: 0,
      itemsSaved: 0,
      itemsFailed: 0,
      duration: 0,
    };
  }
};

/**
 * Parse Xtream playlist
 */
const parseXtreamPlaylist = async (config, options = {}) => {
  console.log(`[INGESTION_MANAGER] Parsing Xtream playlist: ${config.name}`);

  try {
    const result = await xtreamParsingService.parseXtream(
      config.id,
      config.name,
      config.xtreamUrl,
      config.xtreamUsername,
      config.xtreamPassword,
      {
        onProgress: options.onProgress,
        retries: options.retries || 3,
        batchSize: options.batchSize || 50,
        includeTypes: options.includeTypes || ['live', 'vod', 'series'],
      }
    );

    return result;
  } catch (error) {
    console.error(`[INGESTION_MANAGER] Xtream parsing failed:`, error);

    return {
      success: false,
      error: error.message,
      itemsProcessed: 0,
      itemsSaved: 0,
      itemsFailed: 0,
      duration: 0,
    };
  }
};

/**
 * Main ingestion function
 * Orchestrates parsing and integrates with Zustand stores
 */
export const ingestPlaylist = async (config, options = {}) => {
  const {
    onProgress = null,        // Progress callback
    onStateUpdate = null,     // State update callback (for Zustand stores)
    retries = 3,
    batchSize = 50,
  } = options;

  console.log(`[INGESTION_MANAGER] Starting ingestion for playlist: ${config.name}`);

  try {
    // Validate configuration
    const playlistType = validatePlaylistConfig(config);

    console.log(`[INGESTION_MANAGER] Detected playlist type: ${playlistType}`);

    // Notify state management (optional)
    if (onStateUpdate) {
      onStateUpdate({
        type: 'INGESTION_STARTED',
        payload: {
          playlistId: config.id,
          playlistName: config.name,
          playlistType,
        },
      });
    }

    // Create progress callback wrapper
    const progressCallback = (data) => {
      // Call custom progress callback
      if (onProgress) {
        onProgress(data);
      }

      // Notify state management
      if (onStateUpdate) {
        onStateUpdate({
          type: 'INGESTION_PROGRESS',
          payload: data,
        });
      }
    };

    // Parse based on type
    let result;

    if (playlistType === 'm3u') {
      result = await parseM3UPlaylist(config, {
        onProgress: progressCallback,
        retries,
        batchSize,
      });
    } else {
      result = await parseXtreamPlaylist(config, {
        onProgress: progressCallback,
        retries,
        batchSize,
        includeTypes: options.includeTypes,
      });
    }

    // Notify completion
    if (onStateUpdate) {
      onStateUpdate({
        type: 'INGESTION_COMPLETED',
        payload: result,
      });
    }

    console.log(`[INGESTION_MANAGER] ✓ Ingestion completed: ${result.itemsSaved} items saved`);

    return result;
  } catch (error) {
    console.error(`[INGESTION_MANAGER] ✗ Ingestion failed:`, error);

    const result = {
      success: false,
      error: error.message,
      itemsProcessed: 0,
      itemsSaved: 0,
      itemsFailed: 0,
      duration: 0,
    };

    // Notify error state
    if (onStateUpdate) {
      onStateUpdate({
        type: 'INGESTION_ERROR',
        payload: result,
      });
    }

    return result;
  }
};

/**
 * Batch ingest multiple playlists
 */
export const ingestMultiplePlaylists = async (configs, options = {}) => {
  const {
    onProgress = null,
    onPlaylistComplete = null,
    sequential = false, // true: one at a time, false: parallel (up to 3)
    retries = 3,
    batchSize = 50,
  } = options;

  console.log(
    `[INGESTION_MANAGER] Starting batch ingestion: ${configs.length} playlists (${sequential ? 'sequential' : 'parallel'})`
  );

  const results = [];

  if (sequential) {
    // Sequential: one at a time
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];

      console.log(`[INGESTION_MANAGER] Ingesting playlist ${i + 1}/${configs.length}: ${config.name}`);

      try {
        const result = await ingestPlaylist(config, {
          onProgress,
          retries,
          batchSize,
        });

        results.push({
          playlistId: config.id,
          playlistName: config.name,
          ...result,
        });

        if (onPlaylistComplete) {
          onPlaylistComplete({
            playlistId: config.id,
            playlistName: config.name,
            ...result,
          });
        }
      } catch (error) {
        results.push({
          playlistId: config.id,
          playlistName: config.name,
          success: false,
          error: error.message,
          itemsProcessed: 0,
          itemsSaved: 0,
          itemsFailed: 0,
          duration: 0,
        });

        if (onPlaylistComplete) {
          onPlaylistComplete({
            playlistId: config.id,
            playlistName: config.name,
            success: false,
            error: error.message,
          });
        }
      }
    }
  } else {
    // Parallel: up to 3 at a time
    const concurrency = Math.min(3, configs.length);

    for (let batchStart = 0; batchStart < configs.length; batchStart += concurrency) {
      const batchEnd = Math.min(batchStart + concurrency, configs.length);
      const batchConfigs = configs.slice(batchStart, batchEnd);

      console.log(`[INGESTION_MANAGER] Ingesting batch: ${batchStart + 1}-${batchEnd}/${configs.length}`);

      const promises = batchConfigs.map((config) =>
        ingestPlaylist(config, {
          onProgress,
          retries,
          batchSize,
        }).then((result) => ({
          playlistId: config.id,
          playlistName: config.name,
          ...result,
        }))
      );

      try {
        const batchResults = await Promise.allSettled(promises);

        batchResults.forEach((settlement, index) => {
          if (settlement.status === 'fulfilled') {
            results.push(settlement.value);

            if (onPlaylistComplete) {
              onPlaylistComplete(settlement.value);
            }
          } else {
            const config = batchConfigs[index];

            const errorResult = {
              playlistId: config.id,
              playlistName: config.name,
              success: false,
              error: settlement.reason.message,
              itemsProcessed: 0,
              itemsSaved: 0,
              itemsFailed: 0,
              duration: 0,
            };

            results.push(errorResult);

            if (onPlaylistComplete) {
              onPlaylistComplete(errorResult);
            }
          }
        });
      } catch (error) {
        console.error(`[INGESTION_MANAGER] Batch error:`, error);
      }
    }
  }

  // Calculate summary
  const summary = {
    totalPlaylists: configs.length,
    successfulPlaylists: results.filter((r) => r.success).length,
    totalItemsProcessed: results.reduce((sum, r) => sum + (r.itemsProcessed || 0), 0),
    totalItemsSaved: results.reduce((sum, r) => sum + (r.itemsSaved || 0), 0),
    totalItemsFailed: results.reduce((sum, r) => sum + (r.itemsFailed || 0), 0),
    totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0),
    results,
  };

  console.log(`[INGESTION_MANAGER] ✓ Batch ingestion completed: ${summary.successfulPlaylists}/${summary.totalPlaylists} successful`);

  return summary;
};

/**
 * Resume interrupted ingestion
 * (Uses checkpoint data from ProgressTracker)
 */
export const resumePlaylistIngestion = async (config, checkpointData, options = {}) => {
  console.log(`[INGESTION_MANAGER] Resuming ingestion for playlist: ${config.name}`);

  if (!checkpointData || !checkpointData.itemsSaved) {
    console.warn(`[INGESTION_MANAGER] No checkpoint data, starting fresh`);

    return ingestPlaylist(config, options);
  }

  console.log(
    `[INGESTION_MANAGER] Resuming from checkpoint: ${checkpointData.itemsSaved} items already saved`
  );

  // For now, restart from beginning
  // Future enhancement: implement true resume with offset
  return ingestPlaylist(config, options);
};

export default {
  ingestPlaylist,
  ingestMultiplePlaylists,
  resumePlaylistIngestion,
  detectPlaylistType,
  validatePlaylistConfig,
};
