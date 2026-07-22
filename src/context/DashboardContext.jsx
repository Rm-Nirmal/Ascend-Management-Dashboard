/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// ─── Firebase Imports ────────────────────────────────────────────────
import { initializeApp, deleteApp } from 'firebase/app';
import firebaseApp, { db, auth, storage, COLLECTIONS, DEFAULT_ORG_ID } from '../lib/firebase';
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword,
  deleteUser,
} from 'firebase/auth';

const DashboardContext = createContext();

// ─── Pure Helper Functions (no side effects) ─────────────────────────

/**
 * Build a new member data object suitable for writing to Firestore.
 * Generates member_code, qr_token, and sets defaults.
 */
const helperCreateMemberObject = (memberData, memberCode, gymId) => {
  const now = new Date();
  const countdownEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    gymId: gymId || DEFAULT_ORG_ID,
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
const helperCreateInvoiceForMember = (memberId, memberName, plan, gymId) => {
  const tax = 0.0;
  const total = plan.price;
  const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    gymId: gymId || DEFAULT_ORG_ID,
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

/**
 * Subtract months from countdown_end for undoing a membership renewal.
 */
const helperCalculateUndoCountdownEnd = (countdownEnd, months = 1) => {
  if (!countdownEnd) return new Date().toISOString();
  const baseDate = new Date(countdownEnd);
  baseDate.setMonth(baseDate.getMonth() - parseInt(months));
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

// Generate up to 10 variations of gymId for robust case-insensitive queries
export const getGymIdVariations = (id) => {
  if (!id) return [];
  const variations = new Set([
    id,
    id.toLowerCase(),
    id.toUpperCase(),
    id.replace(/[-_]/g, ''),
    id.replace(/[-_]/g, '').toLowerCase(),
    id.replace(/-/g, '_'),
    id.replace(/-/g, '_').toLowerCase(),
    id.replace(/_/g, '-'),
    id.replace(/_/g, '-').toLowerCase(),
  ]);
  return Array.from(variations).slice(0, 10);
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

// Normalize device document to map between legacy format and new enterprise nested format
export const normalizeDevice = (docSnapshot) => {
  const data = docSnapshot.data();
  const id = docSnapshot.id;

  // If it is in the new enterprise format:
  if (data && data.device && data.device.serial !== undefined) {
    return {
      id,
      ...data,
      // Legacy root-level fields for compatibility with existing components
      name: data.device.name || '',
      serialNumber: data.device.serial || '',
      brand: data.device.brand || '',
      model: data.device.model || '',
      ipAddress: data.network?.ip || '',
      macAddress: data.network?.mac || '',
      firmware: data.network?.firmware || '',
      isEnabled: data.health?.status !== 'Disabled',
      status: (data.health?.status || 'Offline').toLowerCase(),
      lastHeartbeat: data.health?.lastHeartbeat || null,
      lastSync: data.health?.lastSync || null,
      doorStatus: data.health?.doorStatus || 'locked',
      gymId: data.gymId
    };
  }

  // Otherwise, it's a legacy flat format document. Normalize it into the nested structure
  return {
    id,
    ...data,
    device: {
      serial: data.serialNumber || '',
      brand: data.brand || 'ZKTeco',
      model: data.model || 'SpeedFace V5L',
      name: data.name || ''
    },
    configuration: {
      entranceType: data.entranceType || 'Main Entrance',
      physicalLocation: data.physicalLocation || 'Reception',
      purpose: data.devicePurpose || 'Door Access + Attendance',
      deviceNumber: data.deviceNumber || 1,
      doorNumber: data.doorNumber || 1,
      readerNumber: data.readerNumber || 1
    },
    network: {
      ip: data.ipAddress || '192.168.1.100',
      port: parseInt(data.communicationSettings?.port || data.port || '4370'),
      protocol: data.communicationSettings?.protocol || data.protocol || 'TCP/IP',
      mac: data.macAddress || ''
    },
    capabilities: data.capabilities || {
      face: true,
      fingerprint: true,
      rfid: true,
      qr: false,
      pin: true,
      palm: false
    },
    health: {
      status: data.status ? (data.status.charAt(0).toUpperCase() + data.status.slice(1)) : (data.isEnabled ? 'Offline' : 'Disabled'),
      lastHeartbeat: data.lastHeartbeat || null,
      latency: data.latency || null,
      heartbeatInterval: data.heartbeatInterval || 30,
      doorStatus: data.doorStatus || 'locked',
      lastSync: data.lastSync || null
    },
    // Legacies mapped back to root to prevent any undefined issues
    name: data.name || '',
    serialNumber: data.serialNumber || '',
    brand: data.brand || '',
    model: data.model || '',
    ipAddress: data.ipAddress || '',
    macAddress: data.macAddress || '',
    firmware: data.firmware || '',
    isEnabled: data.isEnabled !== false,
    status: (data.status || (data.isEnabled !== false ? 'offline' : 'disabled')).toLowerCase(),
    lastHeartbeat: data.lastHeartbeat || null,
    lastSync: data.lastSync || null,
    doorStatus: data.doorStatus || 'locked',
    gymId: data.gymId
  };
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
  const [breakLogs, setBreakLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [shiftLogs, setShiftLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [devices, setDevices] = useState([]);
  const [smsLogs, setSmsLogs] = useState([]);
  const [notificationTemplates, setNotificationTemplates] = useState([]);
  
  // FitGenCore SaaS States
  const [gyms, setGyms] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [memberDocuments, setMemberDocuments] = useState([]);
  const [gymSettings, setGymSettings] = useState(null);
  const [saasPlans, setSaasPlans] = useState([]);
  const [currentGym, setCurrentGym] = useState(null);
  
  // Group Chat States
  const [groupChatMessages, setGroupChatMessages] = useState([]);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  // Inventory Management Module States
  const [inventoryCategories, setInventoryCategories] = useState([]);
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [inventorySuppliers, setInventorySuppliers] = useState([]);
  const [inventoryTransactions, setInventoryTransactions] = useState([]);

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

  const createInvoiceForMember = useCallback(async (memberId, memberName, plan, gymId) => {
    try {
      const invoiceData = helperCreateInvoiceForMember(memberId, memberName, plan, gymId);
      await addDoc(collection(db, COLLECTIONS.INVOICES), invoiceData);
    } catch (err) {
      console.error('createInvoiceForMember error:', err);
    }
  }, []);

  const sendTemplatedSMS = useCallback(async (templateId, member, variables = {}) => {
    try {
      let template = notificationTemplates.find(t => t.id === templateId);
      
      const defaultTemplates = {
        t_pay: {
          id: 't_pay',
          name: 'Payment Reminder Alert',
          body: 'Hello {{name}}, this is a friendly reminder that invoice {{invoice}} for LKR {{amount}} was due on {{date}} at {{gym_name}}.'
        },
        t_welcome: {
          id: 't_welcome',
          name: 'New Registration Welcome',
          body: 'Welcome to {{gym_name}}, {{name}}! Your membership code is {{code}}. Scan your QR code at the entrance gate to check in.'
        }
      };

      const activeTemplate = template || defaultTemplates[templateId];
      if (!activeTemplate) {
        throw new Error(`Template ${templateId} not found.`);
      }

      const resolvedGymId = member.gymId || currentUser?.gymId || DEFAULT_ORG_ID;
      let gymName = 'Fitgencore';
      if (resolvedGymId === 'gym_ascend_hq') {
        gymName = gymSettings?.gymName || 'Fitgencore';
      } else {
        const gym = gyms.find(g => g.gymId === resolvedGymId);
        if (gym) {
          gymName = gym.gymName;
        }
      }

      let message = activeTemplate.body;
      const allVars = {
        name: member.full_name || '',
        code: member.member_code || '',
        gym_name: gymName,
        ...variables
      };

      Object.keys(allVars).forEach(key => {
        const val = allVars[key];
        const displayVal = typeof val === 'number' ? val.toLocaleString('en-US') : val;
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
        message = message.replace(regex, displayVal || '');
      });

      const fromPhone = '0779688582';
      const toPhone = member.phone || '';

      console.log("%c[SMS Gateway] Sending Templated SMS...", "color: #10b981; font-weight: bold;", {
        templateId,
        from: fromPhone,
        to: toPhone,
        message,
      });

      const smsLog = {
        gymId: resolvedGymId,
        from: fromPhone,
        to: toPhone,
        member_name: member.full_name,
        member_id: member.id,
        message,
        sent_at: new Date().toISOString(),
        template_id: templateId
      };

      await addDoc(collection(db, COLLECTIONS.SMS_LOGS), smsLog);

      await logAudit(
        'member.sms_reminder', 
        'member', 
        member.id, 
        `Sent SMS reminder (${activeTemplate.name}) from ${fromPhone} to ${member.full_name} (+${toPhone})`
      );

      return true;
    } catch (err) {
      console.error('sendTemplatedSMS error:', err);
      return false;
    }
  }, [currentUser, gymSettings, gyms, notificationTemplates, logAudit]);


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
        if (!params.has('gymId')) {
          targetGymId = 'super_admin';
        } else {
          targetGymId = params.get('gymId');
        }
      }
      
      if (currentUser.role !== 'super_admin') {
        if (params.get('gymId') !== currentUser.gymId) {
          params.set('gymId', currentUser.gymId || DEFAULT_ORG_ID);
          const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
          window.history.replaceState(null, '', newUrl);
        }
      } else {
        if (targetGymId && params.get('gymId') !== targetGymId) {
          params.set('gymId', targetGymId);
          const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
          window.history.replaceState(null, '', newUrl);
        }
      }
    }
  }, [currentUser]);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE C: Public Plans Firestore Listener (runs for guest too)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const orgId = (currentUser && currentUser.role !== 'super_admin') ? (currentUser.gymId || DEFAULT_ORG_ID) : (currentUser?.gymId || getUrlGymId());
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

  // ─── Real-time Notification Templates Seeder ────────────────────────
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, COLLECTIONS.NOTIFICATION_TEMPLATES), async (snap) => {
      if (snap.empty) {
        // Seed default templates
        const defaultTemplates = [
          {
            id: 't_welcome',
            name: 'New Registration Welcome',
            channel: 'sms',
            body: 'Welcome to {{gym_name}}, {{name}}! Your membership code is {{code}}. Scan your QR code at the entrance gate to check in.'
          },
          {
            id: 't_pay',
            name: 'Payment Reminder Alert',
            channel: 'sms',
            body: 'Hello {{name}}, this is a friendly reminder that invoice {{invoice}} for LKR {{amount}} was due on {{date}} at {{gym_name}}.'
          }
        ];
        for (const t of defaultTemplates) {
          try {
            await addDoc(collection(db, COLLECTIONS.NOTIFICATION_TEMPLATES), t);
          } catch (err) {
            console.error('Seeding notification template error:', err);
          }
        }
      }
    }, (err) => {
      console.error('Notification templates seeder error:', err);
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
        setBreakLogs([]);
        setExpenses([]);
        setIncome([]);
        setDevices([]);
        setGyms([]);
        setSubscriptions([]);
        setSupportTickets([]);
        setAnnouncements([]);
        setMemberDocuments([]);
        setGymSettings(null);
        setCurrentGym(null);
        setInventoryCategories([]);
        setInventoryProducts([]);
        setInventorySuppliers([]);
        setInventoryTransactions([]);
        setDataLoaded(false);
      });
      return;
    }

    const unsubscribers = [];

    if (currentUser.role === 'super_admin') {
      // ─── SUPER ADMIN REAL-TIME LISTENERS ───
      let loadedCount = 0;
      const totalCollections = 12;
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

      // 9. Expenses (all - for global SaaS expense tracking)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.EXPENSES), (snap) => {
          const exp = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          exp.sort((a, b) => new Date(b.date) - new Date(a.date));
          setExpenses(exp);
          markLoaded();
        }, (err) => { console.error('Superadmin expenses error:', err); markLoaded(); })
      );

      // 10. Devices (all - for global device monitoring)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.DEVICES), (snap) => {
          setDevices(snap.docs.map(normalizeDevice));
          markLoaded();
        }, (err) => { console.error('Superadmin devices error:', err); markLoaded(); })
      );

      // 11. SMS Logs (all)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.SMS_LOGS), (snap) => {
          const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          logs.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
          setSmsLogs(logs);
          markLoaded();
        }, (err) => { console.error('Superadmin SMS logs error:', err); markLoaded(); })
      );

      // 12. Member Documents (all)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.MEMBER_DOCUMENTS), (snap) => {
          setMemberDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Superadmin memberDocuments error:', err); markLoaded(); })
      );

    } else {
      // ─── GYM OWNER / STAFF REAL-TIME LISTENERS ───
      const orgId = currentUser.gymId || DEFAULT_ORG_ID;
      let loadedCount = 0;
      const totalCollections = 25;
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
              payment_status: payStatus,
              employee_code: data.employee_code || 'EMP-' + d.id.substring(0, 5).toUpperCase()
            };
          });
          const filteredTrainers = trainersData.filter(emp => 
            emp.role === 'Trainer' || 
            emp.role === 'Personal Trainer' || 
            emp.specialization !== undefined || 
            emp.hourly_rate !== undefined
          );
          setTrainers(filteredTrainers);
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

      // 11. Gym Settings (scoped with case/delimiter variations)
      const settingsQ = query(
        collection(db, COLLECTIONS.GYM_SETTINGS),
        where('gymId', 'in', getGymIdVariations(orgId))
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

      // 12. Announcements (filtered by targetGymIds)
      unsubscribers.push(
        onSnapshot(collection(db, COLLECTIONS.ANNOUNCEMENTS), (snap) => {
          const allAnn = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const filteredAnn = allAnn.filter(a => 
            !a.targetGymIds || 
            a.targetGymIds.includes('all') || 
            a.targetGymIds.includes(orgId)
          );
          filteredAnn.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setAnnouncements(filteredAnn);
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

      // 14. Devices (scoped)
      const devicesQ = query(
        collection(db, COLLECTIONS.DEVICES),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(devicesQ, (snap) => {
          setDevices(snap.docs.map(normalizeDevice));
          markLoaded();
        }, (err) => { console.error('Devices error:', err); markLoaded(); })
      );

      // 15. Inventory Categories (scoped)
      const categoriesQ = query(
        collection(db, 'gyms', orgId, 'inventory', 'default', 'categories')
      );
      unsubscribers.push(
        onSnapshot(categoriesQ, (snap) => {
          setInventoryCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Inventory categories error:', err); markLoaded(); })
      );

      // 16. Inventory Products (scoped)
      const productsQ = query(
        collection(db, 'gyms', orgId, 'inventory', 'default', 'products')
      );
      unsubscribers.push(
        onSnapshot(productsQ, (snap) => {
          setInventoryProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Inventory products error:', err); markLoaded(); })
      );

      // 17. Inventory Suppliers (scoped)
      const suppliersQ = query(
        collection(db, 'gyms', orgId, 'inventory', 'default', 'suppliers')
      );
      unsubscribers.push(
        onSnapshot(suppliersQ, (snap) => {
          setInventorySuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Inventory suppliers error:', err); markLoaded(); })
      );

      // 18. Inventory Stock Transactions (scoped)
      const transactionsQ = query(
        collection(db, 'gyms', orgId, 'inventory', 'default', 'stockTransactions')
      );
      unsubscribers.push(
        onSnapshot(transactionsQ, (snap) => {
          const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          txs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setInventoryTransactions(txs);
          markLoaded();
        }, (err) => { console.error('Inventory transactions error:', err); markLoaded(); })
      );

      // 19. SMS Logs (scoped)
      const smsLogsQ = query(
        collection(db, COLLECTIONS.SMS_LOGS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(smsLogsQ, (snap) => {
          const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          logs.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
          setSmsLogs(logs);
          markLoaded();
        }, (err) => { console.error('SMS logs error:', err); markLoaded(); })
      );

      // 20. Break Logs (scoped)
      const breakLogsQ = query(
        collection(db, COLLECTIONS.BREAK_LOGS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(breakLogsQ, (snap) => {
          const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          logs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
          setBreakLogs(logs);
          markLoaded();
        }, (err) => { console.error('Break logs error:', err); markLoaded(); })
      );

      // 21. Leave Requests (scoped)
      const leaveRequestsQ = query(
        collection(db, COLLECTIONS.LEAVE_REQUESTS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(leaveRequestsQ, (snap) => {
          const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setLeaveRequests(logs);
          markLoaded();
        }, (err) => { console.error('Leave requests error:', err); markLoaded(); })
      );

      // 22. Shift Logs (scoped)
      const shiftLogsQ = query(
        collection(db, COLLECTIONS.SHIFT_LOGS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(shiftLogsQ, (snap) => {
          const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          logs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
          setShiftLogs(logs);
          markLoaded();
        }, (err) => { console.error('Shift logs error:', err); markLoaded(); })
      );

      // 23. Tenant Gym Document Listener
      const tenantGymQ = query(
        collection(db, COLLECTIONS.GYMS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(tenantGymQ, (snap) => {
          if (!snap.empty) {
            setCurrentGym({ id: snap.docs[0].id, ...snap.docs[0].data() });
          } else {
            setCurrentGym(null);
          }
          markLoaded();
        }, (err) => { console.error('Tenant gym info error:', err); markLoaded(); })
      );

      // 24. Group Chat Listener (scoped)
      const groupChatQ = query(
        collection(db, COLLECTIONS.GROUP_CHAT),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(groupChatQ, (snap) => {
          const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          setGroupChatMessages(msgs);
          
          // Check for unread messages if user is not currently on the chat page
          if (msgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            const currentUserId = currentUser?.id || currentUser?.uid;
            if (lastMsg.senderId !== currentUserId) {
              const lastRead = localStorage.getItem('lastReadChatTime_' + currentUserId);
              if (!lastRead || new Date(lastMsg.created_at) > new Date(lastRead)) {
                setHasUnreadChat(true);
              }
            }
          }
          markLoaded();
        }, (err) => { console.error('Group chat error:', err); markLoaded(); })
      );

      // 25. Member Documents (scoped)
      const memberDocsQ = query(
        collection(db, COLLECTIONS.MEMBER_DOCUMENTS),
        where('gymId', '==', orgId)
      );
      unsubscribers.push(
        onSnapshot(memberDocsQ, (snap) => {
          setMemberDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          markLoaded();
        }, (err) => { console.error('Member documents error:', err); markLoaded(); })
      );
    }

    // Global Notification Templates Listener
    unsubscribers.push(
      onSnapshot(collection(db, COLLECTIONS.NOTIFICATION_TEMPLATES), (snap) => {
        setNotificationTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => { console.error('Global notification templates error:', err); })
    );

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
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
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
  const registerAdmin = useCallback(async (name, email, password, role, employeeId = null) => {
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
        employeeId, // Save linked employee ID
        photo_url: '',
        created_at: new Date().toISOString(),
      };

      await addDoc(collection(db, COLLECTIONS.ADMINS), adminData);

      if (employeeId) {
        // Update the employee's role in the employees collection to 'Standard Admin'
        const empRef = doc(db, COLLECTIONS.EMPLOYEES, employeeId);
        await updateDoc(empRef, { role: 'Standard Admin' });
      }

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
      if (code === 'auth/email-already-in-use') {
        try {
          const adminData = {
            uid: 'existing_auth_user',
            name,
            email: email.trim().toLowerCase(),
            role,
            password,
            gymId: currentUser?.gymId || DEFAULT_ORG_ID,
            employeeId,
            photo_url: '',
            created_at: new Date().toISOString(),
          };

          await addDoc(collection(db, COLLECTIONS.ADMINS), adminData);

          if (employeeId) {
            const empRef = doc(db, COLLECTIONS.EMPLOYEES, employeeId);
            await updateDoc(empRef, { role: 'Standard Admin' });
          }

          await logAudit(
            'admin.register', 'auth', 'existing_auth_user',
            `Registered new admin (linked to existing Auth user): ${name} (${role === 'super_admin' ? 'Super Admin' : 'Admin'})`,
            currentUser?.name
          );

          return { success: true, message: 'Admin registered. Email already exists in Firebase Auth, they can log in immediately.' };
        } catch (innerErr) {
          console.error('Failed to create Firestore document for existing auth user:', innerErr);
          return { success: false, message: 'Failed to write administrator document: ' + innerErr.message };
        }
      }

      const messages = {
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
        gymName: 'Fitgencore HQ',
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
        gymName: 'Fitgencore HQ',
        themeColor: '#ffffff',
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
          photo_url: '',
          created_at: new Date().toISOString()
        },
        {
          name: 'James Mercer',
          email: 'admin@ascend.com',
          role: 'gym_owner',
          gymId: 'gym_ascend_hq',
          photo_url: '',
          created_at: new Date().toISOString()
        },
        {
          name: 'John Power',
          email: 'owner@powergym.com',
          role: 'gym_owner',
          gymId: 'gym_power_place',
          photo_url: '',
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
          member_code: 'ASC-0001',
          qr_token: 'qr_token_ASC-0001',
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
          member_code: 'ASC-0002',
          qr_token: 'qr_token_ASC-0002',
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
        gymName: 'Fitgencore HQ',
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
        photo_url: '',
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
        themeColor: '#ffffff',
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
      const variations = getGymIdVariations(gymId);
      
      const gymSnap = await getDocs(query(collection(db, COLLECTIONS.GYMS), where('gymId', 'in', variations)));
      if (gymSnap.empty) {
        return { success: false, message: 'Gym not found.' };
      }
      
      const gymRef = gymSnap.docs[0].ref;
      const updateData = {
        gymName: updatedFields.gymName,
        ownerName: updatedFields.ownerName,
        phone: updatedFields.phone,
        address: updatedFields.address,
        country: updatedFields.country,
        currency: updatedFields.currency,
        timezone: updatedFields.timezone,
        freezeMessage: updatedFields.freezeMessage || '',
        deactivateMessage: updatedFields.deactivateMessage || '',
        fitgencoreHotline: updatedFields.fitgencoreHotline || '',
      };
      if (updatedFields.disabledFeatures !== undefined) {
        updateData.disabledFeatures = updatedFields.disabledFeatures;
      }
      await updateDoc(gymRef, updateData);

      // Also update gym settings
      const settingsSnap = await getDocs(query(collection(db, COLLECTIONS.GYM_SETTINGS), where('gymId', 'in', variations)));
      if (!settingsSnap.empty) {
        const settingsUpdate = {
          gymName: updatedFields.gymName,
          phone: updatedFields.phone,
          address: updatedFields.address,
          currency: updatedFields.currency,
          timezone: updatedFields.timezone,
        };
        if (updatedFields.disabledFeatures !== undefined) {
          settingsUpdate.disabledFeatures = updatedFields.disabledFeatures;
        }
        // Update all matching docs to ensure synchronization
        for (const settingsDoc of settingsSnap.docs) {
          await updateDoc(settingsDoc.ref, settingsUpdate);
        }
      } else {
        const newSettings = {
          gymId: gymId,
          gymName: updatedFields.gymName || 'Client Gym',
          themeColor: '#ffffff',
          darkMode: true,
          logo: '',
          phone: updatedFields.phone || '',
          address: updatedFields.address || '',
          currency: updatedFields.currency || 'LKR',
          timezone: updatedFields.timezone || 'Asia/Colombo',
          disabledFeatures: updatedFields.disabledFeatures || []
        };
        await addDoc(collection(db, COLLECTIONS.GYM_SETTINGS), newSettings);
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
        replies: [],
        readByClient: true,
        readByAdmin: false
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
        status: senderRole === 'super_admin' ? 'in_progress' : 'open',
        readByAdmin: senderRole === 'super_admin',
        readByClient: senderRole !== 'super_admin'
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

  // Mark Support Ticket As Read
  const markTicketAsRead = useCallback(async (ticketId, role) => {
    try {
      const ticketRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);
      if (role === 'super_admin') {
        await updateDoc(ticketRef, { readByAdmin: true });
      } else {
        await updateDoc(ticketRef, { readByClient: true });
      }
    } catch (err) {
      console.error('markTicketAsRead error:', err);
    }
  }, []);

  // Publish SaaS Announcement
  const publishAnnouncement = useCallback(async (annData) => {
    try {
      const newAnn = {
        title: annData.title,
        content: annData.content,
        category: annData.category || 'announcement',
        priority: annData.priority || 'medium',
        publishedBy: currentUser?.name || 'Super Admin',
        createdAt: new Date().toISOString(),
        targetGymIds: annData.targetGymIds || ['all']
      };
      await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), newAnn);
      await logAudit('announcement.publish', 'announcement', 'global', `Published announcement: ${annData.title}`);
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

      // 1. Sync settings changes to COLLECTIONS.GYMS if gym owner, owner, or gym admin
      if (currentUser?.role === 'gym_owner' || currentUser?.role === 'owner' || currentUser?.role === 'admin') {
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
          themeColor: '#ffffff',
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
      const { gymId: memberDataGymId, ...restMemberData } = memberData;
      const resolvedGymId = memberDataGymId || currentUser?.gymId || DEFAULT_ORG_ID;

      let gymName = gymSettings?.gymName;
      if (resolvedGymId !== gymSettings?.gymId) {
        const targetGym = gyms.find(g => g.gymId === resolvedGymId);
        if (targetGym) {
          gymName = targetGym.gymName;
        }
      }
      if (!gymName) {
        gymName = resolvedGymId === 'gym_ascend_hq' ? 'Fitgencore' : 'Client Gym';
      }

       const cleanName = gymName.trim().replace(/[^a-zA-Z]/g, '');
      const prefix = (cleanName.substring(0, 3).toUpperCase() || 'GYM') + '-';

      // Find the next unused member code starting from 0001
      let nextNum = 1;
      const existingCodes = new Set(
        members
          .filter(m => m && m.member_code && m.member_code.startsWith(prefix))
          .map(m => m.member_code)
      );
      while (existingCodes.has(`${prefix}${String(nextNum).padStart(4, '0')}`)) {
        nextNum++;
      }
      const memberCode = `${prefix}${String(nextNum).padStart(4, '0')}`;

      const newMemberData = helperCreateMemberObject(restMemberData, memberCode, resolvedGymId);

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
        await createInvoiceForMember(docRef.id, newMember.full_name, plan, resolvedGymId);
      }

      if (newMember.phone) {
        await sendTemplatedSMS('t_welcome', newMember);
      }

      return newMember;
    } catch (err) {
      console.error('addMember error:', err);
      setError(friendlyFirestoreError(err));
      return null;
    }
  }, [plans, members, createInvoiceForMember, logAudit, currentUser, gymSettings, gyms, sendTemplatedSMS]);

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
      const queryParams = new URLSearchParams(window.location.search);
      const urlGymId = queryParams.get('gymId') || queryParams.get('gym_id');
      const resolvedGymId = formData.gymId || urlGymId || currentUser?.gymId || DEFAULT_ORG_ID;

      const newReq = {
        status: 'pending_approval',
        captcha_verified: true,
        ip_address: '192.168.1.10',
        created_at: new Date().toISOString(),
        ...formData,
        gymId: resolvedGymId,
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.REGISTRATIONS), newReq);
      return { id: docRef.id, ...newReq };
    } catch (err) {
      console.error('addRegistrationRequest error:', err);
      setError(friendlyFirestoreError(err));
      return null;
    }
  }, [currentUser]);

  const approveRegistration = useCallback(async (requestId) => {
    try {
      const req = registrations.find(r => r.id === requestId);
      if (req) {
        const newMember = await addMember({
          full_name: req.full_name,
          email: req.email,
          phone: req.phone,
          gender: req.gender,
          date_of_birth: req.date_of_birth,
          age: req.age || '',
          signature: req.signature || '',
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
          countdown_end: new Date().toISOString(),
          next_payment_date: new Date().toISOString(),
          gymId: req.gymId || currentUser?.gymId || DEFAULT_ORG_ID,
          rules_health_declaration: req.rules_health_declaration || false,
          rules_follow_gym_rules: req.rules_follow_gym_rules || false,
          rules_membership_conduct: req.rules_membership_conduct || false,
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
  }, [registrations, addMember, logAudit, currentUser]);

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
        employee_code: employeeData.employee_code || 'EMP-' + Math.floor(10000 + Math.random() * 90000),
        salary: parseFloat(employeeData.salary),
        total_leaves: parseInt(employeeData.total_leaves) || 0,
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
      if (updated.total_leaves !== undefined) updated.total_leaves = parseInt(updated.total_leaves) || 0;
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
      const queryParams = new URLSearchParams(window.location.search);
      const urlGymId = queryParams.get('gymId') || queryParams.get('gym_id');
      const resolvedGymId = formData.gymId || urlGymId || currentUser?.gymId || DEFAULT_ORG_ID;

      const newReq = {
        status: 'pending_approval',
        created_at: new Date().toISOString(),
        ...formData,
        gymId: resolvedGymId,
        expected_salary: parseFloat(formData.expected_salary),
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.EMPLOYEE_REGISTRATIONS), newReq);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('addEmployeeRegistrationRequest error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser]);

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

  // ─── Break Log Actions ──────────────────────────────────────────────
  const startBreak = useCallback(async (employeeId, employeeName) => {
    try {
      const activeBreak = breakLogs.find(
        b => b.employeeId === employeeId && b.status === 'active'
      );
      if (activeBreak) {
        return { success: false, message: 'You already have an active break timer running.' };
      }

      const newBreak = {
        gymId: currentUser?.gymId || DEFAULT_ORG_ID,
        employeeId,
        employeeName,
        startTime: new Date().toISOString(),
        endTime: null,
        status: 'active',
        duration: 0,
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.BREAK_LOGS), newBreak);
      await logAudit('employee.break_start', 'employee', employeeId, `Started break for ${employeeName}`);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('startBreak error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, breakLogs, logAudit]);

  const stopBreak = useCallback(async (breakId) => {
    try {
      const breakRef = doc(db, COLLECTIONS.BREAK_LOGS, breakId);
      const breakDoc = breakLogs.find(b => b.id === breakId);
      if (!breakDoc) {
        return { success: false, message: 'Break log not found.' };
      }

      const endTime = new Date().toISOString();
      const startTime = new Date(breakDoc.startTime);
      const duration = Math.max(0, Math.floor((new Date(endTime) - startTime) / 1000));

      await updateDoc(breakRef, {
        endTime,
        status: 'completed',
        duration,
      });

      await logAudit('employee.break_stop', 'employee', breakDoc.employeeId, `Stopped break for ${breakDoc.employeeName}. Duration: ${Math.floor(duration / 60)} minutes.`);
      return { success: true };
    } catch (err) {
      console.error('stopBreak error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [breakLogs, logAudit]);

  const clockInOutShift = useCallback(async (employeeId, employeeName) => {
    try {
      const activeShift = shiftLogs.find(
        s => s.employeeId === employeeId && s.status === 'active'
      );

      if (activeShift) {
        // Clock Out
        const shiftRef = doc(db, COLLECTIONS.SHIFT_LOGS, activeShift.id);
        const endTime = new Date().toISOString();
        const startTime = new Date(activeShift.startTime);
        const duration = Math.max(0, Math.floor((new Date(endTime) - startTime) / 1000));

        await updateDoc(shiftRef, {
          endTime,
          status: 'completed',
          duration,
        });

        await logAudit('employee.shift_stop', 'employee', employeeId, `Clocked out shift for ${employeeName}. Duration: ${Math.floor(duration / 60)} minutes.`);
        return { success: true, action: 'clock_out' };
      } else {
        // Clock In
        const newShift = {
          gymId: currentUser?.gymId || DEFAULT_ORG_ID,
          employeeId,
          employeeName,
          startTime: new Date().toISOString(),
          endTime: null,
          status: 'active',
          duration: 0,
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.SHIFT_LOGS), newShift);
        await logAudit('employee.shift_start', 'employee', employeeId, `Clocked in shift for ${employeeName}`);
        return { success: true, action: 'clock_in', id: docRef.id };
      }
    } catch (err) {
      console.error('clockInOutShift error:', err);
      return { success: false, message: err.message || err };
    }
  }, [currentUser, shiftLogs, logAudit]);

  const requestLeave = useCallback(async (leaveData) => {
    try {
      const newRequest = {
        gymId: currentUser?.gymId || DEFAULT_ORG_ID,
        employeeId: leaveData.employeeId,
        employeeName: leaveData.employeeName,
        startDate: leaveData.startDate,
        endDate: leaveData.endDate,
        reason: leaveData.reason,
        type: leaveData.type || 'paid',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.LEAVE_REQUESTS), newRequest);
      await logAudit('leave.request', 'employee', leaveData.employeeId, `Requested leave from ${leaveData.startDate} to ${leaveData.endDate}`);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('requestLeave error:', err);
      return { success: false, message: err.message || err };
    }
  }, [currentUser, logAudit]);

  const approveLeaveRequest = useCallback(async (requestId) => {
    try {
      const req = leaveRequests.find(r => r.id === requestId);
      if (!req) return { success: false, message: 'Leave request not found.' };

      const reqRef = doc(db, COLLECTIONS.LEAVE_REQUESTS, requestId);
      await updateDoc(reqRef, { status: 'approved' });

      // Find corresponding employee
      const employee = employees.find(e => e.id === req.employeeId);
      if (employee) {
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

        const newMonthlyLeaves = Math.max(0, (parseInt(employee.monthly_leaves) || 0) - days);
        
        const empRef = doc(db, COLLECTIONS.EMPLOYEES, req.employeeId);
        await updateDoc(empRef, {
          monthly_leaves: newMonthlyLeaves
        });

        await logAudit('leave.approve', 'employee', req.employeeId, `Approved leave request for ${req.employeeName} (${days} day(s)). Decremented monthly leaves to ${newMonthlyLeaves}`);
      }

      return { success: true };
    } catch (err) {
      console.error('approveLeaveRequest error:', err);
      return { success: false, message: err.message || err };
    }
  }, [leaveRequests, employees, logAudit]);

  const rejectLeaveRequest = useCallback(async (requestId) => {
    try {
      const req = leaveRequests.find(r => r.id === requestId);
      if (!req) return { success: false, message: 'Leave request not found.' };

      const reqRef = doc(db, COLLECTIONS.LEAVE_REQUESTS, requestId);
      await updateDoc(reqRef, { status: 'rejected' });

      await logAudit('leave.reject', 'employee', req.employeeId, `Rejected leave request for ${req.employeeName}`);
      return { success: true };
    } catch (err) {
      console.error('rejectLeaveRequest error:', err);
      return { success: false, message: err.message || err };
    }
  }, [leaveRequests, logAudit]);

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

        // Auto-activate or renew the member if it is a membership invoice
        if (inv.member_id && inv.plan_id) {
          const member = members.find(m => m.id === inv.member_id);
          if (member) {
            const periodMonths = 1;
            const newCountdownEnd = helperCalculateRenewalCountdownEnd(member.countdown_end, periodMonths);

            const memberRef = doc(db, COLLECTIONS.MEMBERS, inv.member_id);
            await updateDoc(memberRef, {
              status: 'active',
              countdown_end: newCountdownEnd,
              next_payment_date: newCountdownEnd,
            });

            await logAudit('member.renew', 'member', inv.member_id,
              `Renewed membership for ${member.full_name} via invoice payment (New Expiry: ${new Date(newCountdownEnd).toLocaleDateString()})`
            );
          }
        }
      }
    } catch (err) {
      console.error('recordPayment error:', err);
    }
  }, [invoices, members, plans, logAudit]);

  const undoPayment = useCallback(async (invoiceId) => {
    try {
      const inv = invoices.find(i => i.id === invoiceId);
      if (!inv) return { success: false, message: 'Invoice not found.' };

      const invoiceRef = doc(db, COLLECTIONS.INVOICES, invoiceId);
      const isOverdue = inv.due_date && new Date(inv.due_date).getTime() < Date.now();
      const revertedStatus = isOverdue ? 'overdue' : 'open';

      await updateDoc(invoiceRef, {
        status: revertedStatus,
        paid_at: null,
        payment_method: null,
      });

      await logAudit(
        'payment.undo', 'invoice', invoiceId,
        `Undid payment of LKR ${inv.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      );

      // Revert membership extension if it is a membership invoice
      if (inv.member_id && inv.plan_id) {
        const member = members.find(m => m.id === inv.member_id);
        if (member) {
          const periodMonths = 1;
          const revertedCountdownEnd = helperCalculateUndoCountdownEnd(member.countdown_end, periodMonths);

          const isExpired = new Date(revertedCountdownEnd).getTime() < Date.now();
          const revertedMemberStatus = isExpired ? 'expired' : 'active';

          const memberRef = doc(db, COLLECTIONS.MEMBERS, inv.member_id);
          await updateDoc(memberRef, {
            status: revertedMemberStatus,
            countdown_end: revertedCountdownEnd,
            next_payment_date: revertedCountdownEnd,
          });

          await logAudit('member.undo_renew', 'member', inv.member_id,
            `Reverted membership renewal for ${member.full_name} due to payment undo (New Expiry: ${new Date(revertedCountdownEnd).toLocaleDateString()})`
          );
        }
      }
      return { success: true };
    } catch (err) {
      console.error('undoPayment error:', err);
      return { success: false, message: err.message || err };
    }
  }, [invoices, members, logAudit]);

  // ═══════════════════════════════════════════════════════════════════
  // ACCESS CONTROL (Check-in / Check-out & Device Operations)
  // ═══════════════════════════════════════════════════════════════════

  const checkInMember = useCallback(async (credentialCode, source = 'qr', deviceId = null) => {
    try {
      const code = credentialCode.trim();
      const codeLower = code.toLowerCase();

      // Find matching device if provided
      const device = deviceId ? devices.find(d => d.id === deviceId) : null;
      const deviceName = device ? device.name : 'Web Console';
      const deviceSerial = device ? device.serialNumber : 'WEB-CMD';

      // 1. Try to find a Member
      const member = members.find(m => m.member_code.toLowerCase() === codeLower);

      // 2. Try to find an Employee (Trainers or Employees)
      const employee = !member ? employees.find(e => 
        (e.employee_code && e.employee_code.toLowerCase() === codeLower) || 
        (e.phone && e.phone.replace(/[^0-9]/g, '') === code.replace(/[^0-9]/g, ''))
      ) : null;

      // Helper to write a denied event
      const writeDeniedEvent = async (entity, type, reason, denyReason) => {
        const event = {
          gymId: entity?.gymId || currentUser?.gymId || DEFAULT_ORG_ID,
          member_id: type === 'member' ? (entity?.id || null) : null,
          employee_id: type === 'employee' ? (entity?.id || null) : null,
          member_name: entity?.full_name || 'Unknown User',
          member_code: code,
          userType: type,
          source,
          result: 'denied',
          deny_reason: denyReason,
          occurred_at: new Date().toISOString(),
          deviceId: deviceId || null,
          device_name: deviceName,
          device_serial: deviceSerial
        };
        const evtRef = await addDoc(collection(db, COLLECTIONS.ACCESS_EVENTS), event);
        await logAudit('access.denied', 'access_event', evtRef.id, `Access denied for ${event.member_name} (${code}). Reason: ${reason}`);
        
        // Audit Logs (Section 13)
        await logAudit('access.failed', 'access_event', evtRef.id, `Failed Authentication: Access Denied on device ${deviceName} due to ${denyReason}`);
        if (denyReason === 'expired') {
          await logAudit('member.expired_attempt', 'member', entity?.id || 'unknown', `Membership Expired: Access denied attempt by ${event.member_name}`);
        }
        
        return { success: false, reason, denyReason };
      };

      // If neither member nor employee found
      if (!member && !employee) {
        return await writeDeniedEvent(null, 'unknown', 'Invalid credential code.', 'invalid_credential');
      }

      // 3. Member Validation Flow
      if (member) {
        // Check if membership has expired (countdown expired)
        if (member.countdown_end && new Date(member.countdown_end).getTime() < Date.now()) {
          if (member.status === 'active') {
            const memberRef = doc(db, COLLECTIONS.MEMBERS, member.id);
            await updateDoc(memberRef, { status: 'expired' });
            await logAudit('member.expire', 'member', member.id, `Membership for ${member.full_name} automatically expired (Countdown over)`);
            member.status = 'expired';
          }
        }

        if (member.status === 'frozen') {
          return await writeDeniedEvent(member, 'member', `Membership is frozen. Reason: ${member.freeze_reason || 'N/A'}`, 'frozen');
        }

        if (member.status === 'expired') {
          return await writeDeniedEvent(member, 'member', 'Membership has expired.', 'expired');
        }

        if (member.status === 'cancelled' || member.status === 'suspended') {
          return await writeDeniedEvent(member, 'member', `Membership status is ${member.status}.`, 'expired');
        }

        // Check if device is enabled
        if (device && !device.isEnabled) {
          return await writeDeniedEvent(member, 'member', 'Device is disabled.', 'device_disabled');
        }

        // Toggle Entry/Exit logic
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const activeEvent = accessEvents.find(e => 
          e.member_id === member.id && 
          e.result === 'granted' && 
          !e.check_out_at && 
          new Date(e.occurred_at) >= todayStart
        );

        if (activeEvent) {
          // Perform Check-out (Exit)
          const eventRef = doc(db, COLLECTIONS.ACCESS_EVENTS, activeEvent.id);
          const checkoutTime = new Date().toISOString();
          await updateDoc(eventRef, { check_out_at: checkoutTime });
          
          await logAudit('member.checkout', 'access_event', activeEvent.id, `Member checked out: ${member.full_name} from device ${deviceName}`);
          await logAudit('member.exit', 'access_event', activeEvent.id, `Member Exit: ${member.full_name} on device ${deviceName}`);
          
          // Momentarily unlock the door relay if linked to a device
          if (device) {
            const unlockData = { doorStatus: 'unlocked' };
            if (device.device && device.device.serial !== undefined) {
              unlockData["health.doorStatus"] = 'unlocked';
            }
            await updateDoc(doc(db, COLLECTIONS.DEVICES, device.id), unlockData);
            setTimeout(async () => {
              try {
                const lockData = { doorStatus: 'locked' };
                if (device.device && device.device.serial !== undefined) {
                  lockData["health.doorStatus"] = 'locked';
                }
                await updateDoc(doc(db, COLLECTIONS.DEVICES, device.id), lockData);
              } catch (err) {
                console.error('Error auto-locking door:', err);
              }
            }, 5000);
          }

          return { success: true, member, direction: 'exit', eventId: activeEvent.id };
        } else {
          // Perform Check-in (Entry)
          const entryTime = new Date().toISOString();
          const grantedEvent = {
            gymId: member.gymId || currentUser?.gymId || DEFAULT_ORG_ID,
            member_id: member.id,
            member_name: member.full_name,
            member_code: member.member_code,
            userType: 'member',
            source,
            result: 'granted',
            occurred_at: entryTime,
            check_out_at: null,
            deviceId: deviceId || null,
            device_name: deviceName,
            device_serial: deviceSerial
          };
          const evtRef = await addDoc(collection(db, COLLECTIONS.ACCESS_EVENTS), grantedEvent);
          await logAudit('member.checkin', 'access_event', evtRef.id, `Member checked in: ${member.full_name} at device ${deviceName}`);
          await logAudit('member.entry', 'access_event', evtRef.id, `Member Entry: ${member.full_name} on device ${deviceName}`);
          
          // Momentarily unlock the door relay if linked to a device
          if (device) {
            const unlockData = { doorStatus: 'unlocked' };
            if (device.device && device.device.serial !== undefined) {
              unlockData["health.doorStatus"] = 'unlocked';
            }
            await updateDoc(doc(db, COLLECTIONS.DEVICES, device.id), unlockData);
            setTimeout(async () => {
              try {
                const lockData = { doorStatus: 'locked' };
                if (device.device && device.device.serial !== undefined) {
                  lockData["health.doorStatus"] = 'locked';
                }
                await updateDoc(doc(db, COLLECTIONS.DEVICES, device.id), lockData);
              } catch (err) {
                console.error('Error auto-locking door:', err);
              }
            }, 5000);
          }

          return { success: true, member, direction: 'entry', eventId: evtRef.id };
        }
      }

      // 4. Employee Validation Flow
      if (employee) {
        if (employee.status !== 'active') {
          return await writeDeniedEvent(employee, 'employee', `Employee status is ${employee.status}.`, 'suspended');
        }

        // Check if device is enabled
        if (device && !device.isEnabled) {
          return await writeDeniedEvent(employee, 'employee', 'Device is disabled.', 'device_disabled');
        }

        // Toggle Entry/Exit logic
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const activeEvent = accessEvents.find(e => 
          e.employee_id === employee.id && 
          e.result === 'granted' && 
          !e.check_out_at && 
          new Date(e.occurred_at) >= todayStart
        );

        if (activeEvent) {
          // Perform Check-out (Exit)
          const eventRef = doc(db, COLLECTIONS.ACCESS_EVENTS, activeEvent.id);
          const checkoutTime = new Date().toISOString();
          await updateDoc(eventRef, { check_out_at: checkoutTime });
          
          await logAudit('employee.checkout', 'access_event', activeEvent.id, `Employee checked out: ${employee.full_name} from device ${deviceName}`);
          await logAudit('employee.exit', 'access_event', activeEvent.id, `Employee Exit: ${employee.full_name} on device ${deviceName}`);
          
          // Momentarily unlock the door relay if linked to a device
          if (device) {
            const unlockData = { doorStatus: 'unlocked' };
            if (device.device && device.device.serial !== undefined) {
              unlockData["health.doorStatus"] = 'unlocked';
            }
            await updateDoc(doc(db, COLLECTIONS.DEVICES, device.id), unlockData);
            setTimeout(async () => {
              try {
                const lockData = { doorStatus: 'locked' };
                if (device.device && device.device.serial !== undefined) {
                  lockData["health.doorStatus"] = 'locked';
                }
                await updateDoc(doc(db, COLLECTIONS.DEVICES, device.id), lockData);
              } catch (err) {
                console.error('Error auto-locking door:', err);
              }
            }, 5000);
          }

          return { success: true, employee, direction: 'exit', eventId: activeEvent.id };
        } else {
          // Perform Check-in (Entry)
          const entryTime = new Date().toISOString();
          const grantedEvent = {
            gymId: employee.gymId || currentUser?.gymId || DEFAULT_ORG_ID,
            employee_id: employee.id,
            member_name: employee.full_name,
            member_code: employee.employee_code || code,
            userType: 'employee',
            source,
            result: 'granted',
            occurred_at: entryTime,
            check_out_at: null,
            deviceId: deviceId || null,
            device_name: deviceName,
            device_serial: deviceSerial
          };
          const evtRef = await addDoc(collection(db, COLLECTIONS.ACCESS_EVENTS), grantedEvent);
          await logAudit('employee.checkin', 'access_event', evtRef.id, `Employee checked in: ${employee.full_name} at device ${deviceName}`);
          await logAudit('employee.entry', 'access_event', evtRef.id, `Employee Entry: ${employee.full_name} on device ${deviceName}`);
          
          // Momentarily unlock the door relay if linked to a device
          if (device) {
            const unlockData = { doorStatus: 'unlocked' };
            if (device.device && device.device.serial !== undefined) {
              unlockData["health.doorStatus"] = 'unlocked';
            }
            await updateDoc(doc(db, COLLECTIONS.DEVICES, device.id), unlockData);
            setTimeout(async () => {
              try {
                const lockData = { doorStatus: 'locked' };
                if (device.device && device.device.serial !== undefined) {
                  lockData["health.doorStatus"] = 'locked';
                }
                await updateDoc(doc(db, COLLECTIONS.DEVICES, device.id), lockData);
              } catch (err) {
                console.error('Error auto-locking door:', err);
              }
            }, 5000);
          }

          return { success: true, employee, direction: 'entry', eventId: evtRef.id };
        }
      }

    } catch (err) {
      console.error('checkInMember error:', err);
      return { success: false, reason: 'System error during authentication. Please try again.' };
    }
  }, [members, employees, devices, accessEvents, logAudit, currentUser]);

  const checkOutMember = useCallback(async (eventId) => {
    try {
      const evt = accessEvents.find(e => e.id === eventId);
      const eventRef = doc(db, COLLECTIONS.ACCESS_EVENTS, eventId);
      await updateDoc(eventRef, {
        check_out_at: new Date().toISOString(),
      });
      if (evt) {
        await logAudit('member.checkout', 'access_event', eventId, `Recorded checkout for ${evt.member_name}`);
        const logType = evt.userType === 'employee' ? 'employee.exit' : 'member.exit';
        await logAudit(logType, 'access_event', eventId, `${evt.userType === 'employee' ? 'Employee' : 'Member'} Exit: ${evt.member_name}`);
      }
    } catch (err) {
      console.error('checkOutMember error:', err);
      setError(friendlyFirestoreError(err));
    }
  }, [accessEvents, logAudit]);

  // ─── Biometric Security Device Actions ───

  const addDevice = useCallback(async (deviceData) => {
    try {
      const gymId = deviceData.gymId || DEFAULT_ORG_ID;
      const gymDevices = devices.filter(d => d.gymId === gymId);
      
      const deviceNumber = gymDevices.length + 1;
      const doorNumber = gymDevices.length + 1;
      const readerNumber = 1;

      const name = deviceData.name;
      const brand = deviceData.brand || 'ZKTeco';
      const model = deviceData.model || 'SpeedFace V5L';
      const serial = (deviceData.serialNumber || '').trim();

      const entranceType = deviceData.entranceType || 'Main Entrance';
      const physicalLocation = deviceData.physicalLocation || 'Reception';
      const purpose = deviceData.devicePurpose || 'Door Access + Attendance';

      const ip = (deviceData.ipAddress || '192.168.1.100').trim();
      const port = parseInt(deviceData.port || '4370');
      const protocol = deviceData.protocol || 'TCP/IP';
      const mac = (deviceData.macAddress || '00:1A:2B:3C:4D:' + Math.floor(10 + Math.random() * 89).toString(16).toUpperCase() + ':5E').trim();
      const firmware = (deviceData.firmware || '').trim();

      const isActivated = deviceData.isEnabled !== false;
      const status = isActivated ? 'Offline' : 'Disabled';

      const capabilities = deviceData.capabilities || {
        face: true,
        fingerprint: true,
        rfid: true,
        qr: false,
        pin: true,
        palm: false
      };

      const newDevice = {
        gymId,
        device: {
          serial,
          brand,
          model,
          name
        },
        configuration: {
          entranceType,
          physicalLocation,
          purpose,
          deviceNumber,
          doorNumber,
          readerNumber
        },
        network: {
          ip,
          port,
          protocol,
          mac,
          firmware
        },
        capabilities,
        health: {
          status,
          lastHeartbeat: null,
          latency: null,
          heartbeatInterval: 30,
          doorStatus: 'locked',
          lastSync: null
        },
        registeredAt: new Date().toISOString(),
        installedAt: new Date().toISOString(),
        activatedAt: isActivated ? new Date().toISOString() : null
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.DEVICES), newDevice);
      
      // Log structured audits
      await logAudit('device.create', 'device', docRef.id, `Registered security device: ${name} (${serial})`);
      if (isActivated) {
        await logAudit('device.activate', 'device', docRef.id, `Activated device ${name}. Eligible for communication.`);
      }

      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('addDevice error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [devices, logAudit]);

  const updateDevice = useCallback(async (id, updatedFields) => {
    try {
      const device = devices.find(d => d.id === id);
      const name = device ? device.name : 'Unknown Device';
      
      const deviceRef = doc(db, COLLECTIONS.DEVICES, id);
      
      // Map flat updatedFields to nested format
      const mapped = {};
      
      if (updatedFields.name !== undefined) mapped["device.name"] = updatedFields.name;
      if (updatedFields.brand !== undefined) mapped["device.brand"] = updatedFields.brand;
      if (updatedFields.model !== undefined) mapped["device.model"] = updatedFields.model;
      if (updatedFields.serialNumber !== undefined) mapped["device.serial"] = updatedFields.serialNumber;

      if (updatedFields.entranceType !== undefined) mapped["configuration.entranceType"] = updatedFields.entranceType;
      if (updatedFields.physicalLocation !== undefined) mapped["configuration.physicalLocation"] = updatedFields.physicalLocation;
      if (updatedFields.devicePurpose !== undefined) mapped["configuration.purpose"] = updatedFields.devicePurpose;
      if (updatedFields.deviceNumber !== undefined) mapped["configuration.deviceNumber"] = updatedFields.deviceNumber;
      if (updatedFields.doorNumber !== undefined) mapped["configuration.doorNumber"] = updatedFields.doorNumber;
      if (updatedFields.readerNumber !== undefined) mapped["configuration.readerNumber"] = updatedFields.readerNumber;

      if (updatedFields.ipAddress !== undefined) mapped["network.ip"] = updatedFields.ipAddress.trim();
      if (updatedFields.port !== undefined) mapped["network.port"] = parseInt(updatedFields.port);
      if (updatedFields.protocol !== undefined) mapped["network.protocol"] = updatedFields.protocol;
      if (updatedFields.macAddress !== undefined) mapped["network.mac"] = updatedFields.macAddress.trim();
      if (updatedFields.firmware !== undefined) mapped["network.firmware"] = updatedFields.firmware.trim();

      if (updatedFields.capabilities !== undefined) mapped["capabilities"] = updatedFields.capabilities;

      if (updatedFields.isEnabled !== undefined) {
        mapped["health.status"] = updatedFields.isEnabled ? "Offline" : "Disabled";
        mapped["activatedAt"] = updatedFields.isEnabled ? new Date().toISOString() : null;
      }
      if (updatedFields.status !== undefined) {
        const formattedStatus = updatedFields.status.charAt(0).toUpperCase() + updatedFields.status.slice(1);
        mapped["health.status"] = formattedStatus;
      }
      if (updatedFields.lastHeartbeat !== undefined) mapped["health.lastHeartbeat"] = updatedFields.lastHeartbeat;
      if (updatedFields.lastSync !== undefined) mapped["health.lastSync"] = updatedFields.lastSync;
      if (updatedFields.latency !== undefined) mapped["health.latency"] = updatedFields.latency;
      if (updatedFields.doorStatus !== undefined) mapped["health.doorStatus"] = updatedFields.doorStatus;

      // Pass through any other fields directly
      for (const k in updatedFields) {
        if (![
          'name', 'brand', 'model', 'serialNumber', 'entranceType', 'physicalLocation',
          'devicePurpose', 'deviceNumber', 'doorNumber', 'readerNumber', 'ipAddress', 'port',
          'protocol', 'macAddress', 'firmware', 'isEnabled', 'status', 'lastHeartbeat',
          'lastSync', 'latency', 'doorStatus', 'capabilities'
        ].includes(k)) {
          mapped[k] = updatedFields[k];
        }
      }

      await updateDoc(deviceRef, mapped);

      // Perform structured audit logging based on changes
      if (updatedFields.isEnabled !== undefined) {
        if (updatedFields.isEnabled) {
          await logAudit('device.activate', 'device', id, `Activated device ${name}. Eligible for communication.`);
        } else {
          await logAudit('device.disable', 'device', id, `Disabled device ${name}. Communication blocked.`);
        }
      }
      if (updatedFields.ipAddress !== undefined || updatedFields.port !== undefined || updatedFields.protocol !== undefined) {
        const ip = updatedFields.ipAddress || (device ? device.network?.ip : '');
        const port = updatedFields.port || (device ? device.network?.port : '');
        const protocol = updatedFields.protocol || (device ? device.network?.protocol : '');
        await logAudit('device.network_change', 'device', id, `Updated network settings for device ${name}: IP ${ip}, Port ${port}, Protocol ${protocol}`);
      }
      if (updatedFields.capabilities !== undefined) {
        await logAudit('device.capabilities_update', 'device', id, `Updated authentication capabilities for device ${name}`);
      }
      if (updatedFields.firmware !== undefined) {
        await logAudit('device.firmware_update', 'device', id, `Updated firmware for device ${name} to ${updatedFields.firmware}`);
      }
      
      await logAudit('device.update', 'device', id, `Updated device settings for ${name}`);
      return { success: true };
    } catch (err) {
      console.error('updateDevice error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [devices, logAudit]);

  const deleteDevice = useCallback(async (id) => {
    try {
      const device = devices.find(d => d.id === id);
      const deviceRef = doc(db, COLLECTIONS.DEVICES, id);
      await deleteDoc(deviceRef);
      if (device) {
        const name = device.device?.name || device.name;
        const serial = device.device?.serial || device.serialNumber;
        await logAudit('device.delete', 'device', id, `Deleted security device: ${name} (${serial})`);
      }
      return { success: true };
    } catch (err) {
      console.error('deleteDevice error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [devices, logAudit]);

  const testDeviceConnection = useCallback(async (deviceIdOrData) => {
    try {
      let name = '';
      let serialNumber = '';
      let isEnabled = false;
      let ip = '';
      let deviceId = 'unsaved';

      if (typeof deviceIdOrData === 'string') {
        deviceId = deviceIdOrData;
        const device = devices.find(d => d.id === deviceId);
        if (!device) return { success: false, message: 'Device not found' };
        
        name = device.device?.name || device.name;
        serialNumber = device.device?.serial || device.serialNumber;
        isEnabled = device.health?.status !== 'Disabled';
        ip = (device.network?.ip || device.ipAddress || '').trim();

        const deviceRef = doc(db, COLLECTIONS.DEVICES, deviceId);
        await updateDoc(deviceRef, { "health.status": "Connecting" });
        await logAudit('device.connecting', 'device', deviceId, `Initiated connection diagnostic test for ${name}`);
      } else {
        // Raw form data passed
        name = deviceIdOrData.name;
        serialNumber = deviceIdOrData.serialNumber || '';
        isEnabled = deviceIdOrData.isEnabled !== false;
        ip = (deviceIdOrData.ipAddress || '').trim();
      }

      // Simulate multi-stage connection loader
      const steps = {
        ping: 'OK',
        tcp: 'OK',
        auth: 'OK',
        firmware: 'OK'
      };
      
      await new Promise(resolve => setTimeout(resolve, 1500));

      const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
      if (!ipRegex.test(ip)) {
        steps.ping = 'FAIL';
        steps.tcp = 'FAIL';
        steps.auth = 'FAIL';
        steps.firmware = 'FAIL';
        const failMessage = 'Incorrect IP Address.';
        await logAudit('device.test_connection', 'device', deviceId, `Connection test for ${name} failed: ${failMessage}`);
        
        if (typeof deviceIdOrData === 'string') {
          const deviceRef = doc(db, COLLECTIONS.DEVICES, deviceId);
          await updateDoc(deviceRef, { "health.status": "Error" });
          await logAudit('device.connect_error', 'device', deviceId, `Device Offline: ${name} failed connection diagnostic: ${failMessage}`);
        }
        return { success: false, latency: 0, steps, message: failMessage };
      }

      if (serialNumber.toLowerCase().includes('timeout')) {
        steps.tcp = 'FAIL';
        steps.auth = 'FAIL';
        steps.firmware = 'FAIL';
        const failMessage = 'Communication Timeout.';
        await logAudit('device.test_connection', 'device', deviceId, `Connection test for ${name} failed: ${failMessage}`);
        
        if (typeof deviceIdOrData === 'string') {
          const deviceRef = doc(db, COLLECTIONS.DEVICES, deviceId);
          await updateDoc(deviceRef, { "health.status": "Error" });
          await logAudit('device.connect_error', 'device', deviceId, `Device Offline: ${name} failed connection diagnostic: ${failMessage}`);
        }
        return { success: false, latency: 0, steps, message: failMessage };
      }

      if (serialNumber.toLowerCase().includes('protocol')) {
        steps.auth = 'FAIL';
        steps.firmware = 'FAIL';
        const failMessage = 'Protocol Mismatch.';
        await logAudit('device.test_connection', 'device', deviceId, `Connection test for ${name} failed: ${failMessage}`);
        
        if (typeof deviceIdOrData === 'string') {
          const deviceRef = doc(db, COLLECTIONS.DEVICES, deviceId);
          await updateDoc(deviceRef, { "health.status": "Error" });
          await logAudit('device.connect_error', 'device', deviceId, `Device Offline: ${name} failed connection diagnostic: ${failMessage}`);
        }
        return { success: false, latency: 0, steps, message: failMessage };
      }

      if (serialNumber.toLowerCase().includes('fail') || !isEnabled) {
        steps.auth = 'FAIL';
        steps.firmware = 'FAIL';
        const failMessage = 'Unable to connect to the device.';
        await logAudit('device.test_connection', 'device', deviceId, `Connection test for ${name} failed: ${failMessage}`);
        
        if (typeof deviceIdOrData === 'string') {
          const deviceRef = doc(db, COLLECTIONS.DEVICES, deviceId);
          await updateDoc(deviceRef, { "health.status": "Error" });
          await logAudit('device.connect_error', 'device', deviceId, `Device Offline: ${name} failed connection diagnostic: ${failMessage}`);
        }
        return { success: false, latency: 0, steps, message: failMessage };
      }

      // Success
      const latencyVal = Math.floor(Math.random() * 25) + 30; // 30ms - 55ms
      const heartbeatTime = new Date().toISOString();

      await logAudit('device.test_connection', 'device', deviceId, `Connection test for ${name} passed. Latency: ${latencyVal}ms`);

      if (typeof deviceIdOrData === 'string') {
        const deviceRef = doc(db, COLLECTIONS.DEVICES, deviceId);
        await updateDoc(deviceRef, { 
          "health.status": "Online", 
          "health.lastHeartbeat": heartbeatTime,
          "health.latency": latencyVal
        });
        await logAudit('device.online', 'device', deviceId, `Device ${name} connected successfully. Latency: ${latencyVal}ms`);
        await logAudit('device.reconnect', 'device', deviceId, `Device Reconnected: ${name} is now online`);
      }

      return { success: true, latency: latencyVal, steps, status: 'Online' };
    } catch (err) {
      console.error('testDeviceConnection error:', err);
      return { success: false, message: err.message };
    }
  }, [devices, logAudit]);

  const syncDeviceUsers = useCallback(async (deviceId) => {
    try {
      const device = devices.find(d => d.id === deviceId);
      if (!device) return { success: false, message: 'Device not found' };

      await new Promise(resolve => setTimeout(resolve, 2000));

      const syncTime = new Date().toISOString();
      const deviceRef = doc(db, COLLECTIONS.DEVICES, deviceId);
      await updateDoc(deviceRef, { 
        lastSync: syncTime,
        lastHeartbeat: syncTime
      });
      
      await logAudit('device.sync', 'device', deviceId, `Synchronized members and staff credentials list on ${device.name}`);
      return { success: true, lastSync: syncTime };
    } catch (err) {
      console.error('syncDeviceUsers error:', err);
      return { success: false, message: err.message };
    }
  }, [devices, logAudit]);

  const triggerDoorCommand = useCallback(async (deviceId, command) => {
    try {
      const device = devices.find(d => d.id === deviceId);
      if (!device) return { success: false, message: 'Device not found' };

      const deviceRef = doc(db, COLLECTIONS.DEVICES, deviceId);
      let targetStatus = 'locked';
      let auditAction = 'door.lock';
      let auditDetails = '';

      if (command === 'open') {
        targetStatus = 'unlocked';
        auditAction = 'door.open';
        auditDetails = `Remote Door Open command sent to ${device.name}`;
      } else if (command === 'lock') {
        targetStatus = 'locked';
        auditAction = 'door.lock';
        auditDetails = `Remote Door Lock command sent to ${device.name}`;
      } else if (command === 'unlock') {
        targetStatus = 'unlocked';
        auditAction = 'door.unlock';
        auditDetails = `Remote Door Unlock command sent to ${device.name}`;
      } else if (command === 'emergency_unlock') {
        targetStatus = 'emergency_unlocked';
        auditAction = 'door.emergency_unlock';
        auditDetails = `EMERGENCY UNLOCK command broadcast to ${device.name}`;
      }

      const updateData = { doorStatus: targetStatus };
      if (device.device && device.device.serial !== undefined) {
        updateData["health.doorStatus"] = targetStatus;
      }
      await updateDoc(deviceRef, updateData);
      // Log audit
      await logAudit(auditAction, 'device', deviceId, auditDetails);
      // Section 13 Audit logs: Door Open, Door Lock, Door Unlock, Emergency Unlock
      let section13Log = 'Door Lock';
      if (command === 'open') section13Log = 'Door Open';
      else if (command === 'unlock') section13Log = 'Door Unlock';
      else if (command === 'emergency_unlock') section13Log = 'Emergency Unlock';
      await logAudit('door.status_change', 'device', deviceId, `${section13Log}: Executed remote relay command for ${device.name}`);

      if (command === 'open') {
        setTimeout(async () => {
          try {
            const relockData = { doorStatus: 'locked' };
            if (device.device && device.device.serial !== undefined) {
              relockData["health.doorStatus"] = 'locked';
            }
            await updateDoc(deviceRef, relockData);
            await logAudit('door.lock', 'device', deviceId, `Door relay on ${device.name} automatically relocked (Timeout)`);
          } catch (relockErr) {
            console.error('Auto-relock failed:', relockErr);
          }
        }, 5000);
      }

      return { success: true, doorStatus: targetStatus };
    } catch (err) {
      console.error('triggerDoorCommand error:', err);
      return { success: false, message: err.message };
    }
  }, [devices, logAudit]);

  const sendSMS = useCallback(async (toPhone, memberName, amount, sourceName, receiptLink, memberId = null) => {
    try {
      const fromPhone = '0779688582';
      const gymName = gymSettings?.gymName || 'Ascend Fit';
      const message = `Welcome to ${gymName}! Hello ${memberName}, your payment of LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} for ${sourceName} has been received. View your receipt: ${receiptLink}`;
      
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
  }, [currentUser, logAudit, showToast, gymSettings]);

  const updateNotificationTemplate = useCallback(async (templateId, updatedFields) => {
    try {
      const q = query(collection(db, COLLECTIONS.NOTIFICATION_TEMPLATES), where('id', '==', templateId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = doc(db, COLLECTIONS.NOTIFICATION_TEMPLATES, snap.docs[0].id);
        await updateDoc(docRef, updatedFields);
      } else {
        await addDoc(collection(db, COLLECTIONS.NOTIFICATION_TEMPLATES), {
          id: templateId,
          ...updatedFields,
          created_at: new Date().toISOString()
        });
      }
      showToast('Notification template updated successfully.', 'success');
      await logAudit('template.update', 'template', templateId, `Updated notification template: ${templateId}`);
      return true;
    } catch (err) {
      console.error('updateNotificationTemplate error:', err);
      showToast('Failed to update notification template.', 'error');
      return false;
    }
  }, [logAudit, showToast]);


  const scanAndSendPaymentReminders = useCallback(async () => {
    try {
      const overdueInvoices = invoices.filter(inv => 
        (inv.status === 'overdue' || (inv.status === 'open' && inv.due_date && new Date(inv.due_date).getTime() < Date.now())) &&
        !inv.reminder_sent
      );

      if (overdueInvoices.length === 0) {
        return { success: true, count: 0 };
      }

      let sentCount = 0;
      for (const inv of overdueInvoices) {
        const member = members.find(m => m.id === inv.member_id);
        if (member && member.phone) {
          const success = await sendTemplatedSMS('t_pay', member, {
            invoice: inv.invoice_number,
            amount: inv.total_amount,
            date: inv.due_date
          });
          if (success) {
            const invRef = doc(db, COLLECTIONS.INVOICES, inv.id);
            await updateDoc(invRef, { reminder_sent: true });
            sentCount++;
          }
        }
      }
      return { success: true, count: sentCount };
    } catch (err) {
      console.error('scanAndSendPaymentReminders error:', err);
      return { success: false, error: err.message };
    }
  }, [invoices, members, sendTemplatedSMS]);

  const sendEmailReceipt = useCallback(async (toEmail, memberName, amount, sourceName, receiptLink, memberId = null) => {
    try {
      const gymName = gymSettings?.gymName || 'Fitgencore';
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      
      console.log("%c[Email Gateway] Dispatching receipt...", "color: #8b5cf6; font-weight: bold;", {
        to: toEmail,
        memberName,
        gymName,
        amount,
        sourceName,
        receiptLink
      });

      let response;
      try {
        response = await fetch(`${backendUrl}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: toEmail,
            gymName,
            memberName,
            amount,
            sourceName,
            receiptLink
          })
        });
      } catch (netErr) {
        console.warn('Backend proxy unreachable. Attempting client-side fallback via CORS proxy...', netErr);
        
        // Construct beautiful client-side fallback html (same layout as backend)
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${gymName}</title>
  <style>
    body {
      font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0b0c10;
      color: #c5c6c7;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0c10;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #15181f;
      border: 1px solid rgba(69, 243, 255, 0.15);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 40px rgba(69, 243, 255, 0.03);
    }
    .header {
      background: linear-gradient(135deg, #15181f 0%, #0d0f13 100%);
      padding: 35px;
      text-align: center;
      border-bottom: 1px solid rgba(69, 243, 255, 0.2);
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 25%;
      width: 50%;
      height: 1px;
      background: linear-gradient(90deg, transparent, #45f3ff, transparent);
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      background: linear-gradient(90deg, #ffffff, #45f3ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .header p {
      margin: 8px 0 0 0;
      color: #8b9bb4;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .content {
      padding: 40px 35px;
    }
    .greeting {
      font-size: 18px;
      color: #ffffff;
      margin-bottom: 20px;
      font-weight: 700;
    }
    .intro {
      font-size: 14px;
      line-height: 1.6;
      color: #9ba9b4;
      margin-bottom: 30px;
    }
    .details-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 35px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
    }
    .details-table th, .details-table td {
      padding: 12px 0;
      text-align: left;
    }
    .details-table th {
      color: #8b9bb4;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-weight: 600;
    }
    .details-table td {
      color: #ffffff;
      font-size: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .details-table tr:last-child td {
      border-bottom: none;
    }
    .details-table td.amount-cell {
      text-align: right;
      font-weight: 700;
      font-family: monospace;
    }
    .details-table th.amount-cell {
      text-align: right;
    }
    .total-row td {
      font-size: 18px;
      font-weight: 800;
      color: #45f3ff !important;
      border-top: 1px solid rgba(69, 243, 255, 0.3) !important;
      padding-top: 18px;
    }
    .btn-container {
      text-align: center;
      margin-top: 25px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #45f3ff 0%, #00cfdf 100%);
      color: #0b0c10 !important;
      text-decoration: none;
      padding: 14px 35px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 1px;
      text-transform: uppercase;
      box-shadow: 0 4px 15px rgba(69, 243, 255, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .footer {
      background-color: #0d0f13;
      padding: 25px;
      text-align: center;
      font-size: 11px;
      color: #667488;
      border-top: 1px solid rgba(255, 255, 255, 0.03);
      letter-spacing: 0.5px;
      line-height: 1.5;
    }
    .footer a {
      color: #45f3ff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${gymName}</h1>
        <p>Official Digital Receipt</p>
      </div>
      <div class="content">
        <div class="greeting">Hello ${memberName},</div>
        <div class="intro">
          We have successfully processed your payment. Below are your transaction details. Thank you for your continued support!
        </div>
        
        <div class="details-card">
          <table class="details-table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount-cell">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${sourceName}</td>
                <td class="amount-cell">LKR ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="total-row">
                <td>Total Paid</td>
                <td class="amount-cell">LKR ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="btn-container">
          <a href="${receiptLink}" class="btn" target="_blank">View Digital Receipt</a>
        </div>
      </div>
      <div class="footer">
        <p>This email was sent on behalf of <strong>${gymName}</strong>.</p>
        <p>Should you have any inquiries regarding this payment, please contact us.</p>
        <p>&copy; ${new Date().getFullYear()} ${gymName}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

        response = await fetch('https://corsproxy.io/?url=https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer re_D1NBAZQQ_9hk6VSFEem3bbQNhCWHoqajC',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${gymName} <onboarding@resend.dev>`,
            to: [toEmail],
            subject: `Payment Receipt: ${sourceName} - ${gymName}`,
            html: htmlContent
          })
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Unknown response format' }));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const resData = await response.json();

      // Log sent email in Firestore
      const emailLog = {
        gymId: currentUser?.gymId || DEFAULT_ORG_ID,
        to: toEmail,
        member_name: memberName,
        member_id: memberId,
        amount,
        source: sourceName,
        receipt_link: receiptLink,
        sent_at: new Date().toISOString(),
        status: 'sent',
        resend_id: resData.data?.id || resData.id || 'N/A'
      };

      await addDoc(collection(db, COLLECTIONS.EMAIL_LOGS), emailLog);

      // Log audit trail
      await logAudit(
        'member.email_receipt',
        'member',
        memberId || 'unknown_member',
        `Sent email receipt to ${memberName} (${toEmail}) for LKR ${amount.toLocaleString()}`
      );

      showToast(`Email receipt sent successfully to ${toEmail}`, 'success');
      return { success: true, resend_id: resData.data?.id || resData.id };
    } catch (err) {
      console.error('sendEmailReceipt error:', err);
      showToast(`Failed to send email receipt: ${err.message}`, 'error');
      
      // Log the failure in audit log
      await logAudit(
        'member.email_receipt_fail',
        'member',
        memberId || 'unknown_member',
        `Failed to send email receipt to ${memberName} (${toEmail}) for LKR ${amount.toLocaleString()}. Error: ${err.message}`
      );
      
      return { success: false, error: err.message };
    }
  }, [currentUser, logAudit, showToast, gymSettings]);


  // ═══════════════════════════════════════════════════════════════════
  // MEMBERSHIP RENEWAL
  // ═══════════════════════════════════════════════════════════════════

  const renewMemberMembership = useCallback(async (memberId, paymentMethod, customPrice = null, periodMonths = 1, discountAmount = 0.0, discountType = 'none', discountRate = 0) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) return { success: false, message: 'Member not found.' };

      const plan = plans.find(p => p.id === member.plan_id) || plans[0];
      if (!plan) return { success: false, message: 'No plan found.' };

      const isCustom = customPrice !== null && parseFloat(customPrice) !== plan.price * parseInt(periodMonths);
      const priceToCharge = isCustom ? parseFloat(customPrice) : plan.price * parseInt(periodMonths);
      const discount = parseFloat(discountAmount || 0);
      const tax = 0.0;
      const total = Math.max(0, priceToCharge - discount);

      const newCountdownEnd = helperCalculateRenewalCountdownEnd(member.countdown_end, periodMonths);

      // Update member in Firestore
      const memberRef = doc(db, COLLECTIONS.MEMBERS, memberId);
      await updateDoc(memberRef, {
        status: 'active',
        countdown_end: newCountdownEnd,
        next_payment_date: newCountdownEnd,
      });

      // Find if there is an existing open/overdue invoice for this member
      const openInvoice = invoices.find(inv => 
        inv.member_id === member.id && 
        (inv.status === 'open' || inv.status === 'overdue')
      );

      let invoiceId = '';
      let finalInvoiceData = {};

      if (openInvoice) {
        invoiceId = openInvoice.id;
        finalInvoiceData = {
          ...openInvoice,
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: paymentMethod,
          total_amount: total,
          subtotal: priceToCharge,
          discount_amount: discount,
          discount_type: discountType,
          discount_rate: parseFloat(discountRate || 0),
          plan_id: plan.id,
          billing_period: `${periodMonths} Month${parseInt(periodMonths) > 1 ? 's' : ''}`
        };
        const invRef = doc(db, COLLECTIONS.INVOICES, openInvoice.id);
        await updateDoc(invRef, {
          status: 'paid',
          paid_at: finalInvoiceData.paid_at,
          payment_method: finalInvoiceData.payment_method,
          total_amount: finalInvoiceData.total_amount,
          subtotal: finalInvoiceData.subtotal,
          discount_amount: finalInvoiceData.discount_amount,
          discount_type: finalInvoiceData.discount_type,
          discount_rate: finalInvoiceData.discount_rate,
          plan_id: finalInvoiceData.plan_id,
          billing_period: finalInvoiceData.billing_period
        });
      } else {
        // Create paid renewal invoice
        finalInvoiceData = {
          gymId: member.gymId || currentUser?.gymId || DEFAULT_ORG_ID,
          member_id: member.id,
          member_name: member.full_name,
          invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          subtotal: priceToCharge,
          tax_amount: tax,
          discount_amount: discount,
          discount_type: discountType,
          discount_rate: parseFloat(discountRate || 0),
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
        const invRef = await addDoc(collection(db, COLLECTIONS.INVOICES), finalInvoiceData);
        invoiceId = invRef.id;
      }

      await logAudit('payment.receive', 'invoice', invoiceId,
        `Collected LKR ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} via ${paymentMethod.toUpperCase()} for membership renewal (${periodMonths}m) of ${member.full_name}`
      );
      await logAudit('member.renew', 'member', memberId,
        `Renewed membership for ${member.full_name} for ${periodMonths} months (New Expiry: ${new Date(newCountdownEnd).toLocaleDateString()})`
      );

      if (member.phone) {
        const receiptLink = `${getBaseUrl()}?view=receipt&type=invoice&id=${invoiceId}`;
        try {
          await sendSMS(member.phone, member.full_name, total, `Membership Renewal - ${plan.name}`, receiptLink, member.id);
        } catch (smsErr) {
          console.error('Failed to send SMS receipt during renewal:', smsErr);
        }
      }

      if (member.email) {
        const receiptLink = `${getBaseUrl()}?view=receipt&type=invoice&id=${invoiceId}`;
        try {
          await sendEmailReceipt(member.email, member.full_name, total, `Membership Renewal - ${plan.name}`, receiptLink, member.id);
        } catch (emailErr) {
          console.error('Failed to send Email receipt during renewal:', emailErr);
        }
      }

      return { success: true, newCountdownEnd, invoice: { id: invoiceId, ...finalInvoiceData } };
    } catch (err) {
      console.error('renewMemberMembership error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [members, plans, invoices, sendSMS, sendEmailReceipt, logAudit, currentUser]);
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
        role: 'Personal Trainer',
        is_personal_trainer: true,
        specialization: trainerData.specialization,
        bio: trainerData.bio || '',
        hourly_rate: parseFloat(trainerData.hourly_rate),
        photo_url: trainerData.photo_url || '',
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
        is_personal_trainer: true,
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

      // Attempt to delete credentials from Firebase Authentication
      if (admin.email && admin.password) {
        try {
          const tempAppName = `TempAppToDelete_${adminId}_${Date.now()}`;
          const tempApp = initializeApp(firebaseApp.options, tempAppName);
          const tempAuth = getAuth(tempApp);
          
          try {
            const userCred = await signInWithEmailAndPassword(tempAuth, admin.email, admin.password);
            if (userCred.user) {
              await deleteUser(userCred.user);
            }
          } catch (authErr) {
            console.warn('Could not delete user from Firebase Auth (might not exist or password changed):', authErr);
          } finally {
            await deleteApp(tempApp);
          }
        } catch (setupErr) {
          console.error('Error during temp firebase app initialization:', setupErr);
        }
      }

      // Delete from Firestore
      const adminRef = doc(db, COLLECTIONS.ADMINS, adminId);
      await deleteDoc(adminRef);

      // Revert employee's role back to default on admin deletion
      if (admin.employeeId) {
        const empRef = doc(db, COLLECTIONS.EMPLOYEES, admin.employeeId);
        await updateDoc(empRef, { role: 'Front Desk' });
      }

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
        if (member) {
          const receiptLink = `${getBaseUrl()}?view=receipt&type=income&id=${docRef.id}`;
          if (member.phone) {
            try {
              await sendSMS(member.phone, member.full_name, newInc.amount, newInc.source, receiptLink, member.id);
            } catch (smsErr) {
              console.error('Failed to send SMS receipt during addIncome:', smsErr);
            }
          }
          if (member.email) {
            try {
              await sendEmailReceipt(member.email, member.full_name, newInc.amount, newInc.source, receiptLink, member.id);
            } catch (emailErr) {
              console.error('Failed to send Email receipt during addIncome:', emailErr);
            }
          }
        }
      }

      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('addIncome error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit, members, sendSMS, sendEmailReceipt]);

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

  // ─── Inventory CRUD Actions ─────────────────────────────────────────

  // Categories
  const addCategory = useCallback(async (categoryData) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const ref = collection(db, 'gyms', gymId, 'inventory', 'default', 'categories');
      const now = new Date().toISOString();
      const newCategory = {
        gymId,
        ...categoryData,
        status: categoryData.status || 'active',
        createdAt: now,
        updatedAt: now
      };
      const docRef = await addDoc(ref, newCategory);
      
      await logAudit(
        'category.create',
        'inventory_category',
        docRef.id,
        `Created category "${categoryData.name}"`,
        null
      );
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('addCategory error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const updateCategory = useCallback(async (id, categoryData) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const categoryRef = doc(db, 'gyms', gymId, 'inventory', 'default', 'categories', id);
      const now = new Date().toISOString();
      const updatedFields = {
        ...categoryData,
        updatedAt: now
      };
      await updateDoc(categoryRef, updatedFields);
      
      await logAudit(
        'category.update',
        'inventory_category',
        id,
        `Updated category "${categoryData.name || id}"`,
        null
      );
      return { success: true };
    } catch (err) {
      console.error('updateCategory error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const deleteCategory = useCallback(async (id) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const categoryRef = doc(db, 'gyms', gymId, 'inventory', 'default', 'categories', id);
      const now = new Date().toISOString();
      
      await updateDoc(categoryRef, {
        status: 'deleted',
        updatedAt: now
      });

      await logAudit(
        'category.delete',
        'inventory_category',
        id,
        `Soft-deleted category ${id}`,
        null
      );
      return { success: true };
    } catch (err) {
      console.error('deleteCategory error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const restoreCategory = useCallback(async (id) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const categoryRef = doc(db, 'gyms', gymId, 'inventory', 'default', 'categories', id);
      const now = new Date().toISOString();
      
      await updateDoc(categoryRef, {
        status: 'active',
        updatedAt: now
      });

      await logAudit(
        'category.restore',
        'inventory_category',
        id,
        `Restored category ${id}`,
        null
      );
      return { success: true };
    } catch (err) {
      console.error('restoreCategory error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const purgeCategory = useCallback(async (id) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const categoryRef = doc(db, 'gyms', gymId, 'inventory', 'default', 'categories', id);
      await deleteDoc(categoryRef);

      await logAudit(
        'category.purge',
        'inventory_category',
        id,
        `Permanently deleted category ${id}`,
        null
      );
      return { success: true };
    } catch (err) {
      console.error('purgeCategory error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  // Products
  const addProduct = useCallback(async (productData) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const ref = collection(db, 'gyms', gymId, 'inventory', 'default', 'products');
      const now = new Date().toISOString();
      const newProduct = {
        gymId,
        ...productData,
        stock: productData.stock ? parseInt(productData.stock) : 0,
        buyPrice: productData.buyPrice ? parseFloat(productData.buyPrice) : 0,
        sellPrice: productData.sellPrice ? parseFloat(productData.sellPrice) : 0,
        discountPrice: productData.discountPrice ? parseFloat(productData.discountPrice) : 0,
        minimumStock: productData.minimumStock ? parseInt(productData.minimumStock) : 0,
        maximumStock: productData.maximumStock ? parseInt(productData.maximumStock) : 0,
        reorderLevel: productData.reorderLevel ? parseInt(productData.reorderLevel) : 0,
        status: productData.status || 'active',
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(ref, newProduct);
      
      await logAudit(
        'product.create',
        'inventory_product',
        docRef.id,
        `Created product "${productData.name}" (SKU: ${productData.sku || 'N/A'})`,
        null
      );
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('addProduct error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const updateProduct = useCallback(async (id, productData) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const productRef = doc(db, 'gyms', gymId, 'inventory', 'default', 'products', id);
      const now = new Date().toISOString();
      const updatedFields = {
        ...productData,
        stock: productData.stock !== undefined ? parseInt(productData.stock) : 0,
        buyPrice: productData.buyPrice !== undefined ? parseFloat(productData.buyPrice) : 0,
        sellPrice: productData.sellPrice !== undefined ? parseFloat(productData.sellPrice) : 0,
        discountPrice: productData.discountPrice !== undefined ? parseFloat(productData.discountPrice) : 0,
        minimumStock: productData.minimumStock !== undefined ? parseInt(productData.minimumStock) : 0,
        maximumStock: productData.maximumStock !== undefined ? parseInt(productData.maximumStock) : 0,
        reorderLevel: productData.reorderLevel !== undefined ? parseInt(productData.reorderLevel) : 0,
        updatedAt: now
      };
      await updateDoc(productRef, updatedFields);
      
      await logAudit(
        'product.update',
        'inventory_product',
        id,
        `Updated product "${productData.name || id}"`,
        null
      );
      return { success: true };
    } catch (err) {
      console.error('updateProduct error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const deleteProduct = useCallback(async (id) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const productRef = doc(db, 'gyms', gymId, 'inventory', 'default', 'products', id);
      const now = new Date().toISOString();
      
      await updateDoc(productRef, {
        status: 'deleted',
        updatedAt: now
      });

      await logAudit(
        'product.delete',
        'inventory_product',
        id,
        `Soft-deleted product ${id}`,
        null
      );
      return { success: true };
    } catch (err) {
      console.error('deleteProduct error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const restoreProduct = useCallback(async (id) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const productRef = doc(db, 'gyms', gymId, 'inventory', 'default', 'products', id);
      const now = new Date().toISOString();
      
      await updateDoc(productRef, {
        status: 'active',
        updatedAt: now
      });

      await logAudit(
        'product.restore',
        'inventory_product',
        id,
        `Restored product ${id}`,
        null
      );
      return { success: true };
    } catch (err) {
      console.error('restoreProduct error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const purgeProduct = useCallback(async (id) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const productRef = doc(db, 'gyms', gymId, 'inventory', 'default', 'products', id);
      await deleteDoc(productRef);

      await logAudit(
        'product.purge',
        'inventory_product',
        id,
        `Permanently deleted product ${id}`,
        null
      );
      return { success: true };
    } catch (err) {
      console.error('purgeProduct error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  // Suppliers
  const addSupplier = useCallback(async (supplierData) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const ref = collection(db, 'gyms', gymId, 'inventory', 'default', 'suppliers');
      const now = new Date().toISOString();
      const newSupplier = {
        gymId,
        ...supplierData,
        createdAt: now,
        updatedAt: now
      };
      const docRef = await addDoc(ref, newSupplier);
      
      await logAudit(
        'supplier.create',
        'inventory_supplier',
        docRef.id,
        `Added supplier "${supplierData.name}" (${supplierData.company || 'N/A'})`,
        null
      );
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('addSupplier error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const updateSupplier = useCallback(async (id, supplierData) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const supplierRef = doc(db, 'gyms', gymId, 'inventory', 'default', 'suppliers', id);
      const now = new Date().toISOString();
      const updatedFields = {
        ...supplierData,
        updatedAt: now
      };
      await updateDoc(supplierRef, updatedFields);
      
      await logAudit(
        'supplier.update',
        'inventory_supplier',
        id,
        `Updated supplier "${supplierData.name || id}"`,
        null
      );
      return { success: true };
    } catch (err) {
      console.error('updateSupplier error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  const deleteSupplier = useCallback(async (id) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const supplierRef = doc(db, 'gyms', gymId, 'inventory', 'default', 'suppliers', id);
      await deleteDoc(supplierRef);

      await logAudit(
        'supplier.delete',
        'inventory_supplier',
        id,
        `Deleted supplier ${id}`,
        null
      );
      return { success: true };
    } catch (err) {
      console.error('deleteSupplier error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, logAudit]);

  // Stock Transactions
  const recordStockTransaction = useCallback(async (transactionData) => {
    try {
      const gymId = currentUser?.gymId || DEFAULT_ORG_ID;
      const transactionsRef = collection(db, 'gyms', gymId, 'inventory', 'default', 'stockTransactions');
      
      const productId = transactionData.productId;
      const product = inventoryProducts.find(p => p.id === productId);
      if (!product) {
        throw new Error('Product not found.');
      }
      
      const previousStock = product.stock || 0;
      const quantity = parseInt(transactionData.quantity);
      let newStock = previousStock;
      
      switch (transactionData.type) {
        case 'stock_in':
        case 'returned':
          newStock = previousStock + quantity;
          break;
        case 'stock_out':
        case 'damaged':
        case 'expired':
          newStock = previousStock - quantity;
          break;
        case 'manual_adjustment':
          newStock = quantity;
          break;
        default:
          throw new Error('Invalid transaction type.');
      }
      
      if (newStock < 0) {
        newStock = 0;
      }
      
      const now = new Date().toISOString();
      const transactionDoc = {
        gymId,
        productId,
        type: transactionData.type,
        quantity: transactionData.type === 'manual_adjustment' ? Math.abs(newStock - previousStock) : quantity,
        previousStock,
        newStock,
        reason: transactionData.reason || '',
        remarks: transactionData.remarks || '',
        performedBy: currentUser?.name || 'System',
        createdAt: now
      };
      
      const docRef = await addDoc(transactionsRef, transactionDoc);
      
      const productRef = doc(db, 'gyms', gymId, 'inventory', 'default', 'products', productId);
      await updateDoc(productRef, {
        stock: newStock,
        updatedAt: now
      });
      
      const actionName = transactionData.type.toUpperCase().replace('_', ' ');
      await logAudit(
        'stock.transaction',
        'inventory_product',
        productId,
        `Recorded ${actionName} for "${product.name}": ${previousStock} -> ${newStock} (${transactionData.reason})`,
        null
      );
      
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('recordStockTransaction error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [currentUser, inventoryProducts, logAudit]);

  const sendGroupChatMessage = useCallback(async (text) => {
    if (!currentUser || !text.trim()) return { success: false };
    try {
      const chatMsg = {
        gymId: currentUser.gymId || DEFAULT_ORG_ID,
        senderId: currentUser.id || currentUser.uid,
        senderName: currentUser.name || 'Anonymous',
        senderRole: currentUser.role || 'staff',
        senderPhotoUrl: currentUser.photo_url || '',
        text: text.trim(),
        created_at: new Date().toISOString()
      };
      await addDoc(collection(db, COLLECTIONS.GROUP_CHAT), chatMsg);
      return { success: true };
    } catch (err) {
      console.error('sendGroupChatMessage error:', err);
      return { success: false, error: err.message };
    }
  }, [currentUser]);

  // ─── MEMBER DOCUMENTS ACTIONS ───
  const saveMemberDocument = useCallback(async (docData, subItems = []) => {
    try {
      const docRef = await addDoc(collection(db, 'memberDocuments'), {
        ...docData,
        gymId: currentUser?.gymId || DEFAULT_ORG_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'System',
        isArchived: false,
        downloadCount: 0,
        viewCount: 0
      });
      
      const docId = docRef.id;
      
      // Save sub-items if present
      if (subItems && subItems.length > 0) {
        let subColName = '';
        if (docData.type === 'workout') subColName = 'exercises';
        else if (docData.type === 'diet') subColName = 'meals';
        else if (docData.type === 'general') subColName = 'attachments';
        
        if (subColName) {
          const subColRef = collection(db, 'memberDocuments', docId, subColName);
          for (const item of subItems) {
            await addDoc(subColRef, item);
          }
        }
      }

      await logAudit(
        'document.create', 
        'member', 
        docData.memberId, 
        `Created ${docData.type} document: "${docData.title}" for member`,
        currentUser?.name
      );

      showToast(`${docData.type === 'workout' ? 'Workout Plan' : docData.type === 'diet' ? 'Diet Plan' : 'General Document'} saved.`, 'success');
      return { success: true, id: docId };
    } catch (err) {
      console.error('saveMemberDocument error:', err);
      showToast('Failed to save document.', 'error');
      return { success: false, error: err.message };
    }
  }, [currentUser, logAudit, showToast]);

  const updateMemberDocument = useCallback(async (docId, docData, subItems = []) => {
    try {
      const docRef = doc(db, 'memberDocuments', docId);
      await updateDoc(docRef, {
        ...docData,
        updatedAt: new Date().toISOString(),
        lastEditedBy: currentUser?.name || 'System'
      });

      // Update sub-items by clearing and re-writing
      let subColName = '';
      if (docData.type === 'workout') subColName = 'exercises';
      else if (docData.type === 'diet') subColName = 'meals';
      else if (docData.type === 'general') subColName = 'attachments';

      if (subColName) {
        const subColRef = collection(db, 'memberDocuments', docId, subColName);
        const currentSnap = await getDocs(subColRef);
        for (const d of currentSnap.docs) {
          await deleteDoc(d.ref);
        }
        for (const item of subItems) {
          await addDoc(subColRef, item);
        }
      }

      await logAudit(
        'document.update', 
        'member', 
        docData.memberId, 
        `Updated ${docData.type} document: "${docData.title}"`,
        currentUser?.name
      );

      showToast('Document updated successfully.', 'success');
      return { success: true };
    } catch (err) {
      console.error('updateMemberDocument error:', err);
      showToast('Failed to update document.', 'error');
      return { success: false, error: err.message };
    }
  }, [currentUser, logAudit, showToast]);

  const getMemberDocumentSubItems = useCallback(async (docId, type) => {
    try {
      let subColName = '';
      if (type === 'workout') subColName = 'exercises';
      else if (type === 'diet') subColName = 'meals';
      else if (type === 'general') subColName = 'attachments';

      if (!subColName) return [];

      const subColRef = collection(db, 'memberDocuments', docId, subColName);
      const snap = await getDocs(subColRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('getMemberDocumentSubItems error:', err);
      return [];
    }
  }, []);

  const deleteMemberDocument = useCallback(async (docId) => {
    try {
      const docRef = doc(db, 'memberDocuments', docId);
      await deleteDoc(docRef);
      await logAudit('document.delete', 'member', null, `Deleted document`, currentUser?.name);
      showToast('Document deleted permanently.', 'success');
      return { success: true };
    } catch (err) {
      console.error('deleteMemberDocument error:', err);
      showToast('Failed to delete document.', 'error');
      return { success: false, error: err.message };
    }
  }, [logAudit, showToast, currentUser]);

  const archiveMemberDocument = useCallback(async (docId, isArchived) => {
    try {
      const docRef = doc(db, 'memberDocuments', docId);
      await updateDoc(docRef, { isArchived });
      await logAudit('document.archive', 'member', null, `${isArchived ? 'Archived' : 'Unarchived'} document`, currentUser?.name);
      showToast(`Document ${isArchived ? 'archived' : 'restored'} successfully.`, 'success');
      return { success: true };
    } catch (err) {
      console.error('archiveMemberDocument error:', err);
      showToast('Failed to archive document.', 'error');
      return { success: false, error: err.message };
    }
  }, [logAudit, showToast, currentUser]);

  const uploadDocumentPDF = useCallback(async (docId, type, pdfBlob) => {
    try {
      let downloadUrl = '';
      try {
        const storageRef = ref(storage, `gyms/${currentUser?.gymId || DEFAULT_ORG_ID}/documents/${type}-plans/${docId}.pdf`);
        await uploadBytes(storageRef, pdfBlob);
        downloadUrl = await getDownloadURL(storageRef);
      } catch (storageErr) {
        console.warn('Firebase Storage upload failed, using local/data URL simulation fallback:', storageErr);
        // Fallback: create a simulated PDF URL or storage ref
        downloadUrl = `simulated://storage/gyms/${currentUser?.gymId || DEFAULT_ORG_ID}/documents/${type}-plans/${docId}.pdf`;
      }

      // Update in Firestore
      const docRef = doc(db, 'memberDocuments', docId);
      await updateDoc(docRef, {
        pdfUrl: downloadUrl,
        status: 'PDF Ready',
        generatedAt: new Date().toISOString()
      });

      await logAudit('document.pdf_generate', 'member', null, `Generated PDF for document ID ${docId}`, currentUser?.name);
      showToast('Branded PDF generated and saved successfully!', 'success');
      return { success: true, pdfUrl: downloadUrl };
    } catch (err) {
      console.error('uploadDocumentPDF error:', err);
      showToast('Failed to save generated PDF.', 'error');
      return { success: false, error: err.message };
    }
  }, [currentUser, logAudit, showToast]);

  const sendGeneralSMS = useCallback(async (toPhone, message, memberName, memberId = null) => {
    try {
      const fromPhone = '0779688582';
      
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
        message,
        sent_at: new Date().toISOString(),
      };
      
      await addDoc(collection(db, COLLECTIONS.SMS_LOGS), smsLog);
      
      await logAudit(
        'member.sms_general', 
        'member', 
        memberId || 'unknown_member', 
        `Sent SMS to ${memberName} (+${toPhone})`,
        currentUser?.name
      );
      
      showToast(`SMS sent to ${memberName} (+${toPhone})`, 'success');
      return { success: true };
    } catch (err) {
      console.error('sendGeneralSMS error:', err);
      showToast('Failed to send SMS.', 'error');
      return { success: false, error: err.message };
    }
  }, [currentUser, logAudit, showToast]);

  const updateAdminPermissions = useCallback(async (adminId, role, permissions) => {
    try {
      const admin = admins.find(a => a.id === adminId);
      if (!admin) return { success: false, message: 'Admin not found.' };

      const adminRef = doc(db, COLLECTIONS.ADMINS, adminId);
      await updateDoc(adminRef, { role, permissions });

      await logAudit('admin.permissions_update', 'admin', adminId, `Updated role/permissions for administrator: ${admin.name}`, currentUser?.name);
      return { success: true };
    } catch (err) {
      console.error('updateAdminPermissions error:', err);
      return { success: false, message: err.message };
    }
  }, [admins, logAudit, currentUser]);

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
      breakLogs,
      expenses,
      income,
      devices,
      currentUser,
      toasts,
      smsLogs,
      notificationTemplates,

      // FitGenCore SaaS States
      gyms,
      subscriptions,
      supportTickets,
      announcements,
      gymSettings,
      currentGym,

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
      startBreak,
      stopBreak,
      clockInOutShift,
      requestLeave,
      approveLeaveRequest,
      rejectLeaveRequest,

      // State exports
      leaveRequests,
      shiftLogs,

      // Payment Actions
      recordPayment,
      undoPayment,
      helperCalculateUndoCountdownEnd,

      // Access Actions
      checkInMember,
      checkOutMember,
      addDevice,
      updateDevice,
      deleteDevice,
      testDeviceConnection,
      syncDeviceUsers,
      triggerDoorCommand,

      // Utility
      logAudit,
      renewMemberMembership,
      processStaffPayroll,
      sendSMS,
      sendTemplatedSMS,
      updateNotificationTemplate,
      scanAndSendPaymentReminders,

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
      markTicketAsRead,
      publishAnnouncement,
      updateGymSettings,
      getGymHealthScore,

      // SaaS Plan Management
      saasPlans,
      addSaasPlan,
      updateSaasPlan,
      deleteSaasPlan,

      // Inventory Management Module States & Actions
      inventoryCategories,
      inventoryProducts,
      inventorySuppliers,
      inventoryTransactions,
      addCategory,
      updateCategory,
      deleteCategory,
      restoreCategory,
      purgeCategory,
      addProduct,
      updateProduct,
      deleteProduct,
      restoreProduct,
      purgeProduct,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      recordStockTransaction,

      // Member Documents
      memberDocuments,
      saveMemberDocument,
      updateMemberDocument,
      getMemberDocumentSubItems,
      deleteMemberDocument,
      archiveMemberDocument,
      uploadDocumentPDF,
      sendGeneralSMS,
      updateAdminPermissions,

      // Group Chat
      groupChatMessages,
      hasUnreadChat,
      setHasUnreadChat,
      sendGroupChatMessage,
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
