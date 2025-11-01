# OnviTV - User Flow

## 🎯 Navigation Structure

### Main Tabs (Bottom Navigation)
1. **Movies** (Default) - Browse admin-curated movies & series
2. **Live TV** - Watch admin-curated live channels
3. **My Playlist** - Access personal imported playlists
4. **More** - Settings, profile, playlist management

---

## 📱 COMPLETE USER JOURNEY

### 1. FIRST TIME USER FLOW

#### A. App Launch
```
Splash Screen (2s with animated logo)
  ↓
Onboarding (3 swipeable screens)
  - Welcome to OnviTV
  - Browse Movies & Live TV
  - Add Your Personal Playlists
  ↓
Get Started Button
  ↓
Login/Signup Screen
```

#### B. Authentication
```
Login Screen
  ├─ Email/Password login
  ├─ "Forgot Password?" → Password reset
  └─ "Sign up now" → Signup Screen

Signup Screen
  ├─ Full Name
  ├─ Email
  ├─ Password
  ├─ Confirm Password
  └─ Create Account
      ↓
  Success → Login
      ↓
  Navigate to Movies Tab
```

#### C. First Launch Experience
```
Movies Tab (Default landing)
  ↓
User sees admin-curated content immediately
  - Featured movies
  - Popular series
  - Categories
  ↓
No setup required - content ready to watch!
```

---

### 2. MOVIES TAB FLOW (Default Tab)

#### Screen Components

**A. Header**
- App logo
- Search icon → SearchScreen
- Profile icon → Profile

**B. Featured Section**
- Hero banner (admin-featured content)
- Play button → VideoPlayer
- More Info → MovieDetailScreen

**C. Categories**
- Action, Drama, Comedy, etc.
- Horizontal scrollable cards
- Tap card → MovieDetailScreen

**D. Popular Movies**
- Grid of movie posters
- Tap → MovieDetailScreen

**E. TV Series**
- Grid of series posters
- Tap → SeriesDetailScreen

#### User Actions
```
Movies Tab
  ├─ Browse content
  ├─ Tap movie → MovieDetailScreen
  │   ├─ View details
  │   ├─ Play → VideoPlayer
  │   └─ Add to Favorites
  ├─ Tap series → SeriesDetailScreen
  │   ├─ View details
  │   ├─ Select season/episode
  │   └─ Play → VideoPlayer
  └─ Search icon → SearchScreen
```

#### Data Source
- **Collection**: `generalMovies`, `generalSeries`
- **Managed by**: Admin
- **Visible to**: All users (same content)

---

### 3. LIVE TV TAB FLOW

#### Screen Components

**A. Header**
- "Live TV" title
- Search icon
- Grid/List toggle

**B. Search Bar**
- Real-time search
- Filter channels

**C. Category Tabs**
- All, Sports, News, Entertainment, etc.
- Horizontal scrollable
- Dynamic from admin categories

**D. Channel Grid/List**
- Channel logo
- Channel name
- Current program (if EPG available)
- Tap → VideoPlayer

#### User Actions
```
Live TV Tab
  ├─ Browse channels by category
  ├─ Search channels
  ├─ Toggle grid/list view
  ├─ Tap channel → VideoPlayer
  │   ├─ Watch live stream
  │   ├─ Show controls (play/pause, seek)
  │   └─ Back button → Return to Live TV
  └─ Add to Favorites (optional)
```

#### Data Source
- **Collection**: `generalChannels`
- **Managed by**: Admin
- **Visible to**: All users (same channels)

---

### 4. MY PLAYLIST TAB FLOW

#### Screen Components

**A. Header**
- "My Playlist" title
- Add Playlist button (+)
- Settings icon → PlaylistManagement

**B. Continue Watching**
- Horizontal scroll
- Resume from last position
- Progress bar on thumbnails

**C. My Favorites**
- User's favorited content
- From both general and personal content

**D. My Channels**
- Channels from user's imported playlists
- "See All" → Full list

**E. My Movies**
- Movies from user's imported playlists
- "See All" → Full list

**F. My Series**
- Series from user's imported playlists
- "See All" → Full list

**G. My Playlists**
- List of user's M3U/Xtream playlists
- Tap → EditPlaylist

**H. Empty State** (if no playlists)
- Icon and message
- "Add Playlist" button

