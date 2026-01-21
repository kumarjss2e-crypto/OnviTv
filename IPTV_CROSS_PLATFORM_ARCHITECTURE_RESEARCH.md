# Professional IPTV Cross-Platform Architecture Research

## Executive Summary

This document outlines the architectural approaches used by professional IPTV applications (like Tivimate, IPTV Extreme, Smarters Pro) and open-source implementations (like IPTVnator) for handling cross-platform M3U parsing and video playback across web browsers, iOS, and Android.

---

## 1. CORS & Web Browser Challenges

### The Problem
**CORS (Cross-Origin Resource Sharing) Restrictions**: Web browsers enforce strict CORS policies that prevent direct access to M3U playlist files and streaming URLs hosted on IPTV servers. This is a security feature that blocks cross-origin requests.

Key challenges:
- **M3U Fetch Blocking**: M3U playlists hosted on different domains cannot be fetched directly from browser JavaScript
- **Streaming URL Access**: HLS/DASH stream URLs cannot be accessed by the video player if they come from different origins
- **No Native Bypass**: Unlike native mobile apps with full HTTP capabilities, web apps are sandboxed by the browser

### Architectural Solutions

#### **Solution 1: Backend Proxy Server (Most Common)**

Professional IPTV apps implement a **backend proxy** that acts as an intermediary:

```
Browser Client → Proxy Server → IPTV Server → Stream
```

**Implementation Pattern:**
- Express.js/Node.js server with CORS middleware
- Proxy service hosted on same domain as web frontend
- Handles playlist fetching and URL rewriting

**Advantages:**
- ✅ Bypasses CORS restrictions naturally (server-to-server communication)
- ✅ Can add custom headers (User-Agent, authentication)
- ✅ Can implement caching, rate limiting, monitoring
- ✅ Works with all IPTV server types
- ✅ Allows request filtering and security

**Disadvantages:**
- ❌ Adds server infrastructure costs
- ❌ Additional latency from extra hop
- ❌ Server must handle all traffic

**Common Implementation:**
```javascript
// Backend proxy example
app.get('/api/playlist/:streamId', async (req, res) => {
  try {
    const response = await fetch(req.query.url, {
      headers: {
        'User-Agent': 'VLC/3.0.0',
        'Authorization': req.headers.authorization
      },
      timeout: 45000
    });
    
    res.set('Access-Control-Allow-Origin', '*');
    res.send(await response.text());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### **Solution 2: CORS Proxy Services**

Some applications use public or private CORS proxy services:

**Public Services:**
- `https://cors-anywhere.herokuapp.com/` (historical, now rate-limited)
- `https://robwu.nl/cors-anywhere.html` (proxy wrapper)

**Pattern:**
```
Browser → Public CORS Proxy → IPTV Server
```

**Advantages:**
- ✅ No backend infrastructure needed
- ✅ Simple implementation
- ✅ Can work immediately

**Disadvantages:**
- ❌ Unreliable (public proxies get rate-limited)
- ❌ Security concerns (third-party seeing all traffic)
- ❌ Performance issues
- ❌ Not suitable for production apps

**Not Used by Professional Apps**: Professional IPTV applications do NOT rely on public CORS proxies due to reliability and security concerns.

#### **Solution 3: Direct Server-Side Rendering (SSR)**

Pre-render and send playlist data with the initial HTML:

```
Server generates HTML with M3U data embedded
→ Browser receives pre-parsed playlist
→ No CORS issues
```

**Advantages:**
- ✅ No CORS issues
- ✅ Fast initial load
- ✅ SEO friendly

**Disadvantages:**
- ❌ Limited dynamic updates
- ❌ Not suitable for live playlists
- ❌ Doesn't scale with multiple users

---

## 2. Handling CORS-Free Mobile Platforms

### iOS/Android Native Capabilities

Native mobile apps have significant advantages over web apps:

**Direct HTTP Access:**
```swift
// iOS - Direct HTTP request without CORS
let url = URL(string: "https://iptv-server.com/playlist.m3u")
let session = URLSession.shared
let task = session.dataTask(with: url) { data, response, error in
  // Can access any URL directly
}
```

**Android - Same Freedom:**
```java
// Android - No CORS restrictions
HttpURLConnection connection = (HttpURLConnection) url.openConnection();
connection.setRequestProperty("User-Agent", "VLC/3.0.0");
InputStream input = connection.getInputStream();
```

### Mobile-Specific Optimizations

Professional IPTV apps implement platform-specific logic:

