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
  OAuthProvider,
  signInWithPopup,
  signInWithCredential
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

// Sign in with Apple
export const signInWithApple = async () => {
  try {
    // Check if auth is properly initialized
    if (!auth) {
      throw new Error('Firebase Auth is not initialized');
    }

    // Only available on iOS
    if (Platform.OS !== 'ios') {
      return { success: false, error: 'Apple Sign-In is only available on iOS' };
    }

    let AppleAuthentication;
    try {
      AppleAuthentication = require('expo-apple-authentication').AppleAuthentication;
    } catch (e) {
      console.warn('Apple Authentication module not available.');
      return { success: false, error: 'Apple Sign-In not available' };
    }

    try {
      // Request Apple Sign-In
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.Scope.FULL_NAME,
          AppleAuthentication.Scope.EMAIL,
        ],
      });

      if (!credential) {
        return { success: false, error: 'No credential returned from Apple' };
      }

      // Create an OAuth credential for Firebase
      const { identityToken, authorizationCode } = credential;

      if (!identityToken) {
        return { success: false, error: 'No identity token returned from Apple' };
      }

      // Create a Firebase credential with the Apple token
      const provider = new OAuthProvider('apple.com');
      const appleCredential = provider.credential({
        idToken: identityToken,
        rawNonce: authorizationCode, // optional, but recommended for security
      });

      // Sign in to Firebase with the Apple credential
      const result = await signInWithCredential(auth, appleCredential);
      if (!result || !result.user) {
        return { success: false, error: 'No user data received' };
      }

      const user = result.user;

      // Extract full name if available
      const fullName = credential.fullName;
      let displayName = user.displayName || '';
      if (fullName && (fullName.givenName || fullName.familyName)) {
        displayName = `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim();
        // Update Firebase user profile with the full name
        if (displayName) {
          await updateProfile(user, { displayName });
        }
      }

      // Create or update user profile in Firestore
      await createUserProfile(user.uid, {
        email: user.email,
        displayName: displayName || '',
        photoURL: user.photoURL || '',
      });

      // Update last login
      await updateLastLogin(user.uid);

      return { success: true, user: user };
    } catch (error) {
      console.log('Apple sign-in error:', error);
      if (error.code === 'ERR_CANCELED' || error.message?.includes('canceled')) {
        return { success: false, error: 'Sign in cancelled' };
      }
      return { success: false, error: error.message || 'Failed to sign in with Apple' };
    }
  } catch (error) {
    console.error('Error signing in with Apple:', error);
    return { success: false, error: error.message || 'Failed to sign in with Apple' };
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

    let user;
    
    if (Platform.OS === 'web') {
      // Web: Use Firebase popup
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      try {
        const result = await signInWithPopup(auth, provider);
        if (!result || !result.user) {
          return { success: false, error: 'No user data received' };
        }
        user = result.user;
      } catch (popupError) {
        console.log('Google sign-in error:', popupError);
        return { success: false, error: popupError.message || 'Failed to sign in with Google' };
      }
    } else {
      // Mobile: Use Google Sign-In SDK via dynamic require to avoid web bundling
      let GoogleSignin;
      try {
        GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
      } catch (e) {
        console.warn('Google Sign-In module not available on this platform.');
        return { success: false, error: 'Google Sign-In not available' };
      }

      try {
        // On Android, ensure Google Play Services are available
        if (Platform.OS === 'android') {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        }
        
        // Get user info from Google
        const { idToken } = await GoogleSignin.signIn();
        
        if (!idToken) {
          return { success: false, error: 'No ID token returned from Google' };
        }
        
        // Create a Google credential with the token
        const googleCredential = GoogleAuthProvider.credential(idToken);
        
        // Sign in to Firebase with the Google credential
        const result = await signInWithCredential(auth, googleCredential);
        if (!result || !result.user) {
          return { success: false, error: 'No user data received' };
        }
        user = result.user;
      } catch (error) {
        console.log('Google sign-in error:', error);
        if (error.code === 'SIGN_IN_CANCELLED' || error.message?.includes('canceled')) {
          return { success: false, error: 'Sign in cancelled' };
        }
        return { success: false, error: error.message || 'Failed to sign in with Google' };
      }
    }
    
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
