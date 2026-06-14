import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import ParsingProgressModal from '../components/ParsingProgressModal';
import { parsingProgressService } from '../services/parsingProgressService';
import { getPlaylist } from '../services/playlistService';

export const ParseLoadingContext = createContext();

// Track total items for each playlist to calculate accurate progress
const totalItemsMap = new Map();

export const ParseLoadingProvider = ({ children }) => {
  const [parsingPlaylistIds, setParsingPlaylistIds] = useState(new Set());
  const [currentPlaylistId, setCurrentPlaylistId] = useState(null);
  const [currentProgress, setCurrentProgress] = useState({});
  const [currentPlaylistName, setCurrentPlaylistName] = useState('');
  const listenerCleanupsRef = useRef([]);

  // Add a playlist to parsing list
  const startParsing = (playlistId, totalItems) => {
    console.log('[ParseLoadingContext] Starting parsing for:', playlistId, 'totalItems:', totalItems);
    if (totalItems) totalItemsMap.set(playlistId, totalItems);
    setParsingPlaylistIds(prev => new Set(prev).add(playlistId));
    setCurrentPlaylistId(playlistId);
    setCurrentProgress({
      itemsProcessed: 0,
      totalItems: totalItems || 0,
      percentComplete: 0,
      phase: 'parsing',
    });
  };

  // Remove a playlist from parsing list
  const finishParsing = (playlistId) => {
    console.log('[ParseLoadingContext] Finished parsing for:', playlistId);
    totalItemsMap.delete(playlistId);
    setParsingPlaylistIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(playlistId);
      return newSet;
    });
    if (currentPlaylistId === playlistId) {
      setCurrentPlaylistId(null);
      setCurrentProgress({});
    }
  };

  // Check if a playlist is parsing
  const isPlaylistParsing = (playlistId) => {
    return parsingPlaylistIds.has(playlistId);
  };

  // Has any parsing active
  const hasAnyParsing = parsingPlaylistIds.size > 0;

  // Average progress (for compatibility)
  const averageProgress = currentProgress.totalItems > 0
    ? Math.round((currentProgress.itemsProcessed / currentProgress.totalItems) * 100)
    : 0;

  useEffect(() => {
    // Listen for total items being set
    const handleTotalItemsSet = (data) => {
      console.log('[ParseLoadingContext] Total items set:', data);
      totalItemsMap.set(data.playlistId, data.totalItems);
      if (data.playlistId === currentPlaylistId) {
        setCurrentProgress(prev => ({
          ...prev,
          totalItems: data.totalItems,
        }));
      }
    };
    
    // Listen to parsing progress events
    const handleFirstBatch = (data) => {
      console.log('[ParseLoadingContext] First batch ready:', data);
      const total = totalItemsMap.get(data.playlistId) || data.itemCount;
      const percent = Math.round((data.itemCount / total) * 100);
      
      setCurrentProgress(prev => ({
        ...prev,
        itemsProcessed: data.itemCount,
        totalItems: total,
        percentComplete: percent,
        phase: 'parsing',
      }));
    };

    const handleBatchSaved = (data) => {
      console.log('[ParseLoadingContext] Batch saved:', data);
      const total = totalItemsMap.get(data.playlistId) || data.totalItemsSoFar;
      const percent = Math.round((data.totalItemsSoFar / total) * 100);
      
      setCurrentProgress(prev => ({
        ...prev,
        itemsProcessed: data.totalItemsSoFar,
        totalItems: total,
        batchNumber: data.batchNumber,
        percentComplete: Math.min(100, percent),
        phase: 'saving',
      }));
    };

    const handleParsingComplete = (data) => {
      console.log('[ParseLoadingContext] Parsing complete:', data);
      const { stats } = data;
      setCurrentProgress({
        itemsProcessed: stats.total,
        totalItems: stats.total,
        percentComplete: 100,
        phase: 'complete',
      });
      finishParsing(data.playlistId);
    };

    const handleParsingError = (data) => {
      console.error('[ParseLoadingContext] Parsing error:', data);
      finishParsing(data.playlistId);
    };

    // Register all listeners
    parsingProgressService.on('totalItemsSet', handleTotalItemsSet);
    parsingProgressService.on('firstBatchReady', handleFirstBatch);
    parsingProgressService.on('batchSaved', handleBatchSaved);
    parsingProgressService.on('parsingComplete', handleParsingComplete);
    parsingProgressService.on('parsingError', handleParsingError);

    // Store cleanups for later
    listenerCleanupsRef.current = [
      () => parsingProgressService.removeListener('totalItemsSet', handleTotalItemsSet),
      () => parsingProgressService.removeListener('firstBatchReady', handleFirstBatch),
      () => parsingProgressService.removeListener('batchSaved', handleBatchSaved),
      () => parsingProgressService.removeListener('parsingComplete', handleParsingComplete),
      () => parsingProgressService.removeListener('parsingError', handleParsingError),
    ];

    return () => {
      listenerCleanupsRef.current.forEach(cleanup => cleanup());
    };
  }, [currentPlaylistId]);

  // Get playlist name when currentPlaylistId changes
  useEffect(() => {
    if (currentPlaylistId) {
      getPlaylist(currentPlaylistId).then(playlist => {
        if (playlist?.name) {
          setCurrentPlaylistName(playlist.name);
        }
      }).catch(err => console.warn('[ParseLoadingContext] Failed to get playlist name:', err));
    }
  }, [currentPlaylistId]);

  const value = {
    parsingPlaylistIds,
    hasAnyParsing,
    parsingProgress: currentProgress,
    averageProgress,
    startParsing,
    finishParsing,
    isPlaylistParsing,
  };

  return (
    <ParseLoadingContext.Provider value={value}>
      {children}
      <ParsingProgressModal
        visible={hasAnyParsing && currentPlaylistId !== null}
        playlistName={currentPlaylistName}
        progress={currentProgress}
      />
    </ParseLoadingContext.Provider>
  );
};

export const useParseLoading = () => {
  const context = useContext(ParseLoadingContext);
  if (!context) {
    throw new Error('useParseLoading must be used within ParseLoadingProvider');
  }
  return context;
};
