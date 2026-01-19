/**
 * M3U Group Analyzer
 * Analyzes unique groups in the M3U file to understand the classification system
 */

const fs = require('fs');
const readline = require('readline');

const filePath = 'C:\\Projects\\OnviTV\\tv_channels_c74823f72c_plus.m3u';

async function analyzeGroups() {
  const groups = {};
  let lineNumber = 0;

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lineNumber++;
    const trimmed = line.trim();

    if (trimmed.startsWith('#EXTINF')) {
      const groupMatch = trimmed.match(/group-title="([^"]*)"/);
      const nameMatch = trimmed.match(/,(.*)$/);
      
      if (groupMatch) {
        const group = groupMatch[1];
        const name = nameMatch ? nameMatch[1].trim() : '';
        
        if (!groups[group]) {
          groups[group] = { count: 0, samples: [] };
        }
        
        groups[group].count++;
        
        if (groups[group].samples.length < 3) {
          groups[group].samples.push(name);
        }
      }
    }
  }

  // Sort groups by count
  const sortedGroups = Object.entries(groups).sort((a, b) => b[1].count - a[1].count);

  console.log('\n' + '='.repeat(100));
  console.log('UNIQUE GROUPS IN M3U FILE (sorted by count)');
  console.log('='.repeat(100));

  sortedGroups.forEach(([group, data]) => {
    console.log(`\n[${data.count}] ${group}`);
    data.samples.forEach(sample => {
      console.log(`    - ${sample}`);
    });
  });

  console.log('\n' + '='.repeat(100));
  console.log(`Total unique groups: ${sortedGroups.length}`);
  console.log(`Total items: ${lineNumber / 3}`); // approx (EXTINF + metadata + URL)
}

analyzeGroups().catch(err => {
  console.error('Error analyzing groups:', err);
  process.exit(1);
});