**1. Custom User-Agent Headers**
```
iOS:     Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)
Android: Mozilla/5.0 (Linux; Android 12; SM-G950F)
Web:     Mozilla/5.0 (Windows NT 10.0; Win64; x64) - Often blocked by IPTV servers
```

**2. Certificate/ATS Handling (iOS-specific)**
```xml
<!-- Info.plist -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
  <key>NSExceptionDomains</key>
  <dict>
    <!-- Allow non-HTTPS streaming servers -->
    <key>stream.example.com</key>
    <dict>
      <key>NSIncludesSubdomains</key>
      <true/>
      <key>NSTemporaryExceptionAllowsInsecureHTTPLoads</key>
      <true/>
    </dict>
  </dict>
</dict>
```

---

## 3. Unified Request Handling Strategy

### Architecture Pattern: Platform Abstraction Layer

Professional apps implement a **request abstraction layer** that handles platform differences:

```
┌─────────────────────────────────────────────┐
│         Application Logic (UI)              │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│   Platform Request Handler (Abstraction)    │
├─────────────────────────────────────────────┤
│  if (Platform == 'web') {                   │
│    return proxyRequest(url)                 │
│  } else if (Platform == 'ios/android') {    │
│    return nativeHttpRequest(url)            │
│  }                                          │
└─────────────────────────────────────────────┘
           ↓
   ┌──────────┴──────────┐
   ↓                     ↓
Backend Proxy    Native HTTP Stack
```

### Unified Service Implementation

```typescript
// Shared Service Layer (works on all platforms)
class PlaylistService {
  async fetchPlaylist(url: string, options: FetchOptions) {
    // Platform detection
    if (this.isPlatform('web')) {
      return this.fetchViaProxy(url, options);
    } else if (this.isPlatform('ios')) {
      return this.nativeIOSFetch(url, options);
    } else if (this.isPlatform('android')) {
      return this.nativeAndroidFetch(url, options);
    }
  }

  private async fetchViaProxy(url: string, options: FetchOptions) {
    // Server-side proxy call
    return fetch('/api/playlist', {
      method: 'POST',
      body: JSON.stringify({ url, ...options })
    });
  }
}
```

### Configuration Management

Different configurations per platform:

```typescript
const CONFIG = {
  web: {
    useProxy: true,
    proxyUrl: '/api/playlist',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  },
  ios: {
    useProxy: false,
    timeout: 45000,
    ats: {
      allowInsecure: true,
      requiresCertificateTransparency: false
    },
    headers: {
      'User-Agent': 'VLC/3.0.0'
    }
  },
  android: {
    useProxy: false,
    timeout: 45000,
    headers: {
      'User-Agent': 'VLC/3.0.0'
    }
  }
};
```

---

## 4. M3U Parsing Best Practices

### Universal Parser Implementation

Professional IPTV apps use **consistent M3U parsing across platforms**:

#### **Standard Format**
```m3u
#EXTM3U
#EXT-X-VERSION:3
#EXTINF:-1 tvg-id="channel.1" tvg-name="Channel Name" 
group-title="Category" tvg-logo="http://example.com/logo.png",Channel Name
http://stream-url.m3u8
```

#### **Parsing Algorithm**
```typescript
class M3UParser {
  parse(content: string): PlaylistItem[] {
    const lines = content.split('\n').map(line => line.trim());
    const items: PlaylistItem[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXTINF:')) {
        const metadata = this.parseExtinf(lines[i]);
        const url = lines[i + 1];
        
        items.push({
          name: metadata.title,
          url: url,
          logo: metadata.logo,
          group: metadata.group,
          duration: metadata.duration
        });
        
        i++; // Skip URL line
      }
    }
    
    return items;
  }

  private parseExtinf(line: string): ExtinfData {
    // Extract tvg-id, tvg-name, group-title, tvg-logo, etc.
    const patterns = {
      name: /,(.+)$/,
      logo: /tvg-logo="([^"]+)"/,
      group: /group-title="([^"]+)"/,
      id: /tvg-id="([^"]+)"/
    };
    
    return {
      title: this.extract(line, patterns.name),
      logo: this.extract(line, patterns.logo),
      group: this.extract(line, patterns.group),
      id: this.extract(line, patterns.id),
      duration: parseInt(line.split(':')[1])
    };
  }
}
```

#### **Robust Error Handling**
```typescript
// Handle malformed M3U files gracefully
try {
  const parsed = parser.parse(m3uContent);
  
  // Filter out invalid entries
  const valid = parsed.filter(item => {
    return item.url && 
           item.name && 
           this.isValidUrl(item.url);
  });
  
  return valid;
} catch (error) {
  logger.warn('M3U parsing error, attempting recovery:', error);
  // Fallback parsing or partial results
  return this.parsePartial(m3uContent);
}
```

