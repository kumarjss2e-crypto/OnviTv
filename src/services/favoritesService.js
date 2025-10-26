import { firestore } from '../config/firebase';

/**
 * Favorites Service - Handles user favorites
 */

// Add to favorites
export const addToFavorites = async (userId, contentData) => {
  try {
    const favoriteRef = firestore().collection('favorites').doc();
    
    await favoriteRef.set({
      userId: userId,
      contentType: contentData.contentType, // 'channel', 'movie', 'series'
      contentId: contentData.contentId,
      playlistId: contentData.playlistId,
      addedAt: firestore.FieldValue.serverTimestamp(),
      metadata: {
        name: contentData.name,
        poster: contentData.poster || '',
        streamUrl: contentData.streamUrl || '',
      },
    });

    return { success: true, favoriteId: favoriteRef.id };
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return { success: false, error: error.message };
  }
};

// Remove from favorites
export const removeFromFavorites = async (favoriteId) => {
  try {
    await firestore().collection('favorites').doc(favoriteId).delete();
    return { success: true };
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return { success: false, error: error.message };
  }
};

// Get user favorites
export const getUserFavorites = async (userId, contentType = null) => {
  try {
    let query = firestore()
      .collection('favorites')
      .where('userId', '==', userId)
      .orderBy('addedAt', 'desc');

    if (contentType) {
      query = query.where('contentType', '==', contentType);
    }

    const snapshot = await query.get();
    const favorites = [];
    
    snapshot.forEach(doc => {
      favorites.push({ id: doc.id, ...doc.data() });
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
    const snapshot = await firestore()
      .collection('favorites')
      .where('userId', '==', userId)
      .where('contentId', '==', contentId)
      .limit(1)
      .get();

    return { success: true, isFavorited: !snapshot.empty };
  } catch (error) {
    console.error('Error checking favorite:', error);
    return { success: false, error: error.message };
  }
};

// Remove favorite by content ID
export const removeFavoriteByContentId = async (userId, contentId) => {
  try {
    const snapshot = await firestore()
      .collection('favorites')
      .where('userId', '==', userId)
      .where('contentId', '==', contentId)
      .get();

    const batch = firestore().batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error removing favorite by content ID:', error);
    return { success: false, error: error.message };
  }
};
