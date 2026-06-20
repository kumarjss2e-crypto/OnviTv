/**
 * useContentState Hook
 * Custom hook to access content state and actions from components
 */

import { useCallback } from 'react';
import useContentStore from '../contentStore';

/**
 * Hook for reading content state
 */
export const useContentState = () => {
  const selectedPlaylistId = useContentStore((state) => state.selectedPlaylistId);
  const content = useContentStore((state) => state.content);
  const contentFilter = useContentStore((state) => state.contentFilter);
  const contentLoading = useContentStore((state) => state.contentLoading);
  const contentError = useContentStore((state) => state.contentError);
  const playlists = useContentStore((state) => state.playlists);
  const stats = useContentStore((state) => state.stats);

  const getFilteredContent = useCallback(() => useContentStore.getState().getFilteredContent(), []);
  const getGroupTitles = useCallback(() => useContentStore.getState().getGroupTitles(), []);
  const getStats = useCallback(() => useContentStore.getState().getStats(), []);
  const getSelectedPlaylistInfo = useCallback(() => useContentStore.getState().getSelectedPlaylistInfo(), []);

  return {
    // State
    selectedPlaylistId,
    content,
    contentFilter,
    contentLoading,
    contentError,
    playlists,
    stats,

    // Computed
    getFilteredContent,
    getGroupTitles,
    getStats,
    getSelectedPlaylistInfo,
  };
};

/**
 * Hook for content actions
 */
export const useContentActions = () => {
  const setPlaylists = useContentStore((state) => state.setPlaylists);
  const selectPlaylist = useContentStore((state) => state.selectPlaylist);
  const loadContent = useContentStore((state) => state.loadContent);
  const setFilterType = useContentStore((state) => state.setFilterType);
  const setSearchQuery = useContentStore((state) => state.setSearchQuery);
  const setGroupFilter = useContentStore((state) => state.setGroupFilter);
  const clearFilters = useContentStore((state) => state.clearFilters);
  const resetContent = useContentStore((state) => state.resetContent);

  return {
    setPlaylists,
    selectPlaylist,
    loadContent,
    setFilterType,
    setSearchQuery,
    setGroupFilter,
    clearFilters,
    resetContent,
  };
};

/**
 * Combined hook for state and actions (convenience)
 */
export const useContentStoreState = () => ({
  ...useContentState(),
  ...useContentActions(),
});

export default useContentState;
