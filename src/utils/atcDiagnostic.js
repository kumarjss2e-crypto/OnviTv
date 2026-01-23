/**
 * iOS ATC Diagnostic Tool
 * 
 * Run this to verify ATC configuration is correct
 * Use in development to catch ATC issues early
 */

import Platform from 'react-native';
import { ATC_CONFIG, isDomainExcepted } from './atcConfig';
import { validateATCCompatibility, logATCCheck } from './atsInit';

/**
 * Run full ATC diagnostic
 * Returns detailed report of ATC configuration and issues
 */
export const runATCDiagnostic = async () => {
  console.log('\n========== iOS ATC DIAGNOSTIC ==========\n');

  if (Platform.OS !== 'ios') {
    console.log(`ℹ️  Running on ${Platform.OS} - ATC is iOS-only`);
    return { platform: Platform.OS, status: 'Not applicable' };
  }

  const report = {
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
    exceptions: {
      streaming: ATC_CONFIG.streamingServers.length,
      iptv: ATC_CONFIG.iptvSources.length,
      trusted: ATC_CONFIG.trustedServices.length,
    },
    validation: {},
    warnings: [],
    errors: [],
  };

  // Test streaming servers
  console.log('Testing streaming servers...');
  ATC_CONFIG.streamingServers.forEach(domain => {
    const url = `http://${domain}/test.m3u8`;
    const validation = validateATCCompatibility(url);
    report.validation[domain] = validation.status;
    console.log(`  ${domain}: ${validation.status}`);
  });

  // Test IPTV sources
  console.log('\nTesting IPTV sources...');
  ATC_CONFIG.iptvSources.forEach(domain => {
    const url = `http://${domain}/test.m3u8`;
    const validation = validateATCCompatibility(url);
    report.validation[domain] = validation.status;
    console.log(`  ${domain}: ${validation.status}`);
  });

  // Test trusted services (should be HTTPS)
  console.log('\nTesting trusted services...');
  ATC_CONFIG.trustedServices.forEach(domain => {
    const url = `https://${domain}/api`;
    const validation = validateATCCompatibility(url);
    report.validation[domain] = validation.status;
    console.log(`  ${domain}: ${validation.status}`);
  });

  // Check for IPv4 addresses (might have issues)
  console.log('\nChecking for IPv4 addresses...');
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipAddresses = [
    ...ATC_CONFIG.streamingServers,
    ...ATC_CONFIG.iptvSources,
  ].filter(domain => ipv4Regex.test(domain));

  if (ipAddresses.length > 0) {
    console.log(`⚠️  Found ${ipAddresses.length} IPv4 addresses:`);
    ipAddresses.forEach(ip => {
      console.log(`    - ${ip}`);
      report.warnings.push(`IPv4 address ${ip} should have NSIncludesSubdomains: false`);
    });
  }

  // Check for localhost entries
  const hasLocalhost = ATC_CONFIG.streamingServers.includes('localhost');
  const hasLoopback = ATC_CONFIG.streamingServers.includes('127.0.0.1');
  if (hasLocalhost || hasLoopback) {
    console.log('✅ Localhost exceptions found (good for development)');
  }

  // Summary
  console.log('\n========== DIAGNOSTIC SUMMARY ==========');
  console.log(`Platform: ${report.platform}`);
  console.log(`Total exceptions: ${Object.keys(report.validation).length}`);
  console.log(`Excepted domains: ${Object.keys(report.validation).filter(k => report.validation[k] === 'EXCEPTED').length}`);
  console.log(`Warnings: ${report.warnings.length}`);
  console.log(`Errors: ${report.errors.length}`);

  if (report.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    report.warnings.forEach(w => console.log(`  - ${w}`));
  }

  if (report.errors.length > 0) {
    console.log('\n❌ Errors:');
    report.errors.forEach(e => console.log(`  - ${e}`));
  } else {
    console.log('\n✅ No errors detected');
  }

  console.log('\n=====================================\n');

  return report;
};

/**
 * Test specific URL against ATC
 */
export const testURL = (url) => {
  console.log(`\nTesting URL: ${url}`);

  const validation = validateATCCompatibility(url);
  console.log(`Compatible: ${validation.compatible}`);
  console.log(`Status: ${validation.status}`);
  console.log(`Reason: ${validation.reason}`);

  if (validation.fix) {
    console.log(`Fix: ${validation.fix}`);
  }

  return validation;
};

/**
 * Test multiple URLs
 */
export const testURLs = (urls = []) => {
  console.log(`\nTesting ${urls.length} URLs...\n`);

  const results = urls.map(url => {
    const validation = validateATCCompatibility(url);
    const status = validation.compatible ? '✅' : '❌';
    console.log(`${status} ${url} (${validation.status})`);
    return { url, ...validation };
  });

  const passed = results.filter(r => r.compatible).length;
  const failed = results.filter(r => !r.compatible).length;

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return results;
};

/**
 * Export config for inspection
 */
export const exportATCConfig = () => {
  return {
    version: '1.0',
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
    config: ATC_CONFIG,
  };
};

/**
 * Compare expected vs actual ATC domains
 */
export const compareATCDomains = (expectedDomains = []) => {
  const allCurrentDomains = [
    ...ATC_CONFIG.streamingServers,
    ...ATC_CONFIG.iptvSources,
    ...ATC_CONFIG.trustedServices,
  ];

  const missing = expectedDomains.filter(d => !allCurrentDomains.includes(d));
  const extra = allCurrentDomains.filter(d => !expectedDomains.includes(d));

  return {
    allMatch: missing.length === 0 && extra.length === 0,
    missing,
    extra,
  };
};

export default {
  runATCDiagnostic,
  testURL,
  testURLs,
  exportATCConfig,
  compareATCDomains,
};

/**
 * Usage Examples:
 * 
 * // Run full diagnostic
 * import { runATCDiagnostic } from './utils/atcDiagnostic';
 * runATCDiagnostic();
 * 
 * // Test specific URL
 * import { testURL } from './utils/atcDiagnostic';
 * testURL('http://tx-4kott.com/playlist.m3u8');
 * 
 * // Test multiple URLs
 * import { testURLs } from './utils/atcDiagnostic';
 * testURLs([
 *   'http://stream1.com/list.m3u8',
 *   'https://api.google.com/data',
 *   'http://192.168.1.1:8080/live'
 * ]);
 */
