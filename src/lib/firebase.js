/**
 * Firebase Configuration & Initialization
 * =========================================
 * Central Firebase setup for the Ascend Management Dashboard.
 * Exports initialized Firebase Auth and Firestore instances.
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase project configuration (fitcore-ascend-production)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};


// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Firebase Auth instance
export const auth = getAuth(app);

// Cloud Firestore instance
export const db = getFirestore(app);

// ─── Collection Name Constants ───────────────────────────────────────
// Centralized collection names to prevent typo bugs across the codebase.
export const COLLECTIONS = {
  ORGANIZATIONS: 'organizations',
  MEMBERS: 'members',
  INVOICES: 'invoices',
  REGISTRATIONS: 'registrations',
  ACCESS_EVENTS: 'access_events',
  AUDIT_LOGS: 'audit_logs',
  PLANS: 'plans',
  TRAINERS: 'trainers',
  ADMINS: 'admins',
  EMPLOYEES: 'employees',
  EMPLOYEE_REGISTRATIONS: 'employee_registrations',
  EXPENSES: 'expenses',
  INCOME: 'income',
  SMS_LOGS: 'sms_logs',
};

// Default organization ID (single-tenant for now)
export const DEFAULT_ORG_ID = 'org_ascend_hq';

export default app;
