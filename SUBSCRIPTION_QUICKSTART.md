# Subscription System - Quick Start Guide

## What Was Implemented? 🎉

I've built a complete **multi-tier subscription system** for your OnviTV platform with:

### ✅ Free Tier Features
- Limited video streaming
- **Must watch reward ads** before watching content (30-second timer)
- 5 downloads per month limit
- SD quality only
- Ad-supported experience

### ✅ Premium Tiers
**Premium Monthly ($9.99/month)**
- Unlimited streaming
- NO ads
- Unlimited downloads
- 4K quality
- Offline viewing

**Premium Yearly ($99.99/year)** - **17% SAVINGS**
- All features of monthly plan
- Year-round unlimited access

### ✅ Premium Features Implemented

1. **SubscriptionContext** - Global state management
2. **Subscription Hooks** - Easy integration with screens
3. **Premium Upgrade Screen** - Beautiful UI with pricing comparison
4. **Reward Ad Screen** - 30-second countdown before video playback
5. **Payment Ready** - Structure for payment gateway integration
6. **Firebase Integration** - Store subscriptions in Firestore

---

## Files Created/Updated

### New Files:
- `src/context/SubscriptionContext.js` - Global subscription state
- `src/services/subscriptionService.js` - Backend logic (enhanced)
- `src/screens/PremiumUpgradeScreen.js` - Upgrade UI
- `src/screens/RewardAdScreen.js` - Reward ad for free users
- `src/hooks/subscriptionHooks.js` - Reusable hooks
- `SUBSCRIPTION_SYSTEM_GUIDE.md` - Full documentation
- `SUBSCRIPTION_IMPLEMENTATION_CHECKLIST.md` - Integration checklist

### Updated Files:
- `App.js` - Added SubscriptionProvider wrapper, new screens in navigation

---

## 3-Minute Integration

### Step 1: Show Upgrade Prompt After Login

**In `src/screens/SplashScreen.js`:**

```javascript
import { usePremiumUpgradePrompt } from '../hooks/subscriptionHooks';
import { useSubscription } from '../context/SubscriptionContext';

function SplashScreen({ navigation }) {
  const { user } = useAuth();
  const { showUpgradePrompt, setShowUpgradePrompt } = usePremiumUpgradePrompt();
  
  // Show upgrade screen for free users after login
  if (user && showUpgradePrompt) {
    return (
      <PremiumUpgradeScreen
        onUpgrade={(plan) => {
          // Call payment gateway here
          console.log('User selected plan:', plan);
          navigation.replace('Main');
        }}
        onSkip={() => {
          setShowUpgradePrompt(true);
          navigation.replace('Main');
        }}
      />
    );
  }

  // ... rest of splash screen
}
```

### Step 2: Add Reward Ad Before Videos

**In `src/screens/VideoPlayerScreen.js`:**

```javascript
import { useFreeUserAds } from '../hooks/subscriptionHooks';
import RewardAdScreen from './RewardAdScreen';

function VideoPlayerScreen() {
  const { needsAdToWatch, handleAdComplete, resetAd } = useFreeUserAds();

  // Show reward ad for free users
  if (needsAdToWatch) {
    return (
      <RewardAdScreen
        onComplete={handleAdComplete}
        onSkip={() => {
          // User can skip to free tier content or go back
          navigation.goBack();
        }}
      />
    );
  }

  // Show actual video player
  return (
    <View style={styles.container}>
      <Video
        source={{ uri: videoUrl }}
        style={styles.video}
        controls
      />
    </View>
  );
}
```

### Step 3: Add Download Limit Check

**In `src/screens/DownloadsScreen.js`:**

```javascript
import { useFreeUserLimitations } from '../hooks/subscriptionHooks';

function DownloadsScreen() {
  const { hasReachedDownloadLimit, isFreeTier } = useFreeUserLimitations();

  const handleDownload = (video) => {
    if (hasReachedDownloadLimit && isFreeTier) {
      showAlert(
        'Download Limit Reached',
        'Free users can download 5 videos per month.\nUpgrade to Premium for unlimited downloads!'
      );
      return;
    }

    // Proceed with download
    downloadVideo(video);
  };

  return (
    // ... downloads UI
  );
}
```

### Step 4: Add Upgrade Option to Profile

**In `src/screens/ProfileScreen.js`:**

```javascript
import { useSubscription } from '../context/SubscriptionContext';

function ProfileScreen({ navigation }) {
  const { isFreeTier, upgrade } = useSubscription();

  const handleUpgradeClick = async () => {
    // This will integrate with your payment gateway
    const result = await upgrade('premium_monthly', {
      paymentId: 'payment_123', // From payment gateway
      method: 'card',
      amount: 9.99,
    });

    if (result.success) {
      showToast('Upgrade successful! 🎉');
    }
  };

  return (
    <View style={styles.container}>
      {isFreeTier && (
        <GradientButton
          title="Upgrade to Premium"
          onPress={handleUpgradeClick}
          style={styles.upgradeButton}
        />
      )}

      {/* Rest of profile */}
    </View>
  );
}
```

---

## Usage Everywhere

### Check If User Is Premium
```javascript
import { useSubscription } from '../context/SubscriptionContext';

const { isPremium, isFreeTier } = useSubscription();

if (isPremium) {
  // Show premium-only features
}
```

