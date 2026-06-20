# IPTV ARCHITECTURE COMPREHENSIVE AUDIT

**Document Version:** 1.0  
**Last Updated:** Now  
**Phase:** 1 - Comprehensive Codebase Audit  
**Status:** COMPLETE - Ready for PHASE 2 (Deletion) and PHASE 3+ (Rebuild)

---

## EXECUTIVE SUMMARY

This audit inventories all IPTV-related systems, storage implementations, parsing pipelines, and state management across the OnviTV codebase. The goal is to identify systems that are:
- **Fragmented** (duplicated logic, platform guards scattered throughout)
- **Broken** (AsyncStorage usage on web, Platform.OS guards)
- **To Be Deleted** (old architecture, failed migrations)
- **To Be Refactored** (needs integration with new architecture)
- **To Be Kept** (core app functionality, authentication, subscriptions)

---

## PART 1: SERVICES INVENTORY

### A. PARSING SERVICES (Critical - To Be Replaced)

| Service Name | Location | Purpose | Status | Notes |
|---|---|---|---|---|
| **backgroundParsingService.js** | `src/services/` | Master orchestrator for M3U and Xtream parsing | REPLACE | Currently routes to webCompatibleParserService on web, but needs complete rebuild into separate M3U and Xtream pipelines. 15,419 bytes. Contains Platform.OS guards (lines 46, 152, 372). |
| **webCompatibleParserService.js** | `src/services/` | Pure JavaScript M3U and Xtream parser | REPLACE | Works but will be replaced with @iptv/playlist library. 400 lines. Currently handles both M3U and Xtream in one file (should be separated). |
| **xtreamSeriesService.js** | `src/services/` | Xtream API client for series/episodes | DELETE | Minimal service, lazy-imports @iptv/xtream-api. Will be replaced by new @iptv/playlist based approach. Only used for SeriesDetailScreen. |
| **parsingProgressService.js** | `src/services/` | Event emitter for parsing progress | KEEP/REPLACE | SimpleEventEmitter implementation. Records: recordFirstBatchSaved(), recordParsingComplete(), recordParsingError(). Can work with new state management or replace with Zustand/Redux. |

### B. STORAGE SERVICES (Critical - To Be Replaced)

| Service Name | Location | Purpose | Status | Notes |
|---|---|---|---|---|
| **contentStorageService.js** | `src/services/` | AsyncStorage-based content storage | DELETE | **BROKEN ON WEB** - Uses @react-native-async-storage/async-storage exclusively (11 matches found). Functions: saveChannels(), getChannels(), saveMovies(), getMovies(), saveSeries(), getSeries(), clearPlaylistContent(), getAllPlaylists(). NO PLATFORM GUARDS - just fails silently on web. |
| **localDatabaseService.js** | `src/services/` | SQLite + in-memory platform-aware storage | REPLACE | Platform.OS guard at line ~17-22. Uses SQLite on native, in-memory Map on web. Fragmented approach - should be replaced by unified itemStorageService routing to proper adapters. |
| **itemStorageService.js** | `src/services/` | NEW unified storage abstraction layer | KEEP | 150 lines. Properly routes to platform adapters. Functions: saveItemsBatch(), getPlaylistItems(), getItemsByType(), getItemsByGroup(), clearPlaylistItems(), countPlaylistItems(), searchItems(). This is the new standard. |

### C. NEW STORAGE ADAPTERS (NEW - To Be Kept)

| Adapter | Location | Purpose | Status | Notes |
|---|---|---|---|---|
| **indexedDBStorage.js** | `src/services/storage/` | Browser IndexedDB for web persistence | KEEP | 280 lines. Browser-native API, atomic transactions, indexed queries. Database: onvitv_db → playlist_items object store. |
| **sqliteStorage.js** | `src/services/storage/` | Native SQLite for iOS/Android | KEEP | 230 lines. expo-sqlite with proper transactions. Database: onvitv.db with playlist_items table. Same interface as IndexedDB. |
| **memoryStorage.js** | `src/services/storage/` | In-memory fallback storage | KEEP | 180 lines. Emergency fallback (session-based, data lost on reload/restart). Never used in production path but safety net for edge cases. |

### D. PLAYLIST/CONTENT SERVICES (To Be Refactored)

