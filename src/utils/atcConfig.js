/**
 * ATC (App Transport Security) Configuration Utility
 * 
 * Handles iOS App Transport Security exceptions for streaming servers
 * This ensures video playback works across different server types without
 * breaking the platform on iOS, Android, or Web
 * 
 * ATC Configuration Explained:
 * - NSAllowsArbitraryLoads: DISABLED (secure by default)
 * - NSAllowsArbitraryLoadsInWebContent: DISABLED (secure by default)
 * - NSAllowsLocalNetworking: ENABLED (for local/LAN servers)
 * - NSRequiresCertificateTransparency: DISABLED (for self-signed certs)
 * 
 * For specific domains:
 * - NSTemporaryExceptionAllowsInsecureHTTPLoads: true = Allow HTTP
 * - NSTemporaryExceptionRequiresForwardSecrecy: false = Allow weak ciphers
 * - NSMinimumTLSVersion: TLSv1.0 = Support older TLS versions
 */

export const ATC_CONFIG = {
  // Streaming/Video servers - Allow HTTP and weak ciphers
  streamingServers: [
    'localhost',
    '127.0.0.1',
    'bestem3uliste.link',
    '110.39.27.47', // Movie streaming endpoint
    'tx-4kott.com',
    'cmshulk.com',
    'picons.cmshulk.com',
  ],

  // IPTV/M3U sources - Allow HTTP
  iptvSources: [
    'm3u8-proxy.example.com',
  ],

  // CDN/Secure services - HTTPS only
  trustedServices: [
    'googleapis.com',
    'gstatic.com',
    'firebaseio.com',
    'cdnjs.cloudflare.com',
    'firebase.google.com',
  ],
};

/**
 * Safely fetch from potentially insecure sources
 * This works around ATC restrictions while maintaining security
 */
export const safeFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error(`[SafeFetch] Error fetching ${url}:`, error.message);
    throw error;
  }
};

/**
 * Check if domain is in ATC exception list
 */
export const isDomainExcepted = (url) => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    const allExceptionDomains = [
      ...ATC_CONFIG.streamingServers,
      ...ATC_CONFIG.iptvSources,
    ];

    return allExceptionDomains.some(exceptedDomain => {
      return domain === exceptedDomain || domain.endsWith(exceptedDomain);
    });
  } catch {
    return false;
  }
};

export default {
  ATC_CONFIG,
  safeFetch,
  isDomainExcepted,
};
