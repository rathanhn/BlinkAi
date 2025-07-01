
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
let storage: FirebaseStorage;
let db: Firestore;

try {
  auth = getAuth(app);
  storage = getStorage(app);
  db = getFirestore(app);
} catch (e) {
  // This can happen on the server if the environment variables are not set.
  // In that case, we'll just log an error. The app will fail gracefully
  // when trying to use these services, rather than crashing on startup.
  console.error(
    'Firebase initialization failed. Make sure your Firebase environment variables are set correctly in your .env file.',
    e
  );
  auth = null as any;
  storage = null as any;
  db = null as any;
}


export { app, auth, storage, db };
