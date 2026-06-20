
const http = require('http');
const https = require('https');

const serverUrl = 'Bestem3uliste'; // User's server name
const username = 'kkHBu0Tz';
const password = 'fZ1HQt6';

const testEndpoint = (baseUrl, action) => {
    return new Promise((resolve, reject) => {
        const url = new URL(`${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=${action}`);
        
        const client = url.protocol === 'https:' ? https : http;
        
        console.log(`Testing ${url.href}`);
        
        const req = client.get(url, (res) => {
            console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
            console.log('Headers:', res.headers);
            
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log('Response:', JSON.stringify(json, null, 2));
                    resolve(json);
                } catch (e) {
                    console.log('Raw response:', data);
                    resolve(data);
                }
            });
        });
        
        req.on('error', (err) => {
            console.error(`Error fetching ${action}:`, err);
            reject(err);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
};

const testServers = async () => {
    console.log('=== Testing possible server variants ===');
    
    const variants = [
        `http://${serverUrl}`,
        `https://${serverUrl}`,
        `http://${serverUrl}.com`,
        `https://${serverUrl}.com`,
        `http://${serverUrl}.net`,
        `https://${serverUrl}.net`,
    ];
    
    for (const baseUrl of variants) {
        try {
            console.log(`\n--- Testing ${baseUrl} ---`);
            const result = await testEndpoint(baseUrl, 'get_live_categories');
            if (Array.isArray(result) && result.length > 0) {
                console.log(`SUCCESS on ${baseUrl}!`);
                
                // Now check live streams
                const liveStreams = await testEndpoint(baseUrl, 'get_live_streams');
                console.log('Live streams:', Array.isArray(liveStreams) ? liveStreams.length : 'invalid');
                
                // Check vod categories
                const vodCats = await testEndpoint(baseUrl, 'get_vod_categories');
                console.log('VOD categories:', Array.isArray(vodCats) ? vodCats.length : 'invalid');
                
                // Check vod streams
                const vodStreams = await testEndpoint(baseUrl, 'get_vod_streams');
                console.log('VOD streams:', Array.isArray(vodStreams) ? vodStreams.length : 'invalid');
                
                // Check series categories
                const seriesCats = await testEndpoint(baseUrl, 'get_series_categories');
                console.log('Series categories:', Array.isArray(seriesCats) ? seriesCats.length : 'invalid');
                
                // Check series
                const seriesStreams = await testEndpoint(baseUrl, 'get_series');
                console.log('Series:', Array.isArray(seriesStreams) ? seriesStreams.length : 'invalid');
                
                return baseUrl;
            }
        } catch (err) {
            console.log(`${baseUrl} failed:`, err.message);
        }
    }
    
    console.log('No working server found');
    return null;
};

testServers();
