import { auth } from '../config/firebase';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { createUserProfile, updateLastLogin } from './userService';
import { Platform } from 'react-native';

/**
 * Authentication Service - Handles user authentication
 */

// Sign up with email and password
export const signUpWithEmail = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: displayName,
    });

    // Create user profile in Firestore
    await createUserProfile(user.uid, {
      email: user.email,
      displayName: displayName,
    });

    return { success: true, user: user };
  } catch (error) {
    console.error('Error signing up:', error);
    return { success: false, error: error.message };
  }
};

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update last login
    await updateLastLogin(user.uid);

    return { success: true, user: user };
  } catch (error) {
    console.error('Error signing in:', error);
    return { success: false, error: error.message };
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error: error.message };
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: error.message };
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Listen to auth state changes
export const onAuthStateChanged = (callback) => {
  return firebaseOnAuthStateChanged(auth, callback);
};

// Update user profile
export const updateUserProfile = async (updates) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, updates);
      return { success: true };
    } else {
      return { success: false, error: 'No user logged in' };
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }
};

// Delete user account
export const deleteUserAccount = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      // TODO: Delete user data from Firestore (use Cloud Function)
      await deleteUser(user);
      return { success: true };
    } else {
      return { success: false, error: 'No user logged in' };
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    return { success: false, error: error.message };
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    // Check if auth is properly initialized
    if (!auth) {
      throw new Error('Firebase Auth is not initialized');
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    let result;
    
    // Use popup for web, redirect for mobile
    if (Platform.OS === 'web') {
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupError) {
        // If popup fails, try redirect
        console.log('Popup failed, trying redirect:', popupError);
        await signInWithRedirect(auth, provider);
        return { success: false, error: 'Redirecting to Google sign in...' };
      }
    } else {
      // For mobile
      await signInWithRedirect(auth, provider);
      result = await getRedirectResult(auth);
      
      if (!result) {
        return { success: false, error: 'Sign in cancelled' };
      }
    }
    
    if (!result || !result.user) {
      return { success: false, error: 'No user data received' };
    }
    
    const user = result.user;
    
    // Create or update user profile in Firestore
    await createUserProfile(user.uid, {
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
    });
    
    // Update last login
    await updateLastLogin(user.uid);
    
    return { success: true, user: user };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    
    // Handle specific error codes
    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Sign in cancelled' };
    }
    
    if (error.code === 'auth/popup-blocked') {
      return { success: false, error: 'Popup was blocked. Please allow popups for this site.' };
    }
    
    if (error.code === 'auth/argument-error') {
      return { success: false, error: 'Google Sign-In is not properly configured. Please use email/password instead.' };
    }
    
    return { success: false, error: error.message || 'Failed to sign in with Google' };
  }
};
