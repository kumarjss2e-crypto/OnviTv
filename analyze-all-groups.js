/**
 * Analyze all unique groups and their distribution
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
    
    const match = line.match(/group-title="([^"]*)"/);
    if (match) {
      const g = match[1] || 'EMPTY';
      groupCounts[g] = (groupCounts[g] || 0) + 1;
    }
  }

  console.log('ALL groups in M3U (top 100):');
  console.log('='.repeat(100));
  
  const sorted = Object.entries(groupCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);

  sorted.forEach(([group, count]) => {
    console.log(`${count.toString().padStart(8)} items: ${group}`);
  });
  
  const totalItems = sorted.reduce((sum, [_, count]) => sum + count, 0);
  console.log('\n' + '='.repeat(100));
  console.log(`Total items: ${totalItems}`);
  console.log(`Unique groups: ${Object.keys(groupCounts).length}`);
})();