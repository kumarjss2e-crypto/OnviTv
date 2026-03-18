import contentStorageService from './contentStorageService';
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
import { asyncLog } from '../utils/asyncLogger';

/**
 * Movie Service - Handles movie-related operations
 */

// Get featured movie (highest rated or manually featured)
export const getFeaturedMovie = async () => {
  try {
    const moviesRef = collection(firestore, 'movies');
    const q = query(
      moviesRef,
      where('isFeatured', '==', true),
      orderBy('addedAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const movie = snapshot.docs[0];
      return { success: true, data: { id: movie.id, ...movie.data() } };
    }

    // If no featured movie, get highest rated
    const fallbackQuery = query(
      moviesRef,
      orderBy('rating', 'desc'),
      limit(1)
    );
    const fallbackSnapshot = await getDocs(fallbackQuery);

    if (!fallbackSnapshot.empty) {
      const movie = fallbackSnapshot.docs[0];
      return { success: true, data: { id: movie.id, ...movie.data() } };
    }

    return { success: false, error: 'No movies found' };
  } catch (error) {
    asyncLog.error('movieService: Featured movie error', { error: error.message });
    return { success: false, error: error.message };
  }
};

// Get movies by category
export const getMoviesByCategory = async (categoryName, limitCount = 10) => {
  try {
    const moviesRef = collection(firestore, 'movies');
    const q = query(
      moviesRef,
      where('categoryName', '==', categoryName),
      orderBy('addedAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);

    const movies = [];
    snapshot.forEach(docSnap => {
      movies.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { success: true, data: movies };
  } catch (error) {
    asyncLog.error('movieService: Get by category error', { error: error.message, category: categoryName });
    return { success: false, error: error.message };
  }
};

// Get movies by playlist - now reads from AsyncStorage
export const getMoviesByPlaylist = async (playlistId, limitCount = 20) => {
  try {
    const movies = await contentStorageService.getMovies(playlistId);
    
    // Apply limit if specified
    const limited = limitCount ? movies.slice(0, limitCount) : movies;
    console.log(`[movieService] Playlist ${playlistId}: Found ${limited.length} movies`);
    
    return { success: true, data: limited };
  } catch (error) {
    asyncLog.error('movieService: Get by playlist error', { error: error.message, playlistId });
    return { success: false, error: error.message };
  }
};

// Get all movies for a user (from all their playlists - from AsyncStorage)
export const getUserMovies = async (userId) => {
  try {
    // Query all playlists for this user from Firebase (metadata only)
    const playlistsRef = collection(firestore, 'playlists');
    const playlistsQ = query(playlistsRef, where('userId', '==', userId));
    const playlistsSnapshot = await getDocs(playlistsQ);

    const movies = [];
    
    // For each playlist, get movies from AsyncStorage
    for (const playlistDoc of playlistsSnapshot.docs) {
      const playlistId = playlistDoc.id;
      const playlistMovies = await contentStorageService.getMovies(playlistId);
      
      console.log(`[movieService] Playlist ${playlistId}: Found ${playlistMovies.length} movies`);
      
      playlistMovies.forEach(movie => {
        movies.push({ 
          ...movie,
          playlistId,
        });
      });
    }

    console.log(`[movieService] Total movies across all playlists: ${movies.length}`);

    return { success: true, data: movies };
  } catch (error) {
    asyncLog.error('movieService: Get user movies error', { error: error.message, userId });
    return { success: false, error: error.message };
  }
};

// Get movie by ID
export const getMovie = async (movieId) => {
  try {
    const docRef = doc(firestore, 'movies', movieId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Movie not found' };
    }
  } catch (error) {
    asyncLog.error('movieService: Get movie error', { error: error.message, movieId });
    return { success: false, error: error.message };
  }
};

// Search movies (from nested subcollections)
export const searchMovies = async (userId, searchTerm) => {
  try {
    // Query all playlists for this user
    const playlistsRef = collection(firestore, 'playlists');
    const playlistsQ = query(playlistsRef, where('userId', '==', userId));
    const playlistsSnapshot = await getDocs(playlistsQ);

    const movies = [];
    
    // For each playlist, search in nested movies subcollection
    for (const playlistDoc of playlistsSnapshot.docs) {
      const playlistId = playlistDoc.id;
      const moviesRef = collection(firestore, `playlists/${playlistId}/movies`);
      const moviesSnapshot = await getDocs(moviesRef);
      
      moviesSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.name?.toLowerCase().includes(searchTerm.toLowerCase())) {
          movies.push({ 
            id: docSnap.id, 
            playlistId,
            ...data 
          });
        }
      });
    }

    return { success: true, data: movies };
  } catch (error) {
    asyncLog.error('movieService: Search error', { error: error.message, searchTerm });
    return { success: false, error: error.message };
  }
};

// Get trending movies (most watched recently)
export const getTrendingMovies = async (limitCount = 10) => {
  try {
    const moviesRef = collection(firestore, 'movies');
    const q = query(
      moviesRef,
      orderBy('viewCount', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);

    const movies = [];
    snapshot.forEach(docSnap => {
      movies.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { success: true, data: movies };
  } catch (error) {
    asyncLog.error('movieService: Trending movies error', { error: error.message });
    return { success: false, error: error.message };
  }
};

// Get recently added movies
export const getRecentMovies = async (userId, limitCount = 10) => {
  try {
    const moviesRef = collection(firestore, 'movies');
    const q = query(
      moviesRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);

    const movies = [];
    snapshot.forEach(docSnap => {
      movies.push({ id: docSnap.id, ...docSnap.data() });
    });

    return { success: true, data: movies };
  } catch (error) {
    asyncLog.error('movieService: Recent movies error', { error: error.message, userId });
    return { success: false, error: error.message };
  }
};
