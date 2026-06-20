/**
 * Content Store (Zustand)
 * Centralized state management for playlists and content
 */

import create from 'zustand';
import itemStorageService from '../services/itemStorageService';

/**
 * Content state store
 * Tracks: playlists, current content, filters, loading states
 */
export const useContentStore = create((set, get) => ({
  // ===== STATE =====

  // Playlists management
  playlists: {}, // playlistId → { id, name, type, itemCount, lastSync, ... }
  selectedPlaylistId: null,

  // Cached content for current playlist
  content: {
    channels: [],
    movies: [],
    series: [],
  },

  // Filtering
  contentFilter: {
    type: 'all', // 'all' | 'channel' | 'movie' | 'series'
    searchQuery: '',
    groupTitle: null, // Filter by category/group
  },

  // Loading states
  contentLoading: false,
  playlistsLoading: false,
  contentError: null,

  // Statistics
  stats: {
    totalChannels: 0,
    totalMovies: 0,
    totalSeries: 0,
    totalGroups: 0,
    lastUpdated: null,
  },

  // ===== ACTIONS =====

  /**
   * Set available playlists
   */
  setPlaylists: (playlists) =>
    set({
      playlists,
    }),

  /**
   * Select a playlist to view
   */
  selectPlaylist: (playlistId) =>
    set({
      selectedPlaylistId: playlistId,
      content: { channels: [], movies: [], series: [] },
      contentFilter: { type: 'all', searchQuery: '', groupTitle: null },
      contentLoading: true,
      contentError: null,
    }),

  /**
   * Load content for selected playlist
   */
  loadContent: async (playlistId) => {
    set({ contentLoading: true, contentError: null });

    try {
      // Load content by type
      const channels = await itemStorageService.getItemsByType(playlistId, 'channel');
      const movies = await itemStorageService.getItemsByType(playlistId, 'movie');
      const series = await itemStorageService.getItemsByType(playlistId, 'series');

      // Calculate stats
      const stats = {
        totalChannels: channels.length,
        totalMovies: movies.length,
        totalSeries: series.length,
        totalGroups: new Set([...channels, ...movies, ...series].map((item) => item.groupTitle)).size,
        lastUpdated: Date.now(),
      };

      set({
        content: { channels, movies, series },
        stats,
        contentLoading: false,
      });

      console.log('[CONTENT_STORE] Loaded content for', playlistId, ':', stats);
    } catch (error) {
      console.error('[CONTENT_STORE] Error loading content:', error);
      set({
        contentError: error.message,
        contentLoading: false,
      });
    }
  },

  /**
   * Set filter type
   */
  setFilterType: (type) =>
    set((state) => ({
      contentFilter: { ...state.contentFilter, type },
    })),

  /**
   * Set search query
   */
  setSearchQuery: (query) =>
    set((state) => ({
      contentFilter: { ...state.contentFilter, searchQuery: query },
    })),

  /**
   * Set group filter
   */
  setGroupFilter: (groupTitle) =>
    set((state) => ({
      contentFilter: { ...state.contentFilter, groupTitle },
    })),

  /**
   * Clear all filters
   */
  clearFilters: () =>
    set({
      contentFilter: { type: 'all', searchQuery: '', groupTitle: null },
    }),

  /**
   * Reset content store
   */
  resetContent: () =>
    set({
      selectedPlaylistId: null,
      content: { channels: [], movies: [], series: [] },
      contentFilter: { type: 'all', searchQuery: '', groupTitle: null },
      contentError: null,
      stats: {
        totalChannels: 0,
        totalMovies: 0,
        totalSeries: 0,
        totalGroups: 0,
        lastUpdated: null,
      },
    }),

  // ===== SELECTORS / COMPUTED =====

  /**
   * Get filtered content based on current filters
   */
  getFilteredContent: () => {
    const state = get();
    const { type, searchQuery, groupTitle } = state.contentFilter;
    const { channels, movies, series } = state.content;

    // Start with all content or filtered by type
    let filtered = [];

    if (type === 'all' || type === 'channel') {
      filtered = [...filtered, ...channels];
    }
    if (type === 'all' || type === 'movie') {
      filtered = [...filtered, ...movies];
    }
    if (type === 'all' || type === 'series') {
      filtered = [...filtered, ...series];
    }

    // Apply search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
      );
    }

    // Apply group filter
    if (groupTitle) {
      filtered = filtered.filter((item) => item.groupTitle === groupTitle);
    }

    return filtered;
  },

  /**
   * Get all unique group titles in current playlist
   */
  getGroupTitles: () => {
    const state = get();
    const { channels, movies, series } = state.content;
    const allItems = [...channels, ...movies, ...series];

    const groups = new Set();
    allItems.forEach((item) => {
      if (item.groupTitle) {
        groups.add(item.groupTitle);
      }
    });

    return Array.from(groups).sort();
  },

  /**
   * Get content stats for current playlist
   */
  getStats: () => get().stats,

  /**
   * Get selected playlist info
   */
  getSelectedPlaylistInfo: () => {
    const state = get();
    if (!state.selectedPlaylistId) {
      return null;
    }
    return state.playlists[state.selectedPlaylistId] || null;
  },
}));

export default useContentStore;
