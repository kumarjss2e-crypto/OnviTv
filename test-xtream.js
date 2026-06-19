import { parseXtream } from './src/services/webCompatibleParserService.js';

async function testXtream() {
  console.log('Testing Xtream parser...');
  
  const serverUrl = 'http://bestem3uliste.link';
  const username = 'kkHBu0Tz';
  const password = 'fZ1HQt6';
  
  try {
    const tracks = await parseXtream(serverUrl, username, password);
    console.log('✅ Success!');
    console.log('Total tracks:', tracks.length);
    
    // Count by type
    const channels = tracks.filter(t => {
      const group = (t.groupTitle || '').toLowerCase();
      return !group.includes('movie') && !group.includes('series') && !group.includes('tv show');
    });
    const movies = tracks.filter(t => (t.groupTitle || '').toLowerCase().includes('movie'));
    const series = tracks.filter(t => (t.groupTitle || '').toLowerCase().includes('series') || (t.groupTitle || '').toLowerCase().includes('tv show'));
    
    console.log('Channels:', channels.length);
    console.log('Movies:', movies.length);
    console.log('Series:', series.length);
    
    // Show first few
    console.log('\nFirst 3 channels:');
    console.log(channels.slice(0, 3).map(c => `- ${c.name} (${c.streamUrl})`).join('\n'));
    
    console.log('\nFirst 3 movies:');
    console.log(movies.slice(0, 3).map(m => `- ${m.name} (${m.streamUrl})`).join('\n'));
    
    console.log('\nFirst 3 series:');
    console.log(series.slice(0, 3).map(s => `- ${s.name} (${s.streamUrl})`).join('\n'));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testXtream();
