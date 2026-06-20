# iOS Network Compatibility Testing Guide

## Quick Start Testing

### Test 1: Local Network (Fastest)
```
1. Setup local M3U server on your machine (e.g., http://192.168.1.100:8000/playlist.m3u)
2. Open app → Add Playlist
3. Enter: http://192.168.1.100:8000/playlist.m3u
4. Expected: ✓ Parsing succeeds in ~1-2 seconds
5. Check Console: Should show "[URLProtocolHandler] Testing HTTP: 192.168.1.100"
6. Should NOT attempt HTTPS (local networks use HTTP only)
```

### Test 2: External HTTPS (Valid Certificate)
```
1. Open app → Add Playlist
2. Enter: https://your-https-provider.com/playlist.m3u
3. Expected: ✓ Parsing succeeds using HTTPS
4. Check Console: Should show "[URLProtocolHandler] Request succeeded via HTTPS"
5. Time: 5-10 seconds depending on network
```

### Test 3: External HTTP
```
1. Open app → Add Playlist
2. Enter: http://your-http-provider.com/playlist.m3u
3. Expected: ✓ Parsing succeeds (tries HTTPS first, then HTTP)
4. Check Console: Should show:
   - "[URLProtocolHandler] Fetching (HTTPS, attempt 1/3): https://..."
   - "[URLProtocolHandler] ✗ HTTPS attempt 1/3 failed: certificate error"
   - "[URLProtocolHandler] Testing HTTP: http://..."
   - "[URLProtocolHandler] ✓ HTTP is supported"
5. Time: 10-15 seconds (due to HTTPS retry)
```

### Test 4: Self-Signed HTTPS
```
1. Setup HTTPS server with self-signed certificate
2. Open app → Add Playlist
3. Enter: https://self-signed.local/playlist.m3u
4. Expected: ✓ Parsing succeeds (despite certificate warning)
5. Check Console: Should show HTTP fallback attempt OR direct HTTPS success
6. This validates app.json exception is working
```

### Test 5: Error Handling - Invalid Domain
```
1. Open app → Add Playlist
2. Enter: https://this-domain-definitely-does-not-exist-12345.com/playlist.m3u
3. Expected: ✗ Shows error message after ~15-30 seconds (3 retries)
4. Error message should suggest: "Check URL and connection. Try HTTP instead of HTTPS."
5. Check Console: Should show 6 failed attempts (3 HTTPS + 3 HTTP)
```

### Test 6: Error Handling - Certificate Error
```
1. Try adding playlist from domain with expired/invalid certificate
2. Expected: ✗ Falls back to HTTP
3. If HTTP unavailable: Shows "Certificate error. Try HTTP URL instead of HTTPS."
4. App.json exception should allow HTTPS despite invalid cert, so may succeed
```

### Test 7: Xtream API - External Domain
```
1. Open app → Add Playlist → Xtream
2. Enter:
   - Server: https://xtream-provider.com
   - Username: your-username
   - Password: your-password
3. Expected: ✓ Connection test succeeds
4. Expected: Progress modal shows "Fetching categories..."
5. Check Console: Should show "[XtreamCodesService] Fetching get_live_categories"
6. Time: ~5 seconds to test connection
```

### Test 8: Xtream API - HTTP Fallback
```
1. Open app → Add Playlist → Xtream
2. Enter HTTP Xtream server
3. Expected: ✓ Auto-detects and tries HTTPS first, then HTTP
4. Check Console: Should show protocol negotiation in logs
```

---

## Console Log Checklist

When running tests, check Xcode Console for these log patterns:

### ✓ Successful Connection
```
[M3UParser] Starting M3U parse from: https://example.com/playlist.m3u
[URLProtocolHandler] Fetching (HTTPS, attempt 1/3): https://example.com/playlist.m3u
[URLProtocolHandler] ✓ Request succeeded via HTTPS
[M3UParser] ✓ Fetched 156789 bytes
[M3UParser] Parsed 2414 items (12 warnings, 0 errors)
[OnboardingParserService] Saving 2414 items in chunks...
```

