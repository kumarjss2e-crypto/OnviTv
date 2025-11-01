# Onvi Player - Firebase Database Structure

## Project Information
- **Project ID**: onvi-iptv-player
- **Storage Bucket**: onvi-iptv-player.firebasestorage.app
- **Database Type**: Firestore (NoSQL)
- **Package Name**: com.onvitv.com

---

## 📱 Platform Content Structure

### **Two Types of Content:**

#### 1. **General Content (Admin-Curated)**
- **Location**: Movies & Live TV tabs
- **Visibility**: All users see the same content
- **Management**: Only admins can add/edit/remove
- **Collections**: `generalChannels`, `generalMovies`, `generalSeries`
- **Purpose**: Curated, high-quality content for all users

#### 2. **Personal Content (User-Imported)**
- **Location**: My Playlist tab
- **Visibility**: User-specific, private
- **Management**: Users import their own M3U/Xtream playlists
- **Collections**: `channels`, `movies`, `series` (with userId)
- **Purpose**: User's personal IPTV subscriptions

### **Navigation Flow:**
```
Login → Movies Tab (General Content)
├── Movies Tab → generalMovies, generalSeries
├── Live TV Tab → generalChannels
└── My Playlist Tab → User's channels, movies, series (from playlists)
```

---

## 🗂️ Collections Structure

### 1. **users** Collection
Stores user account information and preferences.

```
users/{userId}
├── email: string
├── displayName: string
├── photoURL: string (optional)
├── role: string ("user" | "admin" | "moderator")
├── isActive: boolean (admin can suspend users)
├── isBanned: boolean
├── createdAt: timestamp
├── lastLogin: timestamp
├── subscription: object
│   ├── plan: string ("free" | "premium" | "vip")
│   ├── startDate: timestamp
│   ├── endDate: timestamp
│   ├── status: string ("active" | "expired" | "cancelled" | "suspended")
│   ├── autoRenew: boolean
│   └── paymentMethod: string
├── preferences: object
│   ├── theme: string ("dark" | "light")
│   ├── language: string
│   ├── autoPlay: boolean
│   ├── videoQuality: string ("auto" | "720p" | "1080p" | "4k")
│   ├── subtitlesEnabled: boolean
│   ├── subtitlesLanguage: string
│   └── parentalControlPin: string (optional)
├── deviceTokens: array<string> (for push notifications)
├── deviceInfo: object
│   ├── deviceId: string
│   ├── deviceModel: string
│   ├── osVersion: string
│   └── appVersion: string
└── stats: object
    ├── totalWatchTime: number (minutes)
    ├── totalPlaylists: number
    ├── totalFavorites: number
    └── lastActiveDate: timestamp
```

---

### 2. **playlists** Collection
Stores user's IPTV playlists (M3U/Xtream Codes).

```
playlists/{playlistId}
├── userId: string (reference to users collection)
├── name: string
├── type: string ("m3u" | "xtream")
├── createdAt: timestamp
├── updatedAt: timestamp
├── isActive: boolean
├── order: number (for sorting)
│
├── m3uConfig: object (if type === "m3u")
│   ├── url: string
│   └── lastFetched: timestamp
│
├── xtreamConfig: object (if type === "xtream")
│   ├── serverUrl: string
│   ├── username: string
│   ├── password: string (encrypted)
│   ├── lastFetched: timestamp
│   └── serverInfo: object
│       ├── serverProtocol: string
│       ├── serverPort: string
│       ├── timezone: string
│       └── timestampNow: number
│
└── stats: object
    ├── totalChannels: number
    ├── totalMovies: number
    ├── totalSeries: number
    └── totalCategories: number
```

---

### 3. **channels** Collection
Stores parsed live TV channels from USER'S IMPORTED playlists (My Playlist page).

```
channels/{channelId}
├── playlistId: string (reference to playlists)
├── userId: string (reference to users)
├── streamId: string (from provider)
├── name: string
├── logo: string (URL)
├── streamUrl: string
├── streamType: string ("live" | "hls" | "dash")
├── categoryId: string
├── categoryName: string
├── epgChannelId: string (for EPG matching)
├── tvgId: string
├── tvgName: string
├── groupTitle: string
├── isAdult: boolean
├── addedAt: timestamp
└── metadata: object
    ├── country: string
    ├── language: string
    ├── resolution: string
    └── codec: string
```

