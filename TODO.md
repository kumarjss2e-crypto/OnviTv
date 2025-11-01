# OnviTV - Production TODO

## 🎯 PROJECT STATUS

**Current Progress:** 35% Complete

### ✅ Completed
- Database structure with general collections
- Firebase authentication
- Navigation (Movies → Live TV → My Playlist → More)
- Playlist management (M3U & Xtream Codes)
- M3U parser & Xtream API integration
- Live TV screen (general channels)
- My Playlist screen (user content)
- Video player (expo-av with custom controls)
- Auto-retry on stream failure
- Watch progress tracking
- Platform architecture documented

### ⏳ In Progress
- Movies screen (needs general content)
- Admin panel

### 🔜 Upcoming
- EPG integration
- Favorites system
- Search functionality
- Downloads (offline viewing)

---

## 📱 PLATFORM ARCHITECTURE

### Content Types

**1. General Content (Admin-Curated)**
- **Collections**: `generalChannels`, `generalMovies`, `generalSeries`
- **Managed by**: Admin only (via Admin Panel)
- **Visible to**: All users
- **Located in**: Movies Tab, Live TV Tab

**2. Personal Content (User-Imported)**
- **Collections**: `channels`, `movies`, `series`, `playlists`
- **Managed by**: Users (import M3U/Xtream)
- **Visible to**: Owner only
- **Located in**: My Playlist Tab

See `PLATFORM_STRUCTURE.md` for complete details.

---

## 📋 PHASE 1: USER APP - CORE FEATURES

### 1.1 Movies Screen (General Content) ⏳ HIGH PRIORITY
- [ ] Implement MoviesScreen.js
  - [ ] Use `getGeneralMovies()` service
  - [ ] Use `getGeneralSeries()` service
  - [ ] Category tabs (Movies, Series)
  - [ ] Category filters
  - [ ] Search bar
  - [ ] Grid layout
  - [ ] Movie/Series cards with posters
- [ ] Create MovieDetailScreen.js
  - [ ] Backdrop image
  - [ ] Play button → VideoPlayer
  - [ ] Add to Favorites button
  - [ ] Title, year, rating, duration
  - [ ] Genre tags
  - [ ] Description
  - [ ] Similar content section
- [ ] Create SeriesDetailScreen.js
  - [ ] Series info
  - [ ] Seasons selector
  - [ ] Episodes list
  - [ ] Play episode → VideoPlayer
  - [ ] Track progress per episode

### 1.2 Live TV Screen ✅ COMPLETED
- [x] Fetch from `generalChannels` collection
- [x] Category filtering
- [x] Search functionality
- [x] Grid/List view toggle
- [x] Channel cards with logos
- [x] Navigate to VideoPlayer
- [x] No playlist management UI

### 1.3 My Playlist Screen ✅ COMPLETED
- [x] Fetch user's personal content
- [x] Continue Watching section
- [x] Favorites section
- [x] My Channels section
- [x] My Movies section
- [x] My Series section
- [x] My Playlists management
- [x] Empty state with "Add Playlist" CTA

### 1.4 Video Player ✅ COMPLETED
- [x] expo-av integration
- [x] Custom controls (play/pause, seek, rewind/forward)
- [x] Auto-retry on failure (up to 5 attempts)
- [x] YouTube-style error overlay
- [x] Always-visible back button
- [x] Progress tracking (save every 30s)
- [x] Resume from last position
- [x] Responsive (portrait & landscape)
- [x] ResizeMode.CONTAIN for proper aspect ratio

### 1.5 Playlist Management ✅ COMPLETED
- [x] PlaylistManagementScreen
- [x] AddPlaylistScreen (M3U & Xtream)
- [x] EditPlaylistScreen
- [x] M3U parser
- [x] Xtream Codes API integration
- [x] Parse and save to Firestore
- [x] Progress tracking during parsing

### 1.6 Authentication ✅ COMPLETED
- [x] Splash screen
- [x] Onboarding screens
- [x] Login screen
- [x] Signup screen
- [x] Firebase Auth integration
- [x] AsyncStorage for persistence

### 1.7 EPG Integration ⏳
- [ ] Create epgService.js
  - [ ] Fetch EPG from providers
  - [ ] Parse XMLTV format
  - [ ] Match channels to EPG data
  - [ ] Store in Firestore
  - [ ] Auto-update schedule
- [ ] Display EPG on channel cards
  - [ ] Current program
  - [ ] Next program
  - [ ] Progress bar
- [ ] Create EPG grid view (optional)
  - [ ] Time-based grid
  - [ ] Navigate by time
  - [ ] Program details modal

### 1.8 Favorites System ⏳
- [ ] Implement favoritesService.js
  - [ ] Add to favorites
  - [ ] Remove from favorites
  - [ ] Get user favorites
  - [ ] Check if favorited
- [ ] Add favorite buttons
  - [ ] Channel cards
  - [ ] Movie/Series detail screens
  - [ ] Video player
