# Subscription System Refactor - Modal Implementation

## Overview
Moving subscription/premium upgrade logic from SplashScreen to Home screen with a modal presentation that works across Android, iOS, and Web.

## Changes Made

### 1. SplashScreen (COMPLETE ✅)
- **Reverted to simple navigation flow**
- Removed all subscription checks from SplashScreen
- Removed `useSubscription()` hook dependency
- Now only checks:
  1. Is user logged in? → Go to Main
  2. Has seen onboarding? → Go to Login
  3. First time? → Show "Continue" button

### 2. SubscriptionContext (NO CHANGES)
- Remains as-is in `src/context/SubscriptionContext.js`
- Still provides: `isPremium`, `isFreeTier`, `upgrade()`, `cancel()`
- Still depends on user being logged in for subscription data

### 3. Home Screen - NEW IMPLEMENTATION NEEDED
**Location:** `src/screens/HomeScreen.js` (or main tab screen)

**New Requirements:**
- Use `useSubscription()` hook to get subscription status
- Show modal on first render if user is free tier
- Modal should:
  - Display upgrade offer
  - Show pricing plans
  - Have "Upgrade" and "Maybe Later" buttons
  - Not show again on same session (or allow dismissal)
  - Work on Android, iOS, and Web

**Implementation Steps:**
1. Import `useSubscription()` 
2. Track modal visibility state: `const [showUpgradeModal, setShowUpgradeModal] = useState(true)`
3. Show modal when `isFreeTier === true && firstRender`
4. Use `Modal` component (React Native) that works cross-platform
5. Handle modal dismiss with "Maybe Later" button

### 4. PremiumUpgrade Screen (DEPRECATE)
- No longer needed on splash flow
- Consider converting to modal content or removing
- For now, keep but won't be auto-navigated to

## Technical Details

### Platform Compatibility
- **Android:** Modal works natively
- **iOS:** Modal works natively  
- **Web:** Use React Native for Web compatible components

### Modal Implementation
```javascript
// In HomeScreen.js
import { Modal } from 'react-native';
import { useSubscription } from '../context/SubscriptionContext';

const HomeScreen = () => {
  const { isFreeTier } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(true);

  return (
    <View>
      {/* Main content */}
      
      {/* Upgrade Modal */}
      <Modal
        visible={showUpgradeModal && isFreeTier}
        transparent={true}
        animationType="slide"
      >
        {/* Upgrade modal content */}
      </Modal>
    </View>
  );
};
```

### Flow After Changes
```
SplashScreen (Simple)
  ├─ User logged in? → Main Tab Navigator
  │   └─ HomeScreen (Shows Upgrade Modal for Free Users)
  ├─ Not logged in, seen onboarding? → Login
  └─ First time? → Show Continue button
      └─ OnboardingScreen → Login → Main
```

## Files to Modify Next

1. **HomeScreen.js** - Add subscription modal logic
2. **Create UpgradeModal.js** - Extract modal content as component
3. **Remove unused imports** - Remove PremiumUpgrade navigation if not used elsewhere

## Testing Checklist

- [ ] SplashScreen navigates correctly (no login)
- [ ] SplashScreen navigates correctly (with login)
- [ ] SplashScreen navigates correctly (first time)
- [ ] HomeScreen shows modal for free tier users
- [ ] Modal "Upgrade" button works
- [ ] Modal "Maybe Later" button dismisses modal
- [ ] Modal doesn't show for premium users
- [ ] Works on Android
- [ ] Works on iOS (if available)
- [ ] Works on Web

## Notes
- Subscription data depends on user being logged in
- Modal should only show once per session (can dismiss)
- SubscriptionContext will continue to handle subscription logic
- This keeps concerns separated: auth→splash, content→home, upgrades→modal
