
import { Platform } from 'react-native';
import indexedDBStorage from './storage/indexedDBStorage';
import sqliteStorage from './storage/sqliteStorage';
import memoryStorage from './storage/memoryStorage';

let storageBackend = null;
let isInitialized = false;

const initializeStorage = async () => {
  if (isInitialized && storageBackend) {
    return storageBackend;
  }

  try {
    console.log('[itemStorageService] Initializing storage for platform:', Platform.OS);

    if (Platform.OS === 'web') {
      try {
        console.log('[itemStorageService] Testing IndexedDB...');
        await indexedDBStorage.getPlaylistItems('test');
        storageBackend = indexedDBStorage;
        console.log('[itemStorageService] Using IndexedDB');
      } catch (err) {
        console.warn('[itemStorageService] IndexedDB failed, using memory:', err);
        storageBackend = memoryStorage;
      }
    } else {
      try {
        console.log('[itemStorageService] Testing SQLite...');
        await sqliteStorage.getPlaylistItems('test');
        storageBackend = sqliteStorage;
        console.log('[itemStorageService] Using SQLite');
      } catch (err) {
        console.warn('[itemStorageService] SQLite failed, using memory:', err);
        storageBackend = memoryStorage;
      }
    }

    isInitialized = true;
    return storageBackend;
  } catch (error) {
    console.error('[itemStorageService] Fatal error initializing storage:', error);
    storageBackend = memoryStorage;
    isInitialized = true;
    return storageBackend;
  }
};

export const saveItemsBatch = async (playlistId, items) => {
  try {
    console.log('[itemStorageService] saveItemsBatch:', { playlistId, itemCount: items?.length || 0 });
    const backend = await initializeStorage();
    const result = await backend.saveItemsBatch(playlistId, items);
    console.log('[itemStorageService] saveItemsBatch complete');
    return result;
  } catch (error) {
    console.error('[itemStorageService] saveItemsBatch failed:', error);
    throw error;
  }
};

export const getPlaylistItems = async (playlistId) => {
  try {
    const backend = await initializeStorage();
    const items = await backend.getPlaylistItems(playlistId);
    console.log('[itemStorageService] getPlaylistItems returning', items.length, 'items');
    return items;
  } catch (error) {
    console.error('[itemStorageService] getPlaylistItems failed:', error);
    return [];
  }
};

export const getItemsByType = async (playlistId, contentType) => {
  try {
    const backend = await initializeStorage();
    return await backend.getItemsByType(playlistId, contentType);
  } catch (error) {
    console.error('[itemStorageService] getItemsByType failed:', error);
    return [];
  }
};

export const getItemsByGroup = async (playlistId, groupTitle) => {
  try {
    const backend = await initializeStorage();
    return await backend.getItemsByGroup(playlistId, groupTitle);
  } catch (error) {
    console.error('[itemStorageService] getItemsByGroup failed:', error);
    return [];
  }
};

export const clearPlaylistItems = async (playlistId) => {
  try {
    console.log('[itemStorageService] clearPlaylistItems:', playlistId);
    const backend = await initializeStorage();
    return await backend.clearPlaylistItems(playlistId);
  } catch (error) {
    console.error('[itemStorageService] clearPlaylistItems failed:', error);
    return false;
  }
};

export const countPlaylistItems = async (playlistId) => {
  try {
    const backend = await initializeStorage();
    return await backend.countPlaylistItems(playlistId);
  } catch (error) {
    console.error('[itemStorageService] countPlaylistItems failed:', error);
    return 0;
  }
};

export const searchItems = async (playlistId, query) => {
  try {
    const backend = await initializeStorage();
    return await backend.searchItems(playlistId, query);
  } catch (error) {
    console.error('[itemStorageService] searchItems failed:', error);
    return [];
  }
};

export const itemStorageService = {
  saveItemsBatch,
  getPlaylistItems,
  getItemsByType,
  getItemsByGroup,
  clearPlaylistItems,
  countPlaylistItems,
  searchItems,
};

export default itemStorageService;
