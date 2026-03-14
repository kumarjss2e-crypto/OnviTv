/**
 * M3U File Download Service
 * Handles downloading M3U files with progress tracking
 * Uses proven method: download entire file, then parse sequentially
 */

/**
 * Download M3U file with progress callback
 * @param {string} url - M3U URL to download
 * @param {function} onProgress - Callback with progress 0-1
 * @returns {Promise<string>} - File content as text
 */
export const downloadM3UFile = async (url, onProgress) => {
  try {
    console.log('[m3uDownloadService] Starting download from:', url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get total file size from headers
    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    console.log('[m3uDownloadService] Total file size:', totalBytes, 'bytes');

    // If we can't get progress info, use a simpler approach
    if (!totalBytes) {
      console.log('[m3uDownloadService] No content-length, using text() method');
      const text = await response.text();
      onProgress(1);
      return text;
    }

    // Read the response as a stream to track progress
    const reader = response.body.getReader();
    let receivedBytes = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(value);
      receivedBytes += value.length;

      // Calculate and report progress
      const progress = receivedBytes / totalBytes;
      const percent = Math.round(progress * 100);
      
      console.log(`[m3uDownloadService] Downloaded ${percent}%`);
      onProgress(progress);
    }

    // Convert chunks to string
    const decoder = new TextDecoder();
    let fileContent = '';

    for (const chunk of chunks) {
      fileContent += decoder.decode(chunk, { stream: true });
    }

    // Flush the decoder
    fileContent += decoder.decode();

    console.log('[m3uDownloadService] Download complete. File size:', fileContent.length, 'chars');
    onProgress(1);

    return fileContent;

  } catch (error) {
    console.error('[m3uDownloadService] Download error:', error.message);
    throw new Error(`Failed to download M3U file: ${error.message}`);
  }
};

/**
 * Download file with retry logic for network failures
 * @param {string} url - File URL
 * @param {function} onProgress - Progress callback
 * @param {number} maxRetries - Max retry attempts
 * @returns {Promise<string>} - File content
 */
export const downloadM3UFileWithRetry = async (url, onProgress, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[m3uDownloadService] Download attempt ${attempt}/${maxRetries}`);
      return await downloadM3UFile(url, onProgress);
    } catch (error) {
      lastError = error;
      console.warn(`[m3uDownloadService] Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`[m3uDownloadService] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Download failed after all retries');
};
