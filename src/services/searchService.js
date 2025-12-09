import { db } from '../config/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

/**
 * Search across all content types (channels, movies, series)
 * @param {string} userId - User ID
 * @param {string} searchQuery - Search query string
 * @returns {Promise<{channels: Array, movies: Array, series: Array}>}
 */
export const searchContent = async (userId, searchQuery) => {
  try {
    const searchLower = searchQuery.toLowerCase();
    
    // Search channels
    const channelsRef = collection(db, 'channels');
    const channelsQuery = query(
      channelsRef,
      where('userId', '==', userId),
      limit(20)
    );
    const channelsSnapshot = await getDocs(channelsQuery);
    const channels = channelsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(channel => {
        const name = (channel.name || '').toLowerCase();
        const category = (channel.category || '').toLowerCase();
        return name.includes(searchLower) || category.includes(searchLower);
      });

    // Search movies
    const moviesRef = collection(db, 'movies');
    const moviesQuery = query(
      moviesRef,
      where('userId', '==', userId),
      limit(20)
    );
    const moviesSnapshot = await getDocs(moviesQuery);
    const movies = moviesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(movie => {
        const title = (movie.title || movie.name || '').toLowerCase();
        const category = (movie.category || movie.genre || '').toLowerCase();
        const description = (movie.description || movie.plot || '').toLowerCase();
        return title.includes(searchLower) || 
               category.includes(searchLower) || 
               description.includes(searchLower);
      });

    // Search series
    const seriesRef = collection(db, 'series');
    const seriesQuery = query(
      seriesRef,
      where('userId', '==', userId),
      limit(20)
    );
    const seriesSnapshot = await getDocs(seriesQuery);
    const series = seriesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(show => {
        const title = (show.title || show.name || '').toLowerCase();
        const category = (show.category || show.genre || '').toLowerCase();
        const description = (show.description || show.plot || '').toLowerCase();
        return title.includes(searchLower) || 
               category.includes(searchLower) || 
               description.includes(searchLower);
      });

    return {
      channels: channels.slice(0, 10),
      movies: movies.slice(0, 10),
      series: series.slice(0, 10),
    };
  } catch (error) {
    console.error('Error searching content:', error);
    return {
      channels: [],
      movies: [],
      series: [],
    };
  }
};

/**
 * Get trending/popular searches (placeholder for future implementation)
 * @returns {Promise<Array<string>>}
 */
export const getTrendingSearches = async () => {
  // TODO: Implement trending searches based on user activity
  return [
    'Action Movies',
    'Comedy Series',
    'News Channels',
    'Sports',
    'Drama',
  ];
};
