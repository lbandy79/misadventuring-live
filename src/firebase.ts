import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Extend Window interface for our test flag
declare global {
  interface Window {
    __firebaseTestRan?: boolean;
  }
}

// Firebase config — values loaded from Vite env vars (.env.local)
// See .env.example for the required keys.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    'Firebase env vars missing. Copy .env.example to .env.local and fill in VITE_FIREBASE_* values.'
  );
}

// Prevent duplicate initialization (Vite HMR fix)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

console.log('🔥 Firebase ready - project:', firebaseConfig.projectId);

// Test Firebase connection (only once)
if (!window.__firebaseTestRan) {
  window.__firebaseTestRan = true;
  setTimeout(async () => {
    console.log('🧪 Testing Firebase connection...');
    try {
      const testRef = doc(db, 'test', 'connection-test');
      await setDoc(testRef, { 
        timestamp: new Date().toISOString(),
        message: 'Connection test from browser'
      });
      console.log('✅ Firebase connection SUCCESS!');
    } catch (error) {
      const firebaseError = error as { code?: string; message?: string };
      console.error('❌ Firebase connection FAILED:', firebaseError.code, firebaseError.message);
      console.error('Full error:', error);
    }
  }, 2000);
}
