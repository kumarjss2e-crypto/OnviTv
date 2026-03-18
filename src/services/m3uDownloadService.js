/**
 * M3U Download Service
 * Handles downloading M3U files with progress tracking and retry logic
 * Designed to avoid Hermes string limit issues by streaming downloads
 */

/**
 * Download M3U file with progress callback
 * @param {string} url - M3U file URL
 * @param {Function} onProgress - Callback with progress (0-1)
 * @returns {Promise<string>} - File content as text
 */
export const downloadM3UFile = async (url, onProgress = null) => {
  try {
    const isWebPlatform = typeof window !== 'undefined';
    let fetchUrl = url;
    
    console.log(`[m3uDownloadService] Downloading from: ${url}`);
    
    // Try direct fetch first
    let response;
    try {
      response = await fetch(fetchUrl);
    } catch (directError) {
      // If direct fetch fails and we're on web, try CORS proxy
      if (isWebPlatform && directError.message && 
          (directError.message.includes('Certificate') || 
           directError.message.includes('CORS') ||
           directError.message.includes('Failed to fetch'))) {
        console.log(`[m3uDownloadService] Direct fetch failed, trying CORS proxy...`);
        
        // Try multiple CORS proxies
        const corsProxies = [
          'https://cors-anywhere.herokuapp.com/',
          'https://api.allorigins.win/raw?url=',
          'https://thingproxy.freeboard.io/fetch/',
        ];
        
        let corsResponse = null;
        for (const proxy of corsProxies) {
          try {
            const proxiedUrl = proxy + encodeURIComponent(url);
            console.log(`[m3uDownloadService] Trying proxy: ${proxy}`);
            corsResponse = await fetch(proxiedUrl, { timeout: 10000 });
            if (corsResponse.ok) {
              console.log(`[m3uDownloadService] CORS proxy succeeded`);
              response = corsResponse;
              break;
            }
          } catch (proxyError) {
            console.log(`[m3uDownloadService] Proxy failed: ${proxyError.message}`);
          }
        }
        
        if (!corsResponse) {
          throw directError;
        }
      } else {
        throw directError;
      }
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get content length if available
    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10) || 0;
    
    console.log(`[m3uDownloadService] Content-Length: ${contentLength || 'NOT PROVIDED'}, total: ${total}`);

    // Always use streaming reader even if content-length is unknown
    // This allows us to track progress from actual bytes received
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    let lastProgressUpdate = 0;
    const progressUpdateInterval = 50 * 1024; // Update every 50KB chunks received
    let lastProgressTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      chunks.push(value);
      received += value.length;
      
      if (onProgress) {
        // If we know the total, use it for realistic progress
        if (total > 0) {
          const progress = received / total;
          const progressDelta = progress - lastProgressUpdate;
          
          // Update every 0.5% or every 50KB
          if (progressDelta >= 0.005 || received - (lastProgressUpdate * total) >= progressUpdateInterval) {
            const cappedProgress = Math.min(progress, 0.99);
            console.log(`[m3uDownloadService] Download progress: ${Math.round(cappedProgress * 100)}% (${received}/${total} bytes)`);
            onProgress(cappedProgress);
            lastProgressUpdate = progress;
            lastProgressTime = Date.now();
          }
        } else {
          // No content-length: emit progress more frequently 
          // Update every 50KB or every 1 second to show activity
          const now = Date.now();
          const timeDelta = now - lastProgressTime;
          
          const shouldUpdate = received % 51200 < 1024 || timeDelta > 1000;
          
          if (shouldUpdate) {
            // For unknown size, estimate based on accumulated data:
            // Assume max ~50MB, show 5-90% progress based on received bytes
            const estimatedProgress = Math.min(0.05 + (received / 50000000) * 0.85, 0.90);
            console.log(`[m3uDownloadService] Download progress (unknown size): ${Math.round(estimatedProgress * 100)}% (${received} bytes received)`);
            onProgress(estimatedProgress);
            lastProgressUpdate = estimatedProgress;
            lastProgressTime = now;
          }
        }
      }
    }

    console.log(`[m3uDownloadService] Download complete. Total bytes: ${received}`);

    // Combine chunks into single string
    const uint8Array = new Uint8Array(received);
    let position = 0;
    for (const chunk of chunks) {
      uint8Array.set(chunk, position);
      position += chunk.length;
    }

    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(uint8Array);
    
    if (onProgress) onProgress(1);
    return text;
  } catch (error) {
    console.error('[m3uDownloadService] Download error:', error);
    throw error;
  }
};

/**
 * Download M3U file with retry logic
 * @param {string} url - M3U file URL
 * @param {Function} onProgress - Callback with progress (0-1)
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<string>} - File content as text
 */
export const downloadM3UFileWithRetry = async (
  url,
  onProgress = null,
  maxRetries = 3
) => {
  let lastError = null;
  let attemptCount = 0;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      attemptCount = attempt + 1;
      console.log(`[m3uDownloadService] Attempt ${attemptCount}/${maxRetries}:`, url);
      
      const content = await downloadM3UFile(url, onProgress);
      console.log(`[m3uDownloadService] Download successful on attempt ${attemptCount}`);
      return content;
    } catch (error) {
      lastError = error;
      console.error(`[m3uDownloadService] Attempt ${attemptCount} failed:`, error.message);

      if (attempt < maxRetries - 1) {
        // Exponential backoff: 2s, 4s, 8s
        const delayMs = Math.pow(2, attempt + 1) * 1000;
        console.log(`[m3uDownloadService] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Failed to download M3U file after retries');
};

export default {
  downloadM3UFile,
  downloadM3UFileWithRetry,
};
