/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// ─── Firebase Imports ────────────────────────────────────────────────
import { db, auth, COLLECTIONS, DEFAULT_ORG_ID } from '../lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword,
} from 'firebase/auth';

const DashboardContext = createContext();

// ─── Pure Helper Functions (no side effects) ─────────────────────────

/**
 * Build a new member data object suitable for writing to Firestore.
 * Generates member_code, qr_token, and sets defaults.
 */
const helperCreateMemberObject = (memberData, memberCode) => {
  const now = new Date();
  const countdownEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    gymId: DEFAULT_ORG_ID,
    member_code: memberCode,
    joined_at: now.toISOString().split('T')[0],
    status: 'active',
    qr_token: `qr_token_${memberCode}_${Date.now()}`,
    weight_kg: memberData.weight_kg ? parseFloat(memberData.weight_kg) : 75.0,
    height_cm: memberData.height_cm ? parseInt(memberData.height_cm) : 175,
    body_fat_pct: memberData.body_fat_pct ? parseFloat(memberData.body_fat_pct) : 18.0,
    countdown_end: countdownEnd,
    next_payment_date: countdownEnd,
    auto_renew: false,
    trainer_id: null,
    photo_url: '',
    created_at: now.toISOString(),
    ...memberData,
  };
};

/**
 * Build an invoice object for a new member enrollment.
 */
const helperCreateInvoiceForMember = (memberId, memberName, plan) => {
  const tax = 0.0;
  const total = plan.price;
  const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    gymId: DEFAULT_ORG_ID,
    member_id: memberId,
    member_name: memberName,
    invoice_number: invNumber,
    subtotal: plan.price,
    tax_amount: tax,
    discount_amount: 0.0,
    total_amount: total,
    status: 'open',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    issued_at: new Date().toISOString(),
    paid_at: null,
    plan_id: plan.id,
    created_at: new Date().toISOString(),
  };
};

/**
 * Calculate new countdown_end for a membership renewal.
 * Extends from current countdown_end (if still in future) or from now.
 */
const helperCalculateRenewalCountdownEnd = (countdownEnd, months = 1) => {
  const baseDate = countdownEnd && new Date(countdownEnd).getTime() > Date.now()
    ? new Date(countdownEnd)
    : new Date();
  baseDate.setMonth(baseDate.getMonth() + parseInt(months));
  return baseDate.toISOString();
};



// ─── Firestore Error Friendlifier ─────────────────────────────────────
const friendlyFirestoreError = (error) => {
  const code = error?.code || '';
  const map = {
    'permission-denied': 'You do not have permission to perform this action.',
    'not-found': 'The requested document was not found.',
    'already-exists': 'A document with this ID already exists.',
    'unavailable': 'Firestore is currently unavailable. Please try again.',
    'deadline-exceeded': 'The operation timed out. Please try again.',
  };
  return map[code] || error?.message || 'An unknown error occurred.';
};

// Extract gymId from URL path or query parameter
export const getUrlGymId = () => {
  const params = new URLSearchParams(window.location.search);
  const gymIdParam = params.get('gymId');
  if (gymIdParam) return gymIdParam;

  // Check hash query params
  const hash = window.location.hash;
  if (hash && hash.includes('?')) {
    const hashParams = new URLSearchParams(hash.split('?')[1]);
    const hashGymId = hashParams.get('gymId');
    if (hashGymId) return hashGymId;
  }

  // Check pathname
  const parts = window.location.pathname.split('/').filter(Boolean);
  const pathGymId = parts.find(p => p.startsWith('gym_')) || null;
  return pathGymId || DEFAULT_ORG_ID;
};

// Get the base URL, preserving the repository name subdirectory for GitHub Pages
export const getBaseUrl = () => {
  const origin = window.location.origin;
  const parts = window.location.pathname.split('/').filter(Boolean);
  const nonGymParts = parts.filter(p => !p.startsWith('gym_'));
  const basePath = nonGymParts.length > 0 ? '/' + nonGymParts.join('/') + '/' : '/';
  return `${origin}${basePath}`;
};

// Check if the current URL is the bare root URL (i.e. no query parameters or hash, and matching the root paths)
export const isBareRootUrl = () => {
  const search = window.location.search;
  const hash = window.location.hash;
  if (search || hash) return false;

  const path = window.location.pathname;
  return path === '/' || path === '/Ascend-Management-Dashboard' || path === '/Ascend-Management-Dashboard/';
};

