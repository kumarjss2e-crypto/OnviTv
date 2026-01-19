/**
 * M3U File Analyzer
 * Analyzes the 200MB M3U file to show content type distribution
 * and sample items from each category
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const filePath = 'C:\\Projects\\OnviTV\\tv_channels_c74823f72c_plus.m3u';

// Keywords for detection (matching m3uStreamParser.js)
const movieKeywords = ['movie', 'movies', 'christmas movies', 'xmas movies', 'true crime', 'western', 'westernfilme', 'filmrise', 'blockbuster'];
const nameSeriesKeywords = ['binge watch', 'web series', 'webseries', 'miniseries', 'miniserie'];

/**
 * Check if string contains series keywords (multi-language)
 */
const hasSeriesKeyword = (text) => {
  const seriesKeywords = [
    'serien',    // German
    'serie',     // German/Spanish/Italian (series)
    'series',    // English
    'seriale',   // Polish
    'seriali',   // Italian
    'serials',   // English
    'telenovela',// Spanish/Portuguese
  ];
  return seriesKeywords.some(keyword => text.includes(keyword));
};

/**
 * Check if string contains movie keywords (multi-language)
 */
const hasMovieKeyword = (text) => {
  const movieKeywords = [
    'filme',     // German
    'film',      // German/French
    'films',     // English
    'movie',     // English
    'movies',    // English
    'pelicula',  // Spanish
    'peliculas', // Spanish
    'cinema',    // General
  ];
  return movieKeywords.some(keyword => text.includes(keyword));
};

function detectContentType(metadata) {
  const { streamUrl, groupTitle, name } = metadata;
  const streamLower = streamUrl?.toLowerCase() || '';
  const groupLower = groupTitle?.toLowerCase() || '';
  const nameLower = name?.toLowerCase() || '';

  // ========== LEVEL 1: URL STRUCTURE (Most Reliable) ==========
  // Series-specific URLs
  if (streamLower.includes('/series/') || 
      streamLower.includes('/tvshow/') || 
      streamLower.includes('/tvseries/') ||
      streamLower.includes('/season/') ||
      streamLower.includes('/episode/')) {
    return 'series';
  }

  // Movie-specific URLs
  if (streamLower.includes('/movie/') || 
      streamLower.includes('/movies/') || 
      streamLower.includes('/film/') ||
      streamLower.includes('/films/')) {
    return 'movie';
  }

  // ========== LEVEL 2: EPISODE PATTERNS (Very Reliable) ==========
  // S01E01, Season 1 Episode 1, etc.
  if (/\bs\d{1,2}e\d{1,2}\b|\bseason\s+\d+\s+episode|\bepisode\s+\d+/i.test(nameLower)) {
    return 'series';
  }

  // ========== LEVEL 3: EXPLICIT KEYWORDS IN NAME ==========
  // Series keywords (multi-language support)
  const seriesNameKeywords = [
    'web series', 'webseries', 'miniseries', 'miniserie', 'series', 'staffel',
    'temporada',  // Spanish
    'saison',     // French
    'stagione',   // Italian
    'serie',      // Spanish/Italian for series (not just season)
  ];
  if (seriesNameKeywords.some(keyword => nameLower.includes(keyword))) {
    // But exclude if it looks like a provider or category name
    const isProvider = /netflix|amazon|hulu|disney|apple|prime|hbo|paramount|warner|max/i.test(nameLower);
    if (!isProvider) {
      return 'series';
    }
  }

  // Movie keywords (multi-language support)
  const movieNameKeywords = [
    'movie', 'movies', 'film', 'filme', 'films',
    'cinema', 'pelicula', 'peliculas',  // Spanish
    'cinéma', 'film',                   // French
    'christmas movies', 'xmas movies',
    'true crime',
    'western', 'westernfilme',
    'blockbuster'
  ];
  if (movieNameKeywords.some(keyword => nameLower.includes(keyword))) {
    return 'movie';
  }

  // ========== LEVEL 4: GROUP-TITLE ANALYSIS ==========
  // Check for explicit movie groups (filme/film ONLY, no series keywords)
  if ((groupLower.includes('film') || groupLower.includes('filme') || groupLower.includes('movie')) && 
      !hasSeriesKeyword(groupLower)) {
    return 'movie';
  }

  // Check for explicit series groups
  // Must have series keyword AND NOT have film/movie keywords
  if (hasSeriesKeyword(groupLower) && !hasMovieKeyword(groupLower)) {
    return 'series';
  }

  // ========== LEVEL 5: SMART GROUP CONTEXT ==========
  // If group has "shows", "programs", "tv", "channels" - likely series
  if (/\bshows\b|\bprogrammes\b|\bprogramas\b|\btvshow|\btv-show|\btelenovela/.test(groupLower)) {
    return 'series';
  }

  // If group is mixed or generic - analyze context
  if (groupTitle && groupTitle.length > 0) {
    // Mixed genre groups with both films and series - default to channel
    if ((groupLower.includes('film') || groupLower.includes('movie')) && 
        (groupLower.includes('series') || groupLower.includes('serien'))) {
      return 'channel';
    }
  }

  // ========== DEFAULT: CHANNEL ==========
  // Unknown content is typically a live channel or VOD provider entry
  return 'channel';
}

