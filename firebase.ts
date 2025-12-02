// Import the functions you need from the SDKs you need
// FIX: Using namespace import for firebase/app to work around potential module resolution issues.
import * as firebaseApp from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBc0AOawSmcmuitITiSQSFBDUUoVPiJXmM",
  authDomain: "cheesyocceanpizzaapp.firebaseapp.com",
  projectId: "cheesyocceanpizzaapp",
  storageBucket: "cheesyocceanpizzaapp.firebasestorage.app",
  messagingSenderId: "454157345930",
  appId: "1:454157345930:web:af9b1f3dd99ff090863973"
};

// Initialize Firebase
const app = firebaseApp.initializeApp(firebaseConfig);

// Export the Firestore database instance
export const db = getFirestore(app);