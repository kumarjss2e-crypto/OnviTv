import { firestore } from '../config/firebase';

/**
 * Playlist Service - Handles IPTV playlist operations (M3U/Xtream Codes)
 */

// Add new playlist
export const addPlaylist = async (userId, playlistData) => {
  try {
    const playlistRef = firestore().collection('playlists').doc();
    
    const playlist = {
      userId: userId,
      name: playlistData.name,
      type: playlistData.type, // 'm3u' or 'xtream'
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      isActive: true,
      order: playlistData.order || 0,
      stats: {
        totalChannels: 0,
        totalMovies: 0,
        totalSeries: 0,
        totalCategories: 0,
      },
    };

    // Add type-specific config
    if (playlistData.type === 'm3u') {
      playlist.m3uConfig = {
        url: playlistData.url,
        lastFetched: null,
      };
    } else if (playlistData.type === 'xtream') {
      playlist.xtreamConfig = {
        serverUrl: playlistData.serverUrl,
        username: playlistData.username,
        password: playlistData.password, // TODO: Encrypt this
        lastFetched: null,
        serverInfo: {},
      };
    }

    await playlistRef.set(playlist);

    return { success: true, playlistId: playlistRef.id };
  } catch (error) {
    console.error('Error adding playlist:', error);
    return { success: false, error: error.message };
  }
};

// Get user's playlists
export const getUserPlaylists = async (userId) => {
  try {
    const snapshot = await firestore()
      .collection('playlists')
      .where('userId', '==', userId)
      .orderBy('order', 'asc')
      .get();

    const playlists = [];
    snapshot.forEach(doc => {
      playlists.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: playlists };
  } catch (error) {
    console.error('Error getting playlists:', error);
    return { success: false, error: error.message };
  }
};

// Get single playlist
export const getPlaylist = async (playlistId) => {
  try {
    const doc = await firestore().collection('playlists').doc(playlistId).get();
    
    if (doc.exists) {
      return { success: true, data: { id: doc.id, ...doc.data() } };
    } else {
      return { success: false, error: 'Playlist not found' };
    }
  } catch (error) {
    console.error('Error getting playlist:', error);
    return { success: false, error: error.message };
  }
};

// Update playlist
export const updatePlaylist = async (playlistId, updates) => {
  try {
    await firestore().collection('playlists').doc(playlistId).update({
      ...updates,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating playlist:', error);
    return { success: false, error: error.message };
  }
};

// Delete playlist
export const deletePlaylist = async (playlistId) => {
  try {
    // Delete playlist document
    await firestore().collection('playlists').doc(playlistId).delete();

    // TODO: Delete associated channels, movies, series, etc.
    // This should be done in a Cloud Function for better performance

    return { success: true };
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return { success: false, error: error.message };
  }
};

// Update playlist stats
export const updatePlaylistStats = async (playlistId, stats) => {
  try {
    await firestore().collection('playlists').doc(playlistId).update({
      stats: stats,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating playlist stats:', error);
    return { success: false, error: error.message };
  }
};

// Toggle playlist active status
export const togglePlaylistStatus = async (playlistId, isActive) => {
  try {
    await firestore().collection('playlists').doc(playlistId).update({
      isActive: isActive,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error toggling playlist status:', error);
    return { success: false, error: error.message };
  }
};
