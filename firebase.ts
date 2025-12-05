// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Read Firebase config from Vite environment variables, with fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBc0AOawSmcmuitITiSQSFBDUUoVPiJXmM',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'cheesyocceanpizzaapp.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cheesyocceanpizzaapp',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'cheesyocceanpizzaapp.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '454157345930',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:454157345930:web:af9b1f3dd99ff090863973',
};

// Initialize Firebase app (uses provided env values when set)
const app = initializeApp(firebaseConfig);

// Export the Firestore database instance
export const db = getFirestore(app);