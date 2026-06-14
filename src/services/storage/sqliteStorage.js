import * as SQLite from 'expo-sqlite';

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

const initializeDatabase = () => {
  if (db) {
    return Promise.resolve(db);
  }

  return new Promise((resolve, reject) => {
    try {
      console.log('[sqliteStorage] Opening database...');
      db = SQLite.openDatabase('onvitv.db');

      db.transaction(
        (tx) => {
          console.log('[sqliteStorage] Creating tables...');
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS playlist_items (
              id TEXT PRIMARY KEY,
              playlistId TEXT NOT NULL,
              name TEXT NOT NULL,
              streamUrl TEXT NOT NULL,
              url TEXT,
              tvgId TEXT,
              tvgName TEXT,
              tvgLogo TEXT,
              logo TEXT,
              groupTitle TEXT,
              contentType TEXT,
              type TEXT,
              addedAt INTEGER
            );
          `);
          tx.executeSql('CREATE INDEX IF NOT EXISTS idx_playlistId ON playlist_items (playlistId);');
          tx.executeSql('CREATE INDEX IF NOT EXISTS idx_contentType ON playlist_items (contentType, playlistId);');
        },
        (error) => {
          console.error('[sqliteStorage] Failed to initialize database:', error);
          reject(error);
        },
        () => {
          console.log('[sqliteStorage] Database initialized successfully!');
          resolve(db);
        }
      );
    } catch (error) {
      console.error('[sqliteStorage] Failed to initialize database:', error);
      reject(error);
    }
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

const saveItemsBatch = (playlistId, items) => {
  console.log('[sqliteStorage] saveItemsBatch called with', items?.length, 'items');
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.log('[sqliteStorage] No items to save');
    return Promise.resolve(0);
  }

  return new Promise((resolve, reject) => {
    initializeDatabase()
      .then(() => {
        const now = Date.now();
        let savedCount = 0;
        
        db.transaction(
          (tx) => {
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
                console.warn('[sqliteStorage] Skipping item without identifiers:', rawItem);
                continue;
              }

              const streamUrl = rawItem.streamUrl || rawItem.url || '';
              
              if (!streamUrl) {
                console.warn('[sqliteStorage] Skipping item without stream URL:', rawItem);
                continue;
              }
              
              tx.executeSql(
                `INSERT OR REPLACE INTO playlist_items 
                 (id, playlistId, name, streamUrl, url, tvgId, tvgName, tvgLogo, logo, groupTitle, contentType, type, addedAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  itemId,
                  playlistId,
                  rawItem.name || 'Unknown',
                  streamUrl,
                  streamUrl,
                  rawItem.tvgId || null,
                  rawItem.tvgName || rawItem.name || null,
                  rawItem.tvgLogo || rawItem.logo || null,
                  rawItem.tvgLogo || rawItem.logo || null,
                  rawItem.groupTitle || null,
                  contentType,
                  contentType,
                  now,
                ],
                () => {
                  savedCount++;
                  if (savedCount % 100 === 0) {
                    console.log('[sqliteStorage] Saved', savedCount, 'items so far...');
                  }
                },
                (tx, error) => {
                  console.error('[sqliteStorage] Failed to save item:', error, rawItem);
                  return true;
                }
              );
            }
          },
          (error) => {
            console.error('[sqliteStorage] saveItemsBatch failed:', error);
            reject(error);
          },
          () => {
            console.log('[sqliteStorage] Saved', savedCount, 'items!');
            resolve(savedCount);
          }
        );
      })
      .catch((error) => {
        console.error('[sqliteStorage] saveItemsBatch failed:', error);
        reject(error);
      });
  });
};

const getPlaylistItems = (playlistId) => {
  return new Promise((resolve, reject) => {
    initializeDatabase()
      .then(() => {
        db.transaction(
          (tx) => {
            tx.executeSql(
              'SELECT * FROM playlist_items WHERE playlistId = ? ORDER BY name ASC',
              [playlistId],
              (_, result) => {
                const normalized = result.rows._array.map(normalizeItem);
                console.log('[sqliteStorage] getPlaylistItems:', normalized.length, 'items');
                resolve(normalized);
              },
              (_, error) => {
                console.error('[sqliteStorage] getPlaylistItems failed:', error);
                resolve([]);
                return true;
              }
            );
          }
        );
      })
      .catch((error) => {
        console.error('[sqliteStorage] getPlaylistItems failed:', error);
        resolve([]);
      });
  });
};

