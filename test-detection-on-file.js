/**
 * Test Detection System on Real M3U File
 * Analyzes the actual M3U file and shows classification results
 */

const fs = require('fs');
const path = require('path');

const hasSeriesKeyword = (text) => {
  const seriesKeywords = [
    'serien', 'serie', 'series', 'seriale', 'seriali', 'serials', 'telenovela', 'dramaturgia', 'сериал',
  ];
  return seriesKeywords.some(keyword => text.includes(keyword));
};

const hasMovieKeyword = (text) => {
  const movieKeywords = [
    'filme', 'film', 'films', 'movie', 'movies', 'pelicula', 'peliculas', 'cinema',
  ];
  return movieKeywords.some(keyword => text.includes(keyword));
};

const detectContentType = (metadata) => {
  const { streamUrl, groupTitle, name, tvgId, tvgLogo } = metadata;
  
  const streamLower = streamUrl?.toLowerCase() || '';
  const groupLower = groupTitle?.toLowerCase() || '';
  const nameLower = name?.toLowerCase() || '';

  // ========== LEVEL 0: LIVE CHANNEL DETECTION ==========
  const hasEPGIndicators = (tvgId && tvgId.trim() !== '') || (tvgLogo && tvgLogo.trim() !== '');
  
  if (hasEPGIndicators) {
    const hasVODKeywords = hasSeriesKeyword(groupLower) || 
                          hasMovieKeyword(groupLower) ||
                          /\bs\d{1,2}e\d{1,2}\b|\bseason\s+\d+|\bepisode\s+\d+/i.test(nameLower);
    
    if (!hasVODKeywords) {
      const isChannelGroup = /^[A-Z]{2}\s*\||\bde\s*\||\bit\s*\||\bfr\s*\||\bes\s*\||\bpl\s*\||live\s*tv|tv\s*guide|epg|iptv/i.test(groupTitle || '');
      if (isChannelGroup || !groupTitle) {
        return { type: 'channel', layer: 0 };
      }
    }
  }

  // ========== LEVEL 1: URL STRUCTURE ==========
  if (streamLower.includes('/series/') || 
      streamLower.includes('/tvshow/') || 
      streamLower.includes('/tvseries/') ||
      streamLower.includes('/season/') ||
      streamLower.includes('/episode/')) {
    return { type: 'series', layer: 1 };
  }

  if (streamLower.includes('/movie/') || 
      streamLower.includes('/movies/') || 
      streamLower.includes('/film/') ||
      streamLower.includes('/films/')) {
    return { type: 'movie', layer: 1 };
  }

  // ========== LEVEL 2: EPISODE PATTERNS ==========
  if (/\bs\d{1,2}e\d{1,2}\b|\bseason\s+\d+\s+episode|\bepisode\s+\d+/i.test(nameLower)) {
    return { type: 'series', layer: 2 };
  }

  // ========== LEVEL 3: EXPLICIT KEYWORDS ==========
  const seriesNameKeywords = [
    'web series', 'webseries', 'miniseries', 'miniserie', 'series', 'staffel',
    'temporada', 'saison', 'stagione', 'serie',
  ];
  if (seriesNameKeywords.some(keyword => nameLower.includes(keyword))) {
    const isProvider = /netflix|amazon|hulu|disney|apple|prime|hbo|paramount|warner|max/i.test(nameLower);
    if (!isProvider) {
      return { type: 'series', layer: 3 };
    }
  }

  const movieNameKeywords = [
    'movie', 'movies', 'film', 'filme', 'films',
    'cinema', 'pelicula', 'peliculas', 'cinéma',
    'christmas movies', 'xmas movies', 'true crime', 'western', 'westernfilme', 'blockbuster'
  ];
  if (movieNameKeywords.some(keyword => nameLower.includes(keyword))) {
    return { type: 'movie', layer: 3 };
  }

  // ========== LEVEL 4: GROUP-TITLE ANALYSIS ==========
  if ((groupLower.includes('film') || groupLower.includes('filme') || groupLower.includes('movie')) && 
      !hasSeriesKeyword(groupLower)) {
    return { type: 'movie', layer: 4 };
  }

  if (hasSeriesKeyword(groupLower) && !hasMovieKeyword(groupLower)) {
    return { type: 'series', layer: 4 };
  }

  // ========== LEVEL 5: SMART GROUP CONTEXT ==========
  if (/\bshows\b|\bprogrammes\b|\bprogramas\b|\btvshow|\btv-show|\btelenovela/.test(groupLower)) {
    return { type: 'series', layer: 5 };
  }

  if (groupTitle && groupTitle.length > 0) {
    if ((groupLower.includes('film') || groupLower.includes('movie')) && 
        (groupLower.includes('series') || groupLower.includes('serien'))) {
      return { type: 'channel', layer: 5 };
    }
  }

  return { type: 'channel', layer: 6 };
};

