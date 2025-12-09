import { firestore } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';

/**
 * Metadata Service - Fetches rich metadata from external APIs
 * Uses TMDb (The Movie Database) API for movies and series
 * Free API: https://www.themoviedb.org/settings/api
 */

// TMDb API Configuration
const TMDB_API_KEY = 'cca564b7a6122b96e4c59d65aa37332b';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Clean title for better TMDb search results
 * Removes resolution indicators, brackets, and other noise
 */
const cleanTitle = (title) => {
  if (!title) return '';
  
  return title
    // Remove resolution indicators
    .replace(/\s*\(?\d+p\)?/gi, '')
    // Remove [Not 24/7], [Geo-blocked], etc.
    .replace(/\s*\[.*?\]/g, '')
    // Remove (1080p), (720p), (576p), (480p), (360p)
    .replace(/\s*\(\d+p\)/gi, '')
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Search for movie metadata
 * @param {string} title - Movie title
 * @param {number} year - Release year (optional)
 * @returns {Promise<Object>} - Movie metadata
 */
export const searchMovieMetadata = async (title, year = null) => {
  try {
    // Clean title before searching
    const cleanedTitle = cleanTitle(title);
    
    // Build search URL
    let searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedTitle)}`;
    if (year) {
      searchUrl += `&year=${year}`;
    }

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const movie = data.results[0]; // Get first result
      
      return {
        title: movie.title,
        originalTitle: movie.original_title,
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
        releaseDate: movie.release_date,
        plot: movie.overview,
        description: movie.overview,
        rating: movie.vote_average ? movie.vote_average.toFixed(1) : null,
        voteCount: movie.vote_count,
        poster: movie.poster_path ? `${TMDB_IMAGE_BASE}/w500${movie.poster_path}` : null,
        backdrop: movie.backdrop_path ? `${TMDB_IMAGE_BASE}/original${movie.backdrop_path}` : null,
        genre: movie.genre_ids ? movie.genre_ids.join(',') : null,
        popularity: movie.popularity,
        adult: movie.adult,
        language: movie.original_language,
        tmdbId: movie.id,
        source: 'tmdb',
        fetchedAt: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching movie metadata:', error);
    return null;
  }
};

/**
 * Search for series metadata
 * @param {string} title - Series title
 * @param {number} year - First air year (optional)
 * @returns {Promise<Object>} - Series metadata
 */
export const searchSeriesMetadata = async (title, year = null) => {
  try {
    // Clean title before searching
    const cleanedTitle = cleanTitle(title);
    
    // Build search URL
    let searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanedTitle)}`;
    if (year) {
      searchUrl += `&first_air_date_year=${year}`;
    }

    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const series = data.results[0]; // Get first result
      
      // Fetch detailed series info including seasons
      const detailsUrl = `${TMDB_BASE_URL}/tv/${series.id}?api_key=${TMDB_API_KEY}`;
      const detailsResponse = await fetch(detailsUrl);
      const details = await detailsResponse.json();
      
      return {
        title: series.name,
        originalTitle: series.original_name,
        year: series.first_air_date ? new Date(series.first_air_date).getFullYear() : null,
        firstAirDate: series.first_air_date,
        plot: series.overview,
        description: series.overview,
        rating: series.vote_average ? series.vote_average.toFixed(1) : null,
        voteCount: series.vote_count,
        poster: series.poster_path ? `${TMDB_IMAGE_BASE}/w500${series.poster_path}` : null,
        backdrop: series.backdrop_path ? `${TMDB_IMAGE_BASE}/original${series.backdrop_path}` : null,
        genre: series.genre_ids ? series.genre_ids.join(',') : null,
        popularity: series.popularity,
        language: series.original_language,
        tmdbId: series.id,
        totalSeasons: details.number_of_seasons,
        totalEpisodes: details.number_of_episodes,
        seasons: details.seasons ? details.seasons.map(season => ({
          seasonNumber: season.season_number,
          name: season.name,
          episodeCount: season.episode_count,
          airDate: season.air_date,
          poster: season.poster_path ? `${TMDB_IMAGE_BASE}/w500${season.poster_path}` : null,
        })) : [],
        status: details.status,
        type: details.type,
        networks: details.networks ? details.networks.map(n => n.name) : [],
        source: 'tmdb',
        fetchedAt: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching series metadata:', error);
    return null;
  }
};