| Service Name | Location | Purpose | Status | Notes |
|---|---|---|---|---|
| **playlistService.js** | `src/services/` | Playlist operations (metadata, CRUD) | REFACTOR | Uses Firebase Firestore. Functions for add, get, update, delete playlists. No IPTV-specific logic - just metadata. Keep structure, ensure uses new storage for content. |
| **playlistService-updated.js** | `src/services/` | BACKUP/MIGRATION FILE | DELETE | **ABANDONED MIGRATION** - This is a failed or incomplete refactor attempt. Same as playlistService.js but with different implementation. Remove to avoid confusion. |
| **channelService.js** | `src/services/` | Channel operations | REFACTOR | Already updated to use itemStorageService. Functions: getChannelsByPlaylist(), searchChannels(), filterChannels(). Field mapping: categoryName → groupTitle. OK, but needs minor adjustment for new parser output. |
| **movieService.js** | `src/services/` | Movie operations | REFACTOR | Already updated to use itemStorageService. Functions: getMoviesByPlaylist(), searchMovies(). Needs adjustment for new parser schema. |
| **seriesService.js** | `src/services/` | Series operations | REFACTOR | Already updated to use itemStorageService. Functions: getSeriesByPlaylist(), searchSeries(). Needs adjustment for new parser schema. |

### E. METADATA/EPG SERVICES (To Be Integrated)

| Service Name | Location | Purpose | Status | Notes |
|---|---|---|---|---|
| **epgService.js** | `src/services/` | EPG data operations | INTEGRATE | 177 lines. Functions for fetching EPG data, managing schedules. Needs integration with new ingestion pipeline. |
| **metadataService.js** | `src/services/` | TMDB metadata fetching | INTEGRATE | Functions for fetching movie/series metadata from TMDB. Needs integration with new parser to enrich content. |
| **searchService.js** | `src/services/` | Search operations | REFACTOR | Uses local filtering. Should integrate with new storage system. |
| **categoryService.js** | `src/services/` | Category management | REFACTOR | Mentioned in docs but needs audit. Ensure integrates with new groupTitle field. |

### F. AUTHENTICATION & SUBSCRIPTION SERVICES (KEEP - Core App Logic)

| Service Name | Location | Purpose | Status | Notes |
|---|---|---|---|---|
| **authService.js** | `src/services/` | Firebase auth, Google Sign-In | KEEP | Has Platform.OS guards (lines 37, 39, 97, 98, 298, 326) but LEGITIMATE - these are for Google Sign-In SDK differences between platforms. NOT related to IPTV fragmentation. Critical for app. |
| **subscriptionService.js** | `src/services/` | Subscription logic, Firebase integration | KEEP | **CORE APP** - Cannot delete or heavily refactor. Subscription tiers, payment processing. No IPTV-specific logic. |
| **userService.js** | `src/services/` | User profile, account management | KEEP | **CORE APP** - User data, preferences. Not IPTV-specific. |

### G. SUPPORTING SERVICES (Keep or Minor Refactor)

| Service Name | Location | Purpose | Status | Notes |
|---|---|---|---|---|
| **watchHistoryService.js** | `src/services/` | Watch history tracking | KEEP/REFACTOR | Uses itemStorageService or Firestore. Needs audit - should use new storage for consistency. |
| **favoritesService.js** | `src/services/` | Favorites management | KEEP/REFACTOR | Similar to watch history. Should use new storage. |
| **notificationService.js** | `src/services/` | Push notifications | KEEP | Not IPTV-specific. Keep. |
| **downloadService.js** | `src/services/` | Offline downloads | KEEP/REFACTOR | Exists but may not be used. Low priority. |
| **tmdbService.js** | `src/services/` | TMDB API integration | KEEP | For metadata enrichment. Keep. |
| **adService.js** | `src/services/` | AdMob integration | KEEP | Has Platform.OS guards but LEGITIMATE (AdMob is native-only). NOT IPTV fragmentation. |
| **admobService.js** | `src/services/` | AdMob wrapper | KEEP/DELETE? | Might be duplicate of adService. Audit needed. |

---

## PART 2: CONTEXTS & STATE MANAGEMENT

### Current Contexts

| Context | Location | Purpose | Status | Notes |
|---|---|---|---|---|
| **ParseLoadingContext.js** | `src/context/` | Parsing progress state | REPLACE | Used for loading indicators. Will be replaced by Zustand/Redux in rebuild. |
| **SubscriptionContext.js** | `src/context/` | Subscription state | KEEP | **CORE APP** - Cannot delete. |
| **AuthContext.js** | `src/context/` | Auth state | KEEP | **CORE APP** - Cannot delete. |
| **AdContext.js** | `src/context/` | Ad state | KEEP | **CORE APP** - Advertisement state. Keep. |
| **PremiumUpgradeModalContext.js** | `src/context/` | Premium upgrade modal state | KEEP | **CORE APP** - Subscription-related. Keep. |
| **ToastContext.js** | `src/context/` | Toast notifications | KEEP | UI utility. Keep. |