### ✓ HTTP Fallback
```
[URLProtocolHandler] Fetching (HTTPS, attempt 1/3): https://example.com/...
[URLProtocolHandler] ✗ HTTPS attempt 1/3 failed: certificate error
[URLProtocolHandler] Testing HTTP: http://example.com/...
[URLProtocolHandler] ✓ HTTP is supported
[URLProtocolHandler] Request succeeded via HTTP
```

### ✓ Local Network (HTTP Only)
```
[URLProtocolHandler] Normalized URL - Primary: http://192.168.1.100:8000/..., 
                                       Fallback: null, IsLocal: true
[URLProtocolHandler] Fetching (HTTP, attempt 1/3): http://192.168.1.100:8000/...
[URLProtocolHandler] ✓ Request succeeded via HTTP
```

### ✗ All Attempts Failed
```
[URLProtocolHandler] Fetching (HTTPS, attempt 1/3): https://invalid.com/...
[URLProtocolHandler] ✗ HTTPS attempt 1/3 failed: Failed to fetch
[URLProtocolHandler] Fetching (HTTPS, attempt 2/3): https://invalid.com/...
[URLProtocolHandler] ✗ HTTPS attempt 2/3 failed: Failed to fetch
[URLProtocolHandler] Fetching (HTTPS, attempt 3/3): https://invalid.com/...
[URLProtocolHandler] ✗ HTTPS attempt 3/3 failed: Failed to fetch
[URLProtocolHandler] Testing HTTP: http://invalid.com/...
[URLProtocolHandler] Fetching (HTTP, attempt 1/3): http://invalid.com/...
[URLProtocolHandler] ✗ HTTP attempt 1/3 failed: Failed to fetch
...
[M3UParser] Failed to parse M3U: All fetch attempts failed
```

---

## Performance Baseline

| Scenario | Expected Time | Notes |
|----------|---|---|
| Local network M3U | 1-2s | HTTP only, fast connection |
| External HTTPS (success first try) | 5-10s | No retries needed |
| External HTTP (HTTPS retry + HTTP) | 10-15s | One protocol retry |
| Large Xtream (50k items sequential) | 18-25s | Expected for large imports |
| Failed connection (3 retries × 2 protocols) | 25-35s | All attempts exhausted |

---

## Device Testing Checklist

### Before Each Test Session
- [ ] App is freshly built on device (not just reloaded)
- [ ] Device is connected to same WiFi as test infrastructure
- [ ] Xcode Console is open for monitoring logs
- [ ] Device has network connectivity verified

### iOS Device Tests (Critical)
- [ ] M3U from HTTP external domain
- [ ] M3U from HTTPS external domain
- [ ] M3U from local network (192.168.x.x or .local)
- [ ] M3U from self-signed HTTPS
- [ ] Xtream from HTTP external domain
- [ ] Xtream from HTTPS external domain
- [ ] Progress modal displays in real-time
- [ ] Video playback works after parsing
- [ ] No ATS warnings in Xcode Console
- [ ] Memory doesn't grow excessively during large parse
- [ ] App doesn't crash on network error

