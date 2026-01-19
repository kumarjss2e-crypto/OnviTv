import { firestore } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Channel Service - Handles live TV channel operations
 */

// Add channels in batch (from playlist parsing)
export const addChannelsBatch = async (channels) => {
  try {
    const batch = writeBatch(firestore);
    const channelsRef = collection(firestore, 'channels');
    
    channels.forEach(channel => {
      const channelRef = doc(channelsRef);
      batch.set(channelRef, {
        ...channel,
        addedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error adding channels batch:', error);
    return { success: false, error: error.message };
  }
};

// Get channels by playlist
export const getChannelsByPlaylist = async (playlistId, categoryName = null) => {
  try {
    const channelsRef = collection(firestore, 'channels');
    let q;
    
    if (categoryName) {
      q = query(
        channelsRef,
        where('playlistId', '==', playlistId),
        where('categoryName', '==', categoryName)
      );
    } else {
      q = query(channelsRef, where('playlistId', '==', playlistId));
    }

    const snapshot = await getDocs(q);
    const channels = [];
    
    snapshot.forEach(docSnap => {
      channels.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { success: true, data: channels };
  } catch (error) {
    console.error('Error getting channels:', error);
    return { success: false, error: error.message };
  }
};

// Get all user channels (from nested subcollections under playlists)
export const getUserChannels = async (userId) => {
  try {
    // Query all playlists for this user
    const playlistsRef = collection(firestore, 'playlists');
    const playlistsQ = query(playlistsRef, where('userId', '==', userId));
    const playlistsSnapshot = await getDocs(playlistsQ);

    const channels = [];
    
    // For each playlist, get channels from nested subcollection
    for (const playlistDoc of playlistsSnapshot.docs) {
      const playlistId = playlistDoc.id;
      const channelsRef = collection(firestore, `playlists/${playlistId}/channels`);
      const channelsSnapshot = await getDocs(channelsRef);
      
      console.log(`[channelService] Playlist ${playlistId}: Found ${channelsSnapshot.size} channels`);
      
      channelsSnapshot.forEach(docSnap => {
        channels.push({ 
          id: docSnap.id, 
          playlistId,
          ...docSnap.data() 
        });
      });
    }

    console.log(`[channelService] Total channels across all playlists: ${channels.length}`);

    return { success: true, data: channels };
  } catch (error) {
    console.error('Error getting user channels:', error);
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
