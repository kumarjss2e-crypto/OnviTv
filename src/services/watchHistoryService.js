import { firestore } from '../config/firebase';

/**
 * Watch History Service - Tracks viewing history and progress
 */

// Add or update watch history
export const updateWatchHistory = async (userId, watchData) => {
  try {
    // Check if history entry already exists
    const snapshot = await firestore()
      .collection('watchHistory')
      .where('userId', '==', userId)
      .where('contentId', '==', watchData.contentId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      // Update existing entry
      const docRef = snapshot.docs[0].ref;
      await docRef.update({
        watchedAt: firestore.FieldValue.serverTimestamp(),
        progress: watchData.progress,
        completed: watchData.progress >= watchData.duration * 0.9, // 90% watched = completed
      });
      
      return { success: true, historyId: docRef.id };
    } else {
      // Create new entry
      const historyRef = firestore().collection('watchHistory').doc();
      
      await historyRef.set({
        userId: userId,
        contentType: watchData.contentType, // 'channel', 'movie', 'episode'
        contentId: watchData.contentId,
        playlistId: watchData.playlistId,
        watchedAt: firestore.FieldValue.serverTimestamp(),
        duration: watchData.duration,
        progress: watchData.progress,
        completed: false,
        metadata: {
          name: watchData.name,
          poster: watchData.poster || '',
          streamUrl: watchData.streamUrl || '',
        },
      });

      return { success: true, historyId: historyRef.id };
    }
  } catch (error) {
    console.error('Error updating watch history:', error);
    return { success: false, error: error.message };
  }
};

// Get user watch history
export const getUserWatchHistory = async (userId, limit = 50) => {
  try {
    const snapshot = await firestore()
      .collection('watchHistory')
      .where('userId', '==', userId)
      .orderBy('watchedAt', 'desc')
      .limit(limit)
      .get();

    const history = [];
    snapshot.forEach(doc => {
      history.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, data: history };
  } catch (error) {
    console.error('Error getting watch history:', error);
    return { success: false, error: error.message };
  }
};

// Get continue watching (incomplete content)
export const getContinueWatching = async (userId) => {
  try {
    const snapshot = await firestore()
      .collection('watchHistory')
      .where('userId', '==', userId)
      .where('completed', '==', false)
      .orderBy('watchedAt', 'desc')
      .limit(20)
      .get();

    const continueWatching = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Only include if progress is more than 5% and less than 90%
      if (data.progress > data.duration * 0.05 && data.progress < data.duration * 0.9) {
        continueWatching.push({ id: doc.id, ...data });
      }
    });

    return { success: true, data: continueWatching };
  } catch (error) {
    console.error('Error getting continue watching:', error);
    return { success: false, error: error.message };
  }
};

// Get watch progress for specific content
export const getWatchProgress = async (userId, contentId) => {
  try {
    const snapshot = await firestore()
      .collection('watchHistory')
      .where('userId', '==', userId)
      .where('contentId', '==', contentId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      return { 
        success: true, 
        progress: data.progress,
        completed: data.completed 
      };
    } else {
      return { success: true, progress: 0, completed: false };
    }
  } catch (error) {
    console.error('Error getting watch progress:', error);
    return { success: false, error: error.message };
  }
};

// Clear watch history
export const clearWatchHistory = async (userId) => {
  try {
    const snapshot = await firestore()
      .collection('watchHistory')
      .where('userId', '==', userId)
      .get();

    const batch = firestore().batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error clearing watch history:', error);
    return { success: false, error: error.message };
  }
};

// Delete specific history entry
export const deleteHistoryEntry = async (historyId) => {
  try {
    await firestore().collection('watchHistory').doc(historyId).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting history entry:', error);
    return { success: false, error: error.message };
  }
};
