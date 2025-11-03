import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

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
          planId: 'free',
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
 * Update user subscription
 * @param {string} userId - User ID
 * @param {string} planId - New plan ID
 * @returns {Promise<Object>} - Update result
 */
export const updateSubscription = async (userId, planId) => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', userId);
    const now = new Date();
    
    // Calculate expiry date based on plan
    let expiresAt = new Date(now);
    if (planId === 'annual') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else if (planId !== 'free') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt = null; // Free plan doesn't expire
    }

    const subscriptionData = {
      planId,
      status: 'active',
      updatedAt: now.toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
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
    console.error('Error updating subscription:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

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
 * Check if user has active subscription
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if active subscription
 */
export const hasActiveSubscription = async (userId) => {
  try {
    const result = await getUserSubscription(userId);
    if (result.success && result.data) {
      const { status, expiresAt, planId } = result.data;
      
      // Free plan is always active
      if (planId === 'free') {
        return true;
      }

      // Check if subscription is active and not expired
      if (status === 'active') {
        if (!expiresAt) return true;
        return new Date(expiresAt) > new Date();
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
