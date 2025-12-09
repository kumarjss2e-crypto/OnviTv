import { firestore } from '../config/firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';

/**
 * User Service - Handles all user-related database operations
 */

// Create or update user profile
export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(firestore, 'users', userId);
    
    await setDoc(userRef, {
      email: userData.email,
      displayName: userData.displayName || '',
      photoURL: userData.photoURL || '',
      role: 'user',
      isActive: true,
      isBanned: false,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      subscription: {
        plan: 'free',
        status: 'active',
      },
      preferences: {
        theme: 'dark',
        language: 'en',
        autoPlay: true,
        videoQuality: 'auto',
        subtitlesEnabled: false,
        subtitlesLanguage: 'en',
      },
      deviceTokens: [],
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};

// Update user preferences
export const updateUserPreferences = async (userId, preferences) => {
  try {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, {
      preferences: preferences,
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating preferences:', error);
    return { success: false, error: error.message };
  }
};

// Update last login
export const updateLastLogin = async (userId) => {
  try {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating last login:', error);
    return { success: false, error: error.message };
  }
};

// Add device token for push notifications
export const addDeviceToken = async (userId, token) => {
  try {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, {
      deviceTokens: arrayUnion(token),
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding device token:', error);
    return { success: false, error: error.message };
  }
};

// Remove device token
export const removeDeviceToken = async (userId, token) => {
  try {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, {
      deviceTokens: arrayRemove(token),
    });

    return { success: true };
  } catch (error) {
    console.error('Error removing device token:', error);
    return { success: false, error: error.message };
  }
};