const getItemsByType = (playlistId, contentType) => {
  return new Promise((resolve, reject) => {
    initializeDatabase()
      .then(() => {
        db.transaction(
          (tx) => {
            tx.executeSql(
              'SELECT * FROM playlist_items WHERE playlistId = ? AND (contentType = ? OR type = ?) ORDER BY name ASC',
              [playlistId, contentType, contentType],
              (_, result) => {
                resolve(result.rows._array.map(normalizeItem));
              },
              (_, error) => {
                console.error('[sqliteStorage] getItemsByType failed:', error);
                resolve([]);
                return true;
              }
            );
          }
        );
      })
      .catch((error) => {
        console.error('[sqliteStorage] getItemsByType failed:', error);
        resolve([]);
      });
  });
};

const getItemsByGroup = (playlistId, groupTitle) => {
  return new Promise((resolve, reject) => {
    initializeDatabase()
      .then(() => {
        db.transaction(
          (tx) => {
            tx.executeSql(
              'SELECT * FROM playlist_items WHERE playlistId = ? AND groupTitle = ? ORDER BY name ASC',
              [playlistId, groupTitle],
              (_, result) => {
                resolve(result.rows._array.map(normalizeItem));
              },
              (_, error) => {
                console.error('[sqliteStorage] getItemsByGroup failed:', error);
                resolve([]);
                return true;
              }
            );
          }
        );
      })
      .catch((error) => {
        console.error('[sqliteStorage] getItemsByGroup failed:', error);
        resolve([]);
      });
  });
};

const clearPlaylistItems = (playlistId) => {
  return new Promise((resolve, reject) => {
    console.log('[sqliteStorage] Clearing playlist items for:', playlistId);
    initializeDatabase()
      .then(() => {
        db.transaction(
          (tx) => {
            tx.executeSql(
              'DELETE FROM playlist_items WHERE playlistId = ?',
              [playlistId],
              () => {
                console.log('[sqliteStorage] Playlist items cleared!');
                resolve(true);
              },
              (_, error) => {
                console.error('[sqliteStorage] clearPlaylistItems failed:', error);
                resolve(false);
                return true;
              }
            );
          }
        );
      })
      .catch((error) => {
        console.error('[sqliteStorage] clearPlaylistItems failed:', error);
        resolve(false);
      });
  });
};

const countPlaylistItems = (playlistId) => {
  return new Promise((resolve, reject) => {
    initializeDatabase()
      .then(() => {
        db.transaction(
          (tx) => {
            tx.executeSql(
              'SELECT COUNT(*) AS count FROM playlist_items WHERE playlistId = ?',
              [playlistId],
              (_, result) => {
                resolve(result.rows._array[0]?.count || 0);
              },
              (_, error) => {
                console.error('[sqliteStorage] countPlaylistItems failed:', error);
                resolve(0);
                return true;
              }
            );
          }
        );
      })
      .catch((error) => {
        console.error('[sqliteStorage] countPlaylistItems failed:', error);
        resolve(0);
      });
  });
};

const searchItems = (playlistId, query) => {
  return new Promise((resolve, reject) => {
    initializeDatabase()
      .then(() => {
        const searchTerm = `%${query.toLowerCase()}%`;
        db.transaction(
          (tx) => {
            tx.executeSql(
              'SELECT * FROM playlist_items WHERE playlistId = ? AND (LOWER(name) LIKE ? OR LOWER(tvgName) LIKE ? OR LOWER(groupTitle) LIKE ?) ORDER BY name ASC',
              [playlistId, searchTerm, searchTerm, searchTerm],
              (_, result) => {
                resolve(result.rows._array.map(normalizeItem));
              },
              (_, error) => {
                console.error('[sqliteStorage] searchItems failed:', error);
                resolve([]);
                return true;
              }
            );
          }
        );
      })
      .catch((error) => {
        console.error('[sqliteStorage] searchItems failed:', error);
        resolve([]);
      });
  });
};

export const createSQLiteStorage = () => ({
  saveItemsBatch,
  getPlaylistItems,
  getItemsByType,
  getItemsByGroup,
  clearPlaylistItems,
  countPlaylistItems,
  searchItems,
});

export default createSQLiteStorage();
