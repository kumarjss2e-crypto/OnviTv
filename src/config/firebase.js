import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Only import GoogleSignin on native platforms (not web)
let GoogleSignin = null;
if (Platform.OS !== 'web') {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
}

// Firebase configuration - unified for web and mobile
const firebaseConfig = {
  apiKey: 'AIzaSyChegO8wNTm-lJgra7DqQE0MiQ_iv3pNGo',
  authDomain: 'onvi-iptv-player.firebaseapp.com',
  projectId: 'onvi-iptv-player',
  storageBucket: 'onvi-iptv-player.firebasestorage.app',
  messagingSenderId: '1035586796015',
  appId: '1:1035586796015:web:baded0c489037600b71e1a',
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase Auth with platform-specific persistence
let auth;
if (Platform.OS === 'web') {
  // For web, use simple getAuth (it uses browserLocalPersistence by default)
  auth = getAuth(app);
} else {
  // For native, use AsyncStorage persistence
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (error) {
    // Auth already initialized
    auth = getAuth(app);
  }
}

const firestore = getFirestore(app);
const storage = getStorage(app);

// Configure Google Sign-In for mobile
if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: '1035586796015-nkegj0292fa57vtp9m56nq67p8ek093h.apps.googleusercontent.com',
    offlineAccess: true,
  });
}

// Export Firebase services
export { auth, firestore, storage };
export default app;
