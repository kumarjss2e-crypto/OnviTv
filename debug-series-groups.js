/**
 * Debug script: Find all groups matching series detection rule
 */
const fs = require('fs');
const readline = require('readline');

const filePath = 'C:\\Projects\\OnviTV\\tv_channels_c74823f72c_plus.m3u';
const groupCounts = {};

const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity,
});

let lineCount = 0;

(async () => {
  for await (const line of rl) {
    lineCount++;
    if (lineCount % 100000 === 0) {
      console.log(`Processed ${lineCount} lines...`);
    }
    
    const match = line.match(/group-title="([^"]*)"/);
    if (match) {
      const g = match[1].toLowerCase();
      // Check the series rule: (serien|serie|series) AND NOT (filme|film|movies)
      if ((g.match(/serien|serie|series/) && !g.match(/filme|film|movies/))) {
        groupCounts[g] = (groupCounts[g] || 0) + 1;
      }
    }
  }

  console.log('\nGroups matching series detection rule (top 50):');
  console.log('='.repeat(80));
  
  const sorted = Object.entries(groupCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  sorted.forEach(([group, count]) => {
    console.log(`${count.toString().padStart(8)} items: ${group}`);
  });
  
  const totalSeries = sorted.reduce((sum, [_, count]) => sum + count, 0);
  console.log('\n' + '='.repeat(80));
  console.log(`Total items in series groups: ${totalSeries}`);
})();
