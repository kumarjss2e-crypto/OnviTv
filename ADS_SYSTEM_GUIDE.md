# Rewarded Ads System Implementation

## Overview
This document outlines the implementation of a rewarded video ads system for free tier users in the OnviTV React Native application. Free tier users must watch a short video advertisement before they can watch movies, series, or episodes.

## Architecture

### Components

#### 1. **AdContext** (`src/context/AdContext.js`)
- Manages the global state of the ads system
- Initializes Google Mobile Ads SDK on app startup
- Provides hooks for showing rewarded ads
- Tracks ad loading state

**Key Functions:**
- `useAds()` - Hook to access ad functionality from any component
- `showRewardedAdAndWait()` - Shows the ad and returns whether user earned reward
- `isAdsReady()` - Checks if ads are ready to display
- `preloadNextAd()` - Preloads the next ad for faster display

#### 2. **adService.js** (`src/services/adService.js`)
- Core service for Google Mobile Ads integration
- Handles ad creation, loading, and display
- Manages ad callbacks and event listeners

**Key Functions:**
- `initializeAds()` - Initialize Google Mobile Ads SDK
- `createRewardedAd()` - Create a new rewarded ad instance
- `loadRewardedAd()` - Load an ad for display
- `showRewardedAd()` - Display the ad and wait for reward
- `isRewardedAdLoaded()` - Check ad loading status

#### 3. **WatchAdModal** (`src/components/WatchAdModal.js`)
- Beautiful, branded UI component for ad flow
- Shows before user attempts to play content
- Displays countdown after ad is watched
- Animated entrance/exit transitions

**Features:**
- Shows content title being watched
- Lists benefits of watching the ad
- Countdown timer after ad completion
- Close (X) button with semi-transparent background
- "Skip" option for users who want to go back

### Integration Points

#### MovieDetailScreen
When a free tier user clicks "Play" on a movie:
1. Modal shows with movie title
2. User clicks "Watch Ad" button
3. Ad displays
4. On reward earned, movie automatically plays
5. User can also skip if they change their mind

**Code locations:**
- Imports: Line 16-20
- State setup: Line 31-32
- Play handler: Line 166-182
- Modal JSX: Line 364-372

#### SeriesDetailScreen
Same flow for episodes:
1. User clicks to play an episode
2. Ad modal appears with episode title
3. After ad reward, episode plays
4. Or user can skip

**Code locations:**
- Imports: Line 18-24
- State setup: Line 40-41
- Episode play handler: Line 267-304
- Modal JSX: Added near end of return

## AdMob Setup

### Getting Your Ad Unit IDs

1. **Sign up for AdMob:**
   - Go to https://admob.google.com
   - Sign in with your Google account

2. **Create an App:**
   - Click "Apps" in the left menu
   - Add your app (select React Native)
   - Set app name to "OnviTV"

3. **Create Ad Unit:**
   - Go to "Ad units" section
   - Click "Create new ad unit"
   - Choose "Rewarded"
   - Name it "OnviTV Rewarded"
   - Copy the Ad Unit ID (format: `ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyyyyyy`)

### Configuration

In `src/services/adService.js`, update the Ad Unit ID:

```javascript
const AD_UNIT_IDS = {
  REWARDED: __DEV__ 
    ? TestIds.REWARDED 
    : 'ca-app-pub-YOUR-ACTUAL-ID/YOUR-ACTUAL-ID',
};
```

**Important:** Keep test IDs for development to avoid AdMob penalties. Only use production IDs in release builds.

## Testing Flow

### With Development Build (Test Ads)
1. Install APK with `__DEV__` flag enabled
2. Ads will use Google's test IDs
3. Ads will load instantly and not earn real money
4. Perfect for testing the entire flow

### With Production Build (Real Ads)
1. Release build automatically uses production Ad Unit ID
2. Only deploy after thoroughly testing with test IDs
3. Real rewards will be earned by users

### Testing Checklist
- [ ] Free tier user sees ad modal when playing movie
- [ ] Free tier user sees ad modal when playing episode  
- [ ] Premium user bypasses ad modal
- [ ] Ad loads and displays properly
- [ ] "Watch Ad" button triggers ad display
- [ ] "Skip" button closes modal without playing
- [ ] Countdown works (3 seconds)
- [ ] After countdown, content plays automatically
- [ ] Close (X) button works

## User Flow

### Free Tier User
```
User clicks Play
     ↓
Check isFreeTier
     ↓
Show WatchAdModal
     ↓
User clicks "Watch Ad"
     ↓
Ad displays
     ↓
User earns reward (or skips)
     ↓
3-second countdown
     ↓
Content plays
```

### Premium User
```
User clicks Play
     ↓
Check isFreeTier (false)
     ↓
Content plays immediately
```

## Important Notes

1. **Test IDs First**: Always test with Google's test IDs before using production IDs
2. **AdMob Policies**: Ensure ads are not forced, users can skip, and rewards are meaningful
3. **Frequency Capping**: Consider limiting ads per user per day to avoid user fatigue
4. **Error Handling**: App gracefully handles when ads fail to load
5. **Network Requests**: Ad loading happens asynchronously without blocking UI

## Monitoring

Track ad performance in AdMob dashboard:
- Impressions (times ad was shown)
- Clicks (times user clicked)
- Completion rate (% of users who watched full ad)
- Revenue (if monetizing)

## Future Enhancements

1. **Frequency Capping**: Limit to 1 ad per hour or 5 per day
2. **Skip Timer**: Configurable 5-10 second minimum before skip
3. **Interstitial Ads**: Show ads when navigating between screens
4. **Banner Ads**: Small ads at bottom of screens
5. **Rollover System**: Let users watch multiple ads to accumulate "free watch tokens"

## Troubleshooting

### Ad not loading
- Check internet connection
- Verify Ad Unit ID is correct
- Ensure app is properly configured in AdMob
- Check device date/time (AdMob checks this)

### Ad showing but not rewarding
- Check that user actually watched the full ad
- Verify reward callback is being triggered
- Check AdMob dashboard for errors

### Users can't see the modal
- Ensure component is wrapped in AdProvider
- Check that `isFreeTier` is correctly detected
- Verify modal z-index doesn't have conflicts

## File Locations Summary

```
src/
├── context/
│   └── AdContext.js          (State management)
├── services/
│   └── adService.js          (AdMob integration)
├── components/
│   └── WatchAdModal.js       (UI component)
└── screens/
    ├── MovieDetailScreen.js  (Integration point 1)
    └── SeriesDetailScreen.js (Integration point 2)
```

## Implementation Status

- ✅ AdContext created
- ✅ adService.js implemented
- ✅ WatchAdModal UI component
- ✅ MovieDetailScreen integration
- ✅ SeriesDetailScreen integration
- ✅ App.js provider setup
- ⏳ AdMob configuration (needs your Ad Unit IDs)
- ⏳ Testing in production
