/**
 * M3U Playlist Proxy Server
 * Allows web browser to fetch M3U files from IPTV servers without CORS issues
 * Designed to run on port 3000, while Expo web runs on 8081
 * 
 * Usage:
 *   node src/server/proxyServer.js
 * 
 * Or add to package.json:
 *   "proxy": "node src/server/proxyServer.js"
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PROXY_PORT || 3000;
const TIMEOUT = 45000; // 45 seconds
const MAX_REDIRECTS = 5;

// CORS headers for web client
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '3600',
};

/**
 * Fetch from external URL with retry logic
 */
const fetchWithRetry = (targetUrl, options = {}, retries = 3, redirectCount = 0) => {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      return reject(new Error('Too many redirects'));
    }

    const parsedUrl = url.parse(targetUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: options.method || 'GET',
      timeout: TIMEOUT,
      headers: {
        // IPTV server compatible headers
        'User-Agent': 'VLC/3.0.0 LibVLC/3.0.0',
        'Accept': 'application/x-mpegURL, application/vnd.apple.mpegurl, text/plain',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        ...options.headers,
      },
    };

    const request = client.request(requestOptions, (response) => {
      let data = '';

      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return fetchWithRetry(response.headers.location, options, retries, redirectCount + 1)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }

      // Collect response data
      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        resolve({
          status: response.statusCode,
          headers: response.headers,
          body: data,
        });
      });
    });

    request.on('timeout', () => {
      request.destroy();
      if (retries > 0) {
        console.log(`[ProxyServer] Timeout, retrying... (${retries} left)`);
        fetchWithRetry(targetUrl, options, retries - 1, redirectCount)
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error('Request timeout after retries'));
      }
    });

    request.on('error', (error) => {
      if (retries > 0) {
        console.log(`[ProxyServer] Error: ${error.message}, retrying... (${retries} left)`);
        fetchWithRetry(targetUrl, options, retries - 1, redirectCount)
          .then(resolve)
          .catch(reject);
      } else {
        reject(error);
      }
    });

    request.end();
  });
};

/**
 * Main request handler
 */
const handleRequest = async (req, res) => {
  console.log(`[ProxyServer] ${req.method} ${req.url}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Proxy endpoint
  if (req.url.startsWith('/api/proxy/playlist')) {
    if (req.method !== 'POST') {
      res.writeHead(405, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const targetUrl = payload.url;
        const fetchOptions = payload.options || {};

        if (!targetUrl) {
          res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing URL parameter' }));
          return;
        }

        console.log(`[ProxyServer] Fetching: ${targetUrl}`);

        const result = await fetchWithRetry(targetUrl, fetchOptions);

        res.writeHead(result.status, {
          ...corsHeaders,
          'Content-Type': result.headers['content-type'] || 'text/plain',
          'Cache-Control': 'max-age=3600',
        });
        res.end(result.body);
      } catch (error) {
        console.error(`[ProxyServer] Error: ${error.message}`);
        res.writeHead(502, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Bad gateway',
          message: error.message,
        }));
      }
    });
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // 404
  res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
};

// Create server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`[ProxyServer] M3U Playlist Proxy running on http://localhost:${PORT}`);
  console.log(`[ProxyServer] Endpoint: POST /api/proxy/playlist`);
  console.log(`[ProxyServer] Health check: GET /health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[ProxyServer] Shutting down...');
  server.close(() => {
    console.log('[ProxyServer] Server stopped');
    process.exit(0);
  });
});

module.exports = server;
