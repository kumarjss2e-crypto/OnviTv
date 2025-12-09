import { firestore } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Watch History Service - Tracks viewing history and progress
 */

// Add or update watch history
export const updateWatchHistory = async (userId, watchData) => {
  try {
    // Check if history entry already exists
    const historyRef = collection(firestore, 'watchHistory');
    const q = query(
      historyRef,
      where('userId', '==', userId),
      where('contentId', '==', watchData.contentId),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Update existing entry
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, {
        watchedAt: serverTimestamp(),
        progress: watchData.progress,
        completed: watchData.progress >= watchData.duration * 0.9, // 90% watched = completed
      });
      
      return { success: true, historyId: docRef.id };
    } else {
      // Create new entry
      const docRef = await addDoc(historyRef, {
        userId: userId,
        contentType: watchData.contentType, // 'channel', 'movie', 'episode'
        contentId: watchData.contentId,
        playlistId: watchData.playlistId,
        watchedAt: serverTimestamp(),
        duration: watchData.duration,
        progress: watchData.progress,
        completed: false,
        metadata: {
          name: watchData.name,
          poster: watchData.poster || '',
          streamUrl: watchData.streamUrl || '',
        },
      });

      return { success: true, historyId: docRef.id };
    }
  } catch (error) {
    console.error('Error updating watch history:', error);
    return { success: false, error: error.message };
  }
};

// Get user watch history
export const getUserWatchHistory = async (userId, limitCount = 50) => {
  try {
    const historyRef = collection(firestore, 'watchHistory');
    const q = query(
      historyRef,
      where('userId', '==', userId),
      orderBy('watchedAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);

    const history = [];
    snapshot.forEach(docSnap => {
      history.push({ id: docSnap.id, ...docSnap.data() });
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
    const historyRef = collection(firestore, 'watchHistory');
    const q = query(
      historyRef,
      where('userId', '==', userId),
      where('completed', '==', false),
      orderBy('watchedAt', 'desc'),
      limit(20)
    );
    const snapshot = await getDocs(q);

    const continueWatching = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      // Only include if progress is more than 5% and less than 90%
      if (data.progress > data.duration * 0.05 && data.progress < data.duration * 0.9) {
        continueWatching.push({ id: docSnap.id, ...data });
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
    const historyRef = collection(firestore, 'watchHistory');
    const q = query(
      historyRef,
      where('userId', '==', userId),
      where('contentId', '==', contentId),
      limit(1)
    );
    const snapshot = await getDocs(q);

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
    const historyRef = collection(firestore, 'watchHistory');
    const q = query(historyRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const batch = writeBatch(firestore);
    snapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
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
    const docRef = doc(firestore, 'watchHistory', historyId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting history entry:', error);
    return { success: false, error: error.message };
  }
};
