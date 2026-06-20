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
  GYMS: 'gyms',
  ADMINS: 'users',
  MEMBERS: 'members',
  INVOICES: 'payments',
  REGISTRATIONS: 'registrations',
  ACCESS_EVENTS: 'attendance',
  AUDIT_LOGS: 'auditLogs',
  PLANS: 'membershipPlans',
  TRAINERS: 'employees',
  EMPLOYEES: 'employees',
  EMPLOYEE_REGISTRATIONS: 'employeeRegistrations',
  EXPENSES: 'expenses',
  INCOME: 'payments',
  SMS_LOGS: 'smsLogs',
  GYM_SETTINGS: 'gymSettings',
  SUBSCRIPTIONS: 'subscriptions',
  SUPPORT_TICKETS: 'supportTickets',
  ANNOUNCEMENTS: 'announcements',
  NOTIFICATIONS: 'notifications',
  ACCESS_LOGS: 'accessLogs',
  SAAS_PLANS: 'saasPlans',
};

// Default organization ID (single-tenant for now)
export const DEFAULT_ORG_ID = 'gym_ascend_hq';

export default app;
