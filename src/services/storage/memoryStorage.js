
const storage = new Map();

export const createMemoryStorage = () => ({
  saveItemsBatch: async (playlistId, items) => {
    console.log('[memoryStorage] saveItemsBatch for', playlistId, items.length, 'items');
    const playlistItems = storage.get(playlistId) || [];
    items.forEach((entry) => {
      const item = entry.item || entry;
      playlistItems.push(item);
    });
    storage.set(playlistId, playlistItems);
    return items.length;
  },

  getPlaylistItems: async (playlistId) => {
    console.log('[memoryStorage] getPlaylistItems for', playlistId);
    return storage.get(playlistId) || [];
  },

  getItemsByType: async (playlistId, contentType) => {
    const items = storage.get(playlistId) || [];
    return items.filter(item => (item.contentType || item.type) === contentType);
  },

  getItemsByGroup: async (playlistId, groupTitle) => {
    const items = storage.get(playlistId) || [];
    return items.filter(item => item.groupTitle === groupTitle);
  },

  clearPlaylistItems: async (playlistId) => {
    console.log('[memoryStorage] clearPlaylistItems for', playlistId);
    storage.delete(playlistId);
    return true;
  },

  countPlaylistItems: async (playlistId) => {
    return (storage.get(playlistId) || []).length;
  },

  searchItems: async (playlistId, query) => {
    const items = storage.get(playlistId) || [];
    const q = query.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(q) || 
      (item.tvgName && item.tvgName.toLowerCase().includes(q)) ||
      (item.groupTitle && item.groupTitle.toLowerCase().includes(q))
    );
  }
});

export default createMemoryStorage();
