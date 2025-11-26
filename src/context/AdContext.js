import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { initializeAds, createRewardedAd, loadRewardedAd, showRewardedAd, isRewardedAdLoaded } from '../services/adService';

const AdContext = createContext();

export const AdProvider = ({ children }) => {
  const [adsInitialized, setAdsInitialized] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const rewardedAdRef = useRef(null);
  const loadingAttemptRef = useRef(0);

  // Initialize ads when app starts
  useEffect(() => {
    const initAds = async () => {
      try {
        const initialized = await initializeAds();
        setAdsInitialized(initialized);
        
        if (initialized) {
          // Create and load initial rewarded ad
          console.log('[AdContext] Creating initial rewarded ad');
          rewardedAdRef.current = createRewardedAd();
          
          // Try to load with retry logic
          let loaded = false;
          for (let i = 0; i < 3; i++) {
            console.log('[AdContext] Loading rewarded ad, attempt:', i + 1);
            loaded = await loadRewardedAd(rewardedAdRef.current);
            if (loaded) {
              console.log('[AdContext] Initial rewarded ad loaded successfully');
              break;
            }
            // Wait before retrying
            await new Promise(r => setTimeout(r, 1000));
          }
          
          if (!loaded) {
            console.warn('[AdContext] Failed to load rewarded ad after 3 attempts');
          }
        }
      } catch (error) {
        console.error('[AdContext] Error initializing ads:', error);
        setAdsInitialized(false);
      }
    };

    initAds();
  }, []);

  /**
   * Show rewarded ad and get reward status
   * @returns {Promise<boolean>} - Whether user earned the reward
   */
  const showRewardedAdAndWait = async () => {
    if (!adsInitialized || !rewardedAdRef.current) {
      console.warn('[AdContext] Ads not initialized - skipping ad');
      return true; // Return true to allow content access anyway
    }

    if (!isRewardedAdLoaded(rewardedAdRef.current)) {
      console.warn('[AdContext] Rewarded ad not loaded - skipping ad');
      return true; // Return true to allow content access anyway
    }

    setAdLoading(true);
    try {
      // Set a timeout for ad display (max 15 seconds)
      const adPromise = showRewardedAd(rewardedAdRef.current);
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.warn('[AdContext] Ad display timeout - allowing content access');
          resolve(true);
        }, 15000);
      });
      
      const rewarded = await Promise.race([adPromise, timeoutPromise]);
      
      // Create new ad instance for next use
      rewardedAdRef.current = createRewardedAd();
      const preloadSuccess = await loadRewardedAd(rewardedAdRef.current);
      if (!preloadSuccess) {
        console.warn('[AdContext] Failed to preload next ad');
      }
      
      return rewarded;
    } catch (error) {
      console.error('[AdContext] Error showing rewarded ad:', error);
      return true; // Return true to allow content access anyway on error
    } finally {
      setAdLoading(false);
    }
  };

  /**
   * Check if ads are ready to show
   * @returns {boolean}
   */
  const isAdsReady = () => {
    return adsInitialized && isRewardedAdLoaded(rewardedAdRef.current);
  };

  /**
   * Preload next ad
   */
  const preloadNextAd = async () => {
    if (!adsInitialized) {
      console.warn('[AdContext] Ads not initialized, cannot preload');
      return;
    }
    
    try {
      console.log('[AdContext] Preloading next ad');
      if (!rewardedAdRef.current || !isRewardedAdLoaded(rewardedAdRef.current)) {
        rewardedAdRef.current = createRewardedAd();
        
        let loaded = false;
        for (let i = 0; i < 2; i++) {
          loaded = await loadRewardedAd(rewardedAdRef.current);
          if (loaded) {
            console.log('[AdContext] Next ad preloaded successfully');
            break;
          }
          await new Promise(r => setTimeout(r, 500));
        }
        
        if (!loaded) {
          console.warn('[AdContext] Failed to preload next ad');
        }
      }
    } catch (error) {
      console.error('[AdContext] Error preloading ad:', error);
    }
  };

  const value = {
    adsInitialized,
    adLoading,
    showRewardedAdAndWait,
    isAdsReady,
    preloadNextAd,
  };

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
};

export const useAds = () => {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAds must be used within AdProvider');
  }
  return context;
};