const parseExtinfLine = (line, streamUrl) => {
  const metadata = {
    name: '',
    tvgId: null,
    tvgName: null,
    tvgLogo: null,
    groupTitle: null,
    streamUrl,
    duration: -1,
  };

  try {
    const durationMatch = line.match(/#EXTINF:(-?\d+)/);
    if (durationMatch) {
      metadata.duration = parseInt(durationMatch[1]);
    }

    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
    if (tvgIdMatch) metadata.tvgId = tvgIdMatch[1];

    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
    if (tvgNameMatch) metadata.tvgName = tvgNameMatch[1];

    const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
    if (tvgLogoMatch) metadata.tvgLogo = tvgLogoMatch[1];

    const groupMatch = line.match(/group-title="([^"]*)"/);
    if (groupMatch) metadata.groupTitle = groupMatch[1];

    const nameMatch = line.match(/,(.*)$/);
    if (nameMatch) {
      metadata.name = nameMatch[1].trim();
    }

    return metadata;
  } catch (error) {
    console.error('Error parsing EXTINF line:', error);
    return metadata;
  }
};

// Read and parse the M3U file
const m3uPath = path.join(__dirname, 'tv_channels_c74823f72c_plus.m3u');

if (!fs.existsSync(m3uPath)) {
  console.error('❌ M3U file not found:', m3uPath);
  process.exit(1);
}

console.log('🔍 Analyzing M3U File:', m3uPath);
console.log('='.repeat(100));

const fileContent = fs.readFileSync(m3uPath, 'utf-8');
const lines = fileContent.split('\n');

const results = {
  channel: [],
  movie: [],
  series: [],
  layerCounts: {
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
  }
};

let currentExtinf = null;
let processedCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  if (line.startsWith('#EXTINF:')) {
    currentExtinf = line;
  } else if (currentExtinf && line && !line.startsWith('#')) {
    processedCount++;
    const metadata = parseExtinfLine(currentExtinf, line);
    const detection = detectContentType(metadata);
    
    results[detection.type].push({
      name: metadata.name,
      group: metadata.groupTitle,
      tvgId: metadata.tvgId,
      tvgLogo: !!metadata.tvgLogo,
      detection: detection.type,
      layer: detection.layer
    });
    
    results.layerCounts[detection.layer]++;
    currentExtinf = null;

    // Process first 10000 items for performance
    if (processedCount >= 10000) break;
  }
}

// Calculate statistics
const total = results.channel.length + results.movie.length + results.series.length;
const channelPct = ((results.channel.length / total) * 100).toFixed(1);
const moviePct = ((results.movie.length / total) * 100).toFixed(1);
const seriesPct = ((results.series.length / total) * 100).toFixed(1);

console.log('\n📊 DETECTION RESULTS');
console.log('='.repeat(100));
console.log(`Total Items Processed: ${total}`);
console.log(`\n📺 Channels: ${results.channel.length} (${channelPct}%)`);
console.log(`🎬 Movies:  ${results.movie.length} (${moviePct}%)`);
console.log(`📹 Series:  ${results.series.length} (${seriesPct}%)`);

console.log('\n🎯 DETECTION LAYER USAGE');
console.log('='.repeat(100));
console.log(`Layer 0 (EPG):      ${results.layerCounts[0]} items`);
console.log(`Layer 1 (URL):      ${results.layerCounts[1]} items`);
console.log(`Layer 2 (Episodes): ${results.layerCounts[2]} items`);
console.log(`Layer 3 (Keywords): ${results.layerCounts[3]} items`);
console.log(`Layer 4 (Group):    ${results.layerCounts[4]} items`);
console.log(`Layer 5 (Context):  ${results.layerCounts[5]} items`);
console.log(`Layer 6 (Default):  ${results.layerCounts[6]} items`);

console.log('\n📺 SAMPLE CHANNELS (First 5)');
console.log('='.repeat(100));
results.channel.slice(0, 5).forEach((item, idx) => {
  console.log(`${idx + 1}. ${item.name}`);
  console.log(`   Group: ${item.group || '(none)'}`);
  console.log(`   tvg-id: "${item.tvgId || '(empty)'}" | tvg-logo: ${item.tvgLogo ? '✓' : '✗'}`);
  console.log(`   Layer: ${item.layer}\n`);
});

console.log('🎬 SAMPLE MOVIES (First 5)');
console.log('='.repeat(100));
if (results.movie.length > 0) {
  results.movie.slice(0, 5).forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.name}`);
    console.log(`   Group: ${item.group || '(none)'}`);
    console.log(`   Layer: ${item.layer}\n`);
  });
} else {
  console.log('No movies detected\n');
}

console.log('📹 SAMPLE SERIES (First 5)');
console.log('='.repeat(100));
if (results.series.length > 0) {
  results.series.slice(0, 5).forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.name}`);
    console.log(`   Group: ${item.group || '(none)'}`);
    console.log(`   Layer: ${item.layer}\n`);
  });
} else {
  console.log('No series detected\n');
}

console.log('\n✅ ANALYSIS COMPLETE');
console.log('='.repeat(100));
