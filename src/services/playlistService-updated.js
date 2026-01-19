/**
 * Playlist Service (Updated)
 * Handles IPTV playlist operations with subcollection architecture
 * Parsing is handled by backgroundParsingService
 */

import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch,
  setDoc,
} from 'firebase/firestore';

/**
 * Add new playlist - Creates metadata only, parsing starts in background
 * @param {string} userId
 * @param {Object} playlistData
 * @returns {Promise<Object>}
 */
export const addPlaylist = async (userId, playlistData) => {
  try {
    const playlistsRef = collection(db, 'playlists');
    
    const playlist = {
      userId: userId,
      name: playlistData.name,
      type: playlistData.type, // 'm3u' or 'xtream'
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
      order: playlistData.order || 0,
      
      // New fields for streaming parser
      isParsing: true,
      parseStatus: 'pending', // pending -> parsing -> completed/error
      lastParseDate: null,
      lastError: null,
      
      stats: {
        totalChannels: 0,
        totalMovies: 0,
        totalSeries: 0,
        totalCategories: 0,
      },
    };

    // Add type-specific config
    if (playlistData.type === 'm3u') {
      playlist.m3uUrl = playlistData.url;
      playlist.m3uConfig = {
        url: playlistData.url,
        lastFetched: null,
      };
    } else if (playlistData.type === 'xtream') {
      playlist.serverUrl = playlistData.serverUrl;
      playlist.username = playlistData.username;
      playlist.password = playlistData.password; // TODO: Encrypt this
      playlist.xtreamConfig = {
        serverUrl: playlistData.serverUrl,
        username: playlistData.username,
        password: playlistData.password,
        lastFetched: null,
        serverInfo: {},
      };
    }

    // Add playlist document
    const docRef = await addDoc(playlistsRef, playlist);
    const playlistId = docRef.id;

    // Create meta subcollection with progress tracking document
    await initializeProgressTracker(playlistId);

    return { 
      success: true, 
      playlistId,
      message: 'Playlist added. Parsing started in background.',
    };

  } catch (error) {
    console.error('Error adding playlist:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Initialize progress tracker document
 * @param {string} playlistId
 * @returns {Promise<void>}
 */
const initializeProgressTracker = async (playlistId) => {
  try {
    const progressRef = doc(db, `playlists/${playlistId}/meta/progress`);
    
    await setDoc(progressRef, {
      status: 'pending',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      lastUpdatedAt: new Date().toISOString(),
      lineNumber: 0,
      itemsProcessed: 0,
      itemsSaved: 0,
      channels: 0,
      movies: 0,
      series: 0,
      duplicates: 0,
      unsupported: 0,
      errors: 0,
      networkRetries: 0,
      parsingSource: null,
      totalItemsWritten: 0,
    });

  } catch (error) {
    console.error('Error initializing progress tracker:', error);
    throw error;
  }
};

/**
 * Get user's playlists
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const getUserPlaylists = async (userId) => {
  try {
    const playlistsRef = collection(db, 'playlists');
    const q = query(
      playlistsRef,
      where('userId', '==', userId),
      orderBy('order', 'asc')
    );
    const snapshot = await getDocs(q);

    const playlists = [];
    snapshot.forEach(docSnap => {
      playlists.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { success: true, data: playlists };

  } catch (error) {
    console.error('Error getting playlists:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get single playlist
 * @param {string} playlistId
 * @returns {Promise<Object>}
 */
export const getPlaylist = async (playlistId) => {
  try {
    const docRef = doc(db, 'playlists', playlistId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Playlist not found' };
    }

  } catch (error) {
    console.error('Error getting playlist:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get playlist progress
 * @param {string} playlistId
 * @returns {Promise<Object>}
 */
export const getPlaylistProgress = async (playlistId) => {
  try {
    const progressRef = doc(db, `playlists/${playlistId}/meta/progress`);
    const docSnap = await getDoc(progressRef);
    
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    } else {
      return { success: false, error: 'Progress not found' };
    }

  } catch (error) {
    console.error('Error getting progress:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update playlist
 * @param {string} playlistId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export const updatePlaylist = async (playlistId, updates) => {
  try {
    const docRef = doc(db, 'playlists', playlistId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return { success: true };

  } catch (error) {
    console.error('Error updating playlist:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get playlist content (channels, movies, series)
 * @param {string} playlistId
 * @param {string} contentType - 'channels' | 'movies' | 'series'
 * @returns {Promise<Object>}
 */
export const getPlaylistContent = async (playlistId, contentType) => {
  try {
    const contentRef = collection(db, `playlists/${playlistId}/${contentType}`);
    const snapshot = await getDocs(contentRef);
    
    const items = [];
    snapshot.forEach(docSnap => {
      items.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { success: true, data: items };

  } catch (error) {
    console.error(`Error getting ${contentType}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete playlist with all subcollections
 * IMPORTANT: Also cancels any active background parsing for this playlist
 * @param {string} playlistId
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>}
 */
export const deletePlaylist = async (playlistId, onProgress = null) => {
  try {
    console.log('Deleting playlist and subcollections:', playlistId);
    
    // Cancel any active parsing for this playlist
    try {
      // Dynamically import to avoid circular dependency
      const { backgroundParsingService } = await import('./backgroundParsingService');
      if (backgroundParsingService.cancelParsing) {
        await backgroundParsingService.cancelParsing(playlistId);
        console.log('Cancelled active parsing for deleted playlist:', playlistId);
      }
    } catch (error) {
      console.warn('Could not cancel parsing (may not be active):', error.message);
    }
    
    const playlistRef = doc(db, 'playlists', playlistId);
    const subcollections = ['channels', 'movies', 'series'];
    let totalDeleted = 0;

    // Delete content in subcollections
    for (const collName of subcollections) {
      const colRef = collection(db, `playlists/${playlistId}/${collName}`);
      const snapshot = await getDocs(colRef);
      
      const batch = writeBatch(db);
      snapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
      totalDeleted += snapshot.size;

      if (onProgress) {
        onProgress({
          phase: 'content',
          collectionName: collName,
          count: snapshot.size,
          totalDeleted,
        });
      }
    }

    // Delete progress tracking
    try {
      const progressRef = doc(db, `playlists/${playlistId}/meta/progress`);
      await deleteDoc(progressRef);
    } catch (error) {
      console.error('Error deleting progress tracker:', error);
    }

    // Delete playlist document
    await deleteDoc(playlistRef);

    if (onProgress) {
      onProgress({
        phase: 'complete',
        totalDeleted,
      });
    }

    return { 
      success: true, 
      totalDeleted,
      message: 'Playlist deleted successfully',
    };

  } catch (error) {
    console.error('Error deleting playlist:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear parsing state (mark as no longer parsing)
 * @param {string} playlistId
 * @returns {Promise<Object>}
 */
export const clearParsingState = async (playlistId) => {
  try {
    await updatePlaylist(playlistId, {
      isParsing: false,
      parseStatus: 'completed',
      lastParseDate: serverTimestamp(),
    });

    return { success: true };

  } catch (error) {
    console.error('Error clearing parsing state:', error);
    return { success: false, error: error.message };
  }
};

export default {
  addPlaylist,
  getUserPlaylists,
  getPlaylist,
  getPlaylistProgress,
  getPlaylistContent,
  updatePlaylist,
  deletePlaylist,
  clearParsingState,
};