/**
 * Get season episodes metadata
 * @param {number} tmdbId - TMDb series ID
 * @param {number} seasonNumber - Season number
 * @returns {Promise<Array>} - Episodes array
 */
export const getSeasonEpisodes = async (tmdbId, seasonNumber) => {
  try {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.episodes) {
      return data.episodes.map(episode => ({
        episodeNumber: episode.episode_number,
        seasonNumber: episode.season_number,
        title: episode.name,
        plot: episode.overview,
        airDate: episode.air_date,
        rating: episode.vote_average ? episode.vote_average.toFixed(1) : null,
        voteCount: episode.vote_count,
        thumbnail: episode.still_path ? `${TMDB_IMAGE_BASE}/w500${episode.still_path}` : null,
        runtime: episode.runtime,
      }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching season episodes:', error);
    return [];
  }
};

/**
 * Get or fetch metadata with caching
 * @param {string} contentId - Content ID
 * @param {string} contentType - 'movie' or 'series'
 * @param {string} title - Content title
 * @param {number} year - Release year
 * @returns {Promise<Object>} - Metadata object
 */
export const getMetadataWithCache = async (contentId, contentType, title, year = null) => {
  try {
    // Check if metadata already cached in Firestore
    const metadataRef = doc(firestore, 'metadata', contentId);
    const metadataDoc = await getDoc(metadataRef);

    if (metadataDoc.exists()) {
      const cached = metadataDoc.data();
      // Check if cache is less than 30 days old
      const cacheAge = Date.now() - new Date(cached.fetchedAt).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      
      if (cacheAge < thirtyDays) {
        console.log('Using cached metadata for:', title);
        return cached;
      }
    }

    // Fetch fresh metadata
    console.log('Fetching fresh metadata for:', title);
    let metadata;
    
    if (contentType === 'movie') {
      metadata = await searchMovieMetadata(title, year);
    } else if (contentType === 'series') {
      metadata = await searchSeriesMetadata(title, year);
    }

    if (metadata) {
      // Cache in Firestore
      await setDoc(metadataRef, {
        ...metadata,
        contentId,
        contentType,
        cachedAt: serverTimestamp(),
      });
      
      return metadata;
    }

    return null;
  } catch (error) {
    console.error('Error getting metadata with cache:', error);
    return null;
  }
};

/**
 * Check if content already has sufficient metadata
 * @param {Object} content - Content object
 * @returns {boolean} - True if content has good metadata
 */
const hasGoodMetadata = (content) => {
  // Check if content has key metadata fields
  const hasPoster = content.poster || content.cover;
  const hasDescription = content.description || content.plot || content.overview;
  const hasTmdbId = content.tmdbId; // Important for series episodes
  
  // If it has poster AND description AND tmdbId, consider it complete
  // For series, tmdbId is critical for fetching episodes
  return hasPoster && hasDescription && hasTmdbId;
};

/**
 * Enrich content with metadata
 * @param {Object} content - Content object from Firebase
 * @param {string} contentType - 'movie' or 'series'
 * @param {boolean} forceEnrich - Force enrichment even if content has metadata
 * @returns {Promise<Object>} - Enriched content
 */
export const enrichContentWithMetadata = async (content, contentType, forceEnrich = false) => {
  try {
    // Skip enrichment if content already has good metadata (unless forced)
    if (!forceEnrich && hasGoodMetadata(content)) {
      console.log(`[Metadata] Skipping enrichment for "${content.title || content.name}" - already has metadata`);
      return content;
    }
    
    const title = content.title || content.name;
    const year = content.year;
    
    const metadata = await getMetadataWithCache(content.id, contentType, title, year);
    
    if (metadata) {
      // Merge metadata, but preserve existing values if they exist
      return {
        ...content,
        // Only override if original doesn't have the field
        poster: content.poster || content.cover || metadata.poster,
        backdrop: content.backdrop || metadata.backdrop,
        description: content.description || content.plot || content.overview || metadata.description,
        plot: content.plot || content.description || metadata.plot,
        overview: content.overview || content.description || metadata.overview,
        rating: content.rating || content.vote_average || metadata.rating,
        vote_average: content.vote_average || content.rating || metadata.vote_average,
        year: content.year || metadata.year,
        releaseDate: content.releaseDate || metadata.releaseDate,
        genre: content.genre || metadata.genre,
        cast: content.cast || metadata.cast,
        director: content.director || metadata.director,
        runtime: content.runtime || content.duration || metadata.runtime,
        // Add TMDb ID for future reference
        tmdbId: metadata.tmdbId,
        // Keep original stream URL and other critical data
        streamUrl: content.streamUrl,
        stream_url: content.stream_url,
        id: content.id,
        userId: content.userId,
        playlistId: content.playlistId,
      };
    }

    return content;
  } catch (error) {
    console.error('Error enriching content:', error);
    return content;
  }
};

/**
 * Batch enrich multiple content items with rate limiting and lazy loading
 * @param {Array} contentArray - Array of content objects
 * @param {string} contentType - 'movie' or 'series'
 * @param {Object} options - Options for batch processing
 * @returns {Promise<Array>} - Array of enriched content
 */
export const batchEnrichContent = async (contentArray, contentType, options = {}) => {
  try {
    const {
      maxConcurrent = 5, // Process 5 at a time to avoid rate limits
      onlyEnrichVisible = true, // Only enrich first batch
      visibleCount = 20, // Number to enrich immediately
    } = options;

    // For large datasets, only enrich visible items immediately
    if (onlyEnrichVisible && contentArray.length > visibleCount) {
      console.log(`[MetadataService] Large dataset detected (${contentArray.length} items). Enriching first ${visibleCount} only.`);
      
      // Return original array with only first items enriched
      const visibleItems = contentArray.slice(0, visibleCount);
      const remainingItems = contentArray.slice(visibleCount);
      
      // Enrich visible items with concurrency control
      const enrichedVisible = await enrichWithConcurrency(visibleItems, contentType, maxConcurrent);
      
      // Return combined array (enriched + original)
      return [...enrichedVisible, ...remainingItems];
    }

    // For smaller datasets, enrich all with concurrency control
    return await enrichWithConcurrency(contentArray, contentType, maxConcurrent);
  } catch (error) {
    console.error('Error batch enriching content:', error);
    return contentArray;
  }
};

/**
 * Enrich content with concurrency control to avoid rate limits
 * @param {Array} contentArray - Array of content objects
 * @param {string} contentType - 'movie' or 'series'
 * @param {number} maxConcurrent - Maximum concurrent requests
 * @returns {Promise<Array>} - Array of enriched content
 */
const enrichWithConcurrency = async (contentArray, contentType, maxConcurrent = 5) => {
  const results = [];
  
  // Process in batches
  for (let i = 0; i < contentArray.length; i += maxConcurrent) {
    const batch = contentArray.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(content => 
      enrichContentWithMetadata(content, contentType)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to respect rate limits (40 req/10sec for TMDb)
    if (i + maxConcurrent < contentArray.length) {
      await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay
    }
  }
  
  return results;
};

/**
 * Enrich a single item on-demand (for lazy loading)
 * @param {Object} content - Content object
 * @param {string} contentType - 'movie' or 'series'
 * @returns {Promise<Object>} - Enriched content
 */
export const enrichSingleContent = async (content, contentType) => {
  try {
    // Check if already enriched
    if (content.tmdbId || content.source === 'tmdb') {
      return content;
    }
    
    return await enrichContentWithMetadata(content, contentType);
  } catch (error) {
    console.error('Error enriching single content:', error);
    return content;
  }
};

export default {
  searchMovieMetadata,
  searchSeriesMetadata,
  getSeasonEpisodes,
  getMetadataWithCache,
  enrichContentWithMetadata,
  batchEnrichContent,
  enrichSingleContent,
};