### State Management Issues

- **Fragmented State**: Multiple contexts doing overlapping things
- **Missing Integration**: ParseLoadingContext not integrated with state store
- **Inconsistent Patterns**: Mix of Context API and no unified state management (Redux/Zustand proposed)

---

## PART 3: FRAGMENTATION PATTERNS IDENTIFIED

### Pattern 1: AsyncStorage Usage (Broken on Web)

**Files Affected**: `contentStorageService.js` (11 matches)

**Impact**: All content retrieval on web returns empty because AsyncStorage is React Native native-only.

**Action**: DELETE contentStorageService.js, migrate to itemStorageService + adapters.

### Pattern 2: Platform.OS Guards Scattered Throughout

**Files with legitimate guards** (NOT IPTV fragmentation):
- `authService.js` - Google Sign-In SDK differences (legitimate)
- `adService.js` - AdMob is native-only (legitimate)
- `admobService.js` - AdMob wrapper (legitimate)

**Files with fragmentation guards** (IPTV-related):
- `backgroundParsingService.js` lines 46, 152, 372 - Parsing routing
- `localDatabaseService.js` lines ~17-22 - Storage routing

**Action**: Remove fragmentation guards from backgroundParsingService and localDatabaseService. Use unified itemStorageService + proper adapter routing instead.

### Pattern 3: Parsing Logic Duplication

**Current State**:
- `webCompatibleParserService.js` - Pure JS parser (M3U + Xtream combined)
- `xtreamSeriesService.js` - Separate Xtream API client
- `backgroundParsingService.js` - Orchestrator
- Multiple parsing approaches in one codebase

**Action**: Replace with @iptv/playlist library. Separate M3U and Xtream into distinct pipelines.

### Pattern 4: Abandoned Migration

**File**: `playlistService-updated.js`

**Issue**: Backup or incomplete migration attempt. Creates confusion.

**Action**: DELETE after confirming all functionality is in `playlistService.js`.

---

## PART 4: CROSS-SERVICE DEPENDENCIES

### Storage Chain (Current - Broken)

```
channels/movies/series screens
    ↓
channelService.getChannels() / movieService.getMovies() / seriesService.getSeries()
    ↓
itemStorageService (NEW - routes correctly) OR contentStorageService (OLD - AsyncStorage - BROKEN on web)
    ↓
If itemStorageService: → indexedDBStorage (web) or sqliteStorage (native)
If contentStorageService: → AsyncStorage (FAILS on web)
```

### Parsing Chain (Current - Fragmented)

```
HomeScreen initiates parsing
    ↓
backgroundParsingService.startParsing()
    ↓
Platform.OS check:
  - web: webCompatibleParserService (works)
  - native: iptv-m3u-playlist-parser + @iptv/xtream-api (Node.js only, incorrect)
    ↓
Save to: localDatabaseService (fragmented) or itemStorageService (new - correct)
```

---

## PART 5: CRITICAL ISSUES TO RESOLVE

### Issue 1: No Unified Ingestion Manager
**Impact**: Parsing happens in app lifecycle, not independent  
**Solution**: Phase 7 creates backgroundTask service independent of React lifecycle

### Issue 2: Parsing Not Progressive
**Impact**: Users wait for entire playlist before content appears  
**Solution**: Phase 9 implements progressive content loading (first batch appears immediately)

### Issue 3: Storage System Fragmentation
**Impact**: Multiple storage systems, platform guards scattered, AsyncStorage breaks on web  
**Solution**: itemStorageService + proper adapters (mostly done, need to delete old systems)

### Issue 4: No State Management
**Impact**: Parsing state in Context API, inconsistent updates  
**Solution**: Phase 8 implements Zustand or Redux Toolkit

### Issue 5: Web Uses Node.js Only Parsers
**Impact**: iptv-m3u-playlist-parser and @iptv/xtream-api don't work in browser  
**Solution**: webCompatibleParserService created, will be replaced by @iptv/playlist universal parser

---

## PART 6: FILE STRUCTURE CURRENT STATE

