import { useEffect, useState, useRef } from 'react';
import { useSubscription } from '../context/SubscriptionContext';

/**
 * Hook to check and limit free tier features
 */
export const useFreeUserLimitations = () => {
  const { isFreeTier, subscription } = useSubscription();

  const canStreamWithoutAd = () => !isFreeTier;

  const canDownload = () => {
    if (!isFreeTier) return true;
    // Check downloads count for this month
    // This should be implemented based on your backend
    return true;
  };

  const getVideoQuality = () => {
    return isFreeTier ? 'SD' : '4K';
  };

  const hasReachedDownloadLimit = () => {
    if (!isFreeTier) return false;
    // Check if user has reached 5 downloads for this month
    return false;
  };

  return {
    canStreamWithoutAd,
    canDownload,
    getVideoQuality,
    hasReachedDownloadLimit,
    isFreeTier,
  };
};

/**
 * Hook to manage ad frequency for free users
 */
export const useFreeUserAds = () => {
  const { isFreeTier } = useSubscription();
  const [shouldShowAd, setShouldShowAd] = useState(false);
  const [adWatched, setAdWatched] = useState(false);

  useEffect(() => {
    if (isFreeTier) {
      // Show ad before allowing to watch video
      setShouldShowAd(true);
    }
  }, [isFreeTier]);

  const handleAdComplete = () => {
    setAdWatched(true);
    setShouldShowAd(false);
  };

  const resetAd = () => {
    setShouldShowAd(true);
    setAdWatched(false);
  };

  return {
    shouldShowAd,
    adWatched,
    handleAdComplete,
    resetAd,
    needsAdToWatch: isFreeTier && !adWatched,
  };
};
