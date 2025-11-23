import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  PREMIUM_MONTHLY: 'premium_monthly',
  PREMIUM_YEARLY: 'premium_yearly',
};

export const PLAN_DETAILS = {
  free: {
    name: 'Free',
    price: '$0',
    period: 'Forever',
    features: [
      'Limited video streaming',
      'Watch ads to unlock videos',
      'Limited downloads (5/month)',
      'SD quality',
      'Ad-supported',
    ],
    limitations: [
      'Must watch reward ads',
      '5 downloads per month',
      'SD quality only',
      'Ad breaks between content',
    ],
  },
  premium_monthly: {
    name: 'Premium Monthly',
    price: '$9.99',
    period: 'per month',
    features: [
      'Unlimited video streaming',
      'No ads',
      'Unlimited downloads',
      '4K quality',
      'Offline viewing',
      'Early access to new content',
    ],
  },
  premium_yearly: {
    name: 'Premium Yearly',
    price: '$99.99',
    period: 'per year',
    savings: '17% OFF',
    features: [
      'Unlimited video streaming',
      'No ads',
      'Unlimited downloads',
      '4K quality',
      'Offline viewing',
      'Early access to new content',
    ],
  },
};

/**
 * Get user's current subscription
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Subscription data
 */
export const getUserSubscription = async (userId) => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', userId);
    const subscriptionSnap = await getDoc(subscriptionRef);

    if (subscriptionSnap.exists()) {
      return {
        success: true,
        data: {
          id: subscriptionSnap.id,
          ...subscriptionSnap.data(),
        },
      };
    } else {
      // Return default free subscription
      return {
        success: true,
        data: {
          id: userId,
          planId: SUBSCRIPTION_PLANS.FREE,
          plan: SUBSCRIPTION_PLANS.FREE,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      };
    }
  } catch (error) {
    console.error('Error getting subscription:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Create free subscription for new user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Created subscription data
 */
export const createFreeSubscription = async (userId) => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', userId);
    const freeSubscriptionData = {
      userId,
      plan: SUBSCRIPTION_PLANS.FREE,
      planId: SUBSCRIPTION_PLANS.FREE,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(subscriptionRef, freeSubscriptionData);

    return {
      success: true,
      data: {
        id: userId,
        ...freeSubscriptionData,
      },
    };
  } catch (error) {
    console.error('Error creating free subscription:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Upgrade user subscription
 * @param {string} userId - User ID
 * @param {string} plan - New plan (premium_monthly or premium_yearly)
 * @param {Object} paymentData - Payment information
 * @returns {Promise<Object>} - Update result
 */
export const upgradeSubscription = async (userId, plan, paymentData = null) => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', userId);
    const now = new Date();
    
    // Calculate renewal date based on plan
    let renewalDate = new Date(now);
    if (plan === SUBSCRIPTION_PLANS.PREMIUM_YEARLY) {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else if (plan === SUBSCRIPTION_PLANS.PREMIUM_MONTHLY) {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    const subscriptionData = {
      plan,
      planId: plan, // Keep both for compatibility
      status: 'active',
      startDate: now.toISOString(),
      updatedAt: now.toISOString(),
      renewalDate: renewalDate.toISOString(),
      paymentId: paymentData?.paymentId || null,
      paymentMethod: paymentData?.method || null,
      amount: paymentData?.amount || null,
    };

    // Check if subscription exists
    const subscriptionSnap = await getDoc(subscriptionRef);
    
    if (subscriptionSnap.exists()) {
      await updateDoc(subscriptionRef, subscriptionData);
    } else {
      await setDoc(subscriptionRef, {
        ...subscriptionData,
        createdAt: now.toISOString(),
        userId,
      });
    }

    return {
      success: true,
      data: subscriptionData,
    };
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Update user subscription (legacy)
 */
export const updateSubscription = upgradeSubscription;

/**
 * Cancel user subscription
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Cancel result
 */
export const cancelSubscription = async (userId) => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', userId);
    
    await updateDoc(subscriptionRef, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get user's payment history
 * @param {string} userId - User ID
 * @param {number} limitCount - Number of records to fetch
 * @returns {Promise<Object>} - Payment history
 */
export const getPaymentHistory = async (userId, limitCount = 20) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(
      paymentsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const payments = [];

    querySnapshot.forEach((doc) => {
      payments.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      data: payments,
    };
  } catch (error) {
    console.error('Error getting payment history:', error);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
};

/**
 * Add payment record
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} - Add result
 */
export const addPayment = async (paymentData) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const paymentDoc = {
      ...paymentData,
      createdAt: new Date().toISOString(),
    };

    const docRef = await setDoc(doc(paymentsRef), paymentDoc);

    return {
      success: true,
      data: {
        id: docRef.id,
        ...paymentDoc,
      },
    };
  } catch (error) {
    console.error('Error adding payment:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check if user is premium
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if premium user
 */
export const isPremiumUser = async (userId) => {
  try {
    const result = await getUserSubscription(userId);
    if (result.success && result.data) {
      const plan = result.data.plan || result.data.planId;
      return (
        plan === SUBSCRIPTION_PLANS.PREMIUM_MONTHLY ||
        plan === SUBSCRIPTION_PLANS.PREMIUM_YEARLY
      );
    }
    return false;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
};

/**
 * Check if user has active subscription
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if active subscription
 */
export const hasActiveSubscription = async (userId) => {
  try {
    const result = await getUserSubscription(userId);
    if (result.success && result.data) {
      const { status, renewalDate, expiresAt, planId, plan } = result.data;
      const currentPlan = plan || planId;
      
      // Free plan is always active
      if (currentPlan === SUBSCRIPTION_PLANS.FREE) {
        return true;
      }

      // Check if subscription is active and not expired
      if (status === 'active') {
        const expireDate = renewalDate || expiresAt;
        if (!expireDate) return true;
        return new Date(expireDate) > new Date();
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
};

/**
 * Get subscription features
 * @param {string} planId - Plan ID
 * @returns {Object} - Plan features
 */
export const getSubscriptionFeatures = (planId) => {
  const features = {
    free: {
      maxDevices: 1,
      quality: 'SD',
      downloads: false,
      ads: true,
      support: 'community',
    },
    basic: {
      maxDevices: 2,
      quality: 'HD',
      downloads: true,
      ads: false,
      support: 'email',
    },
    premium: {
      maxDevices: 4,
      quality: '4K',
      downloads: true,
      ads: false,
      support: 'priority',
      earlyAccess: true,
      familySharing: true,
    },
    annual: {
      maxDevices: 4,
      quality: '4K',
      downloads: true,
      ads: false,
      support: 'vip',
      earlyAccess: true,
      familySharing: true,
      exclusiveContent: true,
    },
  };

  return features[planId] || features.free;
};
