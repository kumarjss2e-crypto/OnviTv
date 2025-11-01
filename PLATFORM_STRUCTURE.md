# OnviTV Platform Structure

## 📱 Application Architecture

### **Content Organization**

OnviTV has **TWO DISTINCT TYPES** of content:

#### 1️⃣ **General Content (Admin-Curated)**
- **Purpose**: High-quality, curated content for all users
- **Visibility**: Public - all users see the same content
- **Management**: Admin-only (via Admin Panel)
- **Location in App**: 
  - **Movies Tab** (first tab)
  - **Live TV Tab** (second tab)

#### 2️⃣ **Personal Content (User-Imported)**
- **Purpose**: User's personal IPTV subscriptions
- **Visibility**: Private - user-specific
- **Management**: User imports M3U/Xtream playlists
- **Location in App**:
  - **My Playlist Tab** (third tab)

---

## 🗂️ Database Collections

### **General Content Collections (Admin-Managed)**

| Collection | Purpose | Managed By | Visible To |
|------------|---------|------------|------------|
| `generalChannels` | Live TV channels for all users | Admin | All users |
| `generalMovies` | Movies for all users | Admin | All users |
| `generalSeries` | TV Series for all users | Admin | All users |

### **Personal Content Collections (User-Managed)**

| Collection | Purpose | Managed By | Visible To |
|------------|---------|------------|------------|
| `channels` | User's imported channels | User (via playlists) | Owner only |
| `movies` | User's imported movies | User (via playlists) | Owner only |
| `series` | User's imported series | User (via playlists) | Owner only |
| `playlists` | User's M3U/Xtream playlists | User | Owner only |

---

## 🎯 Navigation Structure

```
App Launch
│
├─ Splash Screen
│   └─ Check Auth
│       ├─ Not Logged In → Onboarding → Login/Signup
│       └─ Logged In → Main Tabs
│
└─ Main Tabs (Bottom Navigation)
    │
    ├─ 1. Movies Tab (Default/First)
    │   ├─ Shows: generalMovies, generalSeries
    │   ├─ Content: Admin-curated
    │   └─ Same for all users
    │
    ├─ 2. Live TV Tab
    │   ├─ Shows: generalChannels
    │   ├─ Content: Admin-curated
    │   └─ Same for all users
    │
    ├─ 3. My Playlist Tab
    │   ├─ Shows: User's channels, movies, series
    │   ├─ Content: From user's imported playlists
    │   ├─ Continue Watching
    │   ├─ Favorites
    │   └─ User-specific
    │
    └─ 4. More Tab
        ├─ Profile
        ├─ Settings
        ├─ Playlist Management
        └─ Logout
```

---

## 🔄 User Flow

### **New User Journey**
```
1. Download App
2. See Onboarding
3. Sign Up / Login
4. Land on Movies Tab (general content)
5. Browse Movies & Live TV (no setup needed)
6. Optional: Add personal playlists in "My Playlist" tab
```

### **Returning User Journey**
```
1. Open App
2. Auto-login
3. Land on Movies Tab
4. Browse general content OR go to My Playlist for personal content
```

---

## 👨‍💼 Admin Flow

### **Admin Responsibilities**
1. **Curate General Content**
   - Add channels to `generalChannels`
   - Add movies to `generalMovies`
   - Add series to `generalSeries`

2. **Content Management**
   - Set featured content
   - Organize categories
   - Manage content order
   - Remove inappropriate content

3. **User Management**
   - Monitor user activity
   - Handle reports
   - Manage subscriptions

### **Admin Access**
- Admin Panel (separate web application)
- Direct Firebase access
- Content upload tools

---

## 📊 Content Sources

### **General Content (Movies & Live TV)**
```
Admin Panel
    ↓
Upload/Import Content
    ↓
Store in Firebase
    ├─ generalChannels
    ├─ generalMovies
    └─ generalSeries
    ↓
Visible to ALL users
```

