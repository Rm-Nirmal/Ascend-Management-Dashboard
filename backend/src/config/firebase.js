import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables (fallback in case it wasn't loaded at entry)
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.projectId || firebaseConfig.projectId === 'your-project-id') {
  console.warn('⚠️ Warning: VITE_FIREBASE_PROJECT_ID is placeholder or not defined in your .env file.');
}

console.log(`[Firebase] Initializing client connection for project: ${firebaseConfig.projectId || 'N/A'}`);

const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
