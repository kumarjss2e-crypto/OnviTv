import { firestore } from '../config/firebase';

/**
 * Channel Service - Handles live TV channel operations
 */

// Add channels in batch (from playlist parsing)
export const addChannelsBatch = async (channels) => {
  try {
    const batch = firestore().batch();
    
    channels.forEach(channel => {
      const channelRef = firestore().collection('channels').doc();
      batch.set(channelRef, {
        ...channel,
        addedAt: firestore.FieldValue.serverTimestamp(),
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
    let query = firestore()
      .collection('channels')
      .where('playlistId', '==', playlistId);

    if (categoryName) {
      query = query.where('categoryName', '==', categoryName);
    }

    const snapshot = await query.get();
    const channels = [];
    
    snapshot.forEach(doc => {
      channels.push({ id: doc.id, ...doc.data() });
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
    const snapshot = await firestore()
      .collection('channels')
      .where('userId', '==', userId)
      .get();

    const channels = [];
    snapshot.forEach(doc => {
      channels.push({ id: doc.id, ...doc.data() });
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
    const snapshot = await firestore()
      .collection('channels')
      .where('userId', '==', userId)
      .get();

    const channels = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        channels.push({ id: doc.id, ...data });
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
    const doc = await firestore().collection('channels').doc(channelId).get();
    
    if (doc.exists) {
      return { success: true, data: { id: doc.id, ...doc.data() } };
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
    const snapshot = await firestore()
      .collection('channels')
      .where('playlistId', '==', playlistId)
      .get();

    const batch = firestore().batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error deleting channels:', error);
    return { success: false, error: error.message };
  }
};