- [ ] Create FavoritesScreen (optional)
  - [ ] Tabs: Channels, Movies, Series
  - [ ] Grid view
  - [ ] Remove option

### 1.9 Search Functionality ⏳
- [ ] Create SearchScreen.js
  - [ ] Search bar
  - [ ] Recent searches
  - [ ] Category filters
- [ ] Implement search
  - [ ] Search general channels
  - [ ] Search general movies
  - [ ] Search general series
  - [ ] Search user's content (My Playlist)
  - [ ] Debounced input
  - [ ] Results by category

### 1.10 Downloads (Offline) ⏳
- [ ] Create DownloadsScreen.js
  - [ ] Storage usage indicator
  - [ ] Downloaded content list
  - [ ] Active downloads with progress
  - [ ] Manage storage
- [ ] Implement download manager
  - [ ] Download video files
  - [ ] Pause/Resume/Cancel
  - [ ] Background downloads
  - [ ] Notification progress
- [ ] Offline playback
  - [ ] Play from local storage
  - [ ] Track offline progress

### 1.11 More Screen Enhancements ⏳
- [ ] Profile section
  - [ ] Edit profile
  - [ ] Change password
- [ ] Settings
  - [ ] Video quality preferences
  - [ ] Notifications settings
  - [ ] Language selection
  - [ ] Clear cache
- [ ] Help & Support
  - [ ] FAQ
  - [ ] Contact support
- [ ] About
  - [ ] App version
  - [ ] Terms of service
  - [ ] Privacy policy

### 1.12 Parental Controls ⏳
- [ ] Create ParentalControlsScreen
  - [ ] Enable/Disable toggle
  - [ ] Set PIN
  - [ ] Age restrictions
  - [ ] Block adult content
  - [ ] Time restrictions
- [ ] Implement content filtering
  - [ ] Check before playback
  - [ ] Hide restricted content
  - [ ] PIN verification screen

### 1.13 Performance & Polish ⏳
- [ ] Optimize images
  - [ ] Lazy loading
  - [ ] Image caching
  - [ ] Placeholder images
- [ ] Optimize lists
  - [ ] FlatList optimization
  - [ ] Pagination
  - [ ] Memoization
- [ ] Loading states
  - [ ] Skeleton screens
  - [ ] Progress indicators
- [ ] Error handling
  - [ ] Network errors
  - [ ] Graceful degradation
- [ ] Animations
  - [ ] Smooth transitions
  - [ ] Micro-interactions

---

## 🖥️ PHASE 2: ADMIN PANEL

### 2.1 Admin Panel Setup ⏳ HIGH PRIORITY
- [ ] Create React.js admin panel
  - [ ] Setup with Vite
  - [ ] Install dependencies (React Router, Firebase Admin SDK)
  - [ ] Configure routing
  - [ ] Setup authentication
- [ ] Admin login
  - [ ] Email/password login
  - [ ] Role-based access (admin role check)
  - [ ] Session management

### 2.2 Dashboard ⏳
- [ ] Create Dashboard
  - [ ] Total users stat
  - [ ] Total content stat (channels, movies, series)
  - [ ] Active users chart
  - [ ] Content views chart
  - [ ] Recent activity feed
  - [ ] Quick actions

### 2.3 General Content Management ⏳ HIGH PRIORITY
- [ ] Manage General Channels
  - [ ] List all `generalChannels`
  - [ ] Add new channel
  - [ ] Edit channel (name, logo, streamUrl, category)
  - [ ] Delete channel
  - [ ] Set featured/order
  - [ ] Bulk import from M3U
- [ ] Manage General Movies
  - [ ] List all `generalMovies`
  - [ ] Add new movie
  - [ ] Edit movie (title, poster, streamUrl, metadata)
  - [ ] Delete movie
  - [ ] Set featured/order
  - [ ] Bulk import from M3U
- [ ] Manage General Series
  - [ ] List all `generalSeries`
  - [ ] Add new series
  - [ ] Edit series
  - [ ] Delete series
  - [ ] Manage episodes
  - [ ] Set featured/order

### 2.4 User Management ⏳
- [ ] Users list
  - [ ] View all users
  - [ ] Search & filter
  - [ ] Sort options
  - [ ] Pagination
- [ ] User details
  - [ ] User info
  - [ ] User's playlists
  - [ ] Watch history
  - [ ] Activity logs
- [ ] User actions
  - [ ] Suspend user
  - [ ] Ban user
  - [ ] Delete user
  - [ ] Send notification

### 2.5 Analytics ⏳
- [ ] Analytics dashboard
  - [ ] User growth chart
  - [ ] Content views by category
  - [ ] Popular content
  - [ ] Geographic distribution
  - [ ] Device statistics
  - [ ] Export reports

### 2.6 System Settings ⏳
- [ ] App settings
  - [ ] Features toggles
  - [ ] Limits configuration
  - [ ] Maintenance mode
- [ ] Content settings
  - [ ] Default categories
  - [ ] Featured content slots
  - [ ] Content moderation rules

