# iOS App Transport Security (ATC) Configuration Guide

## Overview

App Transport Security (ATC) is Apple's security feature that enforces HTTPS and proper certificate validation on iOS. This guide explains how OnviTV handles ATC exceptions for streaming servers while maintaining security.

## Current Configuration

### app.json - iOS ATC Settings

```json
{
  "NSAppTransportSecurity": {
    "NSAllowsArbitraryLoads": false,           // Disabled - secure by default
    "NSAllowsArbitraryLoadsInWebContent": false, // Disabled - secure by default
    "NSAllowsLocalNetworking": true,            // Enabled - for LAN servers
    "NSRequiresCertificateTransparency": false, // Disabled - self-signed certs OK
    "NSExceptionDomains": { ... }
  }
}
```

### What Each Setting Does

| Setting | Value | Purpose |
|---------|-------|---------|
| `NSAllowsArbitraryLoads` | `false` | Don't allow HTTP for unknown domains |
| `NSAllowsArbitraryLoadsInWebContent` | `false` | Don't allow HTTP in web views |
| `NSAllowsLocalNetworking` | `true` | Allow connections to .local domains and LAN IPs |
| `NSRequiresCertificateTransparency` | `false` | Accept self-signed certificates from streaming servers |

## Per-Domain Exception Configuration

### Domain Exception Keys

Each domain in `NSExceptionDomains` can have:

- **`NSIncludesSubdomains`** (boolean)
  - `true`: Exception applies to all subdomains (e.g., *.example.com)
  - `false`: Exception applies only to exact domain

- **`NSTemporaryExceptionAllowsInsecureHTTPLoads`** (boolean)
  - `true`: Allow unencrypted HTTP connections
  - `false`: Require HTTPS

- **`NSTemporaryExceptionRequiresForwardSecrecy`** (boolean)
  - `true`: Require forward secrecy (modern ciphers)
  - `false`: Allow older/weaker cipher suites

- **`NSMinimumTLSVersion`** (string, optional)
  - `"TLSv1.0"`: Accept TLS 1.0 (old servers)
  - `"TLSv1.2"`: Require TLS 1.2 (default)
  - `"TLSv1.3"`: Require TLS 1.3 (newest)

### Current Exceptions

#### Streaming Servers (Allow HTTP + Weak Ciphers)
```json
"tx-4kott.com": {
  "NSIncludesSubdomains": true,
  "NSTemporaryExceptionAllowsInsecureHTTPLoads": true,
  "NSTemporaryExceptionRequiresForwardSecrecy": false,
  "NSMinimumTLSVersion": "TLSv1.0"
}
```
**Why**: IPTV/streaming servers often use older infrastructure

#### IP Address Servers (Allow HTTP Only)
```json
"110.39.27.47": {
  "NSIncludesSubdomains": false,
  "NSTemporaryExceptionAllowsInsecureHTTPLoads": true,
  "NSTemporaryExceptionRequiresForwardSecrecy": false
}
```
**Why**: Direct IP addresses, no certificate validation possible

#### Trusted Services (HTTPS Only)
```json
"googleapis.com": {
  "NSIncludesSubdomains": true,
  "NSTemporaryExceptionAllowsInsecureHTTPLoads": false,
  "NSTemporaryExceptionRequiresForwardSecrecy": true
}
```
**Why**: Google/Firebase have modern infrastructure, require security

## Adding New Streaming Servers

If you add a new M3U playlist or streaming source:

1. **Identify the domain** from the URL
2. **Add to app.json** under `NSExceptionDomains`
3. **Test on iOS** to verify it works
4. **Never enable `NSAllowsArbitraryLoads`** - it defeats the purpose

### Example: Adding a New Server

If you want to add `stream.example.com`:

```json
"NSExceptionDomains": {
  "stream.example.com": {
    "NSIncludesSubdomains": true,
    "NSTemporaryExceptionAllowsInsecureHTTPLoads": true,
    "NSTemporaryExceptionRequiresForwardSecrecy": false,
    "NSMinimumTLSVersion": "TLSv1.0"
  }
}
```

## Platform Support

### iOS
✅ Full support - ATC exceptions apply
- All HTTP/HTTPS connections respect exceptions
- Self-signed certificates accepted
- Video player works with streaming servers

### Android
✅ Not affected - No ATC on Android
- All HTTP/HTTPS connections work
- No additional configuration needed

### Web
✅ Not affected - Browser handles CORS/TLS
- Uses browser's certificate validation
- ATC exceptions don't apply

## Security Best Practices

1. **Only add known streaming services** - Don't add arbitrary domains
2. **Use subdomains selectively** - Set `NSIncludesSubdomains: false` when possible
3. **Prefer HTTPS** - Set `NSTemporaryExceptionAllowsInsecureHTTPLoads: false` when the server supports it
4. **Monitor for TLS upgrades** - As streaming servers upgrade, remove HTTP exceptions
5. **Never use `NSAllowsArbitraryLoads: true`** - It's a security risk

## Troubleshooting

### Video Won't Play on iOS
1. Check if domain is in `NSExceptionDomains`
2. Verify `NSTemporaryExceptionAllowsInsecureHTTPLoads` is `true`
3. Check if server requires forward secrecy disabled
4. Try setting `NSMinimumTLSVersion: "TLSv1.0"`

### Certificate Validation Errors
Set `NSRequiresCertificateTransparency: false` (already done)

### Connection Timeouts
- Increase timeout in video player config
- Check if firewall is blocking connection
- Verify domain is correctly spelled

## References

- [Apple ATC Documentation](https://developer.apple.com/documentation/bundleresources/information_property_list/nsapptransportsecurity)
- [Expo/React Native iOS Config](https://docs.expo.dev/guides/ios-deployment/)
- [IPTV Server Best Practices](https://en.wikipedia.org/wiki/IPTV)

## Implementation in Code

Use `safeFetch()` utility from `src/utils/atcConfig.js`:

```javascript
import { safeFetch, isDomainExcepted } from './utils/atcConfig';

// Fetch from streaming server
const response = await safeFetch('http://stream.example.com/playlist.m3u8');

// Check if domain has exception
if (isDomainExcepted('http://tx-4kott.com/stream')) {
  // Safe to use without extra validation
}
```

## Summary

✅ **Security**: Base configuration is restrictive (no arbitrary loads)
✅ **Flexibility**: Exceptions allow streaming servers to work
✅ **Platform Safe**: Android/Web unaffected by iOS ATC
✅ **Maintainable**: Easy to add new servers as needed
