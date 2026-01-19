/**
 * Count items by detection strategy
 */
const fs = require('fs');
const readline = require('readline');

const filePath = 'C:\\Projects\\OnviTV\\tv_channels_c74823f72c_plus.m3u';

const stats = {
  byUrl: 0,
  byNamePattern: 0,
  byNameKeyword: 0,
  byGroupSeries: 0,
  byGroupMovie: 0,
  defaultChannel: 0,
  total: 0,
};

const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity,
});

let lineCount = 0;

async function detectAndCount(metadata) {
  const { streamUrl, groupTitle, name } = metadata;
  const streamLower = streamUrl?.toLowerCase() || '';
  const groupLower = groupTitle?.toLowerCase() || '';
  const nameLower = name?.toLowerCase() || '';

  // Series by URL
  if (streamLower.includes('/series/') || streamLower.includes('/tvshow/') || streamLower.includes('/tv/') || streamLower.includes('/tvseries/')) {
    stats.byUrl++;
    return;
  }

  // Series by name pattern
  if (/\bs\d{1,2}e\d{1,2}\b|season\s+\d+|episode\s+\d+|ep\.\s*\d+/i.test(nameLower)) {
    stats.byNamePattern++;
    return;
  }

  // Series by name keyword
  const nameSeriesKeywords = ['binge watch', 'web series', 'webseries', 'miniseries', 'miniserie', 'staffel'];
  if (nameSeriesKeywords.some(keyword => nameLower.includes(keyword))) {
    stats.byNameKeyword++;
    return;
  }

  // Movie by URL
  if (streamLower.includes('/movie/') || streamLower.includes('/movies/') || streamLower.includes('/vod/')) {
    stats.byGroupMovie++;
    return;
  }

  // Movie by name
  const movieKeywords = ['movie', 'movies', 'christmas movies', 'xmas movies', 'true crime', 'western', 'westernfilme', 'blockbuster'];
  if (movieKeywords.some(keyword => nameLower.includes(keyword))) {
    stats.byGroupMovie++;
    return;
  }

  // Movie by group
  if ((groupLower.includes('film') || groupLower.includes('filme')) && 
      !groupLower.includes('serien') && !groupLower.includes('serie') && 
      !groupLower.includes('series') && !groupLower.includes('seriale') && 
      !groupLower.includes('seriali')) {
    stats.byGroupMovie++;
    return;
  }

  // Series by group
  if ((groupLower.includes('serien') || groupLower.includes('serie') || 
       groupLower.includes('series') || groupLower.includes('seriale') || 
       groupLower.includes('seriali') || groupLower.includes('serials')) && 
      !groupLower.includes('filme') && !groupLower.includes('film') && 
      !groupLower.includes('movies')) {
    stats.byGroupSeries++;
    return;
  }

  // Default to channel
  stats.defaultChannel++;
}

(async () => {
  let currentExtinf = null;

  for await (const line of rl) {
    lineCount++;
    if (lineCount % 100000 === 0) {
      console.log(`Processed ${lineCount} lines...`);
    }

    const trimmed = line.trim();

    // Skip empty lines and non-EXTINF comments
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

      // Detect and count
      await detectAndCount(metadata);
      stats.total++;

      currentExtinf = null;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('DETECTION BREAKDOWN:');
  console.log('='.repeat(80));
  console.log(`Total items: ${stats.total}`);
  console.log(`\nSeries detection:`);
  console.log(`  - By URL pattern: ${stats.byUrl} (${(stats.byUrl / stats.total * 100).toFixed(1)}%)`);
  console.log(`  - By name pattern (S01E01): ${stats.byNamePattern} (${(stats.byNamePattern / stats.total * 100).toFixed(1)}%)`);
  console.log(`  - By name keyword: ${stats.byNameKeyword} (${(stats.byNameKeyword / stats.total * 100).toFixed(1)}%)`);
  console.log(`  - By group-title: ${stats.byGroupSeries} (${(stats.byGroupSeries / stats.total * 100).toFixed(1)}%)`);
  console.log(`\nMovies detection: ${stats.byGroupMovie} (${(stats.byGroupMovie / stats.total * 100).toFixed(1)}%)`);
  console.log(`\nDefault (Channel): ${stats.defaultChannel} (${(stats.defaultChannel / stats.total * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));
})();
