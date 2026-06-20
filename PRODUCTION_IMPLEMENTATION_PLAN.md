# Production-Grade Web Parsing Implementation Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User Adds Playlist                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  AddPlaylistScreen             │
        │  Save metadata to Firebase     │
        │  Start backgroundParsingService│
        └────────────┬───────────────────┘
                     │
        ┌────────────▼────────────┐
        │  backgroundParsingService│
        │  ✓ Web-compatible parser │
        │  ✓ No Platform guards    │
        └────────────┬─────────────┘
                     │
      ┌──────────────▼──────────────┐
      │  webCompatibleParserService  │
      │  • Parses M3U (pure JS)      │
      │  • Parses Xtream (pure JS)   │
      │  • Works on all platforms    │
      └──────────────┬───────────────┘
                     │
      ┌──────────────▼──────────────┐
      │  itemStorageService          │
      │  (Unified Storage Layer)     │
      │  Native: SQLite              │
      │  Web: IndexedDB              │
      └──────────────┬───────────────┘
                     │
      ┌──────────────▼──────────────┐
      │  channelService              │
      │  movieService                │
      │  seriesService               │
      │  (All read from unified      │
      │   storage layer)             │
      └──────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Content displays on Home   │
        │  ✓ All platforms            │
        │  ✓ Persistent after reload  │
        │  ✓ Progressive loading      │
        └────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Unified Storage Layer (Fix Architecture Mismatch)

**Create: `src/services/itemStorageService.js`**
- Replaces dual system (localDatabaseService + contentStorageService)
- Platform-aware:
  - Native: Uses localDatabaseService (SQLite)
  - Web: Uses web-optimized storage (IndexedDB/localStorage)
- Exports unified interface

**Update: `src/services/contentStorageService.js`**
- Add web-compatible storage (IndexedDB on web)
- Keep AsyncStorage for native
- Platform detection before storage selection

### Phase 2: Web-Compatible Parser

**Create: `src/services/webCompatibleParserService.js`**
- Pure JavaScript M3U parser
- Pure JavaScript Xtream authentication + API client
- No Node.js dependencies
- Returns same data structure as production libraries

### Phase 3: Enable Web Parsing

**Update: `src/services/backgroundParsingService.js`**
- Remove `if (Platform.OS === 'web') return;` guards
- Use webCompatibleParserService on web
- Use production libraries on native
- Save to unified itemStorageService

### Phase 4: Update Content Services

**Update:**
- `src/services/channelService.js`
- `src/services/movieService.js`
- `src/services/seriesService.js`

**Changes:**
- All read from itemStorageService (not contentStorageService)
- Ensures consistency with parser's save destination

---

## Detailed Implementation

### 1. Unified Storage Layer

#### Create: `src/services/itemStorageService.js`

```javascript
/**
 * Unified Item Storage Service
 * Abstracts storage layer - works identically on native and web
 * 
 * Native (iOS/Android): Uses SQLite (persistent)
 * Web (browser): Uses IndexedDB (persistent across reloads)
 */

import { Platform } from 'react-native';

// Will be set based on platform
let storageImpl = null;

/**
 * Initialize storage based on platform
 */
const initializeStorage = async () => {
  if (storageImpl) return storageImpl;
  
  try {
    if (Platform.OS === 'web') {
      // Web: Use IndexedDB storage
      const { createIndexedDBStorage } = await import('./storage/indexedDBStorage');
      storageImpl = await createIndexedDBStorage();
      console.log('[itemStorageService] Initialized IndexedDB storage for web');
    } else {
      // Native: Use SQLite storage
      const { createSQLiteStorage } = await import('./storage/sqliteStorage');
      storageImpl = await createSQLiteStorage();
      console.log('[itemStorageService] Initialized SQLite storage for native');
    }
  } catch (error) {
    console.error('[itemStorageService] Failed to initialize storage:', error);
    // Fallback to memory storage if anything fails
    const { createMemoryStorage } = await import('./storage/memoryStorage');
    storageImpl = await createMemoryStorage();
    console.warn('[itemStorageService] Fell back to in-memory storage');
  }
  
  return storageImpl;
};

/**
 * Save items batch
 */
export const saveItemsBatch = async (playlistId, items) => {
  const impl = await initializeStorage();
  return impl.saveItemsBatch(playlistId, items);
};

/**
 * Get all items for playlist
 */
export const getPlaylistItems = async (playlistId) => {
  const impl = await initializeStorage();
  return impl.getPlaylistItems(playlistId);
};

/**
 * Get items by type
 */
export const getItemsByType = async (playlistId, contentType) => {
  const impl = await initializeStorage();
  return impl.getItemsByType(playlistId, contentType);
};

/**
 * Get items by group
 */
export const getItemsByGroup = async (playlistId, groupTitle) => {
  const impl = await initializeStorage();
  return impl.getItemsByGroup(playlistId, groupTitle);
};

/**
 * Clear playlist items
 */
export const clearPlaylistItems = async (playlistId) => {
  const impl = await initializeStorage();
  return impl.clearPlaylistItems(playlistId);
};

/**
 * Count items
 */
export const countPlaylistItems = async (playlistId) => {
  const impl = await initializeStorage();
  return impl.countPlaylistItems(playlistId);
};

/**
 * Search items
 */
export const searchItems = async (playlistId, searchTerm) => {
  const impl = await initializeStorage();
  return impl.searchItems(playlistId, searchTerm);
};

export default {
  initializeStorage,
  saveItemsBatch,
  getPlaylistItems,
  getItemsByType,
  getItemsByGroup,
  clearPlaylistItems,
  countPlaylistItems,
  searchItems,
};
```