### **Personal Content (My Playlist)**
```
User Action
    ↓
Add M3U/Xtream Playlist
    ↓
Parse & Store in Firebase
    ├─ channels (with userId)
    ├─ movies (with userId)
    └─ series (with userId)
    ↓
Visible to OWNER only
```

---

## 🔐 Security & Permissions

### **General Collections**
- **Read**: All authenticated users
- **Write**: Admin only
- **Delete**: Admin only

### **Personal Collections**
- **Read**: Owner only
- **Write**: Owner only
- **Delete**: Owner only

### **Firestore Rules**
```javascript
// General content - read by all, write by admin
match /generalChannels/{id} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}

// Personal content - owner only
match /channels/{id} {
  allow read, write: if request.auth.uid == resource.data.userId;
}
```

---

## 🎬 Video Player Integration

### **Playback Sources**

| Tab | Content Type | Collection | Navigation |
|-----|--------------|------------|------------|
| Movies | General Movies | `generalMovies` | → VideoPlayer |
| Movies | General Series | `generalSeries` | → VideoPlayer |
| Live TV | General Channels | `generalChannels` | → VideoPlayer |
| My Playlist | User Channels | `channels` | → VideoPlayer |
| My Playlist | User Movies | `movies` | → VideoPlayer |
| My Playlist | User Series | `series` | → VideoPlayer |

---

## 📱 Screen Breakdown

### **1. Movies Screen**
- **Purpose**: Browse admin-curated movies & series
- **Data Source**: `generalMovies`, `generalSeries`
- **Features**:
  - Categories
  - Search
  - Featured content
  - Trending

### **2. Live TV Screen**
- **Purpose**: Browse admin-curated live channels
- **Data Source**: `generalChannels`
- **Features**:
  - Categories
  - Search
  - Grid/List view
  - EPG integration

### **3. My Playlist Screen**
- **Purpose**: User's personal content hub
- **Data Source**: User's `channels`, `movies`, `series`
- **Features**:
  - Continue Watching
  - Favorites
  - My Channels
  - My Movies
  - My Series
  - Playlist Management

### **4. More Screen**
- **Purpose**: Settings & account management
- **Features**:
  - Profile
  - Settings
  - Playlist Management
  - Help & Support
  - Logout

---

## ✅ Key Differences Summary

| Aspect | General Content | Personal Content |
|--------|----------------|------------------|
| **Tabs** | Movies, Live TV | My Playlist |
| **Collections** | `general*` | `channels`, `movies`, `series` |
| **Managed By** | Admin | User |
| **Visibility** | All users | Owner only |
| **Purpose** | Curated content | Personal subscriptions |
| **Setup Required** | No | Yes (import playlist) |
| **Content Quality** | High (curated) | Varies (user's choice) |

---

## 🚀 Implementation Status

### ✅ Completed
- [x] Navigation restructure
- [x] MyPlaylistScreen created
- [x] Tab reordering (Movies → Live TV → My Playlist → More)
- [x] Service functions for general content
- [x] LiveTVScreen updated to use `generalChannels`
- [x] Database structure documented
- [x] Security rules defined

### ⏳ Pending
- [ ] MoviesScreen update to use `generalMovies` & `generalSeries`
- [ ] Admin Panel for content management
- [ ] Content upload tools
- [ ] Initial general content population

---

## 📝 Notes for Developers

1. **Always check which collection to use**:
   - Movies/Live TV tabs → `general*` collections
   - My Playlist tab → user-specific collections

2. **No userId in general collections**:
   - `generalChannels`, `generalMovies`, `generalSeries` have NO `userId` field
   - They have `addedBy` (admin userId) instead

3. **Service functions**:
   - `getGeneralChannels()` - for Live TV
   - `getGeneralMovies()` - for Movies
   - `getUserChannels()` - for My Playlist

4. **Navigation**:
   - All tabs navigate to same `VideoPlayer` screen
   - Pass correct content type and data

---

**Last Updated**: November 1, 2025
**Version**: 1.0
