/**
 * Storage Factory
 * Smart adapter selector for platform-aware storage
 * Routes to appropriate storage implementation based on platform
 */

import { Platform } from 'react-native';
import indexedDBStorage from './indexedDBStorage';
import sqliteStorage from './sqliteStorage';
import memoryStorage from './memoryStorage';

/**
 * Get the appropriate storage adapter for current platform
 * @returns {Object} Storage adapter (indexedDBStorage, sqliteStorage, or memoryStorage)
 */
export const getStorageAdapter = () => {
  try {
    if (Platform.OS === 'web') {
      console.log('[STORAGE_FACTORY] Selecting IndexedDB adapter for web');
      return indexedDBStorage;
    }

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      console.log('[STORAGE_FACTORY] Selecting SQLite adapter for native');
      return sqliteStorage;
    }

    // Expo or unknown platform - prefer SQLite
    console.log('[STORAGE_FACTORY] Using SQLite for Expo environment');
    return sqliteStorage;
  } catch (error) {
    console.error('[STORAGE_FACTORY] Error selecting adapter, falling back to memory:', error);
    return memoryStorage;
  }
};

/**
 * Get the current adapter name (for debugging)
 * @returns {string} Adapter name
 */
export const getCurrentAdapter = () => {
  const adapter = getStorageAdapter();
  if (adapter === indexedDBStorage) return 'IndexedDB';
  if (adapter === sqliteStorage) return 'SQLite';
  if (adapter === memoryStorage) return 'Memory';
  return 'Unknown';
};

/**
 * Test storage connectivity (for debugging/diagnostics)
 * @returns {Promise<Object>} Test result { success, adapter, duration, error }
 */
export const testStorageConnection = async () => {
  const startTime = Date.now();

  try {
    const adapter = getStorageAdapter();
    const testKey = '__storage_test_' + Date.now();

    // Test write
    await adapter.saveItemsBatch('__test__', [
      {
        id: testKey,
        playlistId: '__test__',
        name: 'Storage Test',
        streamUrl: 'test://storage',
        contentType: 'test',
        savedAt: Date.now(),
      },
    ]);

    // Test read
    const result = await adapter.getPlaylistItems('__test__');

    if (!result || result.length === 0) {
      throw new Error('Wrote data but could not read it back');
    }

    // Test cleanup
    await adapter.clearPlaylistItems('__test__');

    const duration = Date.now() - startTime;
    console.log('[STORAGE_FACTORY] ✅ Storage connection test passed in', duration, 'ms');

    return {
      success: true,
      adapter: getCurrentAdapter(),
      duration,
      error: null,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[STORAGE_FACTORY] ❌ Storage connection test failed:', error);

    return {
      success: false,
      adapter: getCurrentAdapter(),
      duration,
      error: error.message,
    };
  }
};

/**
 * Storage adapter stats (for debugging)
 * @returns {Promise<Object>} Storage stats
 */
export const getStorageStats = async () => {
  try {
    const adapter = getStorageAdapter();

    if (adapter === indexedDBStorage) {
      return {
        adapter: 'IndexedDB',
        type: 'Browser API',
        persistent: true,
        quota: 'Generous (50MB+)',
      };
    }

    if (adapter === sqliteStorage) {
      return {
        adapter: 'SQLite',
        type: 'Native Database',
        persistent: true,
        quota: 'Device storage',
      };
    }

    return {
      adapter: 'Memory',
      type: 'Session Storage',
      persistent: false,
      quota: 'Available RAM',
    };
  } catch (error) {
    console.error('[STORAGE_FACTORY] Error getting storage stats:', error);
    return { error: error.message };
  }
};

export default {
  getStorageAdapter,
  getCurrentAdapter,
  testStorageConnection,
  getStorageStats,
};
