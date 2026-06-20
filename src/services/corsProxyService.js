/**
 * CORS Proxy Service for Web Platform
 * 
 * Provides workarounds for CORS-blocked requests in web environments
 * Useful for accessing Xtream APIs that don't have CORS headers
 * 
 * ⚠️  WEB PLATFORM ONLY - Not needed on iOS/Android (no CORS restrictions)
 * 
 * Options:
 * 1. Public CORS proxy (https://cors-anywhere.herokuapp.com or similar)
 * 2. Self-hosted CORS proxy
 * 3. Browser extension workaround
 */

import { Platform } from 'react-native';

// ⚠️  This file should ONLY be used on web platform
// Fail-safe: Check platform on import
if (Platform.OS !== 'web') {
  console.warn('[corsProxyService] ⚠️  corsProxyService should only be used on web platform, loaded on ' + Platform.OS);
}

// CORS proxy services (can use multiple with fallback)
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',  // Most reliable
  'https://cors-anywhere.herokuapp.com/',   // Popular but limited
  'https://thingproxy.freeboard.io/fetch/', // Alternative
];

/**
 * Fetch with CORS proxy for web platform
 * Native platforms don't need this as they don't have CORS restrictions
 * 
 * ⚠️  CRITICAL: Only call this on Platform.OS === 'web'
 */
export const fetchWithCorsProxy = async (url, options = {}) => {
  // Safety check - native platforms should not use this
  if (Platform.OS !== 'web') {
    console.warn('[corsProxyService] fetchWithCorsProxy called on non-web platform (' + Platform.OS + '), using direct fetch');
    return fetch(url, options);
  }

  // Try direct fetch first
  try {
    const response = await fetch(url, { ...options, mode: 'cors' });
    if (response.ok) return response;
  } catch (error) {
    console.warn('[corsProxyService] Direct fetch failed, trying CORS proxies:', error.message);
  }

  // If direct fetch fails, try CORS proxies
  for (const proxy of CORS_PROXIES) {
    try {
      const proxiedUrl = proxy + encodeURIComponent(url);
      console.log(`[corsProxyService] Trying proxy: ${proxy}`);
      
      const response = await fetch(proxiedUrl, {
        ...options,
        headers: {
          ...options.headers,
          // Remove origin header for some proxies
        },
      });

      if (response.ok) {
        console.log(`[corsProxyService] ✓ Successful via proxy: ${proxy}`);
        return response;
      }
    } catch (error) {
      console.warn(`[corsProxyService] Proxy failed: ${proxy}`, error.message);
      continue;
    }
  }

  // All proxies failed
  throw new Error(
    'CORS proxy unavailable. For Xtream on web, use:\n' +
    '1. M3U playlists instead\n' +
    '2. A CORS-enabled server\n' +
    '3. A browser extension like "Allow CORS"'
  );
};

/**
 * Get fetch function appropriate for platform
 * Web: uses CORS proxy fallback
 * Native: uses native fetch (no restrictions)
 */
export const getPlatformSpecificFetch = () => {
  return Platform.OS === 'web' ? fetchWithCorsProxy : fetch;
};

/**
 * Check if CORS proxy is available
 */
export const testCorsProxy = async () => {
  try {
    const response = await fetchWithCorsProxy(
      'https://httpbin.org/get',
      { timeout: 5000 }
    );
    return response.ok;
  } catch (error) {
    console.error('[corsProxyService] CORS proxy test failed:', error);
    return false;
  }
};

/**
 * Get user-friendly error message for CORS issues
 */
export const getCorsErrorMessage = (error) => {
  if (error?.message?.includes('CORS')) {
    return (
      'CORS Error: The Xtream server does not allow web requests.\n\n' +
      'Solutions:\n' +
      '1. Switch to M3U playlist (recommended for web)\n' +
      '2. Use the app on iOS/Android (no CORS restrictions)\n' +
      '3. Ask your Xtream provider to enable CORS\n' +
      '4. Set up a backend proxy server'
    );
  }
  return error?.message || 'Unknown error';
};

export default {
  fetchWithCorsProxy,
  getPlatformSpecificFetch,
  testCorsProxy,
  getCorsErrorMessage,
};
