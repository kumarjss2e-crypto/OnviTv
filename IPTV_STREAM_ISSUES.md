# IPTV Stream Playback Issues

## The Problem

You're seeing this error when trying to play movies from your imported M3U playlist:
```
ExoplaybackException: ERROR_CODE_IO_BAD_HTTP_STATUS
```

## What This Means

This error occurs because:

1. **Authentication Required**: Most IPTV providers require login credentials (username/password) to access streams
2. **Expired URLs**: Some M3U playlist URLs expire after a certain time
3. **Geo-Blocking**: Some streams are region-locked
4. **Server Issues**: The stream server may be offline or blocking requests

## Solutions

### Option 1: Use Xtream Codes API (Recommended)

Instead of importing M3U URLs, use Xtream Codes format which includes authentication:

1. Go to **Settings** → **Add Playlist**
2. Select **Xtream Codes**
3. Enter:
   - Server URL: `http://your-provider.com:port`
   - Username: `your_username`
   - Password: `your_password`

This method automatically handles authentication for all streams.

### Option 2: Test with Free IPTV Sources

Try these free, public IPTV sources that don't require authentication:

**Free M3U Playlists:**
- https://iptv-org.github.io/iptv/index.m3u
- https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8

**Note**: Free streams may have limited content and reliability.

### Option 3: Check Your Current Playlist

If you're using a paid IPTV service:

1. **Contact your provider** for:
   - Xtream Codes credentials (preferred)
   - Updated M3U URL (if they support it)
   
2. **Verify the playlist** is still active:
   - Some providers deactivate old URLs
   - You may need to regenerate your playlist URL

## What Works vs What Doesn't

### ✅ Works on Mobile APK:
- Live TV channels (most work)
- Streams with proper CORS headers
- Xtream Codes authenticated streams
- Public/free IPTV streams

### ❌ Doesn't Work:
- M3U URLs requiring authentication headers
- Expired playlist URLs
- Geo-blocked content (without VPN)
- Streams from providers that block mobile apps

## Testing Your Streams

1. **Try a live channel first** (like CBS News) - these usually work
2. **Test with different movies** - some may work, others may not
3. **Check if the stream works in VLC** on your computer:
   - If it doesn't work in VLC, it won't work in the app
   - If VLC asks for credentials, you need Xtream Codes

## Current App Status

✅ **Working Features:**
- App loads successfully
- 4000 movies imported
- Live channels play
- Video player with landscape mode
- Progress tracking
- Favorites

⚠️ **Known Issues:**
- M3U movie streams may require authentication
- Some streams may be expired/offline
- Need TMDb API key for metadata (posters, descriptions)

## Next Steps

1. **Install the latest APK** (just built with better error messages)
2. **Try different content** - test live channels and different movies
3. **Consider Xtream Codes** - if you have provider credentials
4. **Add TMDb API key** - for rich metadata (optional)

## Error Messages Explained

| Error | Meaning | Solution |
|-------|---------|----------|
| `BAD_HTTP_STATUS` | Authentication required or blocked | Use Xtream Codes or contact provider |
| `404` | Stream not found | URL expired, re-import playlist |
| `NETWORK_ERROR` | Connection failed | Check internet, try again |
| `TIMEOUT` | Server not responding | Stream offline, try different content |

---

**Remember**: The app is working correctly. The issue is with the stream URLs from your IPTV provider, not the app itself.
