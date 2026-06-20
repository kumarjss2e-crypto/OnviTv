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
  limit,
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

// Delete playlist with progress tracking (optimized for large playlists)
export const deletePlaylist = async (playlistId, onProgress = null) => {
  try {
    console.log('[playlistService] Deleting playlist and associated content:', playlistId);
    
    const subCollections = ['channels', 'movies', 'series'];
    let deletedCount = { channels: 0, movies: 0, series: 0 };
    let totalDeleted = 0;
    
    // Report starting
    if (onProgress) {
      onProgress({
        phase: 'starting',
        total: 0,
        deleted: 0,
        percentage: 0,
        message: 'Starting deletion...'
      });
    }

    const BATCH_SIZE = 500;
    const DELETION_TIMEOUT = 60000; // 60 seconds per batch

    // Process all subcollections in PARALLEL (not sequential)
    const deletionPromises = subCollections.map(async (subCollectionName) => {
      let collectionDeleted = 0;
      let hasMore = true;
      
      // Keep deleting in batches until no more documents
      while (hasMore) {
        try {
          const subCollectionRef = collection(firestore, `playlists/${playlistId}/${subCollectionName}`);
          
          // Get only what we need for deletion (1 batch size)
          const snapshot = await getDocs(query(subCollectionRef, limit(BATCH_SIZE)));
          const docs = snapshot.docs;
          
          if (docs.length === 0) {
            hasMore = false;
            console.log(`[playlistService] No more documents in ${subCollectionName}`);
            break;
          }
          
          // Delete this batch
          const batch = writeBatch(firestore);
          docs.forEach(docSnap => {
            batch.delete(docSnap.ref);
          });
          
          await batch.commit();
          collectionDeleted += docs.length;
          
          console.log(`[playlistService] Deleted batch of ${docs.length} from ${subCollectionName} (total: ${collectionDeleted})`);
          
          // Check if more documents exist
          if (docs.length < BATCH_SIZE) {
            hasMore = false;
          }
          
          // Add small delay between batches to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`[playlistService] Error deleting ${subCollectionName}:`, error);
          throw error;
        }
      }
      
      console.log(`[playlistService] Total deleted from ${subCollectionName}: ${collectionDeleted}`);
      return { subCollectionName, deleted: collectionDeleted };
    });

    // Wait for all subcollections to finish deleting in parallel
    const results = await Promise.all(deletionPromises);
    
    // Aggregate results
    results.forEach(result => {
      deletedCount[result.subCollectionName] = result.deleted;
      totalDeleted += result.deleted;
    });

    console.log('[playlistService] Deleted content summary:', deletedCount);
    
    // Report before final deletion
    if (onProgress) {
      onProgress({
        phase: 'finalizing',
        total: totalDeleted,
        deleted: totalDeleted,
        percentage: 99,
        message: 'Finalizing deletion...'
      });
    }

    // Finally, delete the playlist document
    const docRef = doc(firestore, 'playlists', playlistId);
    await deleteDoc(docRef);

    console.log('[playlistService] Playlist document deleted successfully');

    // Report completion
    if (onProgress) {
      onProgress({
        phase: 'complete',
        total: totalDeleted,
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
    console.log('[playlistService] updatePlaylistStats called with:', { playlistId, stats });
    const docRef = doc(firestore, 'playlists', playlistId);
    
    const updateData = {
      stats: stats,
      updatedAt: serverTimestamp(),
    };
    
    console.log('[playlistService] Updating Firestore document with:', updateData);
    await updateDoc(docRef, updateData);
    
    console.log('[playlistService] Stats updated successfully in Firestore');
    return { success: true };
  } catch (error) {
    console.error('[playlistService] Error updating playlist stats:', error);
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
