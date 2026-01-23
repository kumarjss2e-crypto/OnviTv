/**
 * iOS App Transport Security Initializer
 * 
 * This module initializes ATC-specific configurations for iOS builds
 * It's safe to call on all platforms (no-op on Android/Web)
 * 
 * ATC Exceptions are configured in app.json infoPlist.NSAppTransportSecurity
 * This module provides runtime checks and logging for debugging
 */

import { Platform } from 'react-native';
import { ATC_CONFIG, isDomainExcepted } from './atcConfig';

/**
 * Initialize ATC for iOS
 * Call this in App.js useEffect on startup
 */
export const initializeATC = () => {
  // Safety check for Platform availability and non-iOS platforms
  try {
    if (!Platform || !Platform.OS || Platform.OS !== 'ios') {
      return; // No-op on Android/Web or if Platform unavailable
    }
  } catch (e) {
    // Platform check failed, likely on web - skip ATC init
    return;
  }

  console.log('[ATC Init] Initializing iOS App Transport Security');
  
  // Log ATC exception domains
  console.log('[ATC Init] Streaming servers with exceptions:', ATC_CONFIG.streamingServers);
  console.log('[ATC Init] IPTV sources with exceptions:', ATC_CONFIG.iptvSources);
  console.log('[ATC Init] Trusted services (HTTPS only):', ATC_CONFIG.trustedServices);
};

/**
 * Validate URL against ATC exceptions
 * Logs warnings if URL might fail due to ATC
 * @param {string} url - URL to validate
 * @returns {Object} - Validation result
 */
export const validateATCCompatibility = (url) => {
  if (!Platform || Platform.OS !== 'ios') {
    return { compatible: true, reason: 'Not iOS' };
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const protocol = urlObj.protocol;

    // Check if domain is excepted
    const isExcepted = isDomainExcepted(url);

    // Check protocol
    const isHTTPS = protocol === 'https:';
    const isHTTP = protocol === 'http:';
    const isLocalhost = domain === 'localhost' || domain === '127.0.0.1';

    if (isLocalhost) {
      return {
        compatible: true,
        reason: 'Localhost is excepted',
        status: 'OK',
      };
    }

    if (isExcepted) {
      return {
        compatible: true,
        reason: `Domain "${domain}" is in ATC exceptions`,
        status: 'EXCEPTED',
      };
    }

    if (isHTTPS) {
      return {
        compatible: true,
        reason: 'HTTPS connections are always allowed',
        status: 'HTTPS',
      };
    }

    if (isHTTP) {
      return {
        compatible: false,
        reason: `HTTP domain "${domain}" is NOT in ATC exceptions`,
        status: 'BLOCKED',
        fix: `Add "${domain}" to NSExceptionDomains in app.json`,
      };
    }

    return {
      compatible: false,
      reason: `Unknown protocol: ${protocol}`,
      status: 'ERROR',
    };
  } catch (error) {
    return {
      compatible: false,
      reason: `Invalid URL: ${error.message}`,
      status: 'ERROR',
    };
  }
};

/**
 * Log ATC compatibility for debugging
 * @param {string} url - URL to check
 * @param {string} context - Context string (e.g., "M3U Fetch", "Video Playback")
 */
export const logATCCheck = (url, context = 'Unknown') => {
  if (!Platform || Platform.OS !== 'ios') {
    return;
  }

  const validation = validateATCCompatibility(url);

  if (validation.compatible) {
    console.log(`[ATC OK] ${context}:`, validation.reason);
  } else {
    console.warn(`[ATC BLOCKED] ${context}:`, validation.reason);
    if (validation.fix) {
      console.warn(`[ATC FIX] ${validation.fix}`);
    }
  }
};

/**
 * Check all critical URLs at startup
 * Helps catch ATC issues early
 * @param {Array<string>} urls - URLs to check
 */
export const validateStartupURLs = (urls = []) => {
  if (!Platform || Platform.OS !== 'ios' || !Array.isArray(urls)) {
    return;
  }

  console.log('[ATC Startup Check] Validating', urls.length, 'URLs');

  const results = {
    compatible: [],
    blocked: [],
  };

  urls.forEach(url => {
    const validation = validateATCCompatibility(url);
    if (validation.compatible) {
      results.compatible.push(url);
    } else {
      results.blocked.push({
        url,
        reason: validation.reason,
        fix: validation.fix,
      });
    }
  });

  if (results.blocked.length > 0) {
    console.warn('[ATC Startup] Found', results.blocked.length, 'potentially blocked URLs:');
    results.blocked.forEach(item => {
      console.warn(`  - ${item.url}`);
      console.warn(`    Reason: ${item.reason}`);
      if (item.fix) {
        console.warn(`    Fix: ${item.fix}`);
      }
    });
  } else {
    console.log('[ATC Startup] All URLs passed ATC validation ✅');
  }

  return results;
};

/**
 * Add a new domain to ATC exceptions (runtime)
 * Note: This doesn't actually modify iOS ATC - it only adds to our config
 * Real ATC exceptions must be set in app.json
 * @param {string} domain - Domain to add
 * @param {string} category - Category ('streaming', 'iptv', or 'trusted')
 */
export const addATCException = (domain, category = 'streaming') => {
  if (!domain) return;

  const categoryMap = {
    streaming: ATC_CONFIG.streamingServers,
    iptv: ATC_CONFIG.iptvSources,
    trusted: ATC_CONFIG.trustedServices,
  };

  const list = categoryMap[category];
  if (list && !list.includes(domain)) {
    list.push(domain);
    console.log(`[ATC Runtime] Added "${domain}" to ${category} exceptions`);
    console.warn('[ATC Runtime] This is only for app logic - update app.json for iOS builds!');
  }
};

export default {
  initializeATC,
  validateATCCompatibility,
  logATCCheck,
  validateStartupURLs,
  addATCException,
};