---

### 3b. **generalChannels** Collection
Stores ADMIN-CURATED live TV channels (Live TV page - visible to all users).

```
generalChannels/{channelId}
├── streamId: string
├── name: string
├── logo: string (URL)
├── streamUrl: string
├── streamType: string ("live" | "hls" | "dash")
├── categoryId: string
├── categoryName: string
├── epgChannelId: string (for EPG matching)
├── tvgId: string
├── tvgName: string
├── groupTitle: string
├── isAdult: boolean
├── isFeatured: boolean
├── order: number (for sorting)
├── addedAt: timestamp
├── addedBy: string (admin userId)
└── metadata: object
    ├── country: string
    ├── language: string
    ├── resolution: string
    ├── codec: string
    └── description: string
```

---

### 4. **categories** Collection
Stores channel/VOD categories.

```
categories/{categoryId}
├── playlistId: string
├── userId: string
├── name: string
├── type: string ("live" | "movie" | "series")
├── order: number
├── icon: string (optional)
└── itemCount: number
```

---

### 5. **movies** Collection
Stores VOD movies from USER'S IMPORTED playlists (My Playlist page).

```
movies/{movieId}
├── playlistId: string
├── userId: string
├── streamId: string
├── name: string
├── title: string
├── plot: string (description)
├── poster: string (URL)
├── backdrop: string (URL)
├── streamUrl: string
├── containerExtension: string ("mp4" | "mkv" | "avi")
├── categoryId: string
├── categoryName: string
├── addedAt: timestamp
├── releaseDate: string
├── rating: number (0-10)
├── duration: number (seconds)
├── genre: array<string>
├── director: string
├── cast: array<string>
├── tmdbId: string (optional, for metadata)
├── imdbId: string (optional)
└── subtitles: array<object>
    ├── language: string
    └── url: string
```

---

### 5b. **generalMovies** Collection
Stores ADMIN-CURATED movies (Movies page - visible to all users).

```
generalMovies/{movieId}
├── streamId: string
├── name: string
├── title: string
├── plot: string (description)
├── poster: string (URL)
├── backdrop: string (URL)
├── streamUrl: string
├── containerExtension: string ("mp4" | "mkv" | "avi")
├── categoryId: string
├── categoryName: string
├── addedAt: timestamp
├── addedBy: string (admin userId)
├── releaseDate: string
├── rating: number (0-10)
├── duration: number (seconds)
├── genre: array<string>
├── director: string
├── cast: array<string>
├── tmdbId: string (optional, for metadata)
├── imdbId: string (optional)
├── isFeatured: boolean
├── order: number (for sorting)
├── viewCount: number
└── subtitles: array<object>
    ├── language: string
    └── url: string
```

---

### 6. **series** Collection
Stores TV series from USER'S IMPORTED playlists (My Playlist page).

```
series/{seriesId}
├── playlistId: string
├── userId: string
├── seriesId: string (from provider)
├── name: string
├── title: string
├── plot: string
├── poster: string
├── backdrop: string
├── categoryId: string
├── categoryName: string
├── addedAt: timestamp
├── releaseDate: string
├── rating: number
├── genre: array<string>
├── cast: array<string>
├── totalSeasons: number
├── totalEpisodes: number
└── tmdbId: string (optional)
```

---

### 6b. **generalSeries** Collection
Stores ADMIN-CURATED TV series (Movies page - visible to all users).

```
generalSeries/{seriesId}
├── seriesId: string
├── name: string
├── title: string
├── plot: string
├── poster: string
├── backdrop: string
├── categoryId: string
├── categoryName: string
├── addedAt: timestamp
├── addedBy: string (admin userId)
├── releaseDate: string
├── rating: number
├── genre: array<string>
├── cast: array<string>
├── totalSeasons: number
├── totalEpisodes: number
├── tmdbId: string (optional)
├── isFeatured: boolean
├── order: number (for sorting)
└── viewCount: number
```

---

### 7. **episodes** Collection
Stores individual episodes of series.

