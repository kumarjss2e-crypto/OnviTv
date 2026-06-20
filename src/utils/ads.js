// Web stub for Google Mobile Ads
export const TestIds = {};
export const AdEventType = {};
export const RewardedAdEventType = {};
export const RewardedAd = { createForAdRequest: () => null };
export const RewardedInterstitialAd = { createForAdRequest: () => null };
export const InterstitialAd = { createForAdRequest: () => null };
export const AppOpenAd = { createForAdRequest: () => null };
export const BannerAd = () => null;
export const NativeAdView = () => null;
export const MediaView = () => null;

const mobileAds = () => ({
  initialize: async () => ({}),
  setRequestConfiguration: () => {},
});

export default mobileAds;
