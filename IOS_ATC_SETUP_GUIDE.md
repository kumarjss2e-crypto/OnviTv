# iOS ATC Testing & Deployment Guide

## Quick Setup

### 1. Configuration Already Done
✅ **app.json** - ATC exceptions configured
✅ **eas.json** - iOS build profiles ready
✅ **App.js** - ATC initializer added
✅ **M3U Parser** - Safe fetch utilities integrated

### 2. Key Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `app.json` | NSAppTransportSecurity config | iOS ATC exceptions |
| `src/utils/atcConfig.js` | New file | ATC configuration utilities |
| `src/utils/atsInit.js` | New file | ATC initialization & validation |
| `App.js` | Added `initializeATC()` | Initialize on app start |
| `src/utils/m3uParser.js` | Import safeFetch | Use safe fetch for parsing |

## What Happens On iOS

### App Startup
```
App launches
  ↓
initializeATC() called
  ↓
Logs ATC configuration (dev builds only)
  ↓
Validates streaming server domains
  ↓
Ready to fetch M3Us and play videos
```

### When Fetching M3U
```
User adds playlist URL
  ↓
validateATCCompatibility() checks domain
  ↓
If domain NOT in exceptions AND not HTTPS:
  - Logs warning with fix
  - Suggests adding to app.json
  ↓
httpGet() fetches with VLC user-agent & retries
  ↓
M3U parser processes content
```

### When Playing Video
```
User plays video
  ↓
Video URL checked against ATC exceptions
  ↓
react-native-video loads with URL
  ↓
Native HLS player (AVPlayer) handles streaming
  ↓
Plays successfully if:
  - HTTPS OR
  - Domain in NSExceptionDomains OR
  - Localhost/LAN
```

## Debugging ATC Issues

### Check if Domain is Excepted

```javascript
// In React Native Console
import { validateATCCompatibility } from './src/utils/atsInit';

const url = 'http://your-stream.com/playlist.m3u8';
const validation = validateATCCompatibility(url);
console.log(validation);
// Output: { compatible: false, reason: '...', fix: '...' }
```

### Enable Debug Logging

Already enabled! Check console for:
- `[ATC Init]` - Initialization logs
- `[ATC OK]` - Successfully excepted domains
- `[ATC BLOCKED]` - Domains that might fail
- `[ATC Startup]` - Startup validation

### Common Issues & Fixes

#### Problem: "Network request failed" on iOS
**Cause**: Domain not in ATC exceptions
**Fix**: Add domain to app.json NSExceptionDomains, rebuild

#### Problem: "ERR_CONTENT_LENGTH_MISMATCH" on Video
**Cause**: Server misconfiguration (not iOS specific)
**Fix**: Verify on web first, then test on iOS
**Note**: This is the movie server issue we identified earlier

#### Problem: "Certificate validation failed"
**Cause**: Server has self-signed certificate
**Fix**: Already handled by `NSRequiresCertificateTransparency: false`

#### Problem: "Connection refused" on localhost
**Cause**: Local server not running
**Fix**: Start local server, ensure NSAllowsLocalNetworking is true (it is)

## Building for iOS

### Development Build (Simulator)
```bash
# With custom ATC config
eas build --platform ios --profile preview

# Use dev client for faster iteration
eas build --platform ios --profile dev-client
```

### Production Build (App Store)
```bash
eas build --platform ios --profile production
```

## Adding New Streaming Servers

### Step 1: Identify the Domain
```
URL: http://stream.example.com/playlist.m3u8
Domain: stream.example.com
```

### Step 2: Add to app.json
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

### Step 3: Rebuild iOS App
```bash
eas build --platform ios --profile preview
```

### Step 4: Verify in Code (Optional)
```javascript
import { logATCCheck } from './src/utils/atsInit';
logATCCheck('http://stream.example.com/playlist.m3u8', 'Custom Server');
// Logs: [ATC OK] Custom Server: Domain "stream.example.com" is in ATC exceptions
```

## Security Considerations

✅ **Good Practices**
- Only add known streaming services
- Use HTTPS when server supports it
- Regularly review and remove unused exceptions
- Monitor for server TLS upgrades

❌ **Avoid**
- Never use `NSAllowsArbitraryLoads: true` (defeats security)
- Don't add private IP addresses unless necessary
- Don't allow HTTP for sensitive data

## Testing Checklist

- [ ] App launches without crashes on iOS simulator
- [ ] `initializeATC()` logs appear in console
- [ ] Can add M3U playlist from HTTP source
- [ ] M3U playlist fetches successfully
- [ ] Channels/series play in video player
- [ ] Movie streams attempt to play (known server issue, expected)
- [ ] HTTPS sources (Firebase, CDN) work normally
- [ ] App doesn't request arbitrary HTTPS loads

## Reference Documentation

- **app.json**: Line 27-66 - NSAppTransportSecurity config
- **atsInit.js**: Initialization and validation utilities
- **atcConfig.js**: Configuration and safe fetch utilities
- **ATC_CONFIGURATION_GUIDE.md**: Detailed technical guide

## Support

If ATC issues arise:

1. Check console for `[ATC]` logs
2. Verify domain is in `NSExceptionDomains`
3. Try HTTPS version of URL first
4. Check if server supports newer TLS versions
5. Review Apple's ATC documentation

## Summary

- **iOS ATC**: Restrictive by default, exceptions only where needed
- **Android**: Not affected, works normally
- **Web**: Not affected, browser handles security
- **Video Player**: Works on iOS native HLS (AVPlayer)
- **M3U Parser**: Uses safe fetch with retries
- **Streaming Servers**: 4 known domains configured, easy to add more
