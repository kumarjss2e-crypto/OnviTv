
const generateSimpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

let db = null;
const DB_NAME = 'onvitv_db';
const STORE_NAME = 'playlist_items';

const initializeDatabase = async () => {
  if (db) {
    return db;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => {
      console.error('[indexedDBStorage] Failed to open IndexedDB');
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[indexedDBStorage] IndexedDB initialized');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = event.target.result;

      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        const store = dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('idx_playlistId', 'playlistId', { unique: false });
      }
    };
  });
};

const normalizeItem = (item) => {
  return {
    ...item,
    url: item.streamUrl || item.url,
    streamUrl: item.streamUrl || item.url,
    logo: item.tvgLogo || item.logo,
    type: item.contentType || item.type,
  };
};

const saveItemsBatch = async (playlistId, items) => {
  console.log('[indexedDBStorage] saveItemsBatch called with', items?.length, 'items');

  if (!items || !Array.isArray(items) || items.length === 0) {
    console.log('[indexedDBStorage] No items to save');
    return 0;
  }

  try {
    await initializeDatabase();
    const now = Date.now();
    let savedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      for (const entry of items) {
        const rawItem = entry.item || entry;
        const contentType = entry.contentType || rawItem.contentType || rawItem.type || 'channel';

        let itemId = rawItem.id;
        if (!itemId && rawItem.tvgId) {
          itemId = `${playlistId}_tvg_${rawItem.tvgId}`;
        } else if (!itemId && rawItem.streamUrl) {
          itemId = `${playlistId}_url_${generateSimpleHash(rawItem.streamUrl)}`;
        } else if (!itemId && rawItem.url) {
          itemId = `${playlistId}_url_${generateSimpleHash(rawItem.url)}`;
        } else if (!itemId && rawItem.name) {
          itemId = `${playlistId}_name_${generateSimpleHash(rawItem.name + now)}`;
        } else if (!itemId) {
          console.warn('[indexedDBStorage] Skipping item without identifiers:', rawItem);
          continue;
        }

        const streamUrl = rawItem.streamUrl || rawItem.url || '';

        if (!streamUrl) {
          console.warn('[indexedDBStorage] Skipping item without stream URL:', rawItem);
          continue;
        }

        const record = {
          id: itemId,
          playlistId,
          name: rawItem.name || 'Unknown',
          streamUrl,
          url: streamUrl,
          tvgId: rawItem.tvgId || null,
          tvgName: rawItem.tvgName || rawItem.name || null,
          tvgLogo: rawItem.tvgLogo || rawItem.logo || null,
          logo: rawItem.tvgLogo || rawItem.logo || null,
          groupTitle: rawItem.groupTitle || null,
          contentType,
          type: contentType,
          addedAt: now,
        };

        store.put(record);
        savedCount++;
      }

      transaction.oncomplete = () => {
        console.log('[indexedDBStorage] Saved', savedCount, 'items!');
        resolve(savedCount);
      };

      transaction.onerror = (event) => {
        console.error('[indexedDBStorage] Transaction failed:', event.target.error);
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('[indexedDBStorage] saveItemsBatch failed:', error);
    throw error;
  }
};

const getPlaylistItems = async (playlistId) => {
  try {
    await initializeDatabase();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('idx_playlistId');
      const request = index.getAll(playlistId);

      request.onsuccess = () => {
        const normalized = request.result.map(normalizeItem);
        console.log('[indexedDBStorage] getPlaylistItems returning', normalized.length, 'items');
        resolve(normalized);
      };

      request.onerror = () => {
        console.error('[indexedDBStorage] getPlaylistItems failed');
        resolve([]);
      };
    });
  } catch (error) {
    console.error('[indexedDBStorage] getPlaylistItems failed:', error);
    return [];
  }
};

const getItemsByType = async (playlistId, contentType) => {
  try {
    const items = await getPlaylistItems(playlistId);
    return items.filter(item => (item.contentType === contentType || item.type === contentType));
  } catch (error) {
    console.error('[indexedDBStorage] getItemsByType failed:', error);
    return [];
  }
};

const getItemsByGroup = async (playlistId, groupTitle) => {
  try {
    const items = await getPlaylistItems(playlistId);
    return items.filter(item => item.groupTitle === groupTitle);
  } catch (error) {
    console.error('[indexedDBStorage] getItemsByGroup failed:', error);
    return [];
  }
};

const clearPlaylistItems = async (playlistId) => {
  try {
    console.log('[indexedDBStorage] Clearing playlist items for:', playlistId);
    await initializeDatabase();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('idx_playlistId');

      const request = index.openCursor(playlistId);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log('[indexedDBStorage] Playlist items cleared!');
        resolve(true);
      };

      transaction.onerror = () => {
        resolve(false);
      };
    });
  } catch (error) {
    console.error('[indexedDBStorage] clearPlaylistItems failed:', error);
    return false;
  }
};

const countPlaylistItems = async (playlistId) => {
  try {
    const items = await getPlaylistItems(playlistId);
    return items.length;
  } catch (error) {
    console.error('[indexedDBStorage] countPlaylistItems failed:', error);
    return 0;
  }
};

const searchItems = async (playlistId, query) => {
  try {
    const items = await getPlaylistItems(playlistId);
    const searchTerm = query.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm) ||
      (item.tvgName && item.tvgName.toLowerCase().includes(searchTerm)) ||
      (item.groupTitle && item.groupTitle.toLowerCase().includes(searchTerm))
    );
  } catch (error) {
    console.error('[indexedDBStorage] searchItems failed:', error);
    return [];
  }
};

export const createIndexedDBStorage = () => ({
  saveItemsBatch,
  getPlaylistItems,
  getItemsByType,
  getItemsByGroup,
  clearPlaylistItems,
  countPlaylistItems,
  searchItems,
});

export default createIndexedDBStorage();