```
episodes/{episodeId}
├── seriesId: string (reference to series)
├── playlistId: string
├── userId: string
├── episodeNum: number
├── seasonNum: number
├── title: string
├── plot: string
├── streamUrl: string
├── containerExtension: string
├── duration: number (seconds)
├── releaseDate: string
├── thumbnail: string
└── subtitles: array<object>
```

---

### 8. **favorites** Collection
Stores user's favorite content.

```
favorites/{favoriteId}
├── userId: string
├── contentType: string ("channel" | "movie" | "series")
├── contentId: string (reference to channels/movies/series)
├── playlistId: string
├── addedAt: timestamp
└── metadata: object (cached content info)
    ├── name: string
    ├── poster: string
    └── streamUrl: string
```

---

### 9. **watchHistory** Collection
Tracks user's viewing history and progress.

```
watchHistory/{historyId}
├── userId: string
├── contentType: string ("channel" | "movie" | "episode")
├── contentId: string
├── playlistId: string
├── watchedAt: timestamp
├── duration: number (total duration in seconds)
├── progress: number (watched duration in seconds)
├── completed: boolean
└── metadata: object
    ├── name: string
    ├── poster: string
    └── streamUrl: string
```

---

### 10. **epg** Collection
Stores Electronic Program Guide data.

```
epg/{epgId}
├── channelId: string (reference to channels)
├── epgChannelId: string
├── programTitle: string
├── description: string
├── startTime: timestamp
├── endTime: timestamp
├── duration: number (seconds)
├── category: string
├── icon: string (optional)
├── rating: string (optional)
└── isCatchupAvailable: boolean
```

---

### 11. **downloads** Collection
Tracks downloaded content for offline viewing.

```
downloads/{downloadId}
├── userId: string
├── contentType: string ("movie" | "episode")
├── contentId: string
├── playlistId: string
├── downloadedAt: timestamp
├── expiresAt: timestamp (optional, for DRM)
├── fileSize: number (bytes)
├── localPath: string (device storage path)
├── status: string ("downloading" | "completed" | "failed" | "paused")
├── progress: number (0-100)
└── metadata: object
    ├── name: string
    ├── poster: string
    └── duration: number
```

---

### 12. **parentalControls** Collection
Stores parental control settings.

```
parentalControls/{userId}
├── enabled: boolean
├── pin: string (encrypted)
├── ageRestriction: number (0-18)
├── blockedCategories: array<string>
├── blockedChannels: array<string>
├── allowedTimeStart: string ("HH:MM")
├── allowedTimeEnd: string ("HH:MM")
└── restrictAdultContent: boolean
```

---

### 13. **catchup** Collection
Stores catch-up TV recordings/links.

```
catchup/{catchupId}
├── userId: string
├── channelId: string
├── epgId: string
├── programTitle: string
├── startTime: timestamp
├── endTime: timestamp
├── streamUrl: string
├── duration: number
├── expiresAt: timestamp
└── thumbnail: string
```

---

### 14. **appSettings** Collection
Global app settings and configurations.

```
appSettings/config
├── minAppVersion: string
├── forceUpdate: boolean
├── maintenanceMode: boolean
├── maintenanceMessage: string
├── supportedVideoFormats: array<string>
├── maxPlaylistsPerUser: number
├── maxDownloadsPerUser: number
├── epgUpdateInterval: number (hours)
└── features: object
    ├── catchupEnabled: boolean
    ├── downloadEnabled: boolean
    ├── parentalControlEnabled: boolean
    └── multiScreenEnabled: boolean
```

---

