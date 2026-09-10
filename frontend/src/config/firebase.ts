import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAGFqqAYzbOEe-0SXjhqhqoG4J094fv--c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "healthcare-eca0e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "healthcare-eca0e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "healthcare-eca0e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "101548902277",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:101548902277:web:072972b4bc99612dd1a6ec",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-EQC9D7CBBZ"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Analytics safely (works in browser environments)
export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
