import { firestore } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  getDocs,
  getDoc,
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

// Remove from favorites (by favorite document ID or by userId + contentId)
export const removeFromFavorites = async (userIdOrFavoriteId, contentId = null, contentType = null) => {
  try {
    if (contentId && contentType) {
      // Remove by userId + contentId + contentType
      return await removeFavoriteByContentId(userIdOrFavoriteId, contentId, contentType);
    } else {
      // Remove by favorite document ID
      const docRef = doc(firestore, 'favorites', userIdOrFavoriteId);
      await deleteDoc(docRef);
      return { success: true };
    }
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return { success: false, error: error.message };
  }
};

// Get user favorites with full content data
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
    
    // Fetch full content data for each favorite
    for (const docSnap of snapshot.docs) {
      const favoriteData = docSnap.data();
      const contentId = favoriteData.contentId;
      const type = favoriteData.contentType;
      
      try {
        // Get full content data from respective collection
        let contentDocRef;
        if (type === 'channel') {
          contentDocRef = doc(firestore, 'channels', contentId);
        } else if (type === 'movie') {
          contentDocRef = doc(firestore, 'movies', contentId);
        } else if (type === 'series') {
          contentDocRef = doc(firestore, 'series', contentId);
        }
        
        if (contentDocRef) {
          const contentDoc = await getDoc(contentDocRef);
          
          if (contentDoc.exists()) {
            favorites.push({
              id: contentId,
              favoriteId: docSnap.id,
              contentType: type,
              favoritedAt: favoriteData.addedAt,
              ...contentDoc.data(),
            });
          } else {
            // If content doesn't exist anymore, just use metadata
            favorites.push({
              id: contentId,
              favoriteId: docSnap.id,
              contentType: type,
              favoritedAt: favoriteData.addedAt,
              ...favoriteData.metadata,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching content data:', err);
        // Fallback to metadata
        favorites.push({
          id: contentId,
          favoriteId: docSnap.id,
          contentType: type,
          favoritedAt: favoriteData.addedAt,
          ...favoriteData.metadata,
        });
      }
    }

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

// Remove favorite by content ID and type
export const removeFavoriteByContentId = async (userId, contentId, contentType) => {
  try {
    const favoritesRef = collection(firestore, 'favorites');
    const q = query(
      favoritesRef,
      where('userId', '==', userId),
      where('contentId', '==', contentId),
      where('contentType', '==', contentType)
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
