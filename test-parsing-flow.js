
// Mock the necessary modules
const mockItemStorageService = {
  saveItemsBatch: async (playlistId, items) => {
    console.log(`[MOCK STORAGE] Saving ${items.length} items for playlist ${playlistId}`);
    items.forEach(i => console.log('  -', i.item?.name || i.name, i.item?.contentType || i.contentType));
    return items.length;
  },
  clearPlaylistItems: async (playlistId) => {
    console.log(`[MOCK STORAGE] Cleared items for playlist ${playlistId}`);
    return 0;
  }
};

const mockXtreamCodesService = {
  parseXtream: async (serverUrl, username, password, onProgress) => {
    console.log('[MOCK XTREAM] Parsing', serverUrl, username);
    
    // Mock some data
    const mockChannels = [
      { name: 'Channel 1', stream_id: '1', stream_icon: 'http://example.com/1.png', category_name: 'News' },
      { name: 'Channel 2', stream_id: '2', stream_icon: 'http://example.com/2.png', category_name: 'Sports' },
    ];
    const mockMovies = [
      { name: 'Movie 1', stream_id: 'm1', stream_icon: 'http://example.com/m1.png', category_name: 'Action' },
      { name: 'Movie 2', stream_id: 'm2', stream_icon: 'http://example.com/m2.png', category_name: 'Comedy' },
    ];
    const mockSeries = [
      { name: 'Series 1', series_id: 's1', cover: 'http://example.com/s1.png', category_name: 'Drama' },
    ];
    
    // Simulate progress
    let progress = 0;
    const totalSteps = 4;
    const tickProgress = () => {
      progress++;
      onProgress?.({
        phase: 'parsing',
        itemsProcessed: progress,
        totalItems: totalSteps,
        percentComplete: Math.round((progress / totalSteps) * 100)
      });
    };
    
    await new Promise(r => setTimeout(r, 500));
    tickProgress(); // Step 1
    
    const items = [];
    
    // Add channels
    mockChannels.forEach(stream => {
      const uniqueId = `xtream-live-${stream.stream_id}`;
      items.push({
        id: uniqueId,
        name: stream.name,
        streamUrl: stream.stream_id,
        tvgId: stream.stream_id,
        tvgName: stream.name,
        tvgLogo: stream.stream_icon,
        groupTitle: stream.category_name,
        contentType: 'channel'
      });
    });
    tickProgress(); // Step 2
    
    // Add movies
    mockMovies.forEach(vod => {
      const uniqueId = `xtream-vod-${vod.stream_id}`;
      items.push({
        id: uniqueId,
        name: vod.name,
        streamUrl: vod.stream_id,
        tvgId: vod.stream_id,
        tvgName: vod.name,
        tvgLogo: vod.stream_icon,
        groupTitle: vod.category_name,
        contentType: 'movie'
      });
    });
    tickProgress(); // Step3
    
    // Add series
    mockSeries.forEach(series => {
      const uniqueId = `xtream-series-${series.series_id}`;
      items.push({
        id: uniqueId,
        name: series.name,
        streamUrl: series.series_id,
        tvgId: series.series_id,
        tvgName: series.name,
        tvgLogo: series.cover,
        groupTitle: series.category_name,
        contentType: 'series',
        seriesId: series.series_id,
        seasons: []
      });
    });
    tickProgress(); // Step4
    
    console.log(`[MOCK XTREAM] Parsed ${items.length} items total`);
    return {
      success: true,
      items,
      stats: {
        channels: mockChannels.length,
        movies: mockMovies.length,
        series: mockSeries.length,
        total: items.length
      }
    };
  }
};

const BATCH_SIZE = 100;
const mockPlaylistParserService = {
  parsePlaylist: async (playlistData, onProgress, onChunk) => {
    console.log('[MOCK PLAYLIST PARSER] Parsing playlist', playlistData.type);
    
    if (playlistData.type === 'xtream') {
      // Parse xtream first
      const result = await mockXtreamCodesService.parseXtream(
        playlistData.serverUrl, 
        playlistData.username, 
        playlistData.password, 
        onProgress
      );
      
      if (!result.success) {
        return result;
      }
      
      // Now split into chunks and call onChunk (this is what PlaylistParserService does!)
      const items = result.items;
      let processed = 0;
      
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const chunk = items.slice(i, i + BATCH_SIZE);
        
        const channels = chunk.filter(item => item.contentType === 'channel');
        const movies = chunk.filter(item => item.contentType === 'movie');
        const seriesItems = chunk.filter(item => item.contentType === 'series');
        
        console.log(`[MOCK PLAYLIST PARSER] Calling onChunk with chunk #${Math.floor(i/BATCH_SIZE)+1}`, { channels: channels.length, movies: movies.length, series: seriesItems.length });
        
        onChunk?.({
          channels,
          movies,
          series: seriesItems,
          batchNumber: Math.floor(i/BATCH_SIZE)+1,
          totalBatches: Math.ceil(items.length/BATCH_SIZE)
        });
        
        processed += chunk.length;
        
        onProgress?.({
          phase: 'saving',
          itemsProcessed: processed,
          totalItems: items.length,
          percentComplete: Math.round((processed/items.length)*100)
        });
      }
      
      return result;
    }
  }
};

// Mock OnboardingParserService.parseAndSavePlaylist
const testParseAndSave = async () => {
  console.log('=== Starting Test ===');
  
  const playlistId = 'test-playlist-123';
  const playlistName = 'Test Xtream Playlist';
  const playlistData = {
    type: 'xtream',
    serverUrl: 'http://example.com',
    username: 'test-user',
    password: 'test-pass'
  };
  
  // Step 1: Clear old items
  await mockItemStorageService.clearPlaylistItems(playlistId);
  
  let totalSaved = 0;
  const stats = { channels: 0, movies: 0, series: 0, total: 0 };
  
  // Step 2: Parse playlist
  const parseResult = await mockPlaylistParserService.parsePlaylist(
    playlistData,
    (progress) => {
      console.log('[PROGRESS]', progress);
    },
    async (chunk) => {
      // Step 3: Save chunk
      const itemsToSave = [
        ...chunk.channels.map(item => ({ item, contentType: 'channel' })),
        ...chunk.movies.map(item => ({ item, contentType: 'movie' })),
        ...chunk.series.map(item => ({ item, contentType: 'series' })),
      ];
      
      await mockItemStorageService.saveItemsBatch(playlistId, itemsToSave);
      totalSaved += itemsToSave.length;
      stats.channels += chunk.channels.length;
      stats.movies += chunk.movies.length;
      stats.series += chunk.series.length;
      stats.total += itemsToSave.length;
    }
  );
  
  console.log('=== Test Complete ===');
  console.log('Parse result:', parseResult);
  console.log('Final stats:', stats);
};

testParseAndSave().catch(console.error);
