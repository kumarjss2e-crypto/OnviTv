/**
 * Service Worker for OnviTV
 * Fixes problematic streaming server headers that cause ERR_CONTENT_LENGTH_MISMATCH
 * 
 * Some IPTV servers return incorrect Content-Length headers or use chunked encoding
 * without proper headers. This worker intercepts fragment requests and fixes the headers.
 */

const MOVIE_STREAM_DOMAIN = '110.39.27.47:8001';

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept .ts fragment requests from problematic servers
  if (!url.pathname.endsWith('.ts')) {
    return;
  }

  if (!url.host.includes(MOVIE_STREAM_DOMAIN)) {
    return;
  }

  // Intercept and modify response
  event.respondWith(
    fetch(request)
      .then((response) => {
        // If response is not ok or there's an issue, still try to use it
        if (!response.ok) {
          return response;
        }

        // Clone the response so we can modify headers
        const modifiedResponse = response.clone();

        // Create a new response with corrected headers
        const newHeaders = new Headers(modifiedResponse.headers);

        // Remove problematic headers
        newHeaders.delete('Content-Length');
        newHeaders.delete('Transfer-Encoding');

        // Read the body as arraybuffer to get actual size
        return modifiedResponse.arrayBuffer().then((buffer) => {
          // Create new response with actual content length
          const finalHeaders = new Headers(newHeaders);
          finalHeaders.set('Content-Length', buffer.byteLength.toString());
          finalHeaders.set('Content-Type', 'video/mp2t'); // MPEG-TS mime type

          return new Response(buffer, {
            status: response.status,
            statusText: response.statusText,
            headers: finalHeaders,
          });
        });
      })
      .catch((err) => {
        console.error('[ServiceWorker] Fetch error for', url.pathname, err);
        // Return error response
        return new Response('Fetch failed', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      })
  );
});

// Handle activation
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activated');
  event.waitUntil(self.clients.claim());
});

// Handle installation
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installed');
  self.skipWaiting();
});
