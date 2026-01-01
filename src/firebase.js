import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCtoiu476Nd765FSsspVzIgl4hOqjwL-TU",
  authDomain: "misadventuring-live.firebaseapp.com",
  projectId: "misadventuring-live",
  storageBucket: "misadventuring-live.firebasestorage.app",
  messagingSenderId: "567713213764",
  appId: "1:567713213764:web:496b98cc82db211be77b11",
  measurementId: "G-4KLYEVJ184"
};

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
      console.error('❌ Firebase connection FAILED:', error.code, error.message);
      console.error('Full error:', error);
    }
  }, 2000);
}
