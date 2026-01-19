/**
 * Test the improved channel detection system
 * Tests with real M3U samples
 */

// Simulate the detection functions
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
        return 'channel';
      }
    }
  }

  // ========== LEVEL 1: URL STRUCTURE ==========
  if (streamLower.includes('/series/') || 
      streamLower.includes('/tvshow/') || 
      streamLower.includes('/tvseries/') ||
      streamLower.includes('/season/') ||
      streamLower.includes('/episode/')) {
    return 'series';
  }

  if (streamLower.includes('/movie/') || 
      streamLower.includes('/movies/') || 
      streamLower.includes('/film/') ||
      streamLower.includes('/films/')) {
    return 'movie';
  }

  // ========== LEVEL 2: EPISODE PATTERNS ==========
  if (/\bs\d{1,2}e\d{1,2}\b|\bseason\s+\d+\s+episode|\bepisode\s+\d+/i.test(nameLower)) {
    return 'series';
  }

  // ========== LEVEL 3: EXPLICIT KEYWORDS ==========
  const seriesNameKeywords = [
    'web series', 'webseries', 'miniseries', 'miniserie', 'series', 'staffel',
    'temporada', 'saison', 'stagione', 'serie',
  ];
  if (seriesNameKeywords.some(keyword => nameLower.includes(keyword))) {
    const isProvider = /netflix|amazon|hulu|disney|apple|prime|hbo|paramount|warner|max/i.test(nameLower);
    if (!isProvider) {
      return 'series';
    }
  }

  const movieNameKeywords = [
    'movie', 'movies', 'film', 'filme', 'films',
    'cinema', 'pelicula', 'peliculas', 'cinéma',
    'christmas movies', 'xmas movies', 'true crime', 'western', 'westernfilme', 'blockbuster'
  ];
  if (movieNameKeywords.some(keyword => nameLower.includes(keyword))) {
    return 'movie';
  }

  // ========== LEVEL 4: GROUP-TITLE ANALYSIS ==========
  if ((groupLower.includes('film') || groupLower.includes('filme') || groupLower.includes('movie')) && 
      !hasSeriesKeyword(groupLower)) {
    return 'movie';
  }

  if (hasSeriesKeyword(groupLower) && !hasMovieKeyword(groupLower)) {
    return 'series';
  }

  // ========== LEVEL 5: SMART GROUP CONTEXT ==========
  if (/\bshows\b|\bprogrammes\b|\bprogramas\b|\btvshow|\btv-show|\btelenovela/.test(groupLower)) {
    return 'series';
  }

  if (groupTitle && groupTitle.length > 0) {
    if ((groupLower.includes('film') || groupLower.includes('movie')) && 
        (groupLower.includes('series') || groupLower.includes('serien'))) {
      return 'channel';
    }
  }

  return 'channel';
};

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

// Test cases from the user's sample
const testCases = [
  {
    name: "JOYN| DYN SPORTMIX",
    metadata: {
      name: "JOYN| DYN SPORTMIX ᴿᴬᵂ",
      tvgId: "",
      tvgLogo: "http://51.158.145.100/picons/logos/GERMANY/1929405.png",
      groupTitle: "DE| JOYN ᴿᴬᵂ",
      streamUrl: "http://19245-par.tx-4kott.com:80/c74823f72c/80847bd04cb3/1929405"
    },
    expected: "channel"
  },
  {
    name: "JOYN| EURONEWS",
    metadata: {
      name: "JOYN| EURONEWS ᴿᴬᵂ",
      tvgId: "Euronews.de",
      tvgLogo: "http://51.158.145.100/picons/logos/GERMANY/1929403.png",
      groupTitle: "DE| JOYN ᴿᴬᵂ",
      streamUrl: "http://19245-par.tx-4kott.com:80/c74823f72c/80847bd04cb3/1929403"
    },
    expected: "channel"
  },
  {
    name: "JOYN| EUROSPORT 1",
    metadata: {
      name: "JOYN| EUROSPORT 1 ᴿᴬᵂ",
      tvgId: "Eurosport1.de",
      tvgLogo: "http://51.158.145.100/picons/logos/GERMANY/1929402.png",
      groupTitle: "DE| JOYN ᴿᴬᵂ",
      streamUrl: "http://19245-par.tx-4kott.com:80/c74823f72c/80847bd04cb3/1929402"
    },
    expected: "channel"
  },
  // Test with empty tvgId (but has logo)
  {
    name: "JOYN| FILMGOLD (no tvg-id)",
    metadata: {
      name: "JOYN| FILMGOLD ᴿᴬᵂ",
      tvgId: "",
      tvgLogo: "http://51.158.145.100/picons/logos/GERMANY/1929400.png",
      groupTitle: "DE| JOYN ᴿᴬᵂ",
      streamUrl: "http://19245-par.tx-4kott.com:80/c74823f72c/80847bd04cb3/1929400"
    },
    expected: "channel"
  },
  // Test actual movie
  {
    name: "Movie sample",
    metadata: {
      name: "The Matrix",
      tvgId: null,
      tvgLogo: null,
      groupTitle: "Movies | Action",
      streamUrl: "http://example.com/movies/the-matrix.mp4"
    },
    expected: "movie"
  },
  // Test actual series
  {
    name: "Series sample",
    metadata: {
      name: "Breaking Bad S01E01",
      tvgId: null,
      tvgLogo: null,
      groupTitle: "TV Series | Drama",
      streamUrl: "http://example.com/series/breaking-bad/s01e01.mp4"
    },
    expected: "series"
  }
];

console.log("🧪 Testing Content Type Detection System\n");
console.log("=".repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach(testCase => {
  const result = detectContentType(testCase.metadata);
  const isCorrect = result === testCase.expected;
  
  if (isCorrect) {
    passed++;
    console.log(`✅ ${testCase.name}`);
  } else {
    failed++;
    console.log(`❌ ${testCase.name}`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result}`);
  }
  console.log(`   Name: ${testCase.metadata.name}`);
  console.log(`   Group: ${testCase.metadata.groupTitle}`);
  console.log(`   tvg-id: "${testCase.metadata.tvgId || '(empty)'}"`);
  console.log(`   tvg-logo: ${testCase.metadata.tvgLogo ? '✓' : '✗'}`);
  console.log(`   Result: ${result}`);
  console.log("-".repeat(80));
});

console.log("\n📊 Test Results");
console.log(`Passed: ${passed}/${testCases.length}`);
console.log(`Failed: ${failed}/${testCases.length}`);
console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