#### User Actions
```
My Playlist Tab
  ├─ View personal content
  ├─ Continue watching → Resume playback
  ├─ Browse my channels/movies/series
  ├─ Add Playlist button → AddPlaylistScreen
  │   ├─ Choose type (M3U or Xtream)
  │   ├─ Enter details
  │   ├─ Test connection
  │   └─ Save → Parse playlist
  ├─ Manage playlists → PlaylistManagement
  │   ├─ View all playlists
  │   ├─ Edit playlist
  │   ├─ Delete playlist
  │   └─ Refresh playlist
  └─ Play content → VideoPlayer
```

#### Data Source
- **Collections**: `channels`, `movies`, `series`, `playlists`
- **Managed by**: User (import playlists)
- **Visible to**: Owner only (private)

---

### 5. MORE TAB FLOW

#### Screen Components

**A. Profile Section**
- User avatar
- Name and email
- Edit profile button

**B. Menu Items**
- My Playlists → PlaylistManagement
- Favorites → FavoritesScreen (optional)
- Downloads → DownloadsScreen (optional)
- Watch History → HistoryScreen (optional)
- Settings → SettingsScreen
- Help & Support
- About
- Logout

#### User Actions
```
More Tab
  ├─ View profile
  ├─ My Playlists → Manage playlists
  ├─ Favorites → View favorites
  ├─ Settings → Configure app
  │   ├─ Video quality
  │   ├─ Notifications
  │   ├─ Language
  │   └─ Clear cache
  ├─ Help & Support → FAQ, Contact
  └─ Logout → Return to Login
```

---

### 6. VIDEO PLAYER FLOW

#### Player Features

**A. Controls** (auto-hide after 3s)
- Back button (always visible)
- Play/Pause button
- Rewind 10s button
- Forward 10s button
- Seek bar (for VOD)
- Time display
- Live indicator (for channels)

**B. Error Handling**
- Auto-retry on failure (up to 5 attempts)
- Error overlay with retry button
- YouTube-style error display

**C. Progress Tracking**
- Save progress every 30s
- Resume from last position
- Mark completed at 90%

#### User Actions
```
VideoPlayer
  ├─ Watch content
  ├─ Tap screen → Show/hide controls
  ├─ Play/Pause
  ├─ Rewind/Forward 10s
  ├─ Seek (VOD only)
  ├─ Back button → Return to previous screen
  └─ On error → Auto-retry or manual retry
```

---

### 7. SEARCH FLOW (Future)

```
Search Icon (any tab)
  ↓
SearchScreen
  ├─ Search bar
  ├─ Recent searches
  ├─ Search in:
  │   ├─ General Movies
  │   ├─ General Series
  │   ├─ General Channels
  │   ├─ My Movies
  │   ├─ My Series
  │   └─ My Channels
  ├─ Results by category
  └─ Tap result → Detail screen or VideoPlayer
```

---

## 🔄 RETURNING USER FLOW

```
App Launch
  ↓
Auto-login (if session valid)
  ↓
Movies Tab (Default)
  ├─ Browse general content
  ├─ OR switch to Live TV
  ├─ OR switch to My Playlist
  └─ Continue watching from last position
```

---

## 📊 CONTENT SOURCES SUMMARY

| Tab | Content Type | Collection | Managed By | Visibility |
|-----|--------------|------------|------------|------------|
| Movies | General | `generalMovies`, `generalSeries` | Admin | All users |
| Live TV | General | `generalChannels` | Admin | All users |
| My Playlist | Personal | `channels`, `movies`, `series` | User | Owner only |

---

## 🎯 KEY USER FLOWS

### Flow 1: Watch General Content (No Setup)
```
Login → Movies Tab → Browse → Play → Watch
```

### Flow 2: Add Personal Playlist
```
Login → My Playlist Tab → Add Playlist → Enter M3U URL → Save → Parse → Watch
```

### Flow 3: Continue Watching
```
Login → My Playlist Tab → Continue Watching → Resume → Watch
```

### Flow 4: Search and Watch
```
Any Tab → Search Icon → Type query → Select result → Play → Watch
```

---

## ✨ USER EXPERIENCE HIGHLIGHTS

1. **Instant Access**: Users can watch general content immediately without setup
2. **Dual Content**: Both curated (general) and personal (imported) content
3. **Seamless Playback**: Auto-retry, progress tracking, resume functionality
4. **Intuitive Navigation**: Clear separation between general and personal content
5. **Flexible**: Users can choose to only use general content or add their own playlists

---

**Last Updated**: November 1, 2025
**Version**: 2.0 (Reflects new platform structure)
