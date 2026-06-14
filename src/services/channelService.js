import { itemStorageService } from './itemStorageService';
import { firestore } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where,
} from 'firebase/firestore';

/**
 * Channel Service - Handles live TV channel operations
 * Content stored via unified itemStorageService, playlist metadata in Firebase
 */

// Add channels in batch (from playlist parsing) - saves via unified storage
export const addChannelsBatch = async (playlistId, channels) => {
  try {
    const items = channels.map(ch => ({
      item: ch,
      contentType: 'channel',
    }));
    await itemStorageService.saveItemsBatch(playlistId, items);
    console.log(`[BATCH_SAVE] Saved ${channels.length} channels for playlist ${playlistId}`);
    return { success: true };
  } catch (error) {
    console.error('[channelService] Error adding channels batch:', error);
    return { success: false, error: error.message };
  }
};

// Get channels by playlist - reads from unified storage
export const getChannelsByPlaylist = async (playlistId, groupTitle = null) => {
  try {
    const channels = await itemStorageService.getItemsByType(playlistId, 'channel');
    
    let filtered = channels;
    if (groupTitle) {
      filtered = channels.filter(ch => ch.groupTitle === groupTitle);
    }

    console.log(`[CONTENT_LOAD] Playlist ${playlistId}: Found ${filtered.length} channels`);
    return { success: true, data: filtered };
  } catch (error) {
    console.error('[channelService] Error getting channels:', error);
    return { success: false, error: error.message };
  }
};

// Get all user channels from all their playlists - reads from unified storage
export const getUserChannels = async (userId) => {
  try {
    // Get user's playlists from Firebase (metadata only)
    const playlistsRef = collection(firestore, 'playlists');
    const playlistsQ = query(playlistsRef, where('userId', '==', userId));
    const playlistsSnapshot = await getDocs(playlistsQ);

    const channels = [];
    
    // For each playlist, get channels from unified storage
    for (const playlistDoc of playlistsSnapshot.docs) {
      const playlistId = playlistDoc.id;
      const playlistChannels = await itemStorageService.getItemsByType(playlistId, 'channel');
      
      console.log(`[CONTENT_LOAD] Playlist ${playlistId}: Found ${playlistChannels.length} channels`);
      
      playlistChannels.forEach(channel => {
        channels.push({ 
          ...channel,
          playlistId,
        });
      });
    }

    console.log(`[CONTENT_LOAD] Total channels across all playlists: ${channels.length}`);

    return { success: true, data: channels };
  } catch (error) {
    console.error('[channelService] Error getting user channels:', error);
    return { success: false, error: error.message };
  }
};

// Search channels (from nested subcollections)
export const searchChannels = async (userId, searchTerm) => {
  try {
    // Query all playlists for this user
    const playlistsRef = collection(firestore, 'playlists');
    const playlistsQ = query(playlistsRef, where('userId', '==', userId));
    const playlistsSnapshot = await getDocs(playlistsQ);

    const channels = [];
    
    // For each playlist, search in nested channels subcollection
    for (const playlistDoc of playlistsSnapshot.docs) {
      const playlistId = playlistDoc.id;
      const channelsRef = collection(firestore, `playlists/${playlistId}/channels`);
      const channelsSnapshot = await getDocs(channelsRef);
      
      channelsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.name?.toLowerCase().includes(searchTerm.toLowerCase())) {
          channels.push({ 
            id: docSnap.id, 
            playlistId,
            ...data 
          });
        }
      });
    }

    return { success: true, data: channels };
  } catch (error) {
    console.error('Error searching channels:', error);
    return { success: false, error: error.message };
  }
};

// Get channel by ID
export const getChannel = async (channelId) => {
  try {
    const docRef = doc(firestore, 'channels', channelId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Channel not found' };
    }
  } catch (error) {
    console.error('Error getting channel:', error);
    return { success: false, error: error.message };
  }
};

// Delete channels by playlist
export const deleteChannelsByPlaylist = async (playlistId) => {
  try {
    const channelsRef = collection(firestore, 'channels');
    const q = query(channelsRef, where('playlistId', '==', playlistId));
    const snapshot = await getDocs(q);

    const batch = writeBatch(firestore);
    snapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error deleting channels:', error);
    return { success: false, error: error.message };
  }
};