// ═══════════════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export const DashboardProvider = ({ children }) => {
  const hasCheckedAutoLogin = useRef(false);

  // ─── Loading & Error State ──────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState(null);

  // ─── Toast Notifications State ──────────────────────────────────────
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9) + Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    // Auto-remove toast after 4000ms
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ─── Auth State ─────────────────────────────────────────────────────
  const [firebaseUser, setFirebaseUser] = useState(null); // Raw Firebase Auth user
  const [currentUser, setCurrentUser] = useState(null);   // Enriched user (with role, name, etc.)
  const [authReady, setAuthReady] = useState(false);

  // ─── Firestore Data State ───────────────────────────────────────────
  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [members, setMembers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [accessEvents, setAccessEvents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeRegistrations, setEmployeeRegistrations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  
  // FitGenCore SaaS States
  const [gyms, setGyms] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [gymSettings, setGymSettings] = useState(null);
  const [saasPlans, setSaasPlans] = useState([]);

  // ─── Core Utility callbacks (declared early to prevent temporal dead zone) ───
  const logAudit = useCallback(async (action, entityType, entityId, details, userOverride = null) => {
    try {
      const logEntry = {
        gymId: currentUser?.gymId || DEFAULT_ORG_ID,
        user_name: userOverride || (currentUser ? currentUser.name : 'System'),
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        occurred_at: new Date().toISOString(),
      };
      await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), logEntry);
    } catch (err) {
      console.error('Audit log write failed:', err);
    }
  }, [currentUser]);

  const createInvoiceForMember = useCallback(async (memberId, memberName, plan) => {
    try {
      const invoiceData = helperCreateInvoiceForMember(memberId, memberName, plan);
      await addDoc(collection(db, COLLECTIONS.INVOICES), invoiceData);
    } catch (err) {
      console.error('createInvoiceForMember error:', err);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE A: Firebase Auth Listener
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // If user is auto-logged in but visiting the bare root URL on initial load, force sign out.
      if (user && isBareRootUrl() && !hasCheckedAutoLogin.current) {
        hasCheckedAutoLogin.current = true;
        try {
          await signOut(auth);
        } catch (e) {
          console.error("Signout error on bare root initial load:", e);
        }
        setFirebaseUser(null);
        setCurrentUser(null);
        setAuthReady(true);
        setIsLoading(false);
        return;
      }

      hasCheckedAutoLogin.current = true;
      setFirebaseUser(user);
      if (user) {
        // User is signed in — we'll fetch their admin profile from Firestore
        // The admin doc lookup happens in a separate effect below
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE B: Fetch admin profile when firebaseUser changes
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!firebaseUser) {
      return;
    }

    // Listen to the admins collection for the logged-in user's email
    const q = query(
      collection(db, COLLECTIONS.ADMINS),
      where('email', '==', firebaseUser.email.toLowerCase())
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const adminDoc = snapshot.docs[0];
        setCurrentUser({
          id: adminDoc.id,
          uid: firebaseUser.uid,
          ...adminDoc.data(),
        });
      } else {
        // User is authenticated but has no admin doc — treat as unauthorized
        setCurrentUser(null);
      }
    }, (err) => {
      console.error('Error fetching admin profile:', err);
      setError(friendlyFirestoreError(err));
    });

    return () => unsubscribe();
  }, [firebaseUser]);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE B.5: Dynamically update URL with gymId on login to prevent logouts on refresh
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (currentUser) {
      const params = new URLSearchParams(window.location.search);
      let targetGymId = currentUser.gymId;
      if (currentUser.role === 'super_admin') {
        targetGymId = 'super_admin';
      }
      if (targetGymId && !params.has('gymId')) {
        params.set('gymId', targetGymId);
        const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
        window.history.replaceState(null, '', newUrl);
      }
    }
  }, [currentUser]);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE C: Public Plans Firestore Listener (runs for guest too)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const orgId = currentUser?.gymId || getUrlGymId();
    const plansQ = query(
      collection(db, COLLECTIONS.PLANS),
      where('gymId', '==', orgId)
    );
    const unsubscribe = onSnapshot(plansQ, (snap) => {
      setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Plans listener error:', err);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // ─── Real-time SaaS Plans Listener & Seeder ────────────────────────
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.SAAS_PLANS), async (snap) => {
      if (snap.empty) {
        // Seed default plans
        const defaultPlans = [
          { name: 'Trial', price: 0, duration_days: 30, maxMembers: 20, maxStaff: 2, features: ['20 Members Quota', '2 Staff Quota', 'Basic Analytics'], created_at: new Date().toISOString() },
          { name: 'Starter', price: 6000, duration_days: 30, maxMembers: 100, maxStaff: 3, features: ['100 Members Quota', '3 Staff Quota', 'Standard Support'], created_at: new Date().toISOString() },
          { name: 'Professional', price: 12000, duration_days: 30, maxMembers: 500, maxStaff: 10, features: ['500 Members Quota', '10 Staff Quota', 'Priority Support', 'AI Insights'], created_at: new Date().toISOString() },
          { name: 'Enterprise', price: 30000, duration_days: 30, maxMembers: 99999, maxStaff: 99999, features: ['Unlimited Members Quota', 'Unlimited Staff Quota', '24/7 Dedicated Support', 'Audit Logs'], created_at: new Date().toISOString() }
        ];
        for (const p of defaultPlans) {
          try {
            await addDoc(collection(db, COLLECTIONS.SAAS_PLANS), p);
          } catch (err) {
            console.error('Seeding SaaS plan error:', err);
          }
        }
      } else {
        const sortedPlans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        sortedPlans.sort((a, b) => a.price - b.price);
        setSaasPlans(sortedPlans);
      }
    }, (err) => {
      console.error('SaaS plans listener error:', err);
    });
    return () => unsubscribe();
  }, []);



  // ═══════════════════════════════════════════════════════════════════
  // PHASE D: Real-time Firestore Listeners (only when authenticated)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!currentUser) {
      // Defer resetting all data when logged out to avoid synchronous state updates
      Promise.resolve().then(() => {
        setMembers([]);
        setInvoices([]);
        setRegistrations([]);
        setAccessEvents([]);
        setAuditLogs([]);
        setPlans([]);
        setTrainers([]);
        setAdmins([]);
        setEmployees([]);
        setEmployeeRegistrations([]);
        setExpenses([]);
        setIncome([]);
        setGyms([]);
        setSubscriptions([]);
        setSupportTickets([]);
        setAnnouncements([]);
        setGymSettings(null);
        setDataLoaded(false);
      });
      return;
    }

    const unsubscribers = [];

    if (currentUser.role === 'super_admin') {
      // ─── SUPER ADMIN REAL-TIME LISTENERS ───
      let loadedCount = 0;
      const totalCollections = 8;
      const markLoaded = () => {
        loadedCount++;
        if (loadedCount >= totalCollections) {
          setDataLoaded(true);
        }
      };

      // 1. Gyms (all)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.GYMS), (snap) => {
          setGyms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Superadmin gyms error:', err); markLoaded(); })
      );

      // 2. Subscriptions (all)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.SUBSCRIPTIONS), (snap) => {
          setSubscriptions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Superadmin subs error:', err); markLoaded(); })
      );

      // 3. Support Tickets (all)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.SUPPORT_TICKETS), (snap) => {
          const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setSupportTickets(tickets);
          markLoaded();
        }, (err) => { console.error('Superadmin tickets error:', err); markLoaded(); })
      );

      // 4. Announcements (all)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.ANNOUNCEMENTS), (snap) => {
          const ann = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          ann.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setAnnouncements(ann);
          markLoaded();
        }, (err) => { console.error('Superadmin announcements error:', err); markLoaded(); })
      );

      // 5. Users (all admins/owners)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.ADMINS), (snap) => {
          setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Superadmin users error:', err); markLoaded(); })
      );

      // 6. Members (all - for global analytics)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.MEMBERS), (snap) => {
          setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Superadmin members error:', err); markLoaded(); })
      );

      // 7. Payments (all - for global revenue trends)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.INVOICES), (snap) => {
          setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Superadmin payments error:', err); markLoaded(); })
      );

      // 8. Audit Logs (all)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.AUDIT_LOGS), (snap) => {
          const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          logs.sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
          setAuditLogs(logs);
          markLoaded();
        }, (err) => { console.error('Superadmin audit logs error:', err); markLoaded(); })
      );

    } else {
      // ─── GYM OWNER / STAFF REAL-TIME LISTENERS ───
      const orgId = currentUser.gymId || DEFAULT_ORG_ID;
      let loadedCount = 0;
      const totalCollections = 13;
      const markLoaded = () => {
        loadedCount++;
        if (loadedCount >= totalCollections) {
          setDataLoaded(true);
        }
      };

      // 1. Employees/Trainers (scoped)
      const trainersQ = query(
        collection(db, COLLECTIONS.TRAINERS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(trainersQ, (snap) => {
          const trainersData = snap.docs.map(d => {
            const data = d.data();
            let dob = data.date_of_birth || '1990-01-01';
            const lastPay = data.last_payment_date || '2026-05-30';
            const nextPay = data.next_payment_date || '2026-06-30';
            const payStatus = data.payment_status || 'pending';
            return { 
              id: d.id, 
              ...data, 
              date_of_birth: dob,
              last_payment_date: lastPay,
              next_payment_date: nextPay,
              payment_status: payStatus
            };
          });
          setTrainers(trainersData);
          setEmployees(trainersData);
          markLoaded();
        }, (err) => { console.error('Trainers error:', err); markLoaded(); })
      );

      // 2. Members (scoped)
      const membersQ = query(
        collection(db, COLLECTIONS.MEMBERS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(membersQ, (snap) => {
          setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Members error:', err); markLoaded(); })
      );

      // 3. Payments/Invoices (scoped)
      const invoicesQ = query(
        collection(db, COLLECTIONS.INVOICES),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(invoicesQ, (snap) => {
          setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Payments error:', err); markLoaded(); })
      );

      // 4. Registrations (scoped)
      const registrationsQ = query(
        collection(db, COLLECTIONS.REGISTRATIONS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(registrationsQ, (snap) => {
          setRegistrations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Registrations error:', err); markLoaded(); })
      );

      // 5. Access Events/Attendance (scoped)
      const accessQ = query(
        collection(db, COLLECTIONS.ACCESS_EVENTS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(accessQ, (snap) => {
          const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          events.sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
          setAccessEvents(events);
          markLoaded();
        }, (err) => { console.error('Attendance error:', err); markLoaded(); })
      );

      // 6. Audit Logs (scoped)
      const auditQ = query(
        collection(db, COLLECTIONS.AUDIT_LOGS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(auditQ, (snap) => {
          const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          logs.sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
          setAuditLogs(logs);
          markLoaded();
        }, (err) => { console.error('Audit logs error:', err); markLoaded(); })
      );

      // 7. Users/Admins (scoped)
      const adminsQ = query(
        collection(db, COLLECTIONS.ADMINS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(adminsQ, (snap) => {
          setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Users error:', err); markLoaded(); })
      );

      // 8. Employee Registrations (scoped)
      const empRegsQ = query(
        collection(db, COLLECTIONS.EMPLOYEE_REGISTRATIONS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(empRegsQ, (snap) => {
          setEmployeeRegistrations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Employee registrations error:', err); markLoaded(); })
      );

      // 9. Expenses (scoped)
      const expensesQ = query(
        collection(db, COLLECTIONS.EXPENSES),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(expensesQ, (snap) => {
          const exp = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          exp.sort((a, b) => new Date(b.date) - new Date(a.date));
          setExpenses(exp);
          markLoaded();
        }, (err) => { console.error('Expenses error:', err); markLoaded(); })
      );

      // 10. Income (scoped)
      const incomeQ = query(
        collection(db, COLLECTIONS.INCOME),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(incomeQ, (snap) => {
          const inc = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          inc.sort((a, b) => new Date(b.date) - new Date(a.date));
          setIncome(inc);
          markLoaded();
        }, (err) => { console.error('Income error:', err); markLoaded(); })
      );

      // 11. Gym Settings (scoped)
      const settingsQ = query(
        collection(db, COLLECTIONS.GYM_SETTINGS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(settingsQ, (snap) => {
          if (!snap.empty) {
            setGymSettings({ id: snap.docs[0].id, ...snap.docs[0].data() });
          } else {
            setGymSettings(null);
          }
          markLoaded();
        }, (err) => { console.error('Settings error:', err); markLoaded(); })
      );

      // 12. Announcements (global)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.ANNOUNCEMENTS), (snap) => {
          const ann = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          ann.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setAnnouncements(ann);
          markLoaded();
        }, (err) => { console.error('Announcements error:', err); markLoaded(); })
      );

      // 13. Support Tickets (scoped)
      const ticketsQ = query(
        collection(db, COLLECTIONS.SUPPORT_TICKETS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(ticketsQ, (snap) => {
          const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setSupportTickets(tickets);
          markLoaded();
        }, (err) => { console.error('Support tickets error:', err); markLoaded(); })
      );
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [currentUser]);

  // ═══════════════════════════════════════════════════════════════════
  // AUTH ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Login with email + password via Firebase Auth.
   * After successful auth, the onAuthStateChanged listener will pick up
   * the user and fetch their admin profile from Firestore.
   */
  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting currentUser
      return { success: true };
    } catch (err) {
      const code = err?.code || '';
      const messages = {
        'auth/user-not-found': 'No account found with this email address.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/user-disabled': 'This account has been disabled. Contact support.',
        'auth/network-request-failed': 'Network error. Check your internet connection.',
      };
      const message = messages[code] || err.message || 'Login failed. Please try again.';
      return { success: false, message };
    }
  }, []);

  /**
   * Logout — sign out from Firebase Auth.
   */
  const logout = useCallback(async () => {
    try {
      // Log audit before signing out (while we still have currentUser)
      if (currentUser) {
        await logAudit('system.logout', 'auth', currentUser.id, `User logged out`, currentUser.name);
      }
      await signOut(auth);
      // onAuthStateChanged will clear currentUser

      // Clear query params & hash to return cleanly to the login screen
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      window.history.replaceState(null, '', url.pathname);
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, [currentUser, logAudit]);

  /**
   * Register a new admin:
   * 1. Create Firebase Auth account
   * 2. Write admin document to Firestore
   */
  const registerAdmin = useCallback(async (name, email, password, role) => {
    try {
      // Check if admin doc already exists in local state
      const exists = admins.some(a => a.email.toLowerCase() === email.trim().toLowerCase());
      if (exists) {
        return { success: false, message: 'An administrator with this email already exists.' };
      }

      // Create Firebase Auth user
      // NOTE: createUserWithEmailAndPassword will sign in as the new user!
      // We need to preserve the current admin's session.
      // Workaround: We'll create the auth user, then immediately sign back in as the current admin.

      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const newUid = userCredential.user.uid;

      // Write admin document to Firestore
      const adminData = {
        uid: newUid,
        name,
        email: email.trim().toLowerCase(),
        role,
        password, // Save password in Firestore for advanced Super Admin actions
        gymId: currentUser?.gymId || DEFAULT_ORG_ID,
        photo_url: role === 'super_admin'
          ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        created_at: new Date().toISOString(),
      };

      await addDoc(collection(db, COLLECTIONS.ADMINS), adminData);

      // Sign back in as the current admin (since createUser switches the auth session)
      // The current admin needs to provide their password again, OR we can skip this
      // For now we'll let the onAuthStateChanged handle it — the admin list will auto-refresh
      // NOTE: This is a known Firebase limitation. In production, use Admin SDK via Cloud Function.

      await logAudit(
        'admin.register', 'auth', newUid,
        `Registered new admin: ${name} (${role === 'super_admin' ? 'Super Admin' : 'Admin'})`,
        currentUser?.name
      );

      return { success: true, message: 'Admin registered. Note: You may need to re-login.' };
    } catch (err) {
      const code = err?.code || '';
      const messages = {
        'auth/email-already-in-use': 'An account with this email already exists in Firebase Auth.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.',
      };
      return { success: false, message: messages[code] || err.message };
    }
  }, [admins, currentUser, logAudit]);

  // ═══════════════════════════════════════════════════════════════════
  // FITGENCORE SaaS MANAGEMENT ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  // Client-Side Database Seeder
  const seedDatabaseClientSide = useCallback(async (demoEmail = null, demoPassword = null) => {
    try {
      showToast('Initializing database seeding...', 'info');
      
      // 1. Seed default plans (membershipPlans)
      const plansRef = collection(db, COLLECTIONS.PLANS);
      const seededPlans = [
        {
          gymId: 'gym_ascend_hq',
          name: 'Basic',
          price: 3500,
          tax_rate: 5,
          duration_days: 30,
          features: ['Gym floor access', 'Locker usage', 'Basic equipment', 'Shower facilities'],
          created_at: new Date().toISOString(),
        },
        {
          gymId: 'gym_ascend_hq',
          name: 'Standard',
          price: 5500,
          tax_rate: 5,
          duration_days: 30,
          features: ['Full gym access', 'Group classes', 'Sauna & steam', 'Nutrition guide', 'Locker usage'],
          created_at: new Date().toISOString(),
        },
        {
          gymId: 'gym_ascend_hq',
          name: 'Premium',
          price: 8500,
          tax_rate: 5,
          duration_days: 30,
          features: ['Full gym + classes', '1 PT session/week', 'Spa access', 'Diet consultation', 'Priority booking', 'Towel service'],
          created_at: new Date().toISOString(),
        },
        {
          gymId: 'gym_ascend_hq',
          name: 'Elite VIP',
          price: 15000,
          tax_rate: 5,
          duration_days: 30,
          features: ['Unlimited everything', '3 PT sessions/week', 'Private locker', 'VIP lounge', 'Guest passes (2/mo)', 'Body composition analysis', 'Priority parking'],
          created_at: new Date().toISOString(),
        }
      ];

      const planDocRefs = [];
      for (const p of seededPlans) {
        const ref = await addDoc(plansRef, p);
        planDocRefs.push({ id: ref.id, ...p });
      }

      // 2. Seed Gyms
      const gymsRef = collection(db, COLLECTIONS.GYMS);
      const defaultGym = {
        gymId: 'gym_ascend_hq',
        gymName: 'Ascend Fitness HQ',
        ownerName: 'James Mercer',
        ownerEmail: 'admin@ascend.com',
        phone: '+94 77 111 2222',
        address: '123 Main Street, Colombo',
        country: 'Sri Lanka',
        currency: 'LKR',
        timezone: 'Asia/Colombo',
        subscriptionPlan: 'Professional',
        maxMembers: 500,
        status: 'active',
        createdAt: new Date().toISOString(),
        dashboardUrl: `${getBaseUrl()}?gymId=gym_ascend_hq`
      };
      const gymPowerPlace = {
        gymId: 'gym_power_place',
        gymName: 'Power Gym',
        ownerName: 'John Power',
        ownerEmail: 'owner@powergym.com',
        phone: '+94 77 999 8888',
        address: '456 Galle Road, Colombo',
        country: 'Sri Lanka',
        currency: 'LKR',
        timezone: 'Asia/Colombo',
        subscriptionPlan: 'Starter',
        maxMembers: 100,
        status: 'active',
        createdAt: new Date().toISOString(),
        dashboardUrl: `${getBaseUrl()}?gymId=gym_power_place`
      };
      await addDoc(gymsRef, defaultGym);
      await addDoc(gymsRef, gymPowerPlace);

      // 3. Seed Subscriptions
      const subsRef = collection(db, COLLECTIONS.SUBSCRIPTIONS);
      const sub1 = {
        gymId: 'gym_ascend_hq',
        planId: 'professional',
        maxMembers: 500,
        maxStaff: 10,
        status: 'active',
        price: 12000,
        currency: 'LKR',
        billingPeriod: 'monthly',
        startDate: new Date().toISOString(),
        nextRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      const sub2 = {
        gymId: 'gym_power_place',
        planId: 'starter',
        maxMembers: 100,
        maxStaff: 3,
        status: 'active',
        price: 6000,
        currency: 'LKR',
        billingPeriod: 'monthly',
        startDate: new Date().toISOString(),
        nextRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
      await addDoc(subsRef, sub1);
      await addDoc(subsRef, sub2);

      // 4. Seed Gym Settings
      const settingsRef = collection(db, COLLECTIONS.GYM_SETTINGS);
      const settings1 = {
        gymId: 'gym_ascend_hq',
        gymName: 'Ascend Fitness HQ',
        themeColor: '#3b82f6',
        darkMode: true,
        logo: '',
        phone: '+94 77 111 2222',
        email: 'admin@ascend.com',
        address: '123 Main Street, Colombo',
        website: 'https://ascendfitness.com',
        currency: 'LKR',
        timezone: 'Asia/Colombo',
        openingHours: '06:00 AM - 10:00 PM',
        language: 'en'
      };
      const settings2 = {
        gymId: 'gym_power_place',
        gymName: 'Power Gym',
        themeColor: '#f97316',
        darkMode: false,
        logo: '',
        phone: '+94 77 999 8888',
        email: 'owner@powergym.com',
        address: '456 Galle Road, Colombo',
        website: 'https://powergym.com',
        currency: 'LKR',
        timezone: 'Asia/Colombo',
        openingHours: '05:00 AM - 11:00 PM',
        language: 'en'
      };
      await addDoc(settingsRef, settings1);
      await addDoc(settingsRef, settings2);

      // 5. Seed Users
      const usersRef = collection(db, COLLECTIONS.ADMINS);
      const userList = [
        {
          name: 'Sarah Jenkins',
          email: 'superadmin@ascend.com',
          role: 'super_admin',
          gymId: null,
          photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          created_at: new Date().toISOString()
        },
        {
          name: 'James Mercer',
          email: 'admin@ascend.com',
          role: 'gym_owner',
          gymId: 'gym_ascend_hq',
          photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          created_at: new Date().toISOString()
        },
        {
          name: 'John Power',
          email: 'owner@powergym.com',
          role: 'gym_owner',
          gymId: 'gym_power_place',
          photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          created_at: new Date().toISOString()
        }
      ];

      for (const u of userList) {
        await addDoc(usersRef, u);
      }

      // 6. Seed Trainers/Employees
      const empRef = collection(db, COLLECTIONS.EMPLOYEES);
      const employeesList = [
        {
          gymId: 'gym_ascend_hq',
          full_name: 'Marcus Rivera',
          email: 'marcus@ascend.com',
          phone: '+94 77 333 4444',
          role: 'Trainer',
          specialization: 'Strength & Conditioning',
          bio: 'NSCA-certified strength coach with 8 years of experience.',
          hourly_rate: 3500,
          salary: 95000,
          next_salary_date: '2026-06-30',
          status: 'active',
          joined_at: '2025-03-15',
          photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          created_at: new Date().toISOString()
        },
        {
          gymId: 'gym_ascend_hq',
          full_name: 'Priya Chandrasekhar',
          email: 'priya@ascend.com',
          phone: '+94 77 555 6666',
          role: 'Trainer',
          specialization: 'Yoga & Mobility',
          bio: 'RYT-500 certified yoga instructor.',
          hourly_rate: 3000,
          salary: 80000,
          next_salary_date: '2026-06-30',
          status: 'active',
          joined_at: '2025-04-01',
          photo_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
          created_at: new Date().toISOString()
        }
      ];
      for (const e of employeesList) {
        await addDoc(empRef, e);
      }

      // 7. Seed Members
      const membersRef = collection(db, COLLECTIONS.MEMBERS);
      const membersList = [
        {
          gymId: 'gym_ascend_hq',
          full_name: 'Ashan Perera',
          email: 'ashan.perera@gmail.com',
          phone: '+94 77 123 4567',
          gender: 'male',
          date_of_birth: '1995-03-15',
          status: 'active',
          member_code: 'ASC-1001',
          qr_token: 'qr_token_ASC-1001',
          joined_at: '2026-05-05',
          countdown_end: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
          weight_kg: 78.5,
          height_cm: 176,
          body_fat_pct: 16.2,
          fitness_goals: 'Build lean muscle.',
          medical_notes: 'None.',
          plan_id: planDocRefs[2]?.id || '', // Premium
          auto_renew: true,
          created_at: new Date().toISOString()
        },
        {
          gymId: 'gym_ascend_hq',
          full_name: 'Kavindi Silva',
          email: 'kavindi.silva@outlook.com',
          phone: '+94 71 987 6543',
          gender: 'female',
          date_of_birth: '1998-07-22',
          status: 'active',
          member_code: 'ASC-1002',
          qr_token: 'qr_token_ASC-1002',
          joined_at: '2026-04-10',
          countdown_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          weight_kg: 58.0,
          height_cm: 163,
          body_fat_pct: 22.5,
          fitness_goals: 'Improve flexibility.',
          medical_notes: 'None.',
          plan_id: planDocRefs[1]?.id || '', // Standard
          auto_renew: true,
          created_at: new Date().toISOString()
        }
      ];
      for (const m of membersList) {
        await addDoc(membersRef, m);
      }

      // 8. Seed Support Tickets
      const ticketsRef = collection(db, COLLECTIONS.SUPPORT_TICKETS);
      const ticket1 = {
        gymId: 'gym_ascend_hq',
        gymName: 'Ascend Fitness HQ',
        subject: 'Billing Inquiry',
        message: 'We noticed a discrepancy in our monthly subscription invoice. Could you please check it?',
        priority: 'medium',
        status: 'open',
        createdAt: new Date().toISOString(),
        replies: []
      };
      const ticket2 = {
        gymId: 'gym_power_place',
        gymName: 'Power Gym',
        subject: 'Upgrade Plan Limit',
        message: 'We are reaching our 100 members limit on the Starter plan. We want to upgrade to the Professional plan.',
        priority: 'high',
        status: 'open',
        createdAt: new Date().toISOString(),
        replies: []
      };
      await addDoc(ticketsRef, ticket1);
      await addDoc(ticketsRef, ticket2);

      // 9. Seed Announcements
      const announcementsRef = collection(db, COLLECTIONS.ANNOUNCEMENTS);
      const ann1 = {
        title: 'FitGenCore Platform Launched!',
        content: 'Welcome to the all-new FitGenCore SaaS portal! Gym owners can now manage their client settings, customize theme colors, and communicate directly with FitGenCore support.',
        category: 'announcement',
        priority: 'high',
        publishedBy: 'Sarah Jenkins',
        createdAt: new Date().toISOString()
      };
      await addDoc(announcementsRef, ann1);

      // 10. Auto-Create Auth accounts using client-side registration if needed
      if (demoEmail && demoPassword) {
        try {
          await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
        } catch (e) {
          console.log('User auth already exists or failed:', e.message);
        }
      }

      showToast('Database seeded successfully!', 'success');
      return { success: true };
    } catch (err) {
      console.error('Seeding failed:', err);
      showToast(`Seeding failed: ${err.message}`, 'error');
      return { success: false, message: err.message };
    }
  }, [showToast]);

  // Gym Onboarding
  const onboardNewGym = useCallback(async (gymData) => {
    try {
      const generatedGymId = `gym_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      const tempPassword = `Temp@${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Create Gym Owner Auth Account
      let ownerUid = '';
      try {
        const userCred = await createUserWithEmailAndPassword(auth, gymData.ownerEmail.trim().toLowerCase(), tempPassword);
        ownerUid = userCred.user.uid;
      } catch (authErr) {
        console.error('Failed to create auth for gym owner:', authErr);
        return { success: false, message: `Auth creation failed: ${authErr.message}` };
      }

      // 2. Create User document in Firestore (COLLECTIONS.ADMINS)
      const userProfile = {
        uid: ownerUid,
        name: gymData.ownerName,
        email: gymData.ownerEmail.trim().toLowerCase(),
        role: 'gym_owner',
        gymId: generatedGymId,
        password: tempPassword,
        photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        created_at: new Date().toISOString()
      };
      await addDoc(collection(db, COLLECTIONS.ADMINS), userProfile);

      // 3. Create Gym document
      const newGymDoc = {
        gymId: generatedGymId,
        gymName: gymData.gymName,
        ownerName: gymData.ownerName,
        ownerEmail: gymData.ownerEmail.trim().toLowerCase(),
        phone: gymData.phone,
        address: gymData.address,
        country: gymData.country || 'Sri Lanka',
        currency: gymData.currency || 'LKR',
        timezone: gymData.timezone || 'Asia/Colombo',
        subscriptionPlan: gymData.subscriptionPlan || 'Starter',
        maxMembers: gymData.subscriptionPlan === 'Starter' ? 100 : (gymData.subscriptionPlan === 'Professional' ? 500 : 99999),
        status: 'trial',
        createdAt: new Date().toISOString(),
        dashboardUrl: `${getBaseUrl()}?gymId=${generatedGymId}`,
        installmentPlan: gymData.installmentPlan || 'Monthly Subscription'
      };
      await addDoc(collection(db, COLLECTIONS.GYMS), newGymDoc);

      // 4. Create Gym Settings Document
      const newSettingsDoc = {
        gymId: generatedGymId,
        gymName: gymData.gymName,
        themeColor: '#3b82f6',
        darkMode: true,
        logo: '',
        phone: gymData.phone,
        email: gymData.ownerEmail,
        address: gymData.address,
        website: '',
        currency: gymData.currency || 'LKR',
        timezone: gymData.timezone || 'Asia/Colombo',
        openingHours: '06:00 AM - 10:00 PM',
        language: 'en'
      };
      await addDoc(collection(db, COLLECTIONS.GYM_SETTINGS), newSettingsDoc);

      // 5. Create Subscription Document
      const planSelected = gymData.subscriptionPlan || 'Starter';
      const installmentSelected = gymData.installmentPlan || 'Monthly Subscription';

      // Resolve plan dynamically from saasPlans
      const selectedPlanObj = saasPlans.find(p => p.name.toLowerCase() === planSelected.toLowerCase()) || 
                              saasPlans.find(p => p.name.toLowerCase() === 'starter') || 
                              { name: 'Starter', price: 6000, maxMembers: 100, maxStaff: 3 };

      let priceSelected = selectedPlanObj.price;
      let billingPeriod = 'monthly';
      let nextRenewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (installmentSelected === '1 Time Payment') {
        priceSelected = selectedPlanObj.price * 10; // Annual upfront (10 months fee)
        billingPeriod = 'one_time';
        nextRenewalDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      } else if (installmentSelected === '3 Month Installment Plan') {
        priceSelected = selectedPlanObj.price * 3; // 3 months contract upfront
        billingPeriod = 'installment_3mo';
        nextRenewalDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      }

      const newSubDoc = {
        gymId: generatedGymId,
        planId: planSelected.toLowerCase(),
        maxMembers: selectedPlanObj.maxMembers || 100,
        maxStaff: selectedPlanObj.maxStaff || 3,
        status: 'active',
        price: priceSelected,
        currency: gymData.currency || 'LKR',
        billingPeriod: billingPeriod,
        startDate: new Date().toISOString(),
        nextRenewalDate: nextRenewalDate
      };
      await addDoc(collection(db, COLLECTIONS.SUBSCRIPTIONS), newSubDoc);

      // 6. Seed default membership plans for the new gym
      const plansRef = collection(db, COLLECTIONS.PLANS);
      const defaultPlans = [
        {
          gymId: generatedGymId,
          name: 'Basic floor membership',
          price: 3500,
          tax_rate: 5,
          duration_days: 30,
          features: ['Gym floor access', 'Locker usage'],
          created_at: new Date().toISOString()
        },
        {
          gymId: generatedGymId,
          name: 'Standard package',
          price: 5500,
          tax_rate: 5,
          duration_days: 30,
          features: ['Full gym access', 'Group classes'],
          created_at: new Date().toISOString()
        }
      ];
      for (const p of defaultPlans) {
        await addDoc(plansRef, p);
      }

      // Create initial SaaS payment invoice (onboard register) (NO TAX)
      const initialPayment = {
        gymId: generatedGymId,
        isSaaS: true,
        gymName: gymData.gymName,
        invoice_number: `SAAS-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        subtotal: newSubDoc.price,
        tax_amount: 0,
        total_amount: newSubDoc.price,
        status: 'paid',
        issued_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        plan_id: newSubDoc.planId,
        created_at: new Date().toISOString(),
        billingPeriod: newSubDoc.billingPeriod || 'monthly',
        currency: newSubDoc.currency || 'LKR',
        description: 'Onboarding Registration Fee'
      };
      await addDoc(collection(db, COLLECTIONS.INVOICES), initialPayment);

      await logAudit(
        'gym.onboard', 'gym', generatedGymId,
        `Onboarded new gym: ${gymData.gymName} (Owner: ${gymData.ownerName}, Plan: ${planSelected}, Period: ${installmentSelected})`,
        currentUser?.name
      );

      showToast(`Gym "${gymData.gymName}" onboarded successfully!`, 'success');
      
      return { 
        success: true, 
        gymId: generatedGymId,
        ownerEmail: gymData.ownerEmail,
        tempPassword,
        dashboardUrl: newGymDoc.dashboardUrl
      };
    } catch (err) {
      console.error('onboardNewGym error:', err);
      return { success: false, message: err.message };
    }
  }, [currentUser, logAudit, showToast]);

  // Update Gym Status (active, frozen, suspended)
  const updateGymStatus = useCallback(async (gymId, newStatus) => {
    try {
      const gymSnap = await getDocs(query(collection(db, COLLECTIONS.GYMS), where('gymId', '==', gymId)));
      if (!gymSnap.empty) {
        await updateDoc(gymSnap.docs[0].ref, { status: newStatus });
      }

      const subSnap = await getDocs(query(collection(db, COLLECTIONS.SUBSCRIPTIONS), where('gymId', '==', gymId)));
      if (!subSnap.empty) {
        await updateDoc(subSnap.docs[0].ref, { status: newStatus === 'deactivated' || newStatus === 'suspended' ? 'suspended' : newStatus });
      }

      await logAudit(
        'gym.status_update', 'gym', gymId,
        `Updated gym status to ${newStatus} for ${gymId}`,
        currentUser?.name
      );
      showToast(`Gym status updated to ${newStatus} successfully.`, 'success');
      return { success: true };
    } catch (err) {
      console.error('updateGymStatus error:', err);
      return { success: false, message: err.message };
    }
  }, [currentUser, logAudit, showToast]);

  // Suspend/Activate Gym (Legacy Wrapper)
  const suspendGym = useCallback(async (gymId, isSuspended) => {
    return updateGymStatus(gymId, isSuspended ? 'suspended' : 'active');
  }, [updateGymStatus]);

  // Delete Gym
  const deleteGym = useCallback(async (gymId) => {
    try {
      const gymSnap = await getDocs(query(collection(db, COLLECTIONS.GYMS), where('gymId', '==', gymId)));
      if (!gymSnap.empty) {
        await deleteDoc(gymSnap.docs[0].ref);
      }
      await logAudit(
        'gym.delete', 'gym', gymId,
        `Permanently deleted gym workspace for ${gymId}`,
        currentUser?.name
      );
      showToast('Gym deleted from directory.', 'info');
      return { success: true };
    } catch (err) {
      console.error('deleteGym error:', err);
      return { success: false, message: err.message };
    }
  }, [currentUser, logAudit, showToast]);

  // Reset Owner Password (in users collection)
  const resetGymOwnerPassword = useCallback(async (ownerEmail, newPassword) => {
    try {
      const userSnap = await getDocs(query(
        collection(db, COLLECTIONS.ADMINS),
        where('email', '==', ownerEmail.trim().toLowerCase())
      ));
      if (!userSnap.empty) {
        await updateDoc(userSnap.docs[0].ref, { password: newPassword });
        await logAudit(
          'admin.password_reset', 'user', userSnap.docs[0].id,
          `Reset owner password for email: ${ownerEmail}`,
          currentUser?.name
        );
        showToast('Password updated in database record.', 'success');
        return { success: true };
      }
      return { success: false, message: 'Owner document not found.' };
    } catch (err) {
      console.error('resetGymOwnerPassword error:', err);
      return { success: false, message: err.message };
    }
  }, [currentUser, logAudit, showToast]);

  // Renew Gym SaaS Subscription
  const renewGymSubscription = useCallback(async (gymId) => {
    try {
      // Find subscription document
      const subSnap = await getDocs(query(collection(db, COLLECTIONS.SUBSCRIPTIONS), where('gymId', '==', gymId)));
      if (subSnap.empty) {
        return { success: false, message: 'Subscription not found for this gym.' };
      }
      const subDocRef = subSnap.docs[0].ref;
      const subData = subSnap.docs[0].data();

      // Extend next renewal date by 30 days
      const currentRenewal = subData.nextRenewalDate;
      const baseDate = currentRenewal && new Date(currentRenewal).getTime() > Date.now()
        ? new Date(currentRenewal)
        : new Date();
      baseDate.setDate(baseDate.getDate() + 30);
      const newRenewalDate = baseDate.toISOString();

      // Update subscription in Firestore
      await updateDoc(subDocRef, {
        nextRenewalDate: newRenewalDate,
        status: 'active'
      });

      // Update gym document to make sure it's active
      const gymSnap = await getDocs(query(collection(db, COLLECTIONS.GYMS), where('gymId', '==', gymId)));
      let gymName = 'Client Gym';
      if (!gymSnap.empty) {
        gymName = gymSnap.docs[0].data().gymName;
        await updateDoc(gymSnap.docs[0].ref, {
          status: 'active'
        });
      }

      // Generate SaaS payment receipt
      const saasReceipt = {
        gymId,
        isSaaS: true,
        gymName,
        invoice_number: `SAAS-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        subtotal: subData.price || 0,
        tax_amount: 0,
        total_amount: subData.price || 0,
        status: 'paid',
        issued_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        plan_id: subData.planId,
        created_at: new Date().toISOString(),
        billingPeriod: subData.billingPeriod || 'monthly',
        currency: subData.currency || 'LKR'
      };
      await addDoc(collection(db, COLLECTIONS.INVOICES), saasReceipt);

      await logAudit(
        'gym.subscription_renew', 'subscription', subSnap.docs[0].id,
        `Renewed SaaS subscription for ${gymName} until ${newRenewalDate.split('T')[0]}`,
        currentUser?.name
      );

      showToast(`Subscription for ${gymName} renewed successfully.`, 'success');
      return { success: true };
    } catch (err) {
      console.error('renewGymSubscription error:', err);
      return { success: false, message: err.message };
    }
  }, [currentUser, logAudit, showToast]);

  // Update and Renew Subscription
  const updateAndRenewSubscription = useCallback(async (gymId, planData) => {
    try {
      const { planId, price, billingPeriod, currency, durationDays } = planData;

      // Find subscription document
      const subSnap = await getDocs(query(collection(db, COLLECTIONS.SUBSCRIPTIONS), where('gymId', '==', gymId)));
      if (subSnap.empty) {
        return { success: false, message: 'Subscription not found for this gym.' };
      }
      const subDocRef = subSnap.docs[0].ref;
      const subData = subSnap.docs[0].data();

      // Extend next renewal date by durationDays (default 30)
      const currentRenewal = subData.nextRenewalDate;
      const baseDate = currentRenewal && new Date(currentRenewal).getTime() > Date.now()
        ? new Date(currentRenewal)
        : new Date();
      baseDate.setDate(baseDate.getDate() + parseInt(durationDays || 30));
      const newRenewalDate = baseDate.toISOString();

      // Resolve plan limits dynamically
      const selectedPlanObj = saasPlans.find(p => p.name.toLowerCase() === planId.toLowerCase() || p.id === planId) || 
                              { name: 'Starter', price: 6000, maxMembers: 100, maxStaff: 3 };
      const maxMembers = selectedPlanObj.maxMembers || 100;
      const maxStaff = selectedPlanObj.maxStaff || 3;

      // Update subscription in Firestore
      await updateDoc(subDocRef, {
        planId: planId.toLowerCase(),
        price: parseFloat(price),
        billingPeriod,
        currency,
        maxMembers,
        maxStaff,
        nextRenewalDate: newRenewalDate,
        status: 'active'
      });

      // Update gym document to make sure it's active
      const gymSnap = await getDocs(query(collection(db, COLLECTIONS.GYMS), where('gymId', '==', gymId)));
      let gymName = 'Client Gym';
      if (!gymSnap.empty) {
        gymName = gymSnap.docs[0].data().gymName;
        const planName = planId.charAt(0).toUpperCase() + planId.slice(1);
        await updateDoc(gymSnap.docs[0].ref, {
          subscriptionPlan: planName,
          maxMembers: maxMembers,
          status: 'active'
        });
      }

      // Generate SaaS payment receipt (NO TAX)
      const invoiceNumber = `SAAS-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const saasReceipt = {
        gymId,
        isSaaS: true,
        gymName,
        invoice_number: invoiceNumber,
        subtotal: parseFloat(price),
        tax_amount: 0,
        total_amount: parseFloat(price),
        status: 'paid',
        issued_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        plan_id: planId.toLowerCase(),
        created_at: new Date().toISOString(),
        billingPeriod,
        currency
      };
      
      const newInvoiceDoc = await addDoc(collection(db, COLLECTIONS.INVOICES), saasReceipt);

      await logAudit(
        'gym.subscription_renew_and_update', 'subscription', subSnap.docs[0].id,
        `Renewed and updated SaaS subscription for ${gymName} until ${newRenewalDate.split('T')[0]}`,
        currentUser?.name
      );

      showToast(`Subscription for ${gymName} updated and renewed successfully.`, 'success');
      return { 
        success: true, 
        invoice: { 
          id: newInvoiceDoc.id, 
          ...saasReceipt 
        } 
      };
    } catch (err) {
      console.error('updateAndRenewSubscription error:', err);
      return { success: false, message: err.message };
    }
  }, [currentUser, logAudit, showToast]);

  // Update Gym Directory details
  const updateGymDetails = useCallback(async (gymId, updatedFields) => {
    try {
      const gymSnap = await getDocs(query(collection(db, COLLECTIONS.GYMS), where('gymId', '==', gymId)));
      if (gymSnap.empty) {
        return { success: false, message: 'Gym not found.' };
      }
      
      const gymRef = gymSnap.docs[0].ref;
      await updateDoc(gymRef, {
        gymName: updatedFields.gymName,
        ownerName: updatedFields.ownerName,
        phone: updatedFields.phone,
        address: updatedFields.address,
        country: updatedFields.country,
        currency: updatedFields.currency,
        timezone: updatedFields.timezone,
      });

      // Also update gym settings
      const settingsSnap = await getDocs(query(collection(db, COLLECTIONS.GYM_SETTINGS), where('gymId', '==', gymId)));
      if (!settingsSnap.empty) {
        await updateDoc(settingsSnap.docs[0].ref, {
          gymName: updatedFields.gymName,
          phone: updatedFields.phone,
          address: updatedFields.address,
          currency: updatedFields.currency,
          timezone: updatedFields.timezone,
        });
      }

      await logAudit(
        'gym.details_update', 'gym', gymId,
        `Updated directory details for ${updatedFields.gymName}`,
        currentUser?.name
      );

      showToast('Gym details updated successfully.', 'success');
      return { success: true };
    } catch (err) {
      console.error('updateGymDetails error:', err);
      return { success: false, message: err.message };
    }
  }, [currentUser, logAudit, showToast]);

  // Create Support Ticket
  const createSupportTicket = useCallback(async (ticketData) => {
    try {
      const orgId = currentUser?.gymId || DEFAULT_ORG_ID;
      const orgName = gymSettings?.gymName || 'Client Gym';
      
      const newTicket = {
        gymId: orgId,
        gymName: orgName,
        subject: ticketData.subject,
        message: ticketData.message,
        priority: ticketData.priority || 'low',
        status: 'open',
        createdAt: new Date().toISOString(),
        replies: []
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.SUPPORT_TICKETS), newTicket);
      await logAudit('support.ticket_create', 'supportTicket', docRef.id, `Created support ticket: "${ticketData.subject}"`);
      showToast('Support ticket submitted successfully.', 'success');
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('createSupportTicket error:', err);
      return { success: false, message: err.message };
    }
  }, [currentUser, gymSettings, logAudit, showToast]);

  // Reply Support Ticket
  const replySupportTicket = useCallback(async (ticketId, replyText, senderRole = 'gym_owner') => {
    try {
      const ticketRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);
      const newReply = {
        sender: currentUser?.name || 'System',
        senderRole,
        message: replyText,
        createdAt: new Date().toISOString()
      };

      const ticket = supportTickets.find(t => t.id === ticketId);
      const existingReplies = ticket?.replies || [];

      await updateDoc(ticketRef, {
        replies: [...existingReplies, newReply],
        status: senderRole === 'super_admin' ? 'in_progress' : 'open'
      });

      await logAudit(
        'support.ticket_reply', 'supportTicket', ticketId,
        `Reply sent by ${currentUser?.name} (${senderRole === 'super_admin' ? 'Support' : 'Client'})`
      );
      showToast('Reply submitted.', 'success');
      return { success: true };
    } catch (err) {
      console.error('replySupportTicket error:', err);
      return { success: false, message: err.message };
    }
  }, [currentUser, supportTickets, logAudit, showToast]);

  // Close Support Ticket
  const closeSupportTicket = useCallback(async (ticketId) => {
    try {
      const ticketRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);
      await updateDoc(ticketRef, { status: 'resolved' });
      await logAudit('support.ticket_close', 'supportTicket', ticketId, `Support ticket resolved/closed.`);
      showToast('Ticket marked as resolved.', 'info');
      return { success: true };
    } catch (err) {
      console.error('closeSupportTicket error:', err);
      return { success: false, message: err.message };
    }
  }, [logAudit, showToast]);

  // Publish SaaS Announcement
  const publishAnnouncement = useCallback(async (annData) => {
    try {
      const newAnn = {
        title: annData.title,
        content: annData.content,
        category: annData.category || 'announcement',
        priority: annData.priority || 'medium',
        publishedBy: currentUser?.name || 'Super Admin',
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), newAnn);
      await logAudit('announcement.publish', 'announcement', 'global', `Published global announcement: ${annData.title}`);
      showToast('Announcement broadcasted successfully!', 'success');
      return { success: true };
    } catch (err) {
      console.error('publishAnnouncement error:', err);
      return { success: false, message: err.message };
    }
  }, [currentUser, logAudit, showToast]);

  // Update Gym Settings (Appearance & Localization)
  const updateGymSettings = useCallback(async (updatedFields) => {
    try {
      const orgId = currentUser?.gymId || DEFAULT_ORG_ID;

      // 1. Sync settings changes to COLLECTIONS.GYMS if gym owner
      if (currentUser?.role === 'gym_owner') {
        const gymSnap = await getDocs(query(collection(db, COLLECTIONS.GYMS), where('gymId', '==', orgId)));
        if (!gymSnap.empty) {
          const gymDocRef = gymSnap.docs[0].ref;
          await updateDoc(gymDocRef, {
            gymName: updatedFields.gymName || gymSnap.docs[0].data().gymName,
            ownerName: updatedFields.ownerName || gymSnap.docs[0].data().ownerName,
            phone: updatedFields.phone || gymSnap.docs[0].data().phone,
            address: updatedFields.address || gymSnap.docs[0].data().address,
            currency: updatedFields.currency || gymSnap.docs[0].data().currency,
            timezone: updatedFields.timezone || gymSnap.docs[0].data().timezone,
          });
        }

        // 2. Sync owner name changes to COLLECTIONS.ADMINS
        if (updatedFields.ownerName && currentUser?.id) {
          const userRef = doc(db, COLLECTIONS.ADMINS, currentUser.id);
          await updateDoc(userRef, {
            name: updatedFields.ownerName
          });
        }
      }

      // 3. Update the GYM_SETTINGS collection doc
      if (!gymSettings?.id) {
        const newSettings = {
          gymId: orgId,
          gymName: (currentUser?.name || 'Client') + ' Gym',
          themeColor: '#3b82f6',
          darkMode: true,
          logo: '',
          phone: '',
          email: currentUser?.email || '',
          address: '',
          website: '',
          currency: 'LKR',
          timezone: 'Asia/Colombo',
          openingHours: '06:00 AM - 10:00 PM',
          language: 'en',
          ...updatedFields
        };
        const docRef = await addDoc(collection(db, COLLECTIONS.GYM_SETTINGS), newSettings);
        setGymSettings({ id: docRef.id, ...newSettings });
      } else {
        const settingsRef = doc(db, COLLECTIONS.GYM_SETTINGS, gymSettings.id);
        const lockedFields = ['gymId', 'firebaseProjectId', 'subscriptionId', 'planId', 'ownerId'];
        const sanitized = { ...updatedFields };
        lockedFields.forEach(f => delete sanitized[f]);

        await updateDoc(settingsRef, sanitized);
        setGymSettings(prev => ({ ...prev, ...sanitized }));
      }

      // 4. Construct detailed audit trail text
      const changedFields = [];
      if (gymSettings?.gymName !== updatedFields.gymName) changedFields.push(`Gym Name to "${updatedFields.gymName}"`);
      if (currentUser?.name !== updatedFields.ownerName) changedFields.push(`Owner Name to "${updatedFields.ownerName}"`);
      if (gymSettings?.phone !== updatedFields.phone) changedFields.push(`Phone Contact to "${updatedFields.phone}"`);
      if (gymSettings?.email !== updatedFields.email) changedFields.push(`Contact Email to "${updatedFields.email}"`);
      if (gymSettings?.address !== updatedFields.address) changedFields.push(`Address`);
      if (gymSettings?.themeColor !== updatedFields.themeColor) changedFields.push(`Theme Color to "${updatedFields.themeColor}"`);
      if (gymSettings?.timezone !== updatedFields.timezone) changedFields.push(`Timezone to "${updatedFields.timezone}"`);
      if (gymSettings?.currency !== updatedFields.currency) changedFields.push(`Currency to "${updatedFields.currency}"`);
      if (gymSettings?.openingHours !== updatedFields.openingHours) changedFields.push(`Opening Hours to "${updatedFields.openingHours}"`);
      if (gymSettings?.language !== updatedFields.language) changedFields.push(`Language to "${updatedFields.language}"`);

      const detailsText = changedFields.length > 0
        ? `Changed ${changedFields.join(', ')}`
        : 'Saved settings with no changes';

      await logAudit('gym.settings_update', 'settings', gymSettings?.id || 'new', detailsText);
      showToast('Gym settings saved successfully.', 'success');
      return { success: true };
    } catch (err) {
      console.error('updateGymSettings error:', err);
      return { success: false, message: err.message };
    }
  }, [gymSettings, currentUser, logAudit, showToast]);

  // Calculate Gym Health Score
  const getGymHealthScore = useCallback((targetGymId) => {
    const gymMembers = members.filter(m => m.gymId === targetGymId);
    const gymUnpaid = invoices.filter(i => i.gymId === targetGymId && i.status === 'overdue').length;
    const gymAccess = accessEvents.filter(e => e.gymId === targetGymId && e.result === 'granted');

    if (gymMembers.length === 0) return 50;

    const activeMembers = gymMembers.filter(m => m.status === 'active').length;
    const attendanceRatio = Math.min((gymAccess.length / (activeMembers || 1)) * 10, 100);
    const growthRatio = Math.min((gymMembers.length / 5) * 10, 100);
    const paymentRatio = Math.max(100 - (gymUnpaid * 15), 30);
    
    const score = Math.round((attendanceRatio * 0.3) + (paymentRatio * 0.4) + (growthRatio * 0.3));
    return Math.min(Math.max(score, 10), 100);
  }, [members, invoices, accessEvents]);

  // ═══════════════════════════════════════════════════════════════════
  // AUDIT LOG HELPER (Moved to top of provider)
  // ═══════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════
  // MEMBER CRUD
  // ═══════════════════════════════════════════════════════════════════

  const addMember = useCallback(async (memberData) => {
    try {
      // Find the next member code sequentially (in order starting with 1000)
      let maxNum = 999;
      members.forEach(m => {
        if (m.member_code && m.member_code.startsWith('ASC-')) {
          const numStr = m.member_code.replace('ASC-', '');
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      const memberCode = `ASC-${maxNum + 1}`;

      const newMemberData = helperCreateMemberObject(memberData, memberCode);

      // Write to Firestore — returns a DocumentReference
      const docRef = await addDoc(collection(db, COLLECTIONS.MEMBERS), newMemberData);
      const newMember = { id: docRef.id, ...newMemberData };

      await logAudit(
        'member.create', 'member', docRef.id,
        `Created profile for ${newMember.full_name} (${newMember.member_code})`
      );

      // Auto-generate invoice for membership
      const plan = plans.find(p => p.id === newMember.plan_id);
      if (plan) {
        await createInvoiceForMember(docRef.id, newMember.full_name, plan);
      }

      return newMember;
    } catch (err) {
      console.error('addMember error:', err);
      setError(friendlyFirestoreError(err));
      return null;
    }
  }, [plans, members, createInvoiceForMember, logAudit]);

  const updateMember = useCallback(async (id, updatedFields) => {
    try {
      const member = members.find(m => m.id === id);
      const memberRef = doc(db, COLLECTIONS.MEMBERS, id);
      await updateDoc(memberRef, updatedFields);

      if (member) {
        const changes = [];
        Object.keys(updatedFields).forEach(key => {
          if (member[key] !== updatedFields[key]) {
            changes.push(`${key}: ${member[key]} -> ${updatedFields[key]}`);
          }
        });
        if (changes.length > 0) {
          await logAudit('member.update', 'member', id, `Updated fields on ${member.full_name}: ${changes.join(', ')}`);
        }
      }
    } catch (err) {
      console.error('updateMember error:', err);
      setError(friendlyFirestoreError(err));
    }
  }, [members, logAudit]);

  const deleteMember = useCallback(async (id) => {
    try {
      const member = members.find(m => m.id === id);
      if (member) {
        const memberRef = doc(db, COLLECTIONS.MEMBERS, id);
        await updateDoc(memberRef, {
          status: 'cancelled',
          deleted_at: new Date().toISOString(),
        });
        await logAudit('member.delete', 'member', id, `Soft-deleted member ${member.full_name}`);
      }
    } catch (err) {
      console.error('deleteMember error:', err);
      setError(friendlyFirestoreError(err));
    }
  }, [members, logAudit]);

  // ─── Freeze / Unfreeze ──────────────────────────────────────────────

  const freezeMembership = useCallback(async (memberId, reason, fromDate, toDate) => {
    try {
      const member = members.find(m => m.id === memberId);
      const memberRef = doc(db, COLLECTIONS.MEMBERS, memberId);
      await updateDoc(memberRef, {
        status: 'frozen',
        frozen_from: fromDate,
        frozen_until: toDate,
        freeze_reason: reason,
      });
      if (member) {
        await logAudit('member.freeze', 'member', memberId, `Froze membership for ${member.full_name}. Reason: ${reason}`);
      }
    } catch (err) {
      console.error('freezeMembership error:', err);
      setError(friendlyFirestoreError(err));
    }
  }, [members, logAudit]);

  const unfreezeMembership = useCallback(async (memberId) => {
    try {
      const member = members.find(m => m.id === memberId);
      const memberRef = doc(db, COLLECTIONS.MEMBERS, memberId);
      await updateDoc(memberRef, {
        status: 'active',
        frozen_from: null,
        frozen_until: null,
        freeze_reason: null,
      });
      if (member) {
        await logAudit('member.unfreeze', 'member', memberId, `Unfroze membership for ${member.full_name}`);
      }
    } catch (err) {
      console.error('unfreezeMembership error:', err);
      setError(friendlyFirestoreError(err));
    }
  }, [members, logAudit]);

  // ═══════════════════════════════════════════════════════════════════
  // REGISTRATION ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  const addRegistrationRequest = useCallback(async (formData) => {
    try {
      const newReq = {
        gymId: DEFAULT_ORG_ID,
        status: 'pending_approval',
        captcha_verified: true,
        ip_address: '192.168.1.10',
        created_at: new Date().toISOString(),
        ...formData,
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.REGISTRATIONS), newReq);
      return { id: docRef.id, ...newReq };
    } catch (err) {
      console.error('addRegistrationRequest error:', err);
      setError(friendlyFirestoreError(err));
      return null;
    }
  }, []);

  const approveRegistration = useCallback(async (requestId) => {
    try {
      const req = registrations.find(r => r.id === requestId);
      if (req) {
        // Create member from registration data
        const newMember = await addMember({
          full_name: req.full_name,
          email: req.email,
          phone: req.phone,
          gender: req.gender,
          date_of_birth: req.date_of_birth,
          plan_id: req.plan_id,
          installment_plan: req.installment_plan || '1 time',
          medical_notes: req.medical_conditions || 'None.',
          fitness_goals: req.fitness_goals || 'General conditioning.',
          emergency_contact_name: req.emergency_contact_name || '',
          emergency_contact_phone: req.emergency_contact_phone || '',
          photo_url: req.photo_url || '',
          weight_kg: req.weight_kg ? parseFloat(req.weight_kg) : 75.0,
          height_cm: req.height_cm ? parseInt(req.height_cm) : 175,
          body_fat_pct: req.body_fat_pct ? parseFloat(req.body_fat_pct) : 18.0,
        });

        // Update registration status in Firestore
        const regRef = doc(db, COLLECTIONS.REGISTRATIONS, requestId);
        await updateDoc(regRef, { status: 'approved' });

        if (newMember) {
          await logAudit(
            'registration.approve', 'registration_request', requestId,
            `Approved registration for ${req.full_name}. Active member code: ${newMember.member_code}`
          );
        }
      }
    } catch (err) {
      console.error('approveRegistration error:', err);
      setError(friendlyFirestoreError(err));
    }
  }, [registrations, addMember, logAudit]);

  const rejectRegistration = useCallback(async (requestId, reason) => {
    try {
      const req = registrations.find(r => r.id === requestId);
      const regRef = doc(db, COLLECTIONS.REGISTRATIONS, requestId);
      await updateDoc(regRef, {
        status: 'rejected',
        rejection_reason: reason,
      });
      if (req) {
        await logAudit(
          'registration.reject', 'registration_request', requestId,
          `Rejected registration for ${req.full_name}. Reason: ${reason}`
        );
      }
    } catch (err) {
      console.error('rejectRegistration error:', err);
      setError(friendlyFirestoreError(err));
    }
  }, [registrations, logAudit]);

  // ═══════════════════════════════════════════════════════════════════
  // EMPLOYEE CRUD & PAYROLL ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  const addEmployee = useCallback(async (employeeData) => {
    try {
      const newEmp = {
        gymId: currentUser?.gymId || DEFAULT_ORG_ID,
        status: 'active',
        joined_at: employeeData.joined_at || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        ...employeeData,
        salary: parseFloat(employeeData.salary),
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.EMPLOYEES), newEmp);
      await logAudit('employee.create', 'employee', docRef.id, `Hired employee: ${newEmp.full_name} (${newEmp.role})`);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('addEmployee error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const updateEmployee = useCallback(async (id, updatedFields) => {
    try {
      const empRef = doc(db, COLLECTIONS.EMPLOYEES, id);
      const updated = { ...updatedFields };
      if (updated.salary !== undefined) updated.salary = parseFloat(updated.salary);
      await updateDoc(empRef, updated);
      await logAudit('employee.update', 'employee', id, `Updated employee fields: ${Object.keys(updated).join(', ')}`);
      return { success: true };
    } catch (err) {
      console.error('updateEmployee error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [logAudit]);

  const deleteEmployee = useCallback(async (id) => {
    try {
      const employee = employees.find(e => e.id === id);
      const empRef = doc(db, COLLECTIONS.EMPLOYEES, id);
      await updateDoc(empRef, {
        status: 'terminated',
        terminated_at: new Date().toISOString(),
      });
      if (employee) {
        await logAudit('employee.terminate', 'employee', id, `Terminated employee profile for ${employee.full_name}`);
      }
      return { success: true };
    } catch (err) {
      console.error('deleteEmployee error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [employees, logAudit]);

  const addEmployeeRegistrationRequest = useCallback(async (formData) => {
    try {
      const newReq = {
        gymId: DEFAULT_ORG_ID,
        status: 'pending_approval',
        created_at: new Date().toISOString(),
        ...formData,
        expected_salary: parseFloat(formData.expected_salary),
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.EMPLOYEE_REGISTRATIONS), newReq);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('addEmployeeRegistrationRequest error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, []);

  const approveEmployeeRegistration = useCallback(async (requestId, finalSalary, nextSalaryDate) => {
    try {
      const req = employeeRegistrations.find(r => r.id === requestId);
      if (req) {
        // Create full employee profile
        const empRes = await addEmployee({
          full_name: req.full_name,
          email: req.email,
          phone: req.phone,
          role: req.role,
          salary: finalSalary,
          next_salary_date: nextSalaryDate,
          joined_at: new Date().toISOString().split('T')[0],
        });

        if (empRes.success) {
          // Update registration status
          const regRef = doc(db, COLLECTIONS.EMPLOYEE_REGISTRATIONS, requestId);
          await updateDoc(regRef, { status: 'approved' });
          await logAudit('employee_registration.approve', 'employee_registration', requestId, `Approved job application and hired ${req.full_name} as ${req.role}`);
          return { success: true };
        }
      }
      return { success: false, message: 'Application not found or hiring failed.' };
    } catch (err) {
      console.error('approveEmployeeRegistration error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [employeeRegistrations, addEmployee, logAudit]);

  const rejectEmployeeRegistration = useCallback(async (requestId, reason) => {
    try {
      const req = employeeRegistrations.find(r => r.id === requestId);
      const regRef = doc(db, COLLECTIONS.EMPLOYEE_REGISTRATIONS, requestId);
      await updateDoc(regRef, {
        status: 'rejected',
        rejection_reason: reason,
      });
      if (req) {
        await logAudit('employee_registration.reject', 'employee_registration', requestId, `Rejected application for ${req.full_name}. Reason: ${reason}`);
      }
      return { success: true };
    } catch (err) {
      console.error('rejectEmployeeRegistration error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [employeeRegistrations, logAudit]);

  // ═══════════════════════════════════════════════════════════════════
  // INVOICING & PAYMENTS
  // ═══════════════════════════════════════════════════════════════════

  const recordPayment = useCallback(async (invoiceId, paymentMethod) => {
    try {
      const inv = invoices.find(i => i.id === invoiceId);
      const invoiceRef = doc(db, COLLECTIONS.INVOICES, invoiceId);
      await updateDoc(invoiceRef, {
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
      });
      if (inv) {
        await logAudit(
          'payment.receive', 'invoice', invoiceId,
          `Recorded payment of LKR ${inv.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} via ${paymentMethod.toUpperCase()}`
        );
      }
    } catch (err) {
      console.error('recordPayment error:', err);
      setError(friendlyFirestoreError(err));
    }
  }, [invoices, logAudit]);

  // ═══════════════════════════════════════════════════════════════════
  // ACCESS CONTROL (Check-in / Check-out)
  // ═══════════════════════════════════════════════════════════════════

  const checkInMember = useCallback(async (memberCode, source = 'qr') => {
    try {
      const member = members.find(m => m.member_code.toLowerCase() === memberCode.trim().toLowerCase());

      // Check if membership has expired (countdown expired)
      if (member && member.countdown_end && new Date(member.countdown_end).getTime() < Date.now()) {
        if (member.status === 'active') {
          // Auto-expire the member
          const memberRef = doc(db, COLLECTIONS.MEMBERS, member.id);
          await updateDoc(memberRef, { status: 'expired' });
          await logAudit('member.expire', 'member', member.id, `Membership for ${member.full_name} automatically expired (Countdown over)`);
          // Update local reference for the checks below
          member.status = 'expired';
        }
      }

      // Helper to write a denied event
      const writeDeniedEvent = async (membObj, reason, denyReason) => {
        const event = {
          gymId: DEFAULT_ORG_ID,
          member_id: membObj?.id || null,
          member_name: membObj?.full_name || 'Unknown Member',
          member_code: membObj?.member_code || memberCode,
          source,
          result: 'denied',
          deny_reason: denyReason,
          occurred_at: new Date().toISOString(),
        };
        const evtRef = await addDoc(collection(db, COLLECTIONS.ACCESS_EVENTS), event);
        await logAudit('access.denied', 'access_event', evtRef.id, `Access denied for ${event.member_name} (${event.member_code}). Reason: ${reason}`);
        return { success: false, reason };
      };

      if (!member) {
        return await writeDeniedEvent(null, 'Invalid membership code.', 'invalid_qr');
      }

      if (member.status === 'frozen') {
        return await writeDeniedEvent(member, `Membership is frozen. Freeze reason: ${member.freeze_reason || 'N/A'}`, 'frozen');
      }

      if (member.status === 'expired') {
        return await writeDeniedEvent(member, 'Membership has expired. Please renew.', 'expired');
      }

      if (member.status === 'cancelled' || member.status === 'suspended') {
        return await writeDeniedEvent(member, `Membership is ${member.status}. Access blocked.`, 'expired');
      }

      // ── ACCESS GRANTED ──
      const grantedEvent = {
        gymId: DEFAULT_ORG_ID,
        member_id: member.id,
        member_name: member.full_name,
        member_code: member.member_code,
        source,
        result: 'granted',
        occurred_at: new Date().toISOString(),
      };
      const evtRef = await addDoc(collection(db, COLLECTIONS.ACCESS_EVENTS), grantedEvent);
      await logAudit('member.checkin', 'access_event', evtRef.id, `Member checked in: ${member.full_name}`);
      return { success: true, member };
    } catch (err) {
      console.error('checkInMember error:', err);
      return { success: false, reason: 'System error during check-in. Please try again.' };
    }
  }, [members, logAudit]);

  const checkOutMember = useCallback(async (eventId) => {
    try {
      const evt = accessEvents.find(e => e.id === eventId);
      const eventRef = doc(db, COLLECTIONS.ACCESS_EVENTS, eventId);
      await updateDoc(eventRef, {
        check_out_at: new Date().toISOString(),
      });
      if (evt) {
        await logAudit('member.checkout', 'access_event', eventId, `Recorded checkout for ${evt.member_name}`);
      }
    } catch (err) {
      console.error('checkOutMember error:', err);
      setError(friendlyFirestoreError(err));
    }
  }, [accessEvents, logAudit]);

  const sendSMS = useCallback(async (toPhone, memberName, amount, sourceName, receiptLink, memberId = null) => {
    try {
      const fromPhone = '0779688582';
      const message = `Welcome to Ascend Fit! Hello ${memberName}, your payment of LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} for ${sourceName} has been received. View your receipt: ${receiptLink}`;
      
      console.log("%c[SMS Gateway] Sending SMS...", "color: #10b981; font-weight: bold;", {
        from: fromPhone,
        to: toPhone,
        message,
      });

      const smsLog = {
        gymId: currentUser?.gymId || DEFAULT_ORG_ID,
        from: fromPhone,
        to: toPhone,
        member_name: memberName,
        member_id: memberId,
        amount,
        source: sourceName,
        message,
        receipt_link: receiptLink,
        sent_at: new Date().toISOString(),
      };
      
      const docRef = await addDoc(collection(db, COLLECTIONS.SMS_LOGS), smsLog);
      
      await logAudit(
        'member.sms_receipt', 
        'member', 
        memberId || 'unknown_member', 
        `Sent SMS receipt from ${fromPhone} to ${memberName} (+${toPhone}) for LKR ${amount.toLocaleString()}`
      );
      
      showToast(`SMS Receipt sent to ${memberName} (+${toPhone}) from ${fromPhone}`, 'success');
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('sendSMS error:', err);
      showToast('Failed to send SMS receipt simulation.', 'error');
      return { success: false, error: err.message };
    }
  }, [currentUser, logAudit, showToast]);

  // ═══════════════════════════════════════════════════════════════════
  // MEMBERSHIP RENEWAL
  // ═══════════════════════════════════════════════════════════════════

  const renewMemberMembership = useCallback(async (memberId, paymentMethod, customPrice = null, periodMonths = 1) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) return { success: false, message: 'Member not found.' };

      const plan = plans.find(p => p.id === member.plan_id) || plans[0];
      if (!plan) return { success: false, message: 'No plan found.' };

      const isCustom = customPrice !== null && parseFloat(customPrice) !== plan.price * parseInt(periodMonths);
      const priceToCharge = isCustom ? parseFloat(customPrice) : plan.price * parseInt(periodMonths);
      const tax = isCustom ? 0 : priceToCharge * (plan.tax_rate / 100);
      const total = priceToCharge + tax;

      const newCountdownEnd = helperCalculateRenewalCountdownEnd(member.countdown_end, periodMonths);

      // Update member in Firestore
      const memberRef = doc(db, COLLECTIONS.MEMBERS, memberId);
      await updateDoc(memberRef, {
        status: 'active',
        countdown_end: newCountdownEnd,
        next_payment_date: newCountdownEnd,
      });

      // Create paid renewal invoice
      const invoiceData = {
        gymId: DEFAULT_ORG_ID,
        member_id: member.id,
        member_name: member.full_name,
        invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        subtotal: priceToCharge,
        tax_amount: tax,
        discount_amount: 0.0,
        total_amount: total,
        status: 'paid',
        due_date: new Date().toISOString().split('T')[0],
        issued_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod,
        plan_id: plan.id,
        created_at: new Date().toISOString(),
        billing_period: `${periodMonths} Month${parseInt(periodMonths) > 1 ? 's' : ''}`
      };
      const invRef = await addDoc(collection(db, COLLECTIONS.INVOICES), invoiceData);

      await logAudit('payment.receive', 'invoice', invRef.id,
        `Collected LKR ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} via ${paymentMethod.toUpperCase()} for membership renewal (${periodMonths}m) of ${member.full_name}`
      );
      await logAudit('member.renew', 'member', memberId,
        `Renewed membership for ${member.full_name} for ${periodMonths} months (New Expiry: ${new Date(newCountdownEnd).toLocaleDateString()})`
      );

      if (member.phone) {
        const receiptLink = `${getBaseUrl()}?view=receipt&type=invoice&id=${invRef.id}`;
        try {
          await sendSMS(member.phone, member.full_name, total, `Membership Renewal - ${plan.name}`, receiptLink, member.id);
        } catch (smsErr) {
          console.error('Failed to send SMS receipt during renewal:', smsErr);
        }
      }

      return { success: true, newCountdownEnd, invoice: { id: invRef.id, ...invoiceData } };
    } catch (err) {
      console.error('renewMemberMembership error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [members, plans, sendSMS, logAudit]);
  // ═══════════════════════════════════════════════════════════════════
  // PLAN (MEMBERSHIP PACKAGE) CRUD ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  const addPlan = useCallback(async (planData) => {
    try {
      const newPlan = {
        gymId: currentUser?.gymId || DEFAULT_ORG_ID,
        name: planData.name,
        price: parseFloat(planData.price),
        tax_rate: parseFloat(planData.tax_rate || 5),
        duration_days: parseInt(planData.duration_days || 30),
        features: planData.features || [],
        created_at: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.PLANS), newPlan);
      await logAudit('plan.create', 'plan', docRef.id, `Created membership package: ${newPlan.name}`);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('addPlan error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const updatePlan = useCallback(async (id, planFields) => {
    try {
      const planRef = doc(db, COLLECTIONS.PLANS, id);
      const updated = {
        ...planFields,
        price: planFields.price ? parseFloat(planFields.price) : undefined,
        tax_rate: planFields.tax_rate ? parseFloat(planFields.tax_rate) : undefined,
        duration_days: planFields.duration_days ? parseInt(planFields.duration_days) : undefined,
      };
      // remove undefined values
      Object.keys(updated).forEach(key => updated[key] === undefined && delete updated[key]);

      await updateDoc(planRef, updated);
      await logAudit('plan.update', 'plan', id, `Updated membership package fields: ${Object.keys(updated).join(', ')}`);
      return { success: true };
    } catch (err) {
      console.error('updatePlan error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [logAudit]);

  const deletePlan = useCallback(async (id) => {
    try {
      const plan = plans.find(p => p.id === id);
      const planRef = doc(db, COLLECTIONS.PLANS, id);
      await deleteDoc(planRef);
      if (plan) {
        await logAudit('plan.delete', 'plan', id, `Deleted membership package: ${plan.name}`);
      }
      return { success: true };
    } catch (err) {
      console.error('deletePlan error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [plans, logAudit]);

  // ─── SaaS PLAN CRUD ACTIONS ─────────────────────────────────────────

  const addSaasPlan = useCallback(async (planData) => {
    try {
      const newPlan = {
        name: planData.name,
        price: parseFloat(planData.price),
        duration_days: parseInt(planData.duration_days || 30),
        maxMembers: parseInt(planData.maxMembers || 100),
        maxStaff: parseInt(planData.maxStaff || 3),
        features: planData.features || [],
        created_at: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.SAAS_PLANS), newPlan);
      await logAudit('saas_plan.create', 'saas_plan', docRef.id, `Created SaaS subscription plan: ${newPlan.name}`);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('addSaasPlan error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [logAudit]);

  const updateSaasPlan = useCallback(async (id, planFields) => {
    try {
      const planRef = doc(db, COLLECTIONS.SAAS_PLANS, id);
      const updated = {
        ...planFields,
        price: planFields.price ? parseFloat(planFields.price) : undefined,
        duration_days: planFields.duration_days ? parseInt(planFields.duration_days) : undefined,
        maxMembers: planFields.maxMembers ? parseInt(planFields.maxMembers) : undefined,
        maxStaff: planFields.maxStaff ? parseInt(planFields.maxStaff) : undefined,
      };
      // remove undefined values
      Object.keys(updated).forEach(key => updated[key] === undefined && delete updated[key]);

      await updateDoc(planRef, updated);
      await logAudit('saas_plan.update', 'saas_plan', id, `Updated SaaS subscription plan fields: ${Object.keys(updated).join(', ')}`);
      return { success: true };
    } catch (err) {
      console.error('updateSaasPlan error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [logAudit]);

  const deleteSaasPlan = useCallback(async (id) => {
    try {
      const planRef = doc(db, COLLECTIONS.SAAS_PLANS, id);
      await deleteDoc(planRef);
      await logAudit('saas_plan.delete', 'saas_plan', id, `Deleted SaaS subscription plan: ${id}`);
      return { success: true };
    } catch (err) {
      console.error('deleteSaasPlan error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [logAudit]);

  // ═══════════════════════════════════════════════════════════════════
  // PERSONAL TRAINER CRUD ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  const addTrainer = useCallback(async (trainerData) => {
    try {
      const newTrainer = {
        gymId: currentUser?.gymId || DEFAULT_ORG_ID,
        name: trainerData.name,
        specialization: trainerData.specialization,
        bio: trainerData.bio || '',
        hourly_rate: parseFloat(trainerData.hourly_rate),
        photo_url: trainerData.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        created_at: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.TRAINERS), newTrainer);
      await logAudit('trainer.create', 'trainer', docRef.id, `Added personal trainer: ${newTrainer.name}`);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('addTrainer error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const updateTrainer = useCallback(async (id, trainerFields) => {
    try {
      const trainerRef = doc(db, COLLECTIONS.TRAINERS, id);
      const updated = {
        ...trainerFields,
        hourly_rate: trainerFields.hourly_rate ? parseFloat(trainerFields.hourly_rate) : undefined,
      };
      Object.keys(updated).forEach(key => updated[key] === undefined && delete updated[key]);

      await updateDoc(trainerRef, updated);
      await logAudit('trainer.update', 'trainer', id, `Updated personal trainer fields: ${Object.keys(updated).join(', ')}`);
      return { success: true };
    } catch (err) {
      console.error('updateTrainer error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [logAudit]);

  const deleteTrainer = useCallback(async (id) => {
    try {
      const trainer = trainers.find(t => t.id === id);
      const trainerRef = doc(db, COLLECTIONS.TRAINERS, id);
      await deleteDoc(trainerRef);
      if (trainer) {
        await logAudit('trainer.delete', 'trainer', id, `Deleted personal trainer: ${trainer.name}`);
      }
      return { success: true };
    } catch (err) {
      console.error('deleteTrainer error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [trainers, logAudit]);

  // ═══════════════════════════════════════════════════════════════════
  // ADVANCED ADMINISTRATOR ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  const updateAdminPassword = useCallback(async (adminId, newPassword) => {
    try {
      const admin = admins.find(a => a.id === adminId);
      if (!admin) return { success: false, message: 'Admin not found.' };

      // Update Firestore admin doc
      const adminRef = doc(db, COLLECTIONS.ADMINS, adminId);
      await updateDoc(adminRef, { password: newPassword });

      // If it is the current user logged in, also update in Firebase Auth
      if (currentUser && currentUser.id === adminId && auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
      }

      await logAudit('admin.password_update', 'admin', adminId, `Updated password for administrator: ${admin.name}`);
      return { success: true };
    } catch (err) {
      console.error('updateAdminPassword error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [admins, currentUser, logAudit]);

  const deleteAdmin = useCallback(async (adminId) => {
    try {
      const admin = admins.find(a => a.id === adminId);
      if (!admin) return { success: false, message: 'Admin not found.' };

      // Delete from Firestore
      const adminRef = doc(db, COLLECTIONS.ADMINS, adminId);
      await deleteDoc(adminRef);

      await logAudit('admin.delete', 'admin', adminId, `Deleted administrator account: ${admin.name}`);

      // If they deleted themselves, sign out
      if (currentUser && currentUser.id === adminId) {
        await logout();
      }

      return { success: true };
    } catch (err) {
      console.error('deleteAdmin error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [admins, currentUser, logout, logAudit]);

  // ─── Finance CRUD Actions ───────────────────────────────────────────

  const addExpense = useCallback(async (expenseData) => {
    try {
      const newExp = {
        gymId: currentUser?.gymId || DEFAULT_ORG_ID,
        created_at: new Date().toISOString(),
        ...expenseData,
        amount: parseFloat(expenseData.amount),
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.EXPENSES), newExp);
      await logAudit('expense.create', 'expense', docRef.id, `Recorded expense: ${newExp.title} (LKR ${newExp.amount.toLocaleString()})`);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('addExpense error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const updateExpense = useCallback(async (id, updatedFields) => {
    try {
      const expRef = doc(db, COLLECTIONS.EXPENSES, id);
      const updated = { ...updatedFields };
      if (updated.amount !== undefined) updated.amount = parseFloat(updated.amount);
      await updateDoc(expRef, updated);
      await logAudit('expense.update', 'expense', id, `Updated expense fields: ${Object.keys(updated).join(', ')}`);
      return { success: true };
    } catch (err) {
      console.error('updateExpense error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [logAudit]);

  const deleteExpense = useCallback(async (id) => {
    try {
      const expRef = doc(db, COLLECTIONS.EXPENSES, id);
      await deleteDoc(expRef);
      await logAudit('expense.delete', 'expense', id, `Deleted expense record`);
      return { success: true };
    } catch (err) {
      console.error('deleteExpense error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [logAudit]);


  const addIncome = useCallback(async (incomeData) => {
    try {
      const newInc = {
        gymId: currentUser?.gymId || DEFAULT_ORG_ID,
        created_at: new Date().toISOString(),
        ...incomeData,
        amount: parseFloat(incomeData.amount),
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.INCOME), newInc);
      await logAudit('income.create', 'income', docRef.id, `Recorded income: ${newInc.source} (LKR ${newInc.amount.toLocaleString()})`);

      if (newInc.member_name) {
        const member = members.find(m => m.full_name === newInc.member_name);
        if (member && member.phone) {
          const receiptLink = `${getBaseUrl()}?view=receipt&type=income&id=${docRef.id}`;
          try {
            await sendSMS(member.phone, member.full_name, newInc.amount, newInc.source, receiptLink, member.id);
          } catch (smsErr) {
            console.error('Failed to send SMS receipt during addIncome:', smsErr);
          }
        }
      }

      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('addIncome error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit, members, sendSMS]);

  const updateIncome = useCallback(async (id, updatedFields) => {
    try {
      const incRef = doc(db, COLLECTIONS.INCOME, id);
      const updated = { ...updatedFields };
      if (updated.amount !== undefined) updated.amount = parseFloat(updated.amount);
      await updateDoc(incRef, updated);
      await logAudit('income.update', 'income', id, `Updated income fields: ${Object.keys(updated).join(', ')}`);
      return { success: true };
    } catch (err) {
      console.error('updateIncome error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [logAudit]);

  const deleteIncome = useCallback(async (id) => {
    try {
      const incRef = doc(db, COLLECTIONS.INCOME, id);
      await deleteDoc(incRef);
      await logAudit('income.delete', 'income', id, `Deleted income record`);
      return { success: true };
    } catch (err) {
      console.error('deleteIncome error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [logAudit]);

  const processStaffPayroll = useCallback(async (trainerId, amount, paymentMethod) => {
    try {
      const trainer = trainers.find(t => t.id === trainerId);
      if (!trainer) return { success: false, message: 'Staff member not found.' };

      const todayStr = new Date().toISOString().split('T')[0];
      const nextPay = new Date();
      nextPay.setMonth(nextPay.getMonth() + 1);
      const nextPayStr = nextPay.toISOString().split('T')[0];

      // Update in Firestore
      const trainerRef = doc(db, COLLECTIONS.TRAINERS, trainerId);
      await updateDoc(trainerRef, {
        last_payment_date: todayStr,
        next_payment_date: nextPayStr,
        payment_status: 'paid'
      });

      // Log audit event
      await logAudit('payroll.process', 'trainer', trainerId,
        `Processed payroll of LKR ${amount.toLocaleString()} via ${paymentMethod.toUpperCase()} for ${trainer.name}`
      );

      return { success: true };
    } catch (err) {
      console.error('processStaffPayroll error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [trainers, logAudit]);

  // ═══════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════
  return (
    <DashboardContext.Provider value={{
      // State
      plans,
      trainers,
      members,
      registrations,
      accessEvents,
      invoices,
      auditLogs,
      admins,
      employees,
      employeeRegistrations,
      expenses,
      income,
      currentUser,
      toasts,

      // FitGenCore SaaS States
      gyms,
      subscriptions,
      supportTickets,
      announcements,
      gymSettings,

      // Loading / Error
      isLoading,
      dataLoaded,
      authReady,
      error,
      setError,

      // Toast Actions
      showToast,
      removeToast,

      // Auth Actions
      login,
      logout,
      registerAdmin,

      // Member CRUD
      addMember,
      updateMember,
      deleteMember,
      freezeMembership,
      unfreezeMembership,

      // Registration Actions
      addRegistrationRequest,
      approveRegistration,
      rejectRegistration,

      // Employee Actions
      addEmployee,
      updateEmployee,
      deleteEmployee,
      addEmployeeRegistrationRequest,
      approveEmployeeRegistration,
      rejectEmployeeRegistration,

      // Payment Actions
      recordPayment,

      // Access Actions
      checkInMember,
      checkOutMember,

      // Utility
      logAudit,
      renewMemberMembership,
      processStaffPayroll,
      sendSMS,

      // Plan CRUD
      addPlan,
      updatePlan,
      deletePlan,

      // Trainer CRUD
      addTrainer,
      updateTrainer,
      deleteTrainer,

      // Admin Management Actions
      updateAdminPassword,
      deleteAdmin,

      // Finance Actions
      addExpense,
      updateExpense,
      deleteExpense,
      addIncome,
      updateIncome,
      deleteIncome,

      // FitGenCore SaaS Callbacks
      seedDatabaseClientSide,
      onboardNewGym,
      updateGymStatus,
      suspendGym,
      deleteGym,
      resetGymOwnerPassword,
      renewGymSubscription,
      updateAndRenewSubscription,
      updateGymDetails,
      createSupportTicket,
      replySupportTicket,
      closeSupportTicket,
      publishAnnouncement,
      updateGymSettings,
      getGymHealthScore,

      // SaaS Plan Management
      saasPlans,
      addSaasPlan,
      updateSaasPlan,
      deleteSaasPlan,
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
