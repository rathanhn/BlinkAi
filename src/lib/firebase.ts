
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
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

let app: FirebaseApp | undefined;
let auth: Auth;
let storage: FirebaseStorage;
let db: Firestore;

// Only initialize Firebase if the API key is provided.
// This prevents the app from crashing on startup if the .env file is missing.
if (firebaseConfig.apiKey) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    storage = getStorage(app);
    db = getFirestore(app);
  } catch (e) {
    console.error(
      'Firebase initialization failed. This is likely due to an invalid Firebase config in your .env file.',
      e
    );
    // Set to null so the rest of the app doesn't break
    auth = null as any;
    storage = null as any;
    db = null as any;
  }
} else {
  console.warn(
    'Firebase config is missing. The app will run, but authentication and database features will be disabled. Please set your Firebase environment variables in the .env file.'
  );
  auth = null as any;
  storage = null as any;
  db = null as any;
}


export { app, auth, storage, db };