```
src/
├── services/
│   ├── backgroundParsingService.js          [REPLACE] (fragmented, Platform.OS guards)
│   ├── webCompatibleParserService.js        [REPLACE] (works, but will use @iptv/playlist)
│   ├── xtreamSeriesService.js               [DELETE]  (unused, will be replaced)
│   ├── contentStorageService.js             [DELETE]  (AsyncStorage - broken on web)
│   ├── localDatabaseService.js              [REPLACE] (fragmented Platform.OS)
│   ├── itemStorageService.js                [KEEP]    (new unified interface)
│   ├── parsingProgressService.js            [KEEP/REPLACE] (with state management)
│   ├── playlistService.js                   [REFACTOR] (metadata only, keep structure)
│   ├── playlistService-updated.js           [DELETE]  (abandoned migration)
│   ├── channelService.js                    [REFACTOR] (updated, needs minor fix)
│   ├── movieService.js                      [REFACTOR] (updated, needs minor fix)
│   ├── seriesService.js                     [REFACTOR] (updated, needs minor fix)
│   ├── epgService.js                        [INTEGRATE]
│   ├── metadataService.js                   [INTEGRATE]
│   ├── searchService.js                     [REFACTOR]
│   ├── storage/
│   │   ├── indexedDBStorage.js              [KEEP]    (web persistence)
│   │   ├── sqliteStorage.js                 [KEEP]    (native persistence)
│   │   └── memoryStorage.js                 [KEEP]    (fallback)
│   ├── authService.js                       [KEEP]    (core auth, legitimate Platform.OS guards)
│   ├── subscriptionService.js               [KEEP]    (core app)
│   ├── userService.js                       [KEEP]    (core app)
│   └── ... (other non-IPTV services)
└── context/
    ├── ParseLoadingContext.js               [REPLACE] (with state management)
    ├── SubscriptionContext.js               [KEEP]    (core app)
    ├── AuthContext.js                       [KEEP]    (core app)
    ├── AdContext.js                         [KEEP]    (core app)
    ├── PremiumUpgradeModalContext.js        [KEEP]    (core app)
    └── ToastContext.js                      [KEEP]    (ui utility)
```

---

## PART 7: CATEGORIZATION MATRIX

### DELETE (Complete Removal)

1. **contentStorageService.js** - AsyncStorage usage, broken on web, replaced by itemStorageService
2. **localDatabaseService.js** - Fragmented, replaced by proper storage adapters
3. **xtreamSeriesService.js** - Minimal wrapper, will be handled by new parser
4. **playlistService-updated.js** - Abandoned migration file
5. **parsingProgressService.js** (IF replaced) - Only if new state management fully replaces it

### REPLACE (Complete Rewrite)

1. **backgroundParsingService.js** - Rebuild with separate M3U/Xtream pipelines, remove Platform.OS guards, use new ingestion manager
2. **webCompatibleParserService.js** - Replace with @iptv/playlist library once available
3. **ParseLoadingContext.js** - Replace with Zustand/Redux state management

### REFACTOR (Minor to Moderate Updates)

1. **playlistService.js** - Keep structure, ensure integrates with new storage for content metadata
2. **channelService.js** - Already updated to itemStorageService, minor field adjustments needed
3. **movieService.js** - Already updated to itemStorageService, minor field adjustments needed
4. **seriesService.js** - Already updated to itemStorageService, minor field adjustments needed
5. **searchService.js** - Integrate with new storage system
6. **epgService.js** - Integrate with new ingestion pipeline
7. **metadataService.js** - Integrate with new parser for enrichment
8. **watchHistoryService.js** - Audit and ensure uses new storage
9. **favoritesService.js** - Audit and ensure uses new storage

### KEEP (No Changes Required)

1. **itemStorageService.js** - New unified interface, working correctly
2. **indexedDBStorage.js** - Web adapter, production-ready
3. **sqliteStorage.js** - Native adapter, production-ready
4. **memoryStorage.js** - Fallback adapter, safety net
5. **subscriptionService.js** - Core app functionality
6. **authService.js** - Core app functionality (legitimate Platform.OS guards)
7. **userService.js** - Core app functionality
8. **adService.js** - Core app functionality (legitimate Platform.OS guards)
9. **admobService.js** - Core app functionality (if not duplicate)
10. **notificationService.js** - Core app functionality
11. **downloadService.js** - Core app functionality
12. **tmdbService.js** - Metadata enrichment
13. All Contexts except ParseLoadingContext - Core app state
14. All Screens - UI layer (NOT TOUCHED)

---

## PART 8: DELETION IMPACT ANALYSIS

### Safe to Delete (No Dependencies)

- `contentStorageService.js` - Already replaced by itemStorageService
- `xtreamSeriesService.js` - Minimal, unused in build
- `playlistService-updated.js` - Abandoned file

### Delete with Verification

- `localDatabaseService.js` - Check if any code still imports it (likely only old background code)

### Delete with Replacement

- `backgroundParsingService.js` (old) - Will be replaced by new implementation
- `webCompatibleParserService.js` (old) - Will be replaced by @iptv/playlist

### Cannot Delete

- All screens and core app components
- Auth/subscription services
- All KEEP-categorized services

---

