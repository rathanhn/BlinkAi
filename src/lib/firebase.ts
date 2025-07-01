
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { FirebaseStorage } from 'firebase/storage';
import type { Firestore } from 'firebase/firestore';

// This file is now a placeholder to prevent import errors.
// The application is using a localStorage-based mock service instead.

const app: FirebaseApp | undefined = undefined;
const auth: Auth = null as any;
const storage: FirebaseStorage = null as any;
const db: Firestore = null as any;

export { app, auth, storage, db };