### Cross-Platform Consistency

Key principles:
1. **Same parsing engine** used on all platforms
2. **Encoding normalization** (UTF-8)
3. **URL resolution** (relative to M3U location)
4. **Character encoding** (handle international channel names)
5. **Memory efficiency** (stream large playlists)

---

## 5. Video Playback Streaming Protocols

### HLS (HTTP Live Streaming) - Primary Method

**Why HLS is Universal:**
- ✅ Works on all platforms (iOS, Android, Web)
- ✅ Adaptive bitrate streaming
- ✅ Built on HTTP (no special networking)
- ✅ Supported by native players

**HLS Implementation:**
```typescript
// Web (Video.js with HLS.js)
const player = videojs('my-player', {
  controls: true,
  preload: 'auto',
  html5: {
    hls: { withCredentials: true }
  }
});

player.src({
  src: 'https://example.com/stream.m3u8',
  type: 'application/x-mpegURL'
});

// iOS (AVPlayer)
let asset = AVURLAsset(url: URL(string: streamUrl)!)
let playerItem = AVPlayerItem(asset: asset)
let player = AVPlayer(playerItem: playerItem)

// Android (ExoPlayer)
val player = SimpleExoPlayer.Builder(context).build()
val mediaItem = MediaItem.fromUri(streamUrl)
player.setMediaItem(mediaItem)
player.prepare()
```

### Master Playlist (Adaptive Streaming)

```m3u8
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=720x480
low/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000,RESOLUTION=1280x720
mid/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=7680000,RESOLUTION=1920x1080
high/index.m3u8
```

### Media Playlist Structure

```m3u8
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
segment0.ts
#EXTINF:10.0,
segment1.ts
#EXT-X-ENDLIST
```

---

## 6. Complete Architecture Example: OnviTV

### Recommended Architecture for Your App

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│                  (React Native / Web)                        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Request Handling Service                         │
│                                                               │
│  - Platform Detection                                         │
│  - Retry Logic (3 attempts with exponential backoff)         │
│  - Custom Headers (User-Agent selection)                     │
│  - Timeout Handling (30s web, 45s mobile)                    │
└─────────────────────────────────────────────────────────────┘
                    ↙              ↘
        WEB PLATFORM            MOBILE PLATFORMS
             ↓                      ↓
    ┌──────────────────┐    ┌──────────────────┐
    │  Backend Proxy   │    │  Native HTTP     │
    │                  │    │  (iOS/Android)   │
    │ - CORS handling  │    │                  │
    │ - URL rewriting  │    │ - No restrictions│
    │ - Caching        │    │ - Direct access  │
    └──────────────────┘    └──────────────────┘
            ↓                      ↓
    ┌──────────────────────────────────────┐
    │        IPTV Server                    │
    │  (M3U playlist URL)                   │
    └──────────────────────────────────────┘
```

### Implementation Steps for OnviTV

**1. Implement Platform Detection**
```typescript
enum Platform {
  WEB = 'web',
  IOS = 'ios',
  ANDROID = 'android'
}

class PlatformDetector {
  static getPlatform(): Platform {
    if (typeof window !== 'undefined') {
      if (window.navigator.userAgent.includes('iPhone')) return Platform.IOS;
      if (window.navigator.userAgent.includes('Android')) return Platform.ANDROID;
      return Platform.WEB;
    }
    return Platform.WEB;
  }
}
```

**2. Create Proxy Service (Backend)**
```typescript
// Express backend at /api/stream/*
app.post('/api/stream/fetch-playlist', async (req, res) => {
  const { url, headers } = req.body;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'VLC/3.0.0',
        ...headers
      },
      timeout: 45000
    });
    
    const content = await response.text();
    
    // CORS headers for web client
    res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**3. Create M3U Streaming Client**
```typescript
class StreamingService {
  async fetchPlaylist(url: string, retries = 3): Promise<string> {
    const platform = PlatformDetector.getPlatform();
    
    for (let i = 0; i < retries; i++) {
      try {
        if (platform === Platform.WEB) {
          // Use backend proxy
          return await this.fetchViaProxy(url);
        } else {
          // Use native HTTP (iOS/Android)
          return await this.nativeFetch(url);
        }
      } catch (error) {
        if (i === retries - 1) throw error;
        // Exponential backoff: 1s, 3s, 5s
        await this.delay((i + 1) * 2000 - 1000);
      }
    }
  }

  private async fetchViaProxy(url: string): Promise<string> {
    const response = await fetch('/api/stream/fetch-playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url,
        headers: { 'User-Agent': 'VLC/3.0.0' }
      })
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  }

  private async nativeFetch(url: string): Promise<string> {
    // Platform-specific native fetch
    if (Platform.IOS) {
      return await window.nativeIOS.fetch(url);
    } else {
      return await window.nativeAndroid.fetch(url);
    }
  }
}
```

