import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration from google-services.json
const firebaseConfig = {
  projectId: 'logistic-m6ffjt',
  storageBucket: 'logistic-m6ffjt.firebasestorage.app',
  apiKey: 'AIzaSyB2iQtmSZnvYX79Ce8YJWhqYFaXfvWfVt8',
  appId: '1:142680197853:android:a74c4e1473501c7e03a934',
  authDomain: 'logistic-m6ffjt.firebaseapp.com',
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase services
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

// Export Firebase services
export { auth, firestore, storage };
export default app;
