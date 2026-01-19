import { Platform } from 'react-native';

console.log('[adService:INIT] Platform.OS =', Platform.OS);

// Only import mobile ads on native platforms
let RewardedAd, RewardedAdEventType, TestIds, AdEventType;
if (Platform.OS !== 'web') {
  console.log('[adService:INIT] Attempting to require Google Mobile Ads');
  try {
    const ads = require('react-native-google-mobile-ads');
    RewardedAd = ads.RewardedAd;
    RewardedAdEventType = ads.RewardedAdEventType;
    TestIds = ads.TestIds;
    AdEventType = ads.AdEventType;
    console.log('[adService:INIT] Google Mobile Ads loaded successfully');
  } catch (e) {
    console.error('[adService:INIT] Failed to load Google Mobile Ads:', e.message);
  }
} else {
  console.log('[adService:INIT] Platform is web, skipping Google Mobile Ads import');
}

// Ad Unit IDs - Using your actual AdMob Unit IDs
const AD_UNIT_IDS = {
  REWARDED: Platform.OS === 'ios' 
    ? 'ca-app-pub-8363023387578083/9902917507'  // iOS Reward Ad Unit ID
    : 'ca-app-pub-8363023387578083/9594251157', // Android Reward Ad Unit ID
};

// Initialize ads service
export const initializeAds = async () => {
  console.log('[initializeAds] Starting, Platform.OS =', Platform.OS);
  try {
    // Skip ads initialization on web platform
    if (Platform.OS === 'web') {
      console.log('[initializeAds] Skipping on web platform');
      return true;
    }
    
    console.log('[initializeAds] Attempting to initialize Google Mobile Ads');
    // Initialize Google Mobile Ads SDK
    const mobileAds = require('react-native-google-mobile-ads').default;
    console.log('[initializeAds] mobileAds type:', typeof mobileAds);
    await mobileAds().initialize();
    console.log('[initializeAds] Google Mobile Ads initialized successfully');
    return true;
  } catch (error) {
    console.error('[initializeAds] Failed to initialize ads:', error.message);
    return false;
  }
};

/**
 * Create a rewarded ad instance
 * @returns {RewardedAd} - Rewarded ad instance
 */
export const createRewardedAd = () => {
  return RewardedAd.createForAdRequest(AD_UNIT_IDS.REWARDED, {
    keywords: ['entertainment', 'movies', 'tv', 'streaming'],
    requestConfiguration: {
      keywords: ['entertainment', 'movies', 'tv', 'streaming'],
    },
  });
};

/**
 * Load a rewarded ad
 * @param {RewardedAd} rewardedAd - The rewarded ad instance
 * @returns {Promise<boolean>} - Whether the ad loaded successfully
 */
export const loadRewardedAd = async (rewardedAd) => {
  try {
    await rewardedAd.load();
    console.log('[AdsService] Rewarded ad loaded successfully');
    return true;
  } catch (error) {
    console.error('[AdsService] Failed to load rewarded ad:', error);
    return false;
  }
};

/**
 * Show a rewarded ad and return a promise that resolves when user is rewarded
 * @param {RewardedAd} rewardedAd - The rewarded ad instance
 * @returns {Promise<boolean>} - Whether the reward was given
 */
export const showRewardedAd = (rewardedAd) => {
  return new Promise((resolve) => {
    let rewardEarned = false;

    // Listener for when user earns reward
    const unsubscribeEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        console.log('[AdsService] User earned reward');
        rewardEarned = true;
      }
    );

    // Listener for when ad is closed
    const unsubscribeClosed = rewardedAd.addAdEventListener(
      RewardedAdEventType.CLOSED,
      () => {
        console.log('[AdsService] Rewarded ad closed. Reward earned:', rewardEarned);
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
        resolve(rewardEarned);
      }
    );

    // Listener for ad errors
    const unsubscribeError = rewardedAd.addAdEventListener(
      RewardedAdEventType.ERROR,
      (error) => {
        console.error('[AdsService] Rewarded ad error:', error);
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeError();
        resolve(true); // Allow access anyway on error
      }
    );

    // Show the ad
    try {
      rewardedAd.show();
    } catch (error) {
      console.error('[AdsService] Failed to show rewarded ad:', error);
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
      resolve(true); // Allow access anyway on error
    }
  });
};

/**
 * Check if a rewarded ad is loaded
 * @param {RewardedAd} rewardedAd - The rewarded ad instance
 * @returns {boolean} - Whether the ad is loaded
 */
export const isRewardedAdLoaded = (rewardedAd) => {
  return rewardedAd && rewardedAd.loaded;
};

/**
 * Get a fresh rewarded ad instance
 * @returns {RewardedAd} - Fresh rewarded ad instance
 */
export const getFreshRewardedAd = () => {
  return createRewardedAd();
};
