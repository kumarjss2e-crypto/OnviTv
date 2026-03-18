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
    // For web platform with certificate issues, try CORS proxy as fallback
    let fetchUrl = url;
    const isWebPlatform = typeof window !== 'undefined';
    
    console.log(`[m3uDownloadService] Downloading from: ${url}`);
    
    const response = await fetch(fetchUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = parseInt(contentLength, 10) || 0;
    
    if (total === 0) {
      // If no content-length, just get the text without progress
      const text = await response.text();
      if (onProgress) onProgress(1);
      return text;
    }

    // Read response body with progress tracking
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      chunks.push(value);
      received += value.length;
      
      if (onProgress && total > 0) {
        const progress = received / total;
        onProgress(Math.min(progress, 0.99));
      }
    }

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
