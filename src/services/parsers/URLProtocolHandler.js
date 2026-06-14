/**
 * URL Protocol Handler
 * Intelligently handles HTTP/HTTPS protocol selection for different domain types
 * 
 * Strategy:
 * 1. Local networks: Always use HTTP (no ATS restrictions)
 * 2. HTTPS domains: Use HTTPS
 * 3. HTTP domains: Try HTTPS first, fallback to HTTP
 * 4. Unknown: Auto-detect and remember result
 */

/**
 * Check if IP/domain is local network
 */
const isLocalNetwork = (hostname) => {
  const localPatterns = [
    /^localhost$/i,
    /^127\./,           // 127.0.0.0/8
    /^192\.168\./,      // 192.168.0.0/16
    /^10\./,            // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /\.local$/i,        // .local domains
    /\.lan$/i,          // .lan domains
  ];

  return localPatterns.some(pattern => pattern.test(hostname));
};

/**
 * Normalize URL and determine best protocol
 */
export const normalizeURL = (urlString) => {
  try {
    // Clean URL first
    const cleanUrl = urlString.trim().replace(/^[`'" ]+|[`'" ]+$/g, '').trim();
    
    // Parse URL
    let url;
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      url = new URL(cleanUrl);
    } else {
      // Assume HTTP if no protocol
      url = new URL(`http://${cleanUrl}`);
    }

    const hostname = url.hostname;
    // Only use port if explicitly provided (non-empty string)
    const customPort = url.port ? `:${url.port}` : '';
    const pathname = url.pathname;
    const search = url.search;

    // For local networks, always use HTTP (no ATS restrictions)
    if (isLocalNetwork(hostname)) {
      return {
        primary: `http://${hostname}${customPort}${pathname}${search}`,
        fallback: null,
        isLocal: true,
        hostname,
        protocol: 'http',
      };
    }

    // For external domains with explicit HTTPS, use HTTPS
    if (url.protocol === 'https:') {
      return {
        primary: `https://${hostname}${customPort}${pathname}${search}`,
        // HTTP fallback: never include explicit port, use default 80
        fallback: `http://${hostname}${pathname}${search}`,
        isLocal: false,
        hostname,
        protocol: 'https',
      };
    }

    // For external domains with HTTP, try HTTPS first then HTTP
    return {
      // HTTPS primary: never include explicit port, use default 443
      primary: `https://${hostname}${pathname}${search}`,
      fallback: `http://${hostname}${customPort}${pathname}${search}`,
      isLocal: false,
      hostname,
      protocol: 'http-auto',
    };
  } catch (error) {
    console.error(`[URLProtocolHandler] Failed to parse URL: ${urlString}`, error);
    // Fallback: assume HTTP
    return {
      primary: `http://${urlString}`,
      fallback: `https://${urlString}`,
      isLocal: false,
      hostname: urlString,
      protocol: 'unknown',
    };
  }
};

/**
 * Detect server capabilities (HTTPS support)
 */
export const detectServerProtocol = async (baseUrl) => {
  const normalized = normalizeURL(baseUrl);

  // Local networks always use HTTP
  if (normalized.isLocal) {
    return {
      url: normalized.primary,
      protocol: 'http',
      supportsHTTPS: false,
      supportsHTTP: true,
    };
  }

  // Try HTTPS first
  try {
    console.log(`[URLProtocolHandler] Testing HTTPS: ${normalized.primary}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(normalized.primary, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok || response.status < 500) {
      console.log(`[URLProtocolHandler] ✓ HTTPS is supported`);
      return {
        url: normalized.primary,
        protocol: 'https',
        supportsHTTPS: true,
        supportsHTTP: true, // HTTP probably works too
      };
    }
  } catch (error) {
    console.warn(`[URLProtocolHandler] HTTPS failed: ${error.message}`);
  }

  // Fallback to HTTP
  if (normalized.fallback) {
    try {
      console.log(`[URLProtocolHandler] Testing HTTP: ${normalized.fallback}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(normalized.fallback, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok || response.status < 500) {
        console.log(`[URLProtocolHandler] ✓ HTTP is supported`);
        return {
          url: normalized.fallback,
          protocol: 'http',
          supportsHTTPS: false,
          supportsHTTP: true,
        };
      }
    } catch (error) {
      console.warn(`[URLProtocolHandler] HTTP also failed: ${error.message}`);
    }
  }

  // Default to primary (will fail, but we tried)
  return {
    url: normalized.primary,
    protocol: normalized.protocol,
    supportsHTTPS: false,
    supportsHTTP: false,
    error: 'Both HTTPS and HTTP failed',
  };
};

/**
 * Fetch with automatic protocol fallback
 */
export const fetchWithFallback = async (urlString, options = {}) => {
  const normalized = normalizeURL(urlString);
  const { retries = 3, timeout = 60000, ...fetchOptions } = options;

  const urls = [normalized.primary];
  if (normalized.fallback) {
    urls.push(normalized.fallback);
  }

  let lastError;

  for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
    const currentUrl = urls[urlIndex];

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(currentUrl, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error;
        const errorMsg = error?.message || String(error);

        if (attempt < retries - 1) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
  }

  throw lastError || new Error('All fetch attempts failed');
};

/**
 * Get recommended protocol for URL
 */
export const getRecommendedProtocol = (urlString) => {
  const normalized = normalizeURL(urlString);

  if (normalized.isLocal) {
    return 'http';
  }

  if (urlString.startsWith('https://')) {
    return 'https';
  }

  // For HTTP URLs on external domains, recommend HTTPS
  return 'https';
};

export default {
  normalizeURL,
  detectServerProtocol,
  fetchWithFallback,
  getRecommendedProtocol,
  isLocalNetwork,
};
