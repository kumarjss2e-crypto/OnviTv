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
    console.error('Error getting featured movie:', error);
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
    console.error('Error getting movies by category:', error);
    return { success: false, error: error.message };
  }
};

// Get movies by playlist
export const getMoviesByPlaylist = async (playlistId, limitCount = 20) => {
  try {
    const moviesRef = collection(firestore, 'movies');
    const q = query(
      moviesRef,
      where('playlistId', '==', playlistId),
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
    console.error('Error getting movies by playlist:', error);
    return { success: false, error: error.message };
  }
};

// Get all movies for a user (from all their playlists)
export const getUserMovies = async (userId, limitCount = 50) => {
  try {
    const moviesRef = collection(firestore, 'movies');
    const q = query(
      moviesRef,
      where('userId', '==', userId),
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
    console.error('Error getting user movies:', error);
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
    console.error('Error getting movie:', error);
    return { success: false, error: error.message };
  }
};

// Search movies
export const searchMovies = async (userId, searchTerm) => {
  try {
    const moviesRef = collection(firestore, 'movies');
    const q = query(moviesRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    const movies = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        movies.push({ id: docSnap.id, ...data });
      }
    });

    return { success: true, data: movies };
  } catch (error) {
    console.error('Error searching movies:', error);
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
    console.error('Error getting trending movies:', error);
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
    console.error('Error getting recent movies:', error);
    return { success: false, error: error.message };
  }
};

// Get general (admin) movies - for Movies page
export const getGeneralMovies = async (categoryName = null, limitCount = null) => {
  try {
    const moviesRef = collection(firestore, 'generalMovies');
    let q;
    
    if (categoryName) {
      q = query(
        moviesRef,
        where('categoryName', '==', categoryName),
        orderBy('addedAt', 'desc')
      );
    } else {
      q = query(moviesRef, orderBy('addedAt', 'desc'));
    }

    const snapshot = await getDocs(q);
    let movies = [];
    
    snapshot.forEach(docSnap => {
      movies.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Apply limit if specified
    if (limitCount) {
      movies = movies.slice(0, limitCount);
    }

    return { success: true, data: movies };
  } catch (error) {
    console.error('Error getting general movies:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Get general movie categories
export const getGeneralMovieCategories = async () => {
  try {
    const moviesRef = collection(firestore, 'generalMovies');
    const snapshot = await getDocs(moviesRef);
    
    const categoriesSet = new Set();
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.categoryName) {
        categoriesSet.add(data.categoryName);
      }
    });

    const categories = Array.from(categoriesSet).sort();
    return { success: true, data: categories };
  } catch (error) {
    console.error('Error getting general movie categories:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Get general (admin) series - for Movies page
export const getGeneralSeries = async (categoryName = null, limitCount = null) => {
  try {
    const seriesRef = collection(firestore, 'generalSeries');
    let q;
    
    if (categoryName) {
      q = query(
        seriesRef,
        where('categoryName', '==', categoryName),
        orderBy('addedAt', 'desc')
      );
    } else {
      q = query(seriesRef, orderBy('addedAt', 'desc'));
    }

    const snapshot = await getDocs(q);
    let series = [];
    
    snapshot.forEach(docSnap => {
      series.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Apply limit if specified
    if (limitCount) {
      series = series.slice(0, limitCount);
    }

    return { success: true, data: series };
  } catch (error) {
    console.error('Error getting general series:', error);
    return { success: false, error: error.message, data: [] };
  }
};
