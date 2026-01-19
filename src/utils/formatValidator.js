/**
 * Format Validator
 * Checks if a stream URL uses a supported video format
 * Only saves content with supported formats
 */

const SUPPORTED_FORMATS = {
  // Video containers
  'mp4': true,
  'webm': true,
  'mov': false,
  'mkv': false,
  'avi': false,
  'flv': true,
  'ts': true,        // MPEG-TS
  'm3u8': true,      // HLS
  'mpd': true,       // DASH
  'm3u': true,
  
  // Streaming protocols
  'hls': true,
  'dash': true,
  'rtmp': false,     // Deprecated
  'http': true,
  'https': true,
};

/**
 * Check if stream URL has supported format
 * @param {string} streamUrl - Stream URL
 * @returns {Object} { isSupported: boolean, format: string, reason: string }
 */
export const validateStreamFormat = (streamUrl) => {
  if (!streamUrl || typeof streamUrl !== 'string') {
    return {
      isSupported: false,
      format: null,
      reason: 'Invalid stream URL',
    };
  }

  try {
    // Extract file extension from URL
    const urlWithoutParams = streamUrl.split('?')[0]; // Remove query params
    const extension = urlWithoutParams.split('.').pop().toLowerCase();
    
    // Check against supported formats
    if (SUPPORTED_FORMATS[extension] === true) {
      return {
        isSupported: true,
        format: extension,
        reason: 'Supported format',
      };
    }
    
    if (SUPPORTED_FORMATS[extension] === false) {
      return {
        isSupported: false,
        format: extension,
        reason: `Unsupported format: .${extension}`,
      };
    }
    
    // If extension not in list, check for protocol/streaming patterns
    if (streamUrl.includes('m3u8')) {
      return {
        isSupported: true,
        format: 'm3u8',
        reason: 'HLS stream detected',
      };
    }
    
    if (streamUrl.includes('mpd')) {
      return {
        isSupported: true,
        format: 'mpd',
        reason: 'DASH stream detected',
      };
    }
    
    if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://')) {
      // Generic HTTP stream - might be supported
      return {
        isSupported: true,
        format: 'http_stream',
        reason: 'HTTP/HTTPS stream (generic)',
      };
    }
    
    return {
      isSupported: false,
      format: extension || 'unknown',
      reason: 'Unknown or unsupported format',
    };
    
  } catch (error) {
    return {
      isSupported: false,
      format: null,
      reason: `Validation error: ${error.message}`,
    };
  }
};

/**
 * Quick check - returns boolean
 * @param {string} streamUrl 
 * @returns {boolean}
 */
export const isSupportedFormat = (streamUrl) => {
  return validateStreamFormat(streamUrl).isSupported;
};

export default {
  validateStreamFormat,
  isSupportedFormat,
  SUPPORTED_FORMATS,
};
