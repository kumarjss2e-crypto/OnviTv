
/**
 * Onboarding Parser Service
 * Simple, robust parse and save flow
 */

import PlaylistParserService from './PlaylistParserService';
import XtreamCodesService from './XtreamCodesService';
import { itemStorageService } from '../itemStorageService';
import { updatePlaylistStats } from '../playlistService';

/**
 * Parse and save playlist
 */
export const parseAndSavePlaylist = async (
  playlistId,
  playlistName,
  playlistData,
  onProgress,
  signal
) => {
  try {
    console.log('=== [OnboardingParserService] Starting ===');
    console.log('playlistId:', playlistId);
    console.log('playlistData:', playlistData);

    // Step 1: Clear old content
    console.log('Step 1: Clear old content');
    try {
      await itemStorageService.clearPlaylistItems(playlistId);
      console.log('✓ Old content cleared');
    } catch (error) {
      console.warn('Warning clearing content:', error);
    }

    // Step 2: Parse
    console.log('Step 2: Parse playlist');
    onProgress?.({
      phase: 'parsing',
      itemsProcessed: 0,
      totalItems: 0,
      percentComplete: 0
    });

    const parseResult = await PlaylistParserService.parsePlaylist(
      playlistData,
      onProgress
    );

    console.log('Parse result:', {
      success: parseResult.success,
      itemsProcessed: parseResult.itemsProcessed,
      stats: parseResult.stats,
      itemsCount: parseResult.items?.length || 0
    });

    if (!parseResult.success || !parseResult.items || parseResult.items.length === 0) {
      console.error('Parse failed or no items!');
      return {
        success: false,
        error: parseResult.error || 'No items found',
        stats: { channels: 0, movies: 0, series: 0, total: 0 },
      };
    }

    // Step 3: Save all items at once
    console.log('Step 3: Save', parseResult.items.length, 'items');
    onProgress?.({
      phase: 'saving',
      itemsProcessed: 0,
      totalItems: parseResult.items.length,
      percentComplete: 0
    });

    const itemsToSave = parseResult.items.map(item => ({
      item,
      contentType: item.contentType || item.type || 'channel'
    }));

    console.log('Items to save count:', itemsToSave.length);

    const savedCount = await itemStorageService.saveItemsBatch(playlistId, itemsToSave);
    console.log('Saved items:', savedCount);

    // Step 4: Calculate final stats
    const stats = {
      channels: parseResult.stats.channels,
      movies: parseResult.stats.movies,
      series: parseResult.stats.series,
      total: parseResult.stats.total,
    };

    console.log('Final stats:', stats);

    // Step 5: Update Firestore
    console.log('Step 5: Update Firestore stats');
    await updatePlaylistStats(playlistId, {
      totalChannels: stats.channels,
      totalMovies: stats.movies,
      totalSeries: stats.series,
      totalItems: stats.total,
    });
    console.log('✓ Firestore updated');

    // Verify the items are actually saved
    console.log('Step 6: Verify saved items');
    const savedItems = await itemStorageService.getPlaylistItems(playlistId);
    console.log('✓ Verified items:', savedItems.length);

    // Done!
    onProgress?.({
      phase: 'complete',
      itemsProcessed: stats.total,
      totalItems: stats.total,
      percentComplete: 100
    });

    console.log('=== [OnboardingParserService] Done! ===');
    return {
      success: true,
      stats,
    };
  } catch (error) {
    console.error('=== [OnboardingParserService] FATAL ERROR ===', error);
    return {
      success: false,
      error: error.message || String(error),
      stats: { channels: 0, movies: 0, series: 0, total: 0 },
    };
  }
};

/**
 * Validate Xtream credentials
 */
export const validateXtreamCredentials = async (serverUrl, username, password) => {
  try {
    console.log('[OnboardingParserService] validateXtreamCredentials');
    const result = await XtreamCodesService.testXtreamConnection(serverUrl, username, password);
    return result;
  } catch (error) {
    console.error('[OnboardingParserService] validation error:', error);
    return { success: false, error: error.message };
  }
};

export default {
  parseAndSavePlaylist,
  validateXtreamCredentials,
};
