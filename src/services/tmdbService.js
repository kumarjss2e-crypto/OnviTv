/**
 * TMDB API Service
 * Fetches movie and series details from The Movie Database API
 * Includes caching to reduce API calls
 */

import { db } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// TMDB API Configuration
const TMDB_API_KEY = '0c452ba6c287e703a3de560ffd040d9f';
const TMDB_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwYzQ1MmJhNmMyODdlNzAzYTNkZTU2MGZmZDA0MGQ5ZiIsIm5iZiI6MTc2ODg1OTc3MS43OTgsInN1YiI6IjY5NmVhODdiNjg5N2ZkNmMxYjIwZGEwNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.OLYidiFkCEoZhTinYdxlCDqdnVtg9xiMjerBQAnmnDg';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days cache

/**
 * Get cached TMDB data from Firestore
 * @param {string} cacheKey - Unique cache key (e.g., "movie_the-matrix")
 * @returns {Promise<Object|null>} - Cached data or null if expired/not found
 */
const getCachedData = async (cacheKey) => {
  try {
    const cacheRef = doc(db, 'tmdb_cache', cacheKey);
    const cacheSnap = await getDoc(cacheRef);
    
    if (!cacheSnap.exists()) {
      return null;
    }
    
    const cacheData = cacheSnap.data();
    const cacheTime = cacheData.cachedAt?.toMillis?.() || 0;
    const now = Date.now();
    
    // Check if cache is still valid (within 30 days)
    if (now - cacheTime > CACHE_DURATION_MS) {
      console.log('[TMDB Cache] Cache expired for:', cacheKey);
      return null;
    }
    
    console.log('[TMDB Cache] Cache hit for:', cacheKey);
    return cacheData.data;
  } catch (error) {
    console.error('[TMDB Cache] Error retrieving cache:', error);
    return null;
  }
};

/**
 * Save data to TMDB cache in Firestore
 * @param {string} cacheKey - Unique cache key
 * @param {Object} data - Data to cache
 * @returns {Promise<void>}
 */
const setCachedData = async (cacheKey, data) => {
  try {
    const cacheRef = doc(db, 'tmdb_cache', cacheKey);
    await setDoc(cacheRef, {
      data,
      cachedAt: serverTimestamp(),
    });
    console.log('[TMDB Cache] Cached:', cacheKey);
  } catch (error) {
    console.error('[TMDB Cache] Error saving cache:', error);
    // Don't throw - caching failure shouldn't break the app
  }
};

/**
 * Search for a movie by title
 * @param {string} title - Movie title to search for
 * @returns {Promise<Object>} - Search results
 */
