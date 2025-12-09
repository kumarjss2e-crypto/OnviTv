# Subscription System Implementation Guide

## Overview
The OnviTV platform now includes a comprehensive subscription system with free and premium tiers, generating revenue for the platform owner.

## System Architecture

### 1. Subscription Plans

#### Free Tier
- Limited video streaming
- Must watch Google AdMob reward videos before watching
- Limited downloads (5/month)
- SD quality only
- Ad-supported experience

#### Premium Monthly ($9.99/month)
- Unlimited streaming
- No ads
- Unlimited downloads
- 4K quality
- Offline viewing
- Early access to new content

#### Premium Yearly ($99.99/year) - 17% savings
- All Premium Monthly features
- Same unlimited benefits year-round

---

## Core Components

### 1. Subscription Service (`src/services/subscriptionService.js`)

**Main Functions:**

```javascript
// Get user's current subscription
getUserSubscription(userId)

// Upgrade to premium
upgradeSubscription(userId, plan, paymentData)

// Cancel subscription (reverts to free)
cancelSubscription(userId)

// Check if user is premium
isPremiumUser(userId)

// Check if subscription is active
hasActiveSubscription(userId)
```

### 2. Subscription Context (`src/context/SubscriptionContext.js`)

**Global State Management:**

```javascript
const {
  subscription,      // Current subscription object
  loading,          // Loading state
  isPremium,        // Boolean: is user premium?
  isFreeTier,       // Boolean: is user free?
  isFreeAndHasNotSeenPrompt, // Show upgrade prompt?
  upgrade,          // Function to upgrade
  cancel,           // Function to cancel
  refreshSubscription, // Manually refresh from DB
} = useSubscription();
```

### 3. Subscription Hooks (`src/hooks/subscriptionHooks.js`)

**Available Hooks:**

#### `usePremiumUpgradePrompt()`
Shows upgrade screen to free users after login (only once per session)

```javascript
const { showUpgradePrompt, setShowUpgradePrompt } = usePremiumUpgradePrompt();
```

#### `useFreeUserLimitations()`
Utilities for enforcing free tier restrictions

```javascript
const {
  canStreamWithoutAd,      // Boolean
  canDownload,            // Boolean
  getVideoQuality,        // Returns 'SD' or '4K'
  hasReachedDownloadLimit, // Boolean
  isFreeTier,
} = useFreeUserLimitations();
```

#### `useFreeUserAds()`
Manages reward ad system for free users

```javascript
const {
  shouldShowAd,      // Show ad screen?
  adWatched,         // Ad completed?
  handleAdComplete,  // Call when ad finishes
  resetAd,           // Reset for next video
  needsAdToWatch,    // Free user needs to watch ad?
} = useFreeUserAds();
```

---

## Screens

### 1. Premium Upgrade Screen
**Path:** `src/screens/PremiumUpgradeScreen.js`

Displayed after user logs in (if free tier and first-time prompt):
- Shows features comparison (Free vs Premium)
- Plan selection (Monthly/Yearly)
- Upgrade and "Continue Free" options

### 2. Reward Ad Screen
**Path:** `src/screens/RewardAdScreen.js`

Displayed before free users can watch videos:
- 30-second countdown timer
- Mock ad placeholder
- Rewards user access for duration

---

## Implementation in Existing Screens

### SplashScreen Integration
After login, free users see `PremiumUpgradeScreen` before accessing `Main` tabs.

```javascript
// In SplashScreen.js
if (user && isFreeTier && !hasSeenUpgradePrompt) {
  navigation.navigate('PremiumUpgrade');
}
```

### VideoPlayerScreen Integration
Before playing videos, free users must watch ad:

```javascript
import { useFreeUserAds } from '../hooks/subscriptionHooks';

const { shouldShowAd, handleAdComplete } = useFreeUserAds();

if (shouldShowAd) {
  return (
    <RewardAdScreen
      onComplete={handleAdComplete}
      onSkip={() => navigation.goBack()}
    />
  );
}
```

### DownloadScreen Integration
Limit downloads for free users:

```javascript
import { useFreeUserLimitations } from '../hooks/subscriptionHooks';

const { hasReachedDownloadLimit } = useFreeUserLimitations();

if (hasReachedDownloadLimit) {
  showAlert('Download Limit Reached', 
    'Free users can download 5 videos per month. Upgrade to Premium for unlimited.');
}
```

