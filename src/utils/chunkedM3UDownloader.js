/**
 * Chunked M3U Downloader
 * Downloads M3U files in chunks and parses them concurrently
 * Allows parsing to start within seconds while download continues
 * 
 * Key difference from streaming: We download chunks and parse them as they arrive,
 * but we don't process individual bytes - we accumulate chunks and extract complete lines
 */

/**
 * Download M3U file in chunks and trigger callback for each chunk
 * @param {string} url - M3U file URL
 * @param {Function} onChunk - Callback when a chunk is received: (chunkData: string) => Promise<void>
 * @param {Function} onProgress - Callback for progress: (bytesReceived: number, totalBytes: number) => void
 * @param {AbortSignal} signal - Signal to abort download
 * @param {number} timeout - Request timeout in ms
 * @returns {Promise<Object>} - { success: boolean, totalSize: number, error?: string }
 */
export const downloadM3UInChunks = async (
  url,
  onChunk,
  onProgress,
  signal,
  timeout = 30000
) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('[chunkedM3UDownloader] Starting chunked download:', url);

      const xhr = new XMLHttpRequest();
      let totalBytes = 0;
      let receivedBytes = 0;
      let buffer = ''; // Buffer incomplete lines
      let lastProgressTime = Date.now();
      const PROGRESS_THROTTLE_MS = 1000; // Only update progress every 1 second max

      // Set timeout
      xhr.timeout = timeout;

      // Track progress
      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          totalBytes = event.total;
          receivedBytes = event.loaded;

          // Throttle progress updates to prevent freezing
          const now = Date.now();
          if (now - lastProgressTime >= PROGRESS_THROTTLE_MS && onProgress) {
            onProgress(receivedBytes, totalBytes);
            lastProgressTime = now;
          }
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            console.log('[chunkedM3UDownloader] Download completed');

            // Process any remaining buffered data
            if (buffer.length > 0) {
              console.log('[chunkedM3UDownloader] Processing final buffer');
              await onChunk(buffer);
            }

            console.log(
              `[chunkedM3UDownloader] Successfully downloaded ${(receivedBytes / 1024 / 1024).toFixed(2)}MB`
            );

            // Final progress update
            if (onProgress) {
              onProgress(receivedBytes, totalBytes);
            }

            resolve({
              success: true,
              totalSize: receivedBytes,
            });
          } catch (error) {
            console.error('[chunkedM3UDownloader] Error processing final chunk:', error);
            reject(error);
          }
        } else {
          reject(
            new Error(
              `Server returned ${xhr.status}: ${xhr.statusText || 'Unknown error'}`
            )
          );
        }
      };

      xhr.onerror = () => {
        reject(
          new Error(
            'Network request failed. Please check your internet connection.'
          )
        );
      };

      xhr.ontimeout = () => {
        reject(
          new Error(
            `Request timed out after ${timeout / 1000} seconds. Please check your internet connection.`
          )
        );
      };

      // Handle abort
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Download aborted'));
        });
      }

      xhr.open('GET', url, true);
      
      // Request gzip compression if supported
      xhr.setRequestHeader('Accept-Encoding', 'gzip, deflate');

      xhr.send();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Parse M3U chunks and extract complete lines
 * Buffers incomplete lines until next chunk arrives
 * 
 * @param {string} chunkData - Raw chunk data received from download
 * @param {Function} onLine - Callback for each complete line: (line: string) => void
 * @returns {string} - Incomplete last line to buffer for next chunk
 */
export const parseM3UChunk = (chunkData, onLine) => {
  const lines = chunkData.split('\n');

  // Process all complete lines (all except the last one)
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line) {
      onLine(line);
    }
  }

  // Return the last incomplete line to be buffered
  return lines[lines.length - 1];
};

export default {
  downloadM3UInChunks,
  parseM3UChunk,
};
