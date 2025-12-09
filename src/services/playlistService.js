import { firestore } from '../config/firebase';
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
  writeBatch
} from 'firebase/firestore';

/**
 * Playlist Service - Handles IPTV playlist operations (M3U/Xtream Codes)
 */

// Add new playlist
export const addPlaylist = async (userId, playlistData) => {
  try {
    const playlistsRef = collection(firestore, 'playlists');
    
    const playlist = {
      userId: userId,
      name: playlistData.name,
      type: playlistData.type, // 'm3u' or 'xtream'
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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

    const docRef = await addDoc(playlistsRef, playlist);

    return { success: true, playlistId: docRef.id };
  } catch (error) {
    console.error('Error adding playlist:', error);
    return { success: false, error: error.message };
  }
};

// Get user's playlists
export const getUserPlaylists = async (userId) => {
  try {
    const playlistsRef = collection(firestore, 'playlists');
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

// Get single playlist
export const getPlaylist = async (playlistId) => {
  try {
    const docRef = doc(firestore, 'playlists', playlistId);
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

// Update playlist
export const updatePlaylist = async (playlistId, updates) => {
  try {
    const docRef = doc(firestore, 'playlists', playlistId);
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

// Delete playlist with progress tracking
export const deletePlaylist = async (playlistId, onProgress = null) => {
  try {
    console.log('Deleting playlist and associated content:', playlistId);
    
    // Delete associated content first
    const collections = ['channels', 'movies', 'series'];
    let deletedCount = { channels: 0, movies: 0, series: 0 };
    let totalToDelete = 0;
    let totalDeleted = 0;
    
    // First, count total items to delete
    for (const collectionName of collections) {
      const q = query(
        collection(firestore, collectionName),
        where('playlistId', '==', playlistId)
      );
      const snapshot = await getDocs(q);
      totalToDelete += snapshot.size;
    }
    
    console.log(`Total items to delete: ${totalToDelete}`);
    
    // Report initial progress
    if (onProgress) {
      onProgress({
        phase: 'counting',
        total: totalToDelete,
        deleted: 0,
        percentage: 0,
        message: `Found ${totalToDelete} items to delete...`
      });
    }
    
    // Delete in batches of 500 (Firebase limit)
    const BATCH_SIZE = 500;
    
    for (const collectionName of collections) {
      const q = query(
        collection(firestore, collectionName),
        where('playlistId', '==', playlistId)
      );
      
      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      console.log(`Deleting ${docs.length} ${collectionName}...`);
      
      // Process in batches
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(firestore);
        const batchDocs = docs.slice(i, i + BATCH_SIZE);
        
        batchDocs.forEach(docSnap => {
          batch.delete(docSnap.ref);
        });
        
        await batch.commit();
        
        const batchDeleted = batchDocs.length;
        deletedCount[collectionName] += batchDeleted;
        totalDeleted += batchDeleted;
        
        // Report progress
        if (onProgress) {
          const percentage = Math.round((totalDeleted / totalToDelete) * 100);
          onProgress({
            phase: 'deleting',
            total: totalToDelete,
            deleted: totalDeleted,
            percentage,
            currentCollection: collectionName,
            message: `Deleting ${collectionName}... ${totalDeleted}/${totalToDelete}`
          });
        }
        
        console.log(`Deleted batch: ${i + batchDeleted}/${docs.length} ${collectionName}`);
      }
    }
    
    console.log('Deleted content:', deletedCount);
    
    // Report final phase
    if (onProgress) {
      onProgress({
        phase: 'finalizing',
        total: totalToDelete,
        deleted: totalDeleted,
        percentage: 100,
        message: 'Finalizing deletion...'
      });
    }
    
    // Finally, delete the playlist document
    const docRef = doc(firestore, 'playlists', playlistId);
    await deleteDoc(docRef);
    
    console.log('Playlist deleted successfully');
    
    // Report completion
    if (onProgress) {
      onProgress({
        phase: 'complete',
        total: totalToDelete,
        deleted: totalDeleted,
        percentage: 100,
        message: `Successfully deleted ${totalDeleted} items`
      });
    }
    
    return { 
      success: true, 
      deletedCount,
      totalDeleted,
      message: `Deleted playlist and ${deletedCount.channels} channels, ${deletedCount.movies} movies, ${deletedCount.series} series`
    };
  } catch (error) {
    console.error('Error deleting playlist:', error);
    
    // Report error
    if (onProgress) {
      onProgress({
        phase: 'error',
        error: error.message,
        message: `Error: ${error.message}`
      });
    }
    
    return { success: false, error: error.message };
  }
};

// Update playlist stats
export const updatePlaylistStats = async (playlistId, stats) => {
  try {
    console.log('updatePlaylistStats called with:', { playlistId, stats });
    const docRef = doc(firestore, 'playlists', playlistId);
    
    const updateData = {
      stats: stats,
      updatedAt: serverTimestamp(),
    };
    
    console.log('Updating Firestore document with:', updateData);
    await updateDoc(docRef, updateData);
    
    console.log('Stats updated successfully in Firestore');
    return { success: true };
  } catch (error) {
    console.error('Error updating playlist stats:', error);
    return { success: false, error: error.message };
  }
};

// Toggle playlist active status
export const togglePlaylistStatus = async (playlistId, isActive) => {
  try {
    const docRef = doc(firestore, 'playlists', playlistId);
    await updateDoc(docRef, {
      isActive: isActive,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error toggling playlist status:', error);
    return { success: false, error: error.message };
  }
};

// Alias for togglePlaylistStatus
export const togglePlaylistActive = togglePlaylistStatus;

// Set playlist parsing status
export const setPlaylistParsingStatus = async (playlistId, isParsing, progress = null) => {
  try {
    const docRef = doc(firestore, 'playlists', playlistId);
    const updateData = {
      isParsing: isParsing,
      updatedAt: serverTimestamp(),
    };

    if (progress) {
      updateData.parseProgress = progress;
    }

    if (!isParsing) {
      updateData.lastParsed = serverTimestamp();
    }

    await updateDoc(docRef, updateData);

    return { success: true };
  } catch (error) {
    console.error('Error setting parsing status:', error);
    return { success: false, error: error.message };
  }
};

// Update last fetched timestamp
export const updateLastFetched = async (playlistId, type) => {
  try {
    const docRef = doc(firestore, 'playlists', playlistId);
    const updateData = {
      updatedAt: serverTimestamp(),
    };

    if (type === 'm3u') {
      updateData['m3uConfig.lastFetched'] = serverTimestamp();
    } else if (type === 'xtream') {
      updateData['xtreamConfig.lastFetched'] = serverTimestamp();
    }

    await updateDoc(docRef, updateData);

    return { success: true };
  } catch (error) {
    console.error('Error updating last fetched:', error);
    return { success: false, error: error.message };
  }
};
