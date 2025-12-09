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

  console.log('[SubscriptionProvider] RENDER - user:', user?.uid, 'loading:', loading, 'isPremium:', isPremium);

  // Fetch user subscription on mount or when user changes
  useEffect(() => {
    console.log('[SubscriptionProvider] EFFECT START - user changed:', user?.uid);
    
    const fetchSubscription = async () => {
      if (user) {
        console.log('[SubscriptionProvider] User exists, fetching subscription for:', user.uid);
        setLoading(true);
        try {
          let result = await getUserSubscription(user.uid);
          
          console.log('[SubscriptionProvider] Subscription fetch result:', {
            userId: user.uid,
            success: result.success,
            hasData: !!result.data,
            planId: result.data?.planId,
            plan: result.data?.plan,
          });
          
          // If no subscription exists, create a free one
          if (!result.data) {
            console.log('[SubscriptionProvider] No subscription found, creating free tier for:', user.uid);
            result = await createFreeSubscription(user.uid);
            console.log('[SubscriptionProvider] Free subscription created:', {
              success: result.success,
              plan: result.data?.plan,
            });
          }

          if (result.success) {
            console.log('[SubscriptionProvider] Setting subscription state:', result.data);
            setSubscription(result.data);
            const premium = await isPremiumUser(user.uid);
            console.log('[SubscriptionProvider] isPremiumUser check result:', {
              userId: user.uid,
              isPremium: premium,
              planId: result.data?.planId,
            });
            setIsPremium(premium);
          } else {
            console.error('[SubscriptionProvider] Subscription fetch failed:', result);
          }
        } catch (error) {
          console.error('[SubscriptionProvider] Error fetching subscription:', error);
        } finally {
          console.log('[SubscriptionProvider] Setting loading = false');
          setLoading(false);
        }
      } else {
        console.log('[SubscriptionProvider] No user, clearing subscription state');
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

  const value = {
    subscription,
    loading,
    isPremium,
    isFreeTier,
    upgrade,
    cancel,
    refreshSubscription,
  };

  console.log('[SubscriptionProvider] PROVIDING VALUE:', {
    loading,
    isPremium,
    isFreeTier,
    plan: subscription?.plan,
    planId: subscription?.planId,
  });

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