## 🔐 Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Playlists - user can only access their own
    match /playlists/{playlistId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // User Channels - user can only access their own
    match /channels/{channelId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // General Channels - read-only for all authenticated users
    match /generalChannels/{channelId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // User Movies - user can only access their own
    match /movies/{movieId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // General Movies - read-only for all authenticated users
    match /generalMovies/{movieId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // User Series & Episodes - user can only access their own
    match /series/{seriesId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // General Series - read-only for all authenticated users
    match /generalSeries/{seriesId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /episodes/{episodeId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Favorites - user can only access their own
    match /favorites/{favoriteId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Watch History - user can only access their own
    match /watchHistory/{historyId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // EPG - read-only for authenticated users
    match /epg/{epgId} {
      allow read: if request.auth != null;
    }
    
    // Downloads - user can only access their own
    match /downloads/{downloadId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // Parental Controls - user can only access their own
    match /parentalControls/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
    }
    
    // Catchup - user can only access their own
    match /catchup/{catchupId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    // App Settings - read-only for all authenticated users
    match /appSettings/{document=**} {
      allow read: if request.auth != null;
    }
  }
}
```

---

## 📊 Indexes (Firestore)

### Required Composite Indexes:

1. **channels** collection:
   - userId (Ascending) + playlistId (Ascending) + categoryName (Ascending)
   - userId (Ascending) + isAdult (Ascending)

2. **movies** collection:
   - userId (Ascending) + playlistId (Ascending) + categoryId (Ascending)
   - userId (Ascending) + rating (Descending)

3. **episodes** collection:
   - seriesId (Ascending) + seasonNum (Ascending) + episodeNum (Ascending)

4. **watchHistory** collection:
   - userId (Ascending) + watchedAt (Descending)
   - userId (Ascending) + completed (Ascending) + watchedAt (Descending)

5. **epg** collection:
   - channelId (Ascending) + startTime (Ascending)
   - epgChannelId (Ascending) + startTime (Ascending) + endTime (Ascending)

6. **favorites** collection:
   - userId (Ascending) + contentType (Ascending) + addedAt (Descending)

---

## 🗄️ Storage Structure (Firebase Storage)

```
storage/
├── users/
│   └── {userId}/
│       ├── profile/
│       │   └── avatar.jpg
│       └── downloads/
│           ├── movies/
│           │   └── {movieId}.mp4
│           └── episodes/
│               └── {episodeId}.mp4
│
├── playlists/
│   └── {playlistId}/
│       ├── logos/
│       │   └── {channelId}.png
│       └── cache/
│           └── playlist.m3u8
│
└── epg/
    └── {date}/
        └── epg_data.xml
```

---

## 🔄 Data Flow

### 1. **Adding a Playlist**
```
User Input → Validate → Parse M3U/Xtream → Store in playlists collection
→ Extract channels/movies/series → Store in respective collections
→ Update categories → Link to user
```

### 2. **Playing Content**
```
User selects content → Check parental controls → Fetch stream URL
→ Update watchHistory → Start player → Track progress
→ Update progress every 30 seconds
```

### 3. **EPG Updates**
```
Background job (every 6 hours) → Fetch EPG data from provider
→ Parse XML/JSON → Store in epg collection → Clean old data (>7 days)
```

### 4. **Favorites**
```
User adds to favorites → Create favorites document
→ Cache metadata → Update UI → Sync across devices
```

---

## 📱 Offline Support Strategy

1. **Local Storage (AsyncStorage)**:
   - User preferences
   - Last viewed content
   - Playlist metadata (lightweight)

2. **SQLite (for complex queries)**:
   - Channel lists
   - EPG data (7 days)
   - Watch history

3. **File System**:
   - Downloaded videos
   - Cached images/logos

---

## 🔐 Encryption

1. **Xtream Codes Passwords**: Encrypted using AES-256
2. **Parental Control PIN**: Hashed using bcrypt
3. **DRM Keys**: Stored securely using device keychain

---

## 📈 Analytics Events to Track

1. **User Events**:
   - user_signup
   - user_login
   - playlist_added
   - playlist_removed

2. **Content Events**:
   - channel_played
   - movie_played
   - series_played
   - content_favorited
   - content_downloaded

3. **Engagement**:
   - watch_time
   - content_completed
   - search_performed
   - category_browsed

---

## ✅ Database Structure Complete!

This structure supports:
- ✅ Multiple playlists per user
- ✅ M3U/M3U8 and Xtream Codes
- ✅ Live TV, VOD, Series
- ✅ EPG integration
- ✅ Catch-up TV
- ✅ Favorites
- ✅ Watch history & progress
- ✅ Downloads
- ✅ Parental controls
- ✅ Multi-device sync
- ✅ DRM support preparation

**Next Step**: Install Firebase SDK and create database service files.
