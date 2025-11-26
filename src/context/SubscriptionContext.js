import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';
import {
  getUserSubscription,
  createFreeSubscription,
  upgradeSubscription,
  cancelSubscription,
  isPremiumUser,
  SUBSCRIPTION_PLANS,
} from '../services/subscriptionService';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [hasSeenUpgradePrompt, setHasSeenUpgradePrompt] = useState(false);

  // Fetch user subscription on mount or when user changes
  useEffect(() => {
    const fetchSubscription = async () => {
      if (user) {
        setLoading(true);
        try {
          let result = await getUserSubscription(user.uid);
          
          console.log('[SubscriptionContext] Subscription fetched:', {
            userId: user.uid,
            subscriptionData: result.data,
            success: result.success
          });
          
          // If no subscription exists, create a free one
          if (!result.data) {
            console.log('[SubscriptionContext] No subscription found, creating free tier');
            result = await createFreeSubscription(user.uid);
          }

          if (result.success) {
            setSubscription(result.data);
            const premium = await isPremiumUser(user.uid);
            console.log('[SubscriptionContext] Premium status:', {
              isPremium: premium,
              planId: result.data?.planId,
              plan: result.data?.plan
            });
            setIsPremium(premium);
          }
        } catch (error) {
          console.error('[SubscriptionContext] Error fetching subscription:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setSubscription(null);
        setIsPremium(false);
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const upgrade = async (plan, paymentData = null) => {
    try {
      const result = await upgradeSubscription(user.uid, plan, paymentData);
      if (result.success) {
        setSubscription(result.data);
        const premium = await isPremiumUser(user.uid);
        setIsPremium(premium);
        return { success: true };
      }
      return result;
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      return { success: false, error: error.message };
    }
  };

  const cancel = async () => {
    try {
      const result = await cancelSubscription(user.uid);
      if (result.success) {
        const newResult = await getUserSubscription(user.uid);
        setSubscription(newResult.data);
        setIsPremium(false);
        return { success: true };
      }
      return result;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return { success: false, error: error.message };
    }
  };

  const refreshSubscription = async () => {
    if (user) {
      try {
        const result = await getUserSubscription(user.uid);
        if (result.success) {
          setSubscription(result.data);
          const premium = await isPremiumUser(user.uid);
          setIsPremium(premium);
        }
      } catch (error) {
        console.error('Error refreshing subscription:', error);
      }
    }
  };

  const isFreeTier = !isPremium;
  const isFreeAndHasNotSeenPrompt = isFreeTier && !hasSeenUpgradePrompt;

  const value = {
    subscription,
    loading,
    isPremium,
    isFreeTier,
    isFreeAndHasNotSeenPrompt,
    hasSeenUpgradePrompt,
    setHasSeenUpgradePrompt,
    upgrade,
    cancel,
    refreshSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