### iOS Simulator Tests (Quick Validation)
- [ ] External HTTPS domain
- [ ] Local network (simulating via http://localhost)
- [ ] Error handling for invalid domain
- [ ] Xtream connection test

### Android Tests (Parallel Validation)
- [ ] Same tests as iOS (no ATS restrictions, but protocol logic same)
- [ ] Verify no crashes or memory leaks
- [ ] Check console logs for protocol decisions

### Web Tests (Regression)
- [ ] M3U parsing still works
- [ ] Xtream API still works
- [ ] No console errors
- [ ] CORS not affected (separate mechanism)

---

## Troubleshooting Failed Tests

### Symptom: "Network request failed" on iOS device

**Investigation Steps**:
1. Check Xcode Console for protocol attempts
2. Verify app.json was rebuilt (EAS build, not just reload)
3. Check device Settings → WiFi → Connected network is correct
4. Try with local network (192.168.x.x) first to isolate issue
5. Try with well-known provider (e.g., https://example.com)

**Solutions to Try**:
- Rebuild app: `eas build --platform ios`
- Hard restart device: Hold power + home, swipe to close
- Check ATS exceptions in app.json were applied
- Try over cellular connection (different network)

### Symptom: Takes 30+ seconds to parse small playlist

**Investigation Steps**:
1. Check console for retry attempts
2. Verify retry backoff times: 1s → 2s → 4s
3. Monitor network tab (if available)
4. Check if domain is actually responding

**Likely Causes**:
- First protocol (HTTPS) timing out before fallback
- All retries being exhausted
- DNS resolution slow on that network

**Solutions**:
- User should provide HTTP URL directly if HTTP-only
- Check domain is actually online
- Try from different network to rule out ISP issues

### Symptom: Certificate error but app.json has exception

**Investigation Steps**:
1. Verify app was rebuilt after app.json changes
2. Check app.json syntax is correct (valid JSON)
3. Verify wildcard "*" exception is present
4. Check NSRequiresCertificateTransparency is false

**Solutions**:
1. Clean build: Remove build directory, rebuild
2. Validate app.json with JSON validator
3. Check that app.json is in root of project
4. Re-run EAS build

### Symptom: Local network times out

**Investigation Steps**:
1. Check if local IP is correct (e.g., 192.168.1.100)
2. Verify device is on same WiFi network
3. Check if local server is actually running
4. Try pinging from device: `ping 192.168.1.100`

**Solutions**:
- Verify local IP address with `ipconfig` or `ifconfig`
- Check firewall isn't blocking connections
- Restart local server
- Try with direct IP (not hostname first)

---

## Test Playlist URLs (Public Services)

For testing without setting up your own infrastructure:

```
# Standard M3U (May vary, check availability)
https://example.com/playlist.m3u

# Xtream-like API (May have demo account requirements)
Server: https://demo.example.com
Username: demo
Password: demo
```

**Note**: Public test services change frequently. Use your own playlists for reliable testing.

---

## Test Results Template

Use this when documenting test results:

```
Test Date: YYYY-MM-DD
Device: [iPhone model, iOS version]
Build: [EAS build ID or date]

Test 1: Local HTTP M3U
  URL: http://192.168.1.100:8000/test.m3u
  Result: ✓ PASS / ✗ FAIL
  Time: XX seconds
  Console Notes: ...

Test 2: External HTTPS M3U
  URL: https://provider.com/playlist.m3u
  Result: ✓ PASS / ✗ FAIL
  Time: XX seconds
  Console Notes: ...

Test 3: Error Handling (Invalid Domain)
  URL: https://definitely-invalid-domain.xyz/test.m3u
  Result: ✓ PASS / ✗ FAIL
  Error Message: ...
  Time: XX seconds

Overall: ✓ READY FOR RELEASE / ⚠️ ISSUES FOUND
Issues to Address:
- ...
```

---

## Success Criteria

All tests must meet these criteria before production release:

- ✅ All 8 basic tests pass
- ✅ Console shows expected protocol attempts
- ✅ No ATS warnings in Xcode Console
- ✅ Performance within expected baseline (±20%)
- ✅ Error messages are clear and helpful
- ✅ App doesn't crash on network errors
- ✅ Video playback works with parsed content
- ✅ Progress modal updates in real-time
- ✅ No memory leaks during large imports
- ✅ All tests pass on actual iOS device (not just simulator)

---

## Next Steps After Testing

Once all tests pass:

1. **Document Results**: Capture console logs and timing for each test
2. **Create Release Notes**: Mention iOS network compatibility improvements
3. **User Communication**: Update support docs with HTTP/HTTPS guidance
4. **Monitor Analytics**: Track which protocol strategies succeed in production
5. **Plan Enhancement**: Consider protocol caching for faster future imports

---

## Contact & Support

If tests fail:
1. Collect full console output
2. Document device details (model, iOS version)
3. Include test playlist URL (if safe)
4. Review troubleshooting section above
5. Compare with this guide's expected patterns
