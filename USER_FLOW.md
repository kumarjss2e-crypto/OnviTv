# Onvi Player - Complete User Flow

## 🎯 Bottom Navigation Structure

### **Main Tabs:**
1. 🏠 **Home** - Featured content, continue watching, recommendations
2. 📺 **Live TV** - All channels with EPG and categories
3. 🎬 **Movies** - VOD movies and series library
4. 📱 **More** - Profile, playlists, downloads, favorites, settings

---

## 📱 COMPLETE USER JOURNEY

### **1. FIRST TIME USER FLOW**

#### **A. App Launch**
```
Splash Screen (2s)
  ↓
Onboarding (3 screens)
  - Welcome to Onvi Player
  - Add Your IPTV Playlists
  - Watch Anywhere, Anytime
  ↓
Get Started Button
  ↓
Login/Signup Screen
```

#### **B. Authentication**
```
Login Screen
  ├─ Login with Email/Password
  ├─ "Forgot Password?" → Reset Password Flow
  └─ "Sign up now" → Signup Screen

Signup Screen
  ├─ Full Name
  ├─ Email
  ├─ Password
  ├─ Confirm Password
  └─ Create Account Button
      ↓
  Success Toast → Navigate to Login
      ↓
  Login → Navigate to Main App
```

#### **C. First Launch (No Playlists)**
```
Home Screen (Empty State)
  ↓
Shows: "No playlists added yet"
  ↓
"Add Your First Playlist" Button
  ↓
Playlist Management Screen
```

---

### **2. HOME TAB FLOW** 🏠

#### **Home Screen Components:**

**A. Header**
- Logo
- Search icon → Search Screen
- Profile icon → Profile Screen