---

## 7. Streaming Player Integration

### Web: Video.js with HLS.js

```typescript
import videojs from 'video.js';
import HttpStreamingPlugin from '@videojs/http-streaming';

const player = videojs('video-player', {
  controls: true,
  autoplay: true,
  preload: 'auto',
  fluid: true,
  plugins: {
    httpStreaming: {}
  }
});

// Load M3U8 stream
player.src({
  src: 'https://example.com/stream.m3u8',
  type: 'application/x-mpegURL'
});
```

### iOS/Android: Native Players

**iOS:**
```swift
import AVKit

let url = URL(string: streamUrl)!
let asset = AVURLAsset(url: url)
let playerItem = AVPlayerItem(asset: asset)
let player = AVPlayer(playerItem: playerItem)

let playerViewController = AVPlayerViewController()
playerViewController.player = player
present(playerViewController, animated: true)
```

**Android:**
```java
import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.source.hls.HlsMediaSource;

ExoPlayer player = new ExoPlayer.Builder(context).build();
MediaSource mediaSource = new HlsMediaSource.Factory(dataSourceFactory)
    .createMediaSource(MediaItem.fromUri(streamUrl));
player.setMediaSource(mediaSource);
player.prepare();
```

---

## 8. Best Practices Summary

### For Web Implementation
1. **Always use backend proxy** - Don't rely on public CORS proxies
2. **Implement retry logic** - 3 attempts with exponential backoff (1s, 3s, 5s)
3. **Custom headers** - Set proper User-Agent (VLC/3.0.0 instead of browser UA)
4. **Timeout handling** - 30-45 seconds for streaming servers
5. **Error recovery** - Graceful fallbacks for failed streams

### For Mobile Implementation
1. **Use native HTTP** - No CORS restrictions in native apps
2. **ATS configuration** - Allow non-HTTPS streams on iOS
3. **Certificate handling** - NSRequiresCertificateTransparency: false for ATS
4. **Memory management** - Stream parsing, not full load into memory
5. **Platform-specific optimizations** - Use native player APIs

### Universal (All Platforms)
1. **Consistent M3U parsing** - Same algorithm across platforms
2. **UTF-8 normalization** - Handle international characters
3. **URL validation** - Check playlist URL format
4. **Metadata extraction** - Extract logo, group, channel name
5. **Error logging** - Track failures for debugging

---

## 9. Real-World Implementation: IPTVnator

[IPTVnator](https://github.com/4gray/iptvnator) is an open-source cross-platform IPTV player that demonstrates these principles:

### Technology Stack
- **Web**: Angular + TypeScript + Electron
- **Players**: HLS.js for web, native players for mobile
- **Streaming**: HLS/M3U8 support
- **Parsing**: Custom M3U parser

### Key Features
- M3U and M3U8 playlist support
- Xtream Code and Stalker portal support
- Custom User-Agent configuration
- EPG (Electronic Program Guide) support
- Multi-platform (macOS, Windows, Linux)
- Open source (MIT license)

---

## 10. Security Considerations

### Recommendations

1. **Proxy Authentication**
   - Validate user identity before proxying requests
   - Rate limit per user/IP
   - Log all proxy requests

2. **HTTPS Only**
   - Always use HTTPS for backend communication
   - Enforce certificate validation
   - Consider certificate pinning

3. **Header Sanitization**
   - Remove sensitive headers before proxying
   - Don't forward Authorization headers to untrusted servers
   - Validate URL structure

4. **Data Privacy**
   - Don't log M3U content (contains private stream URLs)
   - Encrypt playlist URLs in transit
   - Consider GDPR/privacy implications

---

## Conclusion

Professional IPTV applications handle cross-platform challenges through:

1. **Backend Proxy** - Essential for web CORS handling
2. **Platform Detection** - Route requests appropriately
3. **Unified M3U Parser** - Consistent parsing logic
4. **HLS Streaming** - Universal video format
5. **Graceful Error Handling** - Retry logic and fallbacks
6. **Native Integration** - Leverage platform capabilities

For **OnviTV**, implementing a backend proxy service with proper platform detection and retry logic will enable full functionality across web, iOS, and Android platforms while maintaining security and reliability.