#### Create: `src/services/storage/indexedDBStorage.js`

```javascript
/**
 * IndexedDB Storage Implementation for Web
 * Provides persistent storage on web platform
 */

const DB_NAME = 'onvitv_db';
const STORE_NAME = 'playlist_items';
const DB_VERSION = 1;

let db = null;

/**
 * Open or create IndexedDB database
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      console.log('[indexedDBStorage] Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        
        // Create indexes for efficient querying
        store.createIndex('playlistId', 'playlistId', { unique: false });
        store.createIndex('contentType', 'contentType', { unique: false });
        store.createIndex('playlistId_contentType', ['playlistId', 'contentType'], { unique: false });
        
        console.log('[indexedDBStorage] Object store created with indexes');
      }
    };
  });
};

/**
 * Save items batch
 */
export const saveItemsBatch = async (playlistId, items) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const now = Date.now();
    let savedCount = 0;

    return new Promise((resolve, reject) => {
      items.forEach(({ item, contentType }) => {
        const itemData = {
          id: item.tvgId || item.streamUrl,
          playlistId,
          name: item.name,
          streamUrl: item.streamUrl,
          tvgId: item.tvgId || null,
          tvgName: item.tvgName || item.name,
          tvgLogo: item.tvgLogo || null,
          groupTitle: item.groupTitle || null,
          contentType,
          savedAt: now,
        };

        const request = store.put(itemData);
        request.onsuccess = () => {
          savedCount++;
        };
        request.onerror = () => {
          console.error('[indexedDBStorage] Error saving item:', request.error);
        };
      });

      transaction.oncomplete = () => {
        console.log(`[indexedDBStorage] Saved ${savedCount} items in batch`);
        resolve(savedCount);
      };

      transaction.onerror = () => {
        console.error('[indexedDBStorage] Transaction error:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('[indexedDBStorage] Error saving batch:', error);
    throw error;
  }
};

/**
 * Get all items for playlist
 */
export const getPlaylistItems = async (playlistId) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('playlistId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(playlistId);

      request.onsuccess = () => {
        const items = request.result || [];
        // Sort by groupTitle then name
        items.sort((a, b) => {
          if ((a.groupTitle || '') !== (b.groupTitle || '')) {
            return (a.groupTitle || '').localeCompare(b.groupTitle || '');
          }
          return a.name.localeCompare(b.name);
        });
        resolve(items);
      };

      request.onerror = () => {
        console.error('[indexedDBStorage] Error getting items:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[indexedDBStorage] Error getting playlist items:', error);
    return [];
  }
};

/**
 * Get items by content type
 */
export const getItemsByType = async (playlistId, contentType) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('playlistId_contentType');

    return new Promise((resolve, reject) => {
      const request = index.getAll([playlistId, contentType]);

      request.onsuccess = () => {
        const items = request.result || [];
        items.sort((a, b) => {
          if ((a.groupTitle || '') !== (b.groupTitle || '')) {
            return (a.groupTitle || '').localeCompare(b.groupTitle || '');
          }
          return a.name.localeCompare(b.name);
        });
        resolve(items);
      };

      request.onerror = () => {
        console.error('[indexedDBStorage] Error getting items by type:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[indexedDBStorage] Error getting items by type:', error);
    return [];
  }
};

/**
 * Get items by group
 */
export const getItemsByGroup = async (playlistId, groupTitle) => {
  try {
    const allItems = await getPlaylistItems(playlistId);
    return allItems.filter(item => item.groupTitle === groupTitle);
  } catch (error) {
    console.error('[indexedDBStorage] Error getting items by group:', error);
    return [];
  }
};

/**
 * Clear playlist items
 */
export const clearPlaylistItems = async (playlistId) => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('playlistId');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(playlistId);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log(`[indexedDBStorage] Cleared all items for ${playlistId}`);
        resolve();
      };

      transaction.onerror = () => {
        console.error('[indexedDBStorage] Error clearing items:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('[indexedDBStorage] Error clearing playlist items:', error);
    throw error;
  }
};

/**
 * Count items
 */
export const countPlaylistItems = async (playlistId) => {
  try {
    const items = await getPlaylistItems(playlistId);
    return items.length;
  } catch (error) {
    console.error('[indexedDBStorage] Error counting items:', error);
    return 0;
  }
};

/**
 * Search items
 */
export const searchItems = async (playlistId, searchTerm) => {
  try {
    const items = await getPlaylistItems(playlistId);
    const lowerSearch = searchTerm.toLowerCase();
    
    return items.filter(item =>
      item.name.toLowerCase().includes(lowerSearch) ||
      (item.groupTitle && item.groupTitle.toLowerCase().includes(lowerSearch))
    );
  } catch (error) {
    console.error('[indexedDBStorage] Error searching items:', error);
    return [];
  }
};

/**
 * Create storage instance
 */
export const createIndexedDBStorage = async () => {
  await initDB();
  
  return {
    saveItemsBatch,
    getPlaylistItems,
    getItemsByType,
    getItemsByGroup,
    clearPlaylistItems,
    countPlaylistItems,
    searchItems,
  };
};
```

