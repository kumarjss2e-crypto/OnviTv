import { Platform } from 'react-native';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

// AdMob App IDs
export const ADMOB_APP_IDS = {
  ios: 'ca-app-pub-8363023387578083~4485394709',
  android: 'ca-app-pub-8363023387578083~2084137233',
};

// Reward Ad Unit IDs
export const REWARD_AD_UNIT_IDS = {
  ios: 'ca-app-pub-8363023387578083/9902917507',
  android: 'ca-app-pub-8363023387578083/9594251157',
};

// Get the appropriate ad unit ID based on platform
export const getRewardAdUnitId = () => {
  if (Platform.OS === 'ios') {
    return REWARD_AD_UNIT_IDS.ios;
  } else if (Platform.OS === 'android') {
    return REWARD_AD_UNIT_IDS.android;
  }
  // Return test ID for web/other platforms
  return TestIds.REWARDED;
};

// Create a rewarded ad instance
export const createRewardedAd = () => {
  const adUnitId = getRewardAdUnitId();
  
  const rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
    keywords: ['fashion', 'clothing'],
  });

  return rewardedAd;
};

/**
 * Load and show a reward ad
 * @param {Function} onRewardEarned - Callback when user completes watching ad
 * @param {Function} onAdClosed - Callback when ad is closed
 * @param {Function} onAdFailedToLoad - Callback on ad load failure
 * @returns {Promise<boolean>} - True if ad was shown
 */
export const showRewardAd = async (
  onRewardEarned,
  onAdClosed,
  onAdFailedToLoad
) => {
  try {
    const rewardedAd = createRewardedAd();

    // Set up event listeners
    const unsubscribeLoaded = rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        console.log('Reward ad loaded, showing...');
        rewardedAd.show();
      }
    );

    const unsubscribeEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log('User earned reward:', reward);
        onRewardEarned?.(reward);
      }
    );

    const unsubscribeClosed = rewardedAd.addAdEventListener(
      RewardedAdEventType.CLOSED,
      () => {
        console.log('Reward ad closed');
        unsubscribeLoaded();
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeFailed();
        onAdClosed?.();
      }
    );

    const unsubscribeFailed = rewardedAd.addAdEventListener(
      RewardedAdEventType.ERROR,
      (error) => {
        console.error('Reward ad failed to load:', error);
        unsubscribeLoaded();
        unsubscribeEarned();
        unsubscribeClosed();
        unsubscribeFailed();
        onAdFailedToLoad?.(error);
      }
    );

    // Load the ad
    console.log('Loading reward ad with unit ID:', getRewardAdUnitId());
    await rewardedAd.load();

    return true;
  } catch (error) {
    console.error('Error showing reward ad:', error);
    onAdFailedToLoad?.(error);
    return false;
  }
};

/**
 * Preload a reward ad (load without showing)
 * @returns {Promise<RewardedAd|null>}
 */
export const preloadRewardAd = async () => {
  try {
    const rewardedAd = createRewardedAd();
    await rewardedAd.load();
    return rewardedAd;
  } catch (error) {
    console.error('Error preloading reward ad:', error);
    return null;
  }
};
