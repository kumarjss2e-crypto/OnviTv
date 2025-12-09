/**
 * HTTP Client Utility
 * Uses XMLHttpRequest instead of fetch to avoid Response status 0 crashes
 */

/**
 * Make an HTTP GET request
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @param {number} options.timeout - Request timeout in ms (default: 30000)
 * @param {Object} options.headers - Request headers
 * @param {number} options.retries - Number of retry attempts (default: 3)
 * @returns {Promise<string>} - Response text
 */
export const httpGet = async (url, options = {}) => {
  const {
    timeout = 30000,
    headers = {},
    retries = 3,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`HTTP GET (attempt ${attempt}/${retries}):`, url);

      const responseText = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Set timeout
        xhr.timeout = timeout;

        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log(`✅ HTTP GET success: ${xhr.status}`);
            resolve(xhr.responseText);
          } else if (xhr.status === 0) {
            reject(
              new Error(
                'Network request failed - no response from server. Please check your internet connection.'
              )
            );
          } else {
            // Log the response body for debugging
            const responsePreview = xhr.responseText
              ? xhr.responseText.substring(0, 200)
              : 'No response body';
            console.error(`Server error ${xhr.status}:`, responsePreview);

            // Check if response contains error message
            let errorMessage = xhr.statusText || 'Unknown error';
            if (xhr.responseText && xhr.responseText.length < 500) {
              // If response is short, it might be an error message
              errorMessage = xhr.responseText;
            }

            reject(new Error(`Server returned ${xhr.status}: ${errorMessage}`));
          }
        };

        xhr.onerror = function () {
          reject(
            new Error(
              'Network request failed. Please check your internet connection and try again.'
            )
          );
        };

        xhr.ontimeout = function () {
          reject(
            new Error(
              `Request timed out after ${timeout / 1000} seconds. Please check your internet connection.`
            )
          );
        };

        xhr.open('GET', url, true);

        // Set headers
        Object.keys(headers).forEach((key) => {
          xhr.setRequestHeader(key, headers[key]);
        });

        // Set default headers if not provided
        if (!headers['Accept']) {
          xhr.setRequestHeader('Accept', '*/*');
        }
        if (!headers['User-Agent']) {
          xhr.setRequestHeader('User-Agent', 'OnviTV/1.0');
        }

        xhr.send();
      });

      return responseText;
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      if (
        error.message.includes('404') ||
        error.message.includes('403') ||
        error.message.includes('401')
      ) {
        console.error(`❌ Non-retryable error: ${error.message}`);
        break;
      }

      console.warn(`Attempt ${attempt} failed:`, error.message);

      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  // All retries failed
  console.error('❌ All retry attempts failed');
  throw new Error(
    lastError?.message ||
      'Failed to fetch data after multiple attempts. Please check the URL and your internet connection.'
  );
};

/**
 * Make an HTTP GET request and parse JSON response
 * @param {string} url - Request URL
 * @param {Object} options - Request options (same as httpGet)
 * @returns {Promise<Object>} - Parsed JSON response
 */
export const httpGetJSON = async (url, options = {}) => {
  const responseText = await httpGet(url, options);

  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    throw new Error('Invalid JSON response from server');
  }
};

export default {
  httpGet,
  httpGetJSON,
};