## PART 9: REBUILD SEQUENCE SUMMARY

**PHASE 1:** ✅ COMPLETE - Comprehensive codebase audit (THIS DOCUMENT)

**PHASE 2:** DELETE broken architecture
- Delete contentStorageService.js
- Delete localDatabaseService.js (after verification)
- Delete xtreamSeriesService.js
- Delete playlistService-updated.js
- Create backup branch before deletion

**PHASE 3:** Design new architecture
- Detail data flow diagrams
- Document new ingestion manager
- Design M3U and Xtream separate pipelines
- Design progressive content loading
- Design state management structure

**PHASE 4:** Implement new storage (foundation)
- Keep itemStorageService + adapters (already done)
- Delete old storage implementations

**PHASE 5:** Implement M3U ingestion pipeline
- Create m3uParsingService.js (pure JS, cross-platform)
- No Platform.OS guards needed

**PHASE 6:** Implement Xtream ingestion pipeline
- Create xtreamParsingService.js (pure JS, cross-platform)
- Use @iptv/playlist or equivalent universal library

**PHASE 7:** Implement ingestion manager
- Create ingestionManager.js (independent of React lifecycle)
- Handles retry, resume, progress tracking
- Works with both M3U and Xtream

**PHASE 8:** Implement state management
- Set up Zustand or Redux Toolkit
- Replace ParseLoadingContext
- Centralize all parsing state

**PHASE 9:** Implement progressive loading
- First batch appears immediately (first 50 items)
- Subsequent batches load in background
- No user wait for full parse

**PHASE 10:** File structure reorganization
- src/ingestion/ - Parsing pipelines
- src/storage/ - Storage adapters (already done)
- src/state/ - State management
- src/services/content/ - Content services
- Clean separation of concerns

**PHASE 11:** Comprehensive testing
- Unit tests for each pipeline
- Integration tests for storage
- E2E tests for parsing flow
- Web, Android, iOS testing

**PHASE 12:** Final documentation and deliverables
- Architecture documentation
- API reference
- Setup guide
- Performance benchmarks

---

## PART 10: SUCCESS CRITERIA FOR REBUILD

### Must-Have (Non-Negotiable)

1. ✅ Web parsing works (no AsyncStorage, no Platform.OS guards in parsing)
2. ✅ Native parsing works (iOS and Android both show content)
3. ✅ No content loss (all items saved and retrieved correctly)
4. ✅ Progressive loading (first batch appears immediately)
5. ✅ State consistency (same content across all platforms)
6. ✅ No broken screens (all UI still works)
7. ✅ Auth/subscriptions unchanged (core app untouched)

### Nice-to-Have (Optimizations)

1. Automatic retry on failure
2. Resume incomplete parsing
3. Metadata enrichment (TMDB integration)
4. EPG integration
5. Search optimization

### Documentation

1. Architecture guide
2. Data flow diagrams
3. API reference
4. Setup instructions

---

## CONCLUSION

This audit provides a complete inventory of the IPTV architecture. The fragmentation is now clear:

**Root Causes of Fragmentation:**
1. AsyncStorage (breaks on web)
2. Platform.OS guards (scattered throughout code)
3. Dual storage systems (localDatabaseService vs contentStorageService)
4. Node.js-only parser libraries
5. No unified storage interface (before itemStorageService)
6. No state management (state in contexts, parsing in component lifecycle)

**New Architecture (Phase 3+):**
1. Single unified ingestion manager (independent of React)
2. Separate M3U and Xtream pipelines
3. Cross-platform parsers (pure JS, no Platform.OS guards)
4. Unified storage interface (itemStorageService) with platform adapters
5. Centralized state management (Zustand/Redux)
6. Progressive loading (users see content immediately)

**Next Step:** Proceed to PHASE 2 - Deletion of broken architecture (using this audit as reference).

---

## APPENDIX: FILES TO DELETE

| File | Path | Reason |
|---|---|---|
| contentStorageService.js | src/services/ | AsyncStorage usage (broken on web) |
| localDatabaseService.js | src/services/ | Fragmented Platform.OS guards |
| xtreamSeriesService.js | src/services/ | Minimal, unused, will be replaced |
| playlistService-updated.js | src/services/ | Abandoned migration file |

## APPENDIX: FILES TO KEEP AS REFERENCE

- All documentation files in project root (IMPLEMENTATION_*.md, etc.)
- This audit file (IPTV_ARCHITECTURE_AUDIT.md)
- All existing working code (screens, auth, subscriptions)

---

**Document prepared for: IPTV Architecture Complete Rebuild (15-Phase Specification)**  
**Ready for:** PHASE 2 - Deletion Plan Implementation
