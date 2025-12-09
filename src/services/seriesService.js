import { firestore } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit 
} from 'firebase/firestore';

/**
 * Series Service - Handles TV series operations
 */

// Get series by playlist
export const getSeriesByPlaylist = async (playlistId, limitCount = 20) => {
  try {
    const seriesRef = collection(firestore, 'series');
    const q = query(
      seriesRef,
      where('playlistId', '==', playlistId),
      orderBy('addedAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);

    const series = [];
    snapshot.forEach(docSnap => {
      series.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { success: true, data: series };
  } catch (error) {
    console.error('Error getting series by playlist:', error);
    return { success: false, error: error.message };
  }
};

// Get all series for a user
export const getUserSeries = async (userId) => {
  try {
    const seriesRef = collection(firestore, 'series');
    const q = query(seriesRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const series = [];
    snapshot.forEach(docSnap => {
      series.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { success: true, data: series };
  } catch (error) {
    console.error('Error getting user series:', error);
    return { success: false, error: error.message };
  }
};

// Get series by ID
export const getSeries = async (seriesId) => {
  try {
    const docRef = doc(firestore, 'series', seriesId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Series not found' };
    }
  } catch (error) {
    console.error('Error getting series:', error);
    return { success: false, error: error.message };
  }
};

// Get episodes for a series
export const getSeriesEpisodes = async (seriesId, seasonNumber = null) => {
  try {
    const episodesRef = collection(firestore, 'episodes');
    let q;

    if (seasonNumber !== null) {
      q = query(
        episodesRef,
        where('seriesId', '==', seriesId),
        where('seasonNumber', '==', seasonNumber),
        orderBy('episodeNumber', 'asc')
      );
    } else {
      q = query(
        episodesRef,
        where('seriesId', '==', seriesId),
        orderBy('seasonNumber', 'asc'),
        orderBy('episodeNumber', 'asc')
      );
    }

    const snapshot = await getDocs(q);

    const episodes = [];
    snapshot.forEach(docSnap => {
      episodes.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { success: true, data: episodes };
  } catch (error) {
    console.error('Error getting series episodes:', error);
    return { success: false, error: error.message };
  }
};

// Get trending series
export const getTrendingSeries = async (limitCount = 10) => {
  try {
    const seriesRef = collection(firestore, 'series');
    const q = query(
      seriesRef,
      orderBy('viewCount', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);

    const series = [];
    snapshot.forEach(docSnap => {
      series.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { success: true, data: series };
  } catch (error) {
    console.error('Error getting trending series:', error);
    return { success: false, error: error.message };
  }
};

// Get recently added series
export const getRecentSeries = async (userId, limitCount = 10) => {
  try {
    const seriesRef = collection(firestore, 'series');
    const q = query(
      seriesRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);

    const series = [];
    snapshot.forEach(docSnap => {
      series.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { success: true, data: series };
  } catch (error) {
    console.error('Error getting recent series:', error);
    return { success: false, error: error.message };
  }
};

// Search series
export const searchSeries = async (userId, searchTerm) => {
  try {
    const seriesRef = collection(firestore, 'series');
    const q = query(seriesRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const series = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        series.push({ id: docSnap.id, ...data });
      }
    });

    return { success: true, data: series };
  } catch (error) {
    console.error('Error searching series:', error);
    return { success: false, error: error.message };
  }
};
