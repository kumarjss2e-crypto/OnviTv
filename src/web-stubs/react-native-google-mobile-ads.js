// Web stub for react-native-google-mobile-ads
export const TestIds = {
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  INTERSTITIAL_VIDEO: 'ca-app-pub-3940256099942544/8691691433',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  REWARDED_INTERSTITIAL: 'ca-app-pub-3940256099942544/5354046379',
  APP_OPEN: 'ca-app-pub-3940256099942544/3419831104',
  NATIVE_ADVANCED: 'ca-app-pub-3940256099942544/2247696110',
  NATIVE_ADVANCED_VIDEO: 'ca-app-pub-3940256099942544/1044960115',
};

export const AdEventType = {
  LOADED: 'loaded',
  ERROR: 'error',
  OPENED: 'opened',
  CLICKED: 'clicked',
  CLOSED: 'closed',
};

export const RewardedAdEventType = {
  LOADED: 'loaded',
  ERROR: 'error',
  OPENED: 'opened',
  CLICKED: 'clicked',
  CLOSED: 'closed',
  EARNED_REWARD: 'earned_reward',
};

export class RewardedAd {
  static createForAdRequest(adUnitId) {
    return {
      adUnitId,
      loaded: false,
      addAdEventListener: () => () => {},
      load: async () => {},
      show: async () => {},
    };
  }
}

export class RewardedInterstitialAd {
  static createForAdRequest(adUnitId) {
    return {
      adUnitId,
      loaded: false,
      addAdEventListener: () => () => {},
      load: async () => {},
      show: async () => {},
    };
  }
}

export class InterstitialAd {
  static createForAdRequest(adUnitId) {
    return {
      adUnitId,
      loaded: false,
      addAdEventListener: () => () => {},
      load: async () => {},
      show: async () => {},
    };
  }
}

export class AppOpenAd {
  static createForAdRequest(adUnitId) {
    return {
      adUnitId,
      loaded: false,
      addAdEventListener: () => () => {},
      load: async () => {},
      show: async () => {},
    };
  }
}

export const BannerAd = () => null;
export const NativeAdView = () => null;
export const MediaView = () => null;
export const Text = () => null;
export const CallToActionView = () => null;
export const StarRatingView = () => null;
export const StoreView = () => null;
export const IconView = () => null;
export const PriceView = () => null;
export const AdvertiserView = () => null;
export const HeadlineView = () => null;
export const TaglineView = () => null;

// Default export for mobileAds()
const mobileAds = () => ({
  initialize: async () => ({}),
  setRequestConfiguration: () => {},
});

export default mobileAds;