export const searchMovie = async (title) => {
  try {
    const encodedTitle = encodeURIComponent(title);
    const url = `${TMDB_BASE_URL}/search/movie?query=${encodedTitle}&include_adult=false`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return { success: false, error: 'No results found', data: null };
    }

    // Return best match (first result)
    return {
      success: true,
      data: data.results[0],
      results: data.results,
    };
  } catch (error) {
    console.error('[TMDB] Error searching movie:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Get detailed movie information by TMDB ID
 * @param {number} movieId - TMDB movie ID
 * @returns {Promise<Object>} - Movie details
 */
export const getMovieDetails = async (movieId) => {
  try {
    const url = `${TMDB_BASE_URL}/movie/${movieId}?append_to_response=credits,videos,images`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      data: formatMovieDetails(data),
    };
  } catch (error) {
    console.error('[TMDB] Error fetching movie details:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Search and get full details for a movie by title
 * Uses cache to avoid repeated API calls
 * @param {string} title - Movie title
 * @returns {Promise<Object>} - Full movie details from TMDB
 */
export const searchAndGetMovieDetails = async (title) => {
  try {
    // Create cache key from title (normalize it)
    const cacheKey = `movie_${title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50)}`;
    
    // Check cache first
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return { success: true, data: cachedData, fromCache: true };
    }

    // Not in cache, search for the movie
    const searchResult = await searchMovie(title);
    
    if (!searchResult.success || !searchResult.data) {
      return { success: false, error: 'Movie not found', data: null };
    }

    // Then get full details
    const detailsResult = await getMovieDetails(searchResult.data.id);
    
    if (detailsResult.success && detailsResult.data) {
      // Cache the result for future use
      await setCachedData(cacheKey, detailsResult.data);
    }
    
    return detailsResult;
  } catch (error) {
    console.error('[TMDB] Error in searchAndGetMovieDetails:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Get TV series details by TMDB ID with caching
 * @param {number} seriesId - TMDB series ID
 * @param {string} seriesName - Series name for cache key
 * @returns {Promise<Object>} - Series details
 */
export const getSeriesDetails = async (seriesId, seriesName = '') => {
  try {
    // Check cache first
    const cacheKey = `series_${seriesId}_${seriesName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}`;
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return { success: true, data: cachedData, fromCache: true };
    }

    const url = `${TMDB_BASE_URL}/tv/${seriesId}?append_to_response=credits,videos,images`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const formattedData = formatSeriesDetails(data);
    
    // Cache the result
    await setCachedData(cacheKey, formattedData);
    
    return {
      success: true,
      data: formattedData,
    };
  } catch (error) {
    console.error('[TMDB] Error fetching series details:', error);
    return { success: false, error: error.message, data: null };
  }
};

/**
 * Format movie details for display
 * @param {Object} data - Raw TMDB movie data
 * @returns {Object} - Formatted movie details
 */
const formatMovieDetails = (data) => {
  return {
    id: data.id,
    title: data.title,
    originalTitle: data.original_title,
    overview: data.overview,
    releaseDate: data.release_date,
    runtime: data.runtime,
    budget: data.budget,
    revenue: data.revenue,
    voteAverage: data.vote_average,
    voteCount: data.vote_count,
    popularity: data.popularity,
    tagline: data.tagline,
    status: data.status,
    originalLanguage: data.original_language,
    genres: data.genres || [],
    productionCompanies: data.production_companies || [],
    productionCountries: data.production_countries || [],
    spokenLanguages: data.spoken_languages || [],
    posterPath: data.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${data.poster_path}` : null,
    backdropPath: data.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/w1280${data.backdrop_path}` : null,
    credits: {
      cast: (data.credits?.cast || []).slice(0, 10).map(actor => ({
        id: actor.id,
        name: actor.name,
        character: actor.character,
        profilePath: actor.profile_path ? `${TMDB_IMAGE_BASE_URL}/w185${actor.profile_path}` : null,
      })),
      crew: (data.credits?.crew || [])
        .filter(person => ['Director', 'Screenplay', 'Writer', 'Producer'].includes(person.job))
        .slice(0, 5)
        .map(person => ({
          id: person.id,
          name: person.name,
          job: person.job,
          profilePath: person.profile_path ? `${TMDB_IMAGE_BASE_URL}/w185${person.profile_path}` : null,
        })),
    },
    videos: {
      results: (data.videos?.results || [])
        .filter(video => video.type === 'Trailer' || video.type === 'Teaser')
        .slice(0, 3),
    },
  };
};

/**
 * Format series details for display
 * @param {Object} data - Raw TMDB series data
 * @returns {Object} - Formatted series details
 */
const formatSeriesDetails = (data) => {
  return {
    id: data.id,
    name: data.name,
    originalName: data.original_name,
    overview: data.overview,
    firstAirDate: data.first_air_date,
    lastAirDate: data.last_air_date,
    numberOfSeasons: data.number_of_seasons,
    numberOfEpisodes: data.number_of_episodes,
    voteAverage: data.vote_average,
    voteCount: data.vote_count,
    popularity: data.popularity,
    status: data.status,
    originalLanguage: data.original_language,
    genres: data.genres || [],
    networks: data.networks || [],
    productionCompanies: data.production_companies || [],
    productionCountries: data.production_countries || [],
    spokenLanguages: data.spoken_languages || [],
    posterPath: data.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${data.poster_path}` : null,
    backdropPath: data.backdrop_path ? `${TMDB_IMAGE_BASE_URL}/w1280${data.backdrop_path}` : null,
    credits: {
      cast: (data.credits?.cast || []).slice(0, 10).map(actor => ({
        id: actor.id,
        name: actor.name,
        character: actor.character,
        profilePath: actor.profile_path ? `${TMDB_IMAGE_BASE_URL}/w185${actor.profile_path}` : null,
      })),
      crew: (data.credits?.crew || [])
        .filter(person => ['Director', 'Creator', 'Writer', 'Producer'].includes(person.job))
        .slice(0, 5)
        .map(person => ({
          id: person.id,
          name: person.name,
          job: person.job,
          profilePath: person.profile_path ? `${TMDB_IMAGE_BASE_URL}/w185${person.profile_path}` : null,
        })),
    },
    videos: {
      results: (data.videos?.results || [])
        .filter(video => video.type === 'Trailer' || video.type === 'Teaser')
        .slice(0, 3),
    },
  };
};

/**
 * Get high quality poster image URL
 * @param {string} posterPath - TMDB poster path
 * @returns {string} - Full poster URL
 */
export const getPosterUrl = (posterPath) => {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE_URL}/w500${posterPath}`;
};

/**
 * Get high quality backdrop image URL
 * @param {string} backdropPath - TMDB backdrop path
 * @returns {string} - Full backdrop URL
 */
export const getBackdropUrl = (backdropPath) => {
  if (!backdropPath) return null;
  return `${TMDB_IMAGE_BASE_URL}/w1280${backdropPath}`;
};

/**
 * Get actor profile image URL
 * @param {string} profilePath - TMDB profile path
 * @returns {string} - Full profile URL
 */
export const getProfileUrl = (profilePath) => {
  if (!profilePath) return null;
  return `${TMDB_IMAGE_BASE_URL}/w185${profilePath}`;
};

export default {
  searchMovie,
  getMovieDetails,
  searchAndGetMovieDetails,
  getSeriesDetails,
  getPosterUrl,
  getBackdropUrl,
  getProfileUrl,
};