#### Update: `src/services/storage/sqliteStorage.js`

```javascript
/**
 * SQLite Storage Implementation for Native Platforms
 */

export const createSQLiteStorage = async () => {
  const SQLite = await import('expo-sqlite');
  const db = await SQLite.openDatabaseAsync('onvitv.db');

  // Create tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS playlist_items (
      id TEXT PRIMARY KEY,
      playlistId TEXT NOT NULL,
      name TEXT NOT NULL,
      streamUrl TEXT NOT NULL,
      tvgId TEXT,
      tvgName TEXT,
      tvgLogo TEXT,
      groupTitle TEXT,
      contentType TEXT,
      savedAt INTEGER
    );
    
    CREATE INDEX IF NOT EXISTS idx_playlistId ON playlist_items(playlistId);
    CREATE INDEX IF NOT EXISTS idx_contentType ON playlist_items(contentType);
    CREATE INDEX IF NOT EXISTS idx_playlistId_contentType ON playlist_items(playlistId, contentType);
  `);

  const saveItemsBatch = async (playlistId, items) => {
    const now = Date.now();
    
    await db.withTransactionAsync(async () => {
      for (const { item, contentType } of items) {
        await db.runAsync(
          `INSERT OR REPLACE INTO playlist_items 
           (id, playlistId, name, streamUrl, tvgId, tvgName, tvgLogo, groupTitle, contentType, savedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.tvgId || item.streamUrl,
            playlistId,
            item.name,
            item.streamUrl,
            item.tvgId || null,
            item.tvgName || item.name,
            item.tvgLogo || null,
            item.groupTitle || null,
            contentType,
            now,
          ]
        );
      }
    });
    
    console.log(`[sqliteStorage] Saved ${items.length} items in batch`);
  };

  const getPlaylistItems = async (playlistId) => {
    const results = await db.getAllAsync(
      `SELECT * FROM playlist_items WHERE playlistId = ? ORDER BY groupTitle ASC, name ASC`,
      [playlistId]
    );
    return results || [];
  };

  const getItemsByType = async (playlistId, contentType) => {
    const results = await db.getAllAsync(
      `SELECT * FROM playlist_items 
       WHERE playlistId = ? AND contentType = ? 
       ORDER BY groupTitle ASC, name ASC`,
      [playlistId, contentType]
    );
    return results || [];
  };

  const getItemsByGroup = async (playlistId, groupTitle) => {
    const results = await db.getAllAsync(
      `SELECT * FROM playlist_items 
       WHERE playlistId = ? AND groupTitle = ? 
       ORDER BY name ASC`,
      [playlistId, groupTitle]
    );
    return results || [];
  };

  const clearPlaylistItems = async (playlistId) => {
    await db.runAsync(
      `DELETE FROM playlist_items WHERE playlistId = ?`,
      [playlistId]
    );
  };

  const countPlaylistItems = async (playlistId) => {
    const result = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM playlist_items WHERE playlistId = ?`,
      [playlistId]
    );
    return result?.count || 0;
  };

  const searchItems = async (playlistId, searchTerm) => {
    const lowerSearch = `%${searchTerm.toLowerCase()}%`;
    const results = await db.getAllAsync(
      `SELECT * FROM playlist_items 
       WHERE playlistId = ? AND (LOWER(name) LIKE ? OR LOWER(groupTitle) LIKE ?)
       ORDER BY groupTitle ASC, name ASC`,
      [playlistId, lowerSearch, lowerSearch]
    );
    return results || [];
  };

  return {
    saveItemsBatch,
    getPlaylistItems,
    getItemsByType,
    getItemsByGroup,
    clearPlaylistItems,
    countPlaylistItems,
    searchItems,
  };
};
```

#### Create: `src/services/storage/memoryStorage.js`

```javascript
/**
 * In-Memory Storage (Fallback)
 * Used if IndexedDB or SQLite initialization fails
 */

const store = {};

export const createMemoryStorage = async () => {
  const saveItemsBatch = async (playlistId, items) => {
    if (!store[playlistId]) {
      store[playlistId] = [];
    }

    const now = Date.now();
    const newItems = items.map(({ item, contentType }) => ({
      id: item.tvgId || item.streamUrl,
      playlistId,
      name: item.name,
      streamUrl: item.streamUrl,
      tvgId: item.tvgId || null,
      tvgName: item.tvgName || item.name,
      tvgLogo: item.tvgLogo || null,
      groupTitle: item.groupTitle || null,
      contentType,
      savedAt: now,
    }));

    store[playlistId] = [
      ...store[playlistId].filter(
        i => !newItems.map(n => n.id).includes(i.id)
      ),
      ...newItems,
    ];

    console.log(`[memoryStorage] Saved ${items.length} items in batch`);
  };

  const getPlaylistItems = async (playlistId) => {
    const items = store[playlistId] || [];
    items.sort((a, b) => {
      if ((a.groupTitle || '') !== (b.groupTitle || '')) {
        return (a.groupTitle || '').localeCompare(b.groupTitle || '');
      }
      return a.name.localeCompare(b.name);
    });
    return items;
  };

  const getItemsByType = async (playlistId, contentType) => {
    const items = (store[playlistId] || []).filter(
      item => item.contentType === contentType
    );
    items.sort((a, b) => {
      if ((a.groupTitle || '') !== (b.groupTitle || '')) {
        return (a.groupTitle || '').localeCompare(b.groupTitle || '');
      }
      return a.name.localeCompare(b.name);
    });
    return items;
  };

  const getItemsByGroup = async (playlistId, groupTitle) => {
    return (store[playlistId] || [])
      .filter(item => item.groupTitle === groupTitle)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const clearPlaylistItems = async (playlistId) => {
    store[playlistId] = [];
  };

  const countPlaylistItems = async (playlistId) => {
    return (store[playlistId] || []).length;
  };

  const searchItems = async (playlistId, searchTerm) => {
    const lowerSearch = searchTerm.toLowerCase();
    return (store[playlistId] || [])
      .filter(item =>
        item.name.toLowerCase().includes(lowerSearch) ||
        (item.groupTitle && item.groupTitle.toLowerCase().includes(lowerSearch))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  return {
    saveItemsBatch,
    getPlaylistItems,
    getItemsByType,
    getItemsByGroup,
    clearPlaylistItems,
    countPlaylistItems,
    searchItems,
  };
};
```

---

### 2. Web-Compatible Parser Service

**Create: `src/services/webCompatibleParserService.js`**

(Will provide in next message - document is getting large)

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `backgroundParsingService.js` | Remove `Platform.OS === 'web'` guards | Enables web parsing |
| `itemStorageService.js` (NEW) | Unified storage layer | Fixes architecture mismatch |
| `storage/indexedDBStorage.js` (NEW) | Web-persistent storage | Replaces AsyncStorage on web |
| `storage/sqliteStorage.js` (NEW) | Extracted SQLite layer | Consistent storage interface |
| `channelService.js` | Use itemStorageService | Reads from same storage as parser |
| `movieService.js` | Use itemStorageService | Reads from same storage as parser |
| `seriesService.js` | Use itemStorageService | Reads from same storage as parser |

---

## Testing Checklist

- [ ] Web M3U parsing works
- [ ] Web Xtream parsing works
- [ ] Native M3U parsing works  
- [ ] Native Xtream parsing works
- [ ] Content persists on web after page reload
- [ ] Content persists on native after app restart
- [ ] Progressive content loading works (first batch appears first)
- [ ] Large playlists parsed correctly
- [ ] Error handling and recovery works
- [ ] No memory leaks during parsing
- [ ] Background job continues after navigation