### Get Quality Level
```javascript
import { useFreeUserLimitations } from '../hooks/subscriptionHooks';

const { getVideoQuality } = useFreeUserLimitations();
const quality = getVideoQuality(); // Returns 'SD' or '4K'
```

### Manage Ads
```javascript
import { useFreeUserAds } from '../hooks/subscriptionHooks';

const { 
  needsAdToWatch,      // Free user needs to watch ad?
  handleAdComplete,    // Call when ad finishes
  resetAd              // Reset for next video
} = useFreeUserAds();
```

---

## Payment Gateway Integration

Once you choose your payment provider (Stripe, RevenueCat, Paddle, etc.):

**1. In `PremiumUpgradeScreen.js`:**
```javascript
async function handleUpgradeNow() {
  try {
    // Call your payment API
    const paymentResult = await paymentAPI.createPayment({
      plan: selectedPlan,
      userId: user.uid,
    });

    if (paymentResult.success) {
      // Upgrade user in Firebase
      await upgrade(selectedPlan, {
        paymentId: paymentResult.id,
        method: paymentResult.method,
        amount: paymentResult.amount,
      });

      navigation.replace('Main');
    }
  } catch (error) {
    Alert.alert('Payment Failed', error.message);
  }
}
```

**2. Set up webhooks** to handle payment confirmations and subscription renewals

---

## Firebase Security Rules

Add these to your Firestore security rules:

```javascript
match /subscriptions/{userId} {
  allow read: if request.auth.uid == userId;
  allow write: if request.auth.uid == userId && 
               (resource == null || 
                request.resource.data.userId == userId);
}

match /payments/{document=**} {
  allow read, create: if request.auth != null;
  allow update: if request.auth.uid == resource.data.userId;
}
```

---

## Key Functions Reference

### Subscription Service
```javascript
// Get current subscription
await getUserSubscription(userId)

// Upgrade to premium
await upgradeSubscription(userId, plan, paymentData)

// Cancel subscription (goes back to free)
await cancelSubscription(userId)

// Check if premium
await isPremiumUser(userId)

// Check if active
await hasActiveSubscription(userId)
```

### Subscription Context
```javascript
const {
  subscription,          // Current subscription object
  loading,              // Loading state
  isPremium,            // Is user premium?
  isFreeTier,           // Is user free?
  upgrade,              // Function to upgrade
  cancel,               // Function to cancel
  refreshSubscription   // Refresh from DB
} = useSubscription();
```

### Hooks
```javascript
// Show upgrade prompt
const { showUpgradePrompt, setShowUpgradePrompt } = usePremiumUpgradePrompt();

// Feature restrictions
const { 
  canStreamWithoutAd, 
  canDownload, 
  getVideoQuality, 
  hasReachedDownloadLimit 
} = useFreeUserLimitations();

// Ad management
const { 
  needsAdToWatch, 
  handleAdComplete, 
  resetAd 
} = useFreeUserAds();
```

---

## Testing the System

### Test Free User Flow:
1. Create new account
2. After login, should see Premium Upgrade Screen
3. Click "Continue Free"
4. Try to watch video → should see Reward Ad
5. Complete ad → can watch video

### Test Premium User Flow:
1. Create account
2. Simulate upgrade in Firebase: change plan to `premium_monthly`
3. After login, no upgrade screen
4. Click video → no reward ad needed
5. Video plays directly

### Quick Test with Firebase:
```javascript
// In browser console while testing:
db.collection('subscriptions').doc(userId).set({
  plan: 'premium_monthly',
  status: 'active',
  startDate: new Date(),
  renewalDate: new Date(Date.now() + 30*24*60*60*1000)
})
```

---

## Next: Revenue Setup

1. **Choose Payment Provider**
   - Stripe (most flexible)
   - RevenueCat (mobile-focused)
   - Paddle (global payment)

2. **Add Payment Gateway Integration**
   - Follow their SDK documentation
   - Implement in `PremiumUpgradeScreen.js`

3. **Set Up Webhooks**
   - Handle `payment.completed` event
   - Update subscription in Firebase

4. **Track Analytics**
   - Monitor conversion rates
   - Track upgrade events
   - Monitor churn

---

## Revenue Potential

With this system you can:
- ✅ Generate monthly recurring revenue (MRR)
- ✅ Create predictable income
- ✅ Scale ad revenue + subscription
- ✅ Offer yearly subscriptions (higher lifetime value)
- ✅ Implement freemium model

**Example Monthly Revenue (1M users):**
- 80% free tier: 800,000 users × $0 = $0
- 15% premium monthly: 150,000 users × $9.99 = $1,498,500
- 5% premium yearly: 50,000 users × $8.33/mo = $416,500
- **Total: ~$1.9M/month**

---

## Support Files

- 📘 **SUBSCRIPTION_SYSTEM_GUIDE.md** - Full technical documentation
- ✅ **SUBSCRIPTION_IMPLEMENTATION_CHECKLIST.md** - Step-by-step checklist
- 📄 This file - Quick reference

---

## Questions? 

Refer to:
1. Hook implementations in `src/hooks/subscriptionHooks.js`
2. Service logic in `src/services/subscriptionService.js`
3. Context in `src/context/SubscriptionContext.js`
4. Screen examples: `PremiumUpgradeScreen.js`, `RewardAdScreen.js`

Everything is well-documented with comments!

