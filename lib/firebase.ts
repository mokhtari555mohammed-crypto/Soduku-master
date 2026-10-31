import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Read config from Vite environment variables (or process.env fallback)
const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || process.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || process.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-app.firebaseapp.com',
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || process.env.VITE_FIREBASE_PROJECT_ID || 'demo-sudoku',
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || process.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-sudoku.appspot.com',
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || process.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:demo',
};

export const isFirebaseConfigured = Boolean(
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'demo-api-key') ||
  (process.env.VITE_FIREBASE_API_KEY && process.env.VITE_FIREBASE_API_KEY !== 'demo-api-key')
);

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export { app };
export default app;
