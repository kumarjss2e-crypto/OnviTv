import { RewardedAd, RewardedAdEventType, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

// Ad Unit IDs - Using your actual AdMob Unit IDs
const AD_UNIT_IDS = {
  REWARDED: Platform.OS === 'ios' 
    ? 'ca-app-pub-8363023387578083/9902917507'  // iOS Reward Ad Unit ID
    : 'ca-app-pub-8363023387578083/9594251157', // Android Reward Ad Unit ID
};

// Initialize ads service
export const initializeAds = async () => {
  try {
    // Initialize Google Mobile Ads SDK
    await require('react-native-google-mobile-ads').default().initialize();
    console.log('[AdsService] Google Mobile Ads initialized');
    return true;
  } catch (error) {
    console.error('[AdsService] Failed to initialize ads:', error);
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
