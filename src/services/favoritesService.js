import { firestore } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
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
 * Favorites Service - Handles user favorites
 */

// Add to favorites
export const addToFavorites = async (userId, contentData) => {
  try {
    const favoritesRef = collection(firestore, 'favorites');
    
    const docRef = await addDoc(favoritesRef, {
      userId: userId,
      contentType: contentData.contentType, // 'channel', 'movie', 'series'
      contentId: contentData.contentId,
      playlistId: contentData.playlistId,
      addedAt: serverTimestamp(),
      metadata: {
        name: contentData.name,
        poster: contentData.poster || '',
        streamUrl: contentData.streamUrl || '',
      },
    });

    return { success: true, favoriteId: docRef.id };
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return { success: false, error: error.message };
  }
};

// Remove from favorites
export const removeFromFavorites = async (favoriteId) => {
  try {
    const docRef = doc(firestore, 'favorites', favoriteId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return { success: false, error: error.message };
  }
};

// Get user favorites
export const getUserFavorites = async (userId, contentType = null) => {
  try {
    const favoritesRef = collection(firestore, 'favorites');
    let q;
    
    if (contentType) {
      q = query(
        favoritesRef,
        where('userId', '==', userId),
        where('contentType', '==', contentType),
        orderBy('addedAt', 'desc')
      );
    } else {
      q = query(
        favoritesRef,
        where('userId', '==', userId),
        orderBy('addedAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    const favorites = [];
    
    snapshot.forEach(docSnap => {
      favorites.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { success: true, data: favorites };
  } catch (error) {
    console.error('Error getting favorites:', error);
    return { success: false, error: error.message };
  }
};

// Check if content is favorited
export const isFavorited = async (userId, contentId) => {
  try {
    const favoritesRef = collection(firestore, 'favorites');
    const q = query(
      favoritesRef,
      where('userId', '==', userId),
      where('contentId', '==', contentId),
      limit(1)
    );
    const snapshot = await getDocs(q);

    return { success: true, isFavorited: !snapshot.empty };
  } catch (error) {
    console.error('Error checking favorite:', error);
    return { success: false, error: error.message };
  }
};

// Remove favorite by content ID
export const removeFavoriteByContentId = async (userId, contentId) => {
  try {
    const favoritesRef = collection(firestore, 'favorites');
    const q = query(
      favoritesRef,
      where('userId', '==', userId),
      where('contentId', '==', contentId)
    );
    const snapshot = await getDocs(q);

    const batch = writeBatch(firestore);
    snapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error removing favorite by content ID:', error);
    return { success: false, error: error.message };
  }
};