async function analyzeM3U() {
  const stats = {
    channels: 0,
    movies: 0,
    series: 0,
    total: 0,
  };

  const samples = {
    channels: [],
    movies: [],
    series: [],
  };

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let currentExtinf = null;
  let lineNumber = 0;

  for await (const line of rl) {
    lineNumber++;
    const trimmed = line.trim();

    // Log progress
    if (lineNumber % 10000 === 0) {
      console.log(`Processed ${lineNumber} lines... (Channels: ${stats.channels}, Movies: ${stats.movies}, Series: ${stats.series})`);
    }

    // Skip empty lines
    if (!trimmed || (trimmed.startsWith('#') && !trimmed.startsWith('#EXTINF'))) {
      continue;
    }

    // Parse EXTINF metadata line
    if (trimmed.startsWith('#EXTINF')) {
      currentExtinf = trimmed;
      continue;
    }

    // Stream URL line (next line after EXTINF)
    if (currentExtinf && !trimmed.startsWith('#')) {
      const streamUrl = trimmed;
      
      // Parse EXTINF
      const metadata = {};
      
      const tvgIdMatch = currentExtinf.match(/tvg-id="([^"]*)"/);
      metadata.tvgId = tvgIdMatch ? tvgIdMatch[1] : null;

      const tvgNameMatch = currentExtinf.match(/tvg-name="([^"]*)"/);
      metadata.tvgName = tvgNameMatch ? tvgNameMatch[1] : null;

      const tvgLogoMatch = currentExtinf.match(/tvg-logo="([^"]*)"/);
      metadata.tvgLogo = tvgLogoMatch ? tvgLogoMatch[1] : null;

      const groupMatch = currentExtinf.match(/group-title="([^"]*)"/);
      metadata.groupTitle = groupMatch ? groupMatch[1] : null;

      const nameMatch = currentExtinf.match(/,(.*)$/);
      metadata.name = nameMatch ? nameMatch[1].trim() : 'Unknown';

      metadata.streamUrl = streamUrl || '';

      // Detect type
      const contentType = detectContentType(metadata);
      if (!contentType || typeof contentType !== 'string') {
        console.error(`Invalid content type at line ${lineNumber}: ${contentType}`);
        currentExtinf = null;
        continue;
      }

      stats[contentType]++;
      stats.total++;

      // Collect samples (max 10 per type)
      if (samples[contentType] && samples[contentType].length < 10) {
        samples[contentType].push({
          name: metadata.name,
          group: metadata.groupTitle,
          url: streamUrl ? (streamUrl.substring(0, 100) + (streamUrl.length > 100 ? '...' : '')) : 'N/A',
        });
      }

      currentExtinf = null;
    }
  }

  // Print results
  console.log('\n\n' + '='.repeat(80));
  console.log('M3U ANALYSIS RESULTS');
  console.log('='.repeat(80));
  console.log(`Total items: ${stats.total}`);
  console.log(`- Channels: ${stats.channels} (${((stats.channels / stats.total) * 100).toFixed(1)}%)`);
  console.log(`- Movies: ${stats.movies} (${((stats.movies / stats.total) * 100).toFixed(1)}%)`);
  console.log(`- Series: ${stats.series} (${((stats.series / stats.total) * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));

  console.log('\nSAMPLE CHANNELS:');
  samples.channels.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.name}`);
    console.log(`     Group: ${item.group || 'N/A'}`);
  });

  console.log('\nSAMPLE MOVIES:');
  samples.movies.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.name}`);
    console.log(`     Group: ${item.group || 'N/A'}`);
  });

  console.log('\nSAMPLE SERIES:');
  samples.series.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.name}`);
    console.log(`     Group: ${item.group || 'N/A'}`);
  });

  console.log('\n' + '='.repeat(80));
}

analyzeM3U().catch(err => {
  console.error('Error analyzing M3U:', err);
  process.exit(1);
});