---

## 🔧 PHASE 3: BACKEND & INFRASTRUCTURE

### 3.1 Firebase Security Rules ✅ COMPLETED
- [x] Firestore rules defined
  - [x] User data protection
  - [x] General collections (read: all, write: admin)
  - [x] Personal collections (read/write: owner)
- [ ] Deploy to production
- [ ] Test security rules

### 3.2 Cloud Functions ⏳
- [ ] User management functions
  - [ ] onUserCreate (create profile)
  - [ ] onUserDelete (cleanup data)
  - [ ] sendWelcomeEmail
- [ ] Analytics functions
  - [ ] dailyAggregation (scheduled)
  - [ ] trackContentViews
- [ ] Cleanup functions
  - [ ] deleteOldLogs (scheduled)
  - [ ] deleteExpiredDownloads

### 3.3 Database Optimization ⏳
- [ ] Create Firestore indexes
  - [ ] Composite indexes for queries
  - [ ] Test query performance
- [ ] Implement caching
  - [ ] Cache EPG data
  - [ ] Cache frequently accessed content
- [ ] Data cleanup strategy
  - [ ] Archive old data
  - [ ] Delete unused data

---

## 🧪 PHASE 4: TESTING & QA

### 4.1 Testing ⏳
- [ ] Test user flows
  - [ ] Signup → Browse Movies → Watch
  - [ ] Login → My Playlist → Add Playlist → Watch
  - [ ] Search → Play content
- [ ] Test on devices
  - [ ] Android (different sizes)
  - [ ] iOS (different sizes)
  - [ ] Web browser
- [ ] Test admin panel
  - [ ] Add general content
  - [ ] Manage users
  - [ ] View analytics

### 4.2 Bug Fixes ⏳
- [ ] Fix critical bugs
- [ ] Fix UI/UX issues
- [ ] Fix performance issues
- [ ] Fix security issues

---

## 📦 PHASE 5: DEPLOYMENT

### 5.1 App Deployment ⏳
- [ ] Android (Google Play)
  - [ ] Generate signed APK/AAB
  - [ ] Create store listing
  - [ ] Screenshots & description
  - [ ] Privacy policy & terms
  - [ ] Submit for review
- [ ] iOS (App Store)
  - [ ] Generate IPA
  - [ ] Create store listing
  - [ ] Screenshots & description
  - [ ] Privacy policy & terms
  - [ ] Submit for review

### 5.2 Admin Panel Deployment ⏳
- [ ] Build production
- [ ] Deploy to hosting (Vercel/Netlify)
- [ ] Configure custom domain
- [ ] Setup SSL

### 5.3 Backend Deployment ⏳
- [ ] Deploy Cloud Functions
- [ ] Deploy Firestore rules
- [ ] Deploy indexes
- [ ] Setup backup strategy

---

## 📚 PHASE 6: DOCUMENTATION

### 6.1 User Documentation ⏳
- [ ] User guide
  - [ ] How to browse Movies & Live TV
  - [ ] How to add personal playlists
  - [ ] How to watch content
- [ ] FAQ
  - [ ] Common questions
  - [ ] Troubleshooting

### 6.2 Admin Documentation ⏳
- [ ] Admin guide
  - [ ] How to add general content
  - [ ] How to manage users
  - [ ] How to view analytics

---

## 🎯 IMMEDIATE NEXT TASKS

### This Week:
1. **Implement MoviesScreen** with general content
2. **Update USER_FLOW.md** with correct structure
3. **Test complete user flow** (Login → Movies → Watch)

### Next Week:
1. **Start Admin Panel** development
2. **Add EPG integration**
3. **Implement Favorites system**

---

## 📊 PROGRESS SUMMARY

**Phase 1 (User App):** 35% ✅✅✅⏳⏳⏳⏳⏳⏳⏳
**Phase 2 (Admin Panel):** 0% ⏳⏳⏳⏳⏳⏳⏳⏳⏳⏳
**Phase 3 (Backend):** 40% ✅✅✅✅⏳⏳⏳⏳⏳⏳
**Phase 4 (Testing):** 0% ⏳⏳⏳⏳⏳⏳⏳⏳⏳⏳
**Phase 5 (Deployment):** 0% ⏳⏳⏳⏳⏳⏳⏳⏳⏳⏳
**Phase 6 (Documentation):** 50% ✅✅✅✅✅⏳⏳⏳⏳⏳

**Total Platform Progress:** ~35% Complete

---

## ✅ COMPLETION CRITERIA

Platform is production-ready when:
- ✅ All user features working
- ✅ Admin panel functional
- ✅ General content populated
- ✅ Security rules deployed
- ✅ Apps published to stores
- ✅ Documentation complete
- ✅ No critical bugs
- ✅ Performance optimized

---

**Estimated Timeline:** 2-3 months for production-ready platform
**Current Status:** Core features complete, Movies screen & Admin panel pending
**Next Milestone:** Complete Movies screen with general content
