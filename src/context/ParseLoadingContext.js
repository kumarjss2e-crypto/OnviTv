/**
 * Parse Loading Context
 * Tracks parsing state before content appears (during M3U fetch wait time)
 * Shows loading indicator until first batch is saved
 */

import React, { createContext, useState, useCallback, useEffect } from 'react';
import { backgroundParsingService } from '../services/backgroundParsingService';

export const ParseLoadingContext = createContext();

export const ParseLoadingProvider = ({ children }) => {
  // Map of playlistId -> isLoading (true during initial fetch, false once first batch saved)
  const [parsingPlaylistIds, setParsingPlaylistIds] = useState(new Set());
  // Map of playlistId -> progress percentage (0-100)
  const [parsingProgress, setParsingProgress] = useState({});

  const startParsing = useCallback((playlistId) => {
    console.log(`[ParseLoadingContext] Starting to track parsing for ${playlistId}`);
    setParsingPlaylistIds(prev => new Set([...prev, playlistId]));
    setParsingProgress(prev => ({ ...prev, [playlistId]: 0 }));
    
    // Subscribe to parse events for this playlist
    const unsubscribe = backgroundParsingService.addParseListener(playlistId, (event) => {
      if (event.type === 'firstBatchSaved') {
        console.log(`[ParseLoadingContext] First batch saved for ${playlistId}, finishing parsing indicator`);
        finishParsing(playlistId);
      } else if (event.type === 'parseFailed') {
        console.log(`[ParseLoadingContext] Parsing failed for ${playlistId}, hiding loading indicator`);
        finishParsing(playlistId);
      } else if (event.type === 'progressUpdate' && event.progress !== undefined) {
        // Update progress percentage (0-100)
        setParsingProgress(prev => ({ ...prev, [playlistId]: event.progress }));
      }
    });

    return unsubscribe;
  }, []);

  const finishParsing = useCallback((playlistId) => {
    setParsingPlaylistIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(playlistId);
      console.log(`[ParseLoadingContext] Finished tracking parsing for ${playlistId}`);
      return newSet;
    });
    setParsingProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[playlistId];
      return newProgress;
    });
  }, []);

  const isPlaylistParsing = useCallback((playlistId) => {
    return parsingPlaylistIds.has(playlistId);
  }, [parsingPlaylistIds]);

  const hasAnyParsing = parsingPlaylistIds.size > 0;
  
  // Get average progress across all parsing playlists
  const averageProgress = parsingPlaylistIds.size > 0
    ? Math.round(
        Array.from(parsingPlaylistIds).reduce((sum, id) => sum + (parsingProgress[id] || 0), 0) /
        parsingPlaylistIds.size
      )
    : 0;

  const value = {
    parsingPlaylistIds,
    hasAnyParsing,
    parsingProgress,
    averageProgress,
    startParsing,
    finishParsing,
    isPlaylistParsing,
  };

  return (
    <ParseLoadingContext.Provider value={value}>
      {children}
    </ParseLoadingContext.Provider>
  );
};

export const useParseLoading = () => {
  const context = React.useContext(ParseLoadingContext);
  if (!context) {
    throw new Error('useParseLoading must be used within ParseLoadingProvider');
  }
  return context;
};