**B. Featured Section**
- Large hero banner (from admin's featured content)
- Play button → Video Player
- More Info button → Detail Screen

**C. Continue Watching**
- Horizontal scroll of incomplete content
- Shows progress bar
- Tap → Resume playback

**D. Recommended for You**
- Based on watch history
- Horizontal scroll

**E. Trending Now**
- Popular content across platform
- From analytics data

**F. New Releases**
- Recently added content
- From global playlists

**G. Categories**
- Quick access to genre categories
- Sports, Movies, News, Entertainment, etc.

#### **User Actions:**
```
Home Screen
  ├─ Tap Featured Content → Video Player
  ├─ Tap Continue Watching → Resume Video Player
  ├─ Tap Search → Search Screen
  ├─ Tap Category → Category View
  ├─ Long Press Content → Quick Actions Menu
  │   ├─ Add to Favorites
  │   ├─ Download
  │   └─ Share
  └─ Pull to Refresh → Reload content
```

---

### **3. LIVE TV TAB FLOW** 📺

#### **Live TV Screen Components:**

**A. Header**
- "Live TV" title
- Filter icon → Category Filter
- Search icon → Channel Search
- Grid/List toggle

**B. Category Tabs**
- All Channels
- Sports
- News
- Entertainment
- Movies
- Kids
- (Dynamic from playlists)

**C. Channel List**
```
Each Channel Card Shows:
  ├─ Channel logo
  ├─ Channel name
  ├─ Current program (from EPG)
  ├─ Progress bar (current show)
  ├─ Next program
  └─ Favorite star icon
```

**D. EPG (Electronic Program Guide)**
- Grid view of all channels
- Time-based navigation
- Current/upcoming shows

#### **User Actions:**
```
Live TV Screen
  ├─ Tap Channel → Video Player
  ├─ Tap EPG Icon → EPG Grid View
  ├─ Tap Favorite Icon → Add/Remove Favorite
  ├─ Long Press Channel → Quick Menu
  │   ├─ Add to Favorites
  │   ├─ Set Reminder
  │   ├─ Record (if catch-up enabled)
  │   └─ Channel Info
  ├─ Filter by Category → Show filtered channels
  └─ Search → Find specific channel
```

#### **EPG Flow:**
```
EPG Screen
  ├─ Horizontal: Time slots (30min intervals)
  ├─ Vertical: Channels
  ├─ Tap Program → Program Details
  │   ├─ Title, description, duration
  │   ├─ Watch Now (if live)
  │   ├─ Watch from Start (catch-up)
  │   ├─ Set Reminder
  │   └─ Record
  └─ Swipe left/right → Navigate time
```

---

### **4. MOVIES TAB FLOW** 🎬

#### **Movies Screen Components:**

**A. Top Tabs**
- Movies
- Series
- Downloads (offline content)

**B. Movies Section**
```
Header
  ├─ Search icon
  ├─ Filter icon (Genre, Year, Rating)
  └─ Sort icon (Popular, Recent, A-Z)

Categories:
  ├─ Action
  ├─ Comedy
  ├─ Drama
  ├─ Horror
  ├─ Sci-Fi
  ├─ Romance
  └─ (Dynamic from playlists)

Movie Grid/List:
  ├─ Poster
  ├─ Title
  ├─ Year
  ├─ Rating (IMDb/TMDB)
  ├─ Duration
  └─ Progress bar (if started)
```

**C. Series Section**
```
Series Grid:
  ├─ Poster
  ├─ Title
  ├─ Seasons count
  ├─ Episodes count
  ├─ Rating
  └─ "Continue S1E3" (if watching)
```

#### **Movie Detail Flow:**
```
Tap Movie → Movie Detail Screen
  ├─ Backdrop image
  ├─ Play button
  ├─ Download button
  ├─ Add to Favorites
  ├─ Share
  ├─ Title, year, rating, duration
  ├─ Genre tags
  ├─ Description
  ├─ Cast & Crew
  ├─ Trailer (if available)
  ├─ Similar Movies
  └─ User Reviews (optional)

Actions:
  ├─ Play → Video Player
  ├─ Download → Download Manager
  ├─ Favorite → Add to favorites list
  └─ Share → Share dialog
```

#### **Series Detail Flow:**
```
Tap Series → Series Detail Screen
  ├─ Backdrop image
  ├─ Play Next Episode button
  ├─ Download Season
  ├─ Add to Favorites
  ├─ Title, year, rating
  ├─ Description
  ├─ Seasons dropdown
  │   └─ Episodes list
  │       ├─ Episode number & title
  │       ├─ Duration
  │       ├─ Description
  │       ├─ Thumbnail
  │       ├─ Progress bar
  │       └─ Download icon
  ├─ Cast & Crew
  └─ Similar Series

Actions:
  ├─ Play Episode → Video Player
  ├─ Download Episode → Download Manager
  ├─ Download Season → Batch download
  └─ Mark as Watched
```

---

### **5. MORE TAB FLOW** 📱

#### **More Screen Menu:**

```
More Screen
  ├─ Profile Section
  │   ├─ Avatar
  │   ├─ Name
  │   ├─ Email
  │   └─ Subscription badge (Free/Premium/VIP)
  │
  ├─ My Playlists
  │   └─ Manage IPTV sources
  │
  ├─ Favorites
  │   ├─ Channels
  │   ├─ Movies
  │   └─ Series
  │
  ├─ Downloads
  │   ├─ Downloaded content
  │   ├─ Storage usage
  │   └─ Manage downloads
  │
  ├─ Watch History
  │   └─ View all watched content
  │
  ├─ Subscription
  │   ├─ Current plan
  │   ├─ Upgrade/Downgrade
  │   └─ Payment history
  │
  ├─ Settings
  │   ├─ Account settings
  │   ├─ Video quality
  │   ├─ Parental controls
  │   ├─ Notifications
  │   ├─ Language
  │   └─ Theme
  │
  ├─ Help & Support
  │   ├─ FAQ
  │   ├─ Contact us
  │   └─ Report issue
  │
  ├─ About
  │   ├─ Version
  │   ├─ Terms of Service
  │   └─ Privacy Policy
  │
  └─ Logout
```

---

### **6. PLAYLIST MANAGEMENT FLOW**

```
More → My Playlists
  ↓
Playlist Management Screen
  ├─ List of added playlists
  │   ├─ Playlist name
  │   ├─ Type (M3U/Xtream)
  │   ├─ Channels count
  │   ├─ Active toggle
  │   └─ Edit/Delete icons
  │
  └─ "Add Playlist" Button
      ↓
  Add Playlist Screen
      ├─ Choose Type:
      │   ├─ M3U/M3U8 URL
      │   └─ Xtream Codes API
      │
      ├─ M3U Flow:
      │   ├─ Playlist Name
      │   ├─ M3U URL
      │   └─ Save Button
      │       ↓
      │   Parse playlist → Save to Firestore
      │       ↓
      │   Success toast → Back to list
      │
      └─ Xtream Flow:
          ├─ Playlist Name
          ├─ Server URL
          ├─ Username
          ├─ Password
          └─ Save Button
              ↓
          Test connection → Fetch content
              ↓
          Save to Firestore
              ↓
          Success toast → Back to list
```

---

### **7. VIDEO PLAYER FLOW**

```
Video Player Screen
  ├─ Video controls
  │   ├─ Play/Pause
  │   ├─ Seek bar
  │   ├─ Volume
  │   ├─ Quality selector (Auto, 720p, 1080p, 4K)
  │   ├─ Subtitles toggle
  │   ├─ Audio track selector
  │   ├─ Fullscreen toggle
  │   └─ PiP (Picture-in-Picture)
  │
  ├─ Top controls
  │   ├─ Back button
  │   ├─ Title
  │   ├─ Favorite icon
  │   └─ More options (...)
  │       ├─ Download
  │       ├─ Share
  │       └─ Report issue
  │
  ├─ Bottom info (for Live TV)
  │   ├─ Current program
  │   ├─ Time remaining
  │   └─ Next program
  │
  └─ Gestures
      ├─ Tap → Show/hide controls
      ├─ Double tap left → Rewind 10s
      ├─ Double tap right → Forward 10s
      ├─ Swipe up/down → Brightness
      ├─ Swipe left/right → Volume

Player Features:
  ├─ Auto-save progress (every 30s)
  ├─ Resume from last position
  ├─ Auto-quality based on connection
  ├─ Chromecast support
  ├─ AirPlay support
  └─ Background audio (for radio channels)
```

---

### **8. SEARCH FLOW**

```
Search Screen
  ├─ Search bar (auto-focus)
  ├─ Recent searches
  ├─ Trending searches
  └─ Categories quick filter

User types query
  ↓
Real-time search results
  ├─ Channels
  ├─ Movies
  ├─ Series
  └─ "View All" for each category

Tap result → Detail screen or Play
```

---

### **9. FAVORITES FLOW**

```
More → Favorites
  ↓
Favorites Screen
  ├─ Top Tabs:
  │   ├─ Channels
  │   ├─ Movies
  │   └─ Series
  │
  ├─ Grid/List view
  ├─ Sort options
  └─ Remove from favorites

Actions:
  ├─ Tap item → Detail screen or Play
  ├─ Long press → Remove from favorites
  └─ Swipe to delete
```

---

### **10. DOWNLOADS FLOW**

```
More → Downloads
  ↓
Downloads Screen
  ├─ Storage usage bar
  ├─ "Manage Storage" button
  ├─ Downloaded content list
  │   ├─ Thumbnail
  │   ├─ Title
  │   ├─ File size
  │   ├─ Download date
  │   └─ Delete icon
  │
  └─ Active downloads
      ├─ Progress bar
      ├─ Pause/Resume
      └─ Cancel

Download Process:
  1. Tap download icon on content
  2. Select quality (if multiple)
  3. Download starts in background
  4. Notification shows progress
  5. Complete → Available offline
  6. Auto-delete after expiry (if DRM)
```

---

### **11. PARENTAL CONTROLS FLOW**

```
More → Settings → Parental Controls
  ↓
Parental Controls Screen
  ├─ Enable/Disable toggle
  ├─ Set PIN (4-6 digits)
  ├─ Age restriction (0-18)
  ├─ Block adult content
  ├─ Blocked categories
  ├─ Blocked channels
  ├─ Time restrictions
  │   ├─ Allowed start time
  │   └─ Allowed end time
  └─ Save

When restricted content accessed:
  ↓
PIN Entry Screen
  ├─ Enter PIN
  ├─ Correct → Allow access
  └─ Wrong → Deny access + toast
```

---

### **12. CATCH-UP TV FLOW**

```
Live TV → EPG → Past Program
  ↓
Program Details
  ├─ "Watch from Start" button
  ├─ Program info
  ├─ Available until: [date]
  └─ Download option

Tap "Watch from Start"
  ↓
Video Player (catch-up mode)
  ├─ Seek bar (full program)
  ├─ Normal playback controls
  └─ Save to watch history
```

---

### **13. SUBSCRIPTION FLOW**

```
More → Subscription
  ↓
Subscription Screen
  ├─ Current Plan card
  │   ├─ Plan name
  │   ├─ Features list
  │   ├─ Expiry date
  │   └─ Auto-renew status
  │
  ├─ Available Plans
  │   ├─ Free
  │   │   ├─ Features
  │   │   └─ Current plan badge
  │   ├─ Premium ($9.99/month)
  │   │   ├─ Features
  │   │   └─ Upgrade button
  │   └─ VIP ($19.99/month)
  │       ├─ Features
  │       └─ Upgrade button
  │
  └─ Payment History
      ├─ Date
      ├─ Amount
      ├─ Status
      └─ Invoice download

Upgrade Flow:
  1. Tap "Upgrade" button
  2. Select billing cycle (Monthly/Yearly)
  3. Review plan details
  4. Payment method selection
     ├─ Credit/Debit Card
     ├─ PayPal
     ├─ Google Pay
     └─ Apple Pay
  5. Enter payment details
  6. Confirm purchase
  7. Process payment
  8. Update subscription in Firestore
  9. Success screen → Navigate back
```

---

### **14. SETTINGS FLOW**

```
More → Settings
  ↓
Settings Screen

├─ Account
│   ├─ Edit profile
│   ├─ Change password
│   ├─ Email preferences
│   └─ Delete account
│
├─ Video & Audio
│   ├─ Default quality (Auto/720p/1080p/4K)
│   ├─ Auto-play next episode
│   ├─ Data saver mode
│   ├─ Subtitles
│   │   ├─ Default language
│   │   ├─ Font size
│   │   └─ Background opacity
│   └─ Audio
│       ├─ Default audio track
│       └─ Normalize volume
│
├─ Playback
│   ├─ Continue watching prompt
│   ├─ Skip intro (auto-skip)
│   ├─ Skip credits
│   └─ Playback speed
│
├─ Downloads
│   ├─ Download quality
│   ├─ Download over WiFi only
│   ├─ Storage location
│   └─ Auto-delete watched
│
├─ Notifications
│   ├─ Push notifications
│   ├─ New content alerts
│   ├─ Subscription reminders
│   └─ Download complete
│
├─ Parental Controls
│   └─ (See Parental Controls Flow)
│
├─ Language & Region
│   ├─ App language
│   ├─ Content language
│   └─ Region
│
├─ Appearance
│   ├─ Theme (Dark/Light/Auto)
│   └─ App icon
│
└─ Advanced
    ├─ Clear cache
    ├─ Reset app
    └─ Developer options (if enabled)
```

---

### **15. NOTIFICATIONS FLOW**

```
Push Notification Received
  ↓
Notification Types:
  ├─ New content added
  ├─ Subscription expiring
  ├─ Download complete
  ├─ Live event starting
  ├─ New episode available
  └─ Platform announcement

Tap Notification
  ↓
Navigate to relevant screen:
  ├─ Content → Detail screen
  ├─ Subscription → Subscription screen
  ├─ Download → Downloads screen
  ├─ Live event → Video player
  └─ Announcement → Announcement detail
```

---

## 🎯 KEY USER SCENARIOS

### **Scenario 1: New User Setup**
```
1. Download app
2. Complete onboarding
3. Sign up
4. Add first M3U playlist
5. Browse channels
6. Watch first channel
7. Add to favorites
```

### **Scenario 2: Daily Usage**
```
1. Open app → Home screen
2. Continue watching last content
3. Browse new releases
4. Check EPG for tonight's shows
5. Set reminder for favorite show
6. Download movie for offline
```

### **Scenario 3: Premium User**
```
1. Browse premium content
2. Watch in 4K quality
3. Download multiple episodes
4. Use catch-up TV
5. Watch on multiple devices
6. No ads
```

---

## ✅ USER FLOW COMPLETE!

This document covers every aspect of the user journey in Onvi Player.
