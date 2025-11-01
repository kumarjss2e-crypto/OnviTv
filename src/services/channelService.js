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

// Get all user channels
export const getUserChannels = async (userId) => {
  try {
    const channelsRef = collection(firestore, 'channels');
    const q = query(channelsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const channels = [];
    snapshot.forEach(docSnap => {
      channels.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { success: true, data: channels };
  } catch (error) {
    console.error('Error getting user channels:', error);
    return { success: false, error: error.message };
  }
};

// Search channels
export const searchChannels = async (userId, searchTerm) => {
  try {
    const channelsRef = collection(firestore, 'channels');
    const q = query(channelsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const channels = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        channels.push({ id: docSnap.id, ...data });
      }
    });

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
