import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration from google-services.json
const firebaseConfig = {
  projectId: 'onvi-iptv-player',
  storageBucket: 'onvi-iptv-player.firebasestorage.app',
  apiKey: 'AIzaSyB7C2uB1OuaEnJj3yskaFRqaWsCw1ahMro',
  appId: '1:1035586796015:android:817820a6bafa8090b71e1a',
  authDomain: 'onvi-iptv-player.firebaseapp.com',
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

// Export Firebase services
export { auth, firestore, storage };
export default app;