---

## Firebase Database Structure

```
firestore/
├── subscriptions/
│   ├── {userId}/
│   │   ├── plan: "free" | "premium_monthly" | "premium_yearly"
│   │   ├── status: "active" | "cancelled"
│   │   ├── startDate: timestamp
│   │   ├── renewalDate: timestamp (for premium)
│   │   ├── paymentId: string
│   │   ├── paymentMethod: string
│   │   └── createdAt: timestamp
│
└── payments/
    ├── {paymentId}/
    │   ├── userId: string
    │   ├── amount: number
    │   ├── plan: string
    │   ├── status: "pending" | "completed" | "failed"
    │   └── createdAt: timestamp
```

---

## Usage Examples

### Example 1: Show Premium Upgrade Option in Profile
```javascript
import { useSubscription } from '../context/SubscriptionContext';

function ProfileScreen() {
  const { isFreeTier, upgrade } = useSubscription();

  return (
    <View>
      {isFreeTier && (
        <GradientButton
          title="Upgrade to Premium"
          onPress={() => upgrade('premium_monthly')}
        />
      )}
    </View>
  );
}
```

### Example 2: Conditional Feature Access
```javascript
import { useFreeUserLimitations } from '../hooks/subscriptionHooks';

function MovieDetailScreen() {
  const { getVideoQuality } = useFreeUserLimitations();
  const quality = getVideoQuality();

  return (
    <VideoPlayer
      quality={quality}
      message={quality === 'SD' ? 'Free users: SD only. Upgrade for 4K!' : null}
    />
  );
}
```

### Example 3: Handle Ad Requirement
```javascript
import { useFreeUserAds } from '../hooks/subscriptionHooks';

function VideoPlayerScreen() {
  const { needsAdToWatch, handleAdComplete } = useFreeUserAds();

  if (needsAdToWatch) {
    return (
      <RewardAdScreen
        onComplete={handleAdComplete}
        onSkip={() => {/* handle skip */}}
      />
    );
  }

  return <ActualVideoPlayer />;
}
```

---

## Revenue Integration

### Payment Processing (To Be Implemented)

The system is ready for payment gateway integration. Add payment handling:

```javascript
// In PremiumUpgradeScreen.js
async function handlePayment(plan) {
  // 1. Call your payment gateway (Stripe, RevenueCat, etc.)
  const paymentResult = await processPayment({
    plan,
    amount: plan === 'premium_monthly' ? 9.99 : 99.99,
  });

  if (paymentResult.success) {
    // 2. Upgrade user subscription
    await upgrade(plan, {
      paymentId: paymentResult.id,
      method: paymentResult.method,
      amount: paymentResult.amount,
    });

    // 3. Track event for analytics
    trackSubscriptionEvent(user.uid, 'upgrade_success', { plan });
  }
}
```

---

## Recommended Integration Steps

1. **Phase 1: Backend Setup**
   - Set up Firestore rules for subscription access
   - Configure payment gateway (Stripe/RevenueCat)
   - Create webhook handlers for payment callbacks

2. **Phase 2: Screen Integration**
   - Integrate `PremiumUpgradeScreen` in navigation
   - Add premium prompt to `SplashScreen`
   - Add reward ads to `VideoPlayerScreen`

3. **Phase 3: Feature Restrictions**
   - Apply download limits in `DownloadScreen`
   - Apply quality restrictions in `VideoPlayerScreen`
   - Apply ad requirements in appropriate screens

4. **Phase 4: Analytics & Monetization**
   - Track subscription events
   - Monitor conversion rates
   - Optimize pricing and messaging

---

## Key Features Implemented

✅ Multi-tier subscription system (Free, Premium Monthly, Premium Yearly)
✅ Subscription context with global state management
✅ Premium upgrade screen with feature comparison
✅ Reward ad screen for free users
✅ Subscription hooks for feature restrictions
✅ Firebase Firestore integration
✅ Platform-aware implementation (iOS, Android, Web)
✅ Session-based upgrade prompt (shows once after login)

---

## Next Steps

1. Integrate payment gateway
2. Add download limit tracking
3. Implement ad network integration (Google AdMob)
4. Set up email notifications for renewals
5. Add subscription management screen
6. Implement family sharing (Premium feature)
7. Add promo code support
8. Set up analytics dashboard

