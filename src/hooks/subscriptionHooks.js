import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hook to handle premium upgrade prompt
 * Shows upgrade screen for free users after login
 */
export const usePremiumUpgradePrompt = () => {
  const { user } = useAuth();
  const { isFreeTier, hasSeenUpgradePrompt, setHasSeenUpgradePrompt } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    const checkAndShowPrompt = async () => {
      if (user && isFreeTier && !hasSeenUpgradePrompt) {
        // Check if we've already shown it in this session
        const sessionKey = `premium_prompt_shown_${user.uid}`;
        const alreadyShown = await AsyncStorage.getItem(sessionKey);

        if (!alreadyShown) {
          setShowUpgradePrompt(true);
          await AsyncStorage.setItem(sessionKey, 'true');
          setHasSeenUpgradePrompt(true);
        }
      }
    };

    checkAndShowPrompt();
  }, [user, isFreeTier, hasSeenUpgradePrompt]);

  return {
    showUpgradePrompt,
    setShowUpgradePrompt,
  };
};

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
