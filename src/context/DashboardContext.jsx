/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
  orderBy,
  serverTimestamp,
  Timestamp,
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
  return {
    organization_id: DEFAULT_ORG_ID,
    member_code: memberCode,
    joined_at: now.toISOString().split('T')[0],
    status: 'active',
    qr_token: `qr_token_${memberCode}_${Date.now()}`,
    weight_kg: memberData.weight_kg ? parseFloat(memberData.weight_kg) : 75.0,
    height_cm: memberData.height_cm ? parseInt(memberData.height_cm) : 175,
    body_fat_pct: memberData.body_fat_pct ? parseFloat(memberData.body_fat_pct) : 18.0,
    countdown_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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
    organization_id: DEFAULT_ORG_ID,
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
const helperCalculateRenewalCountdownEnd = (countdownEnd) => {
  const baseDate = countdownEnd && new Date(countdownEnd).getTime() > Date.now()
    ? new Date(countdownEnd)
    : new Date();
  baseDate.setDate(baseDate.getDate() + 30);
  return baseDate.toISOString();
};

/**
 * Build a renewal invoice object.
 */
const helperCreateRenewalInvoice = (memberId, memberName, plan, priceToCharge, tax, total, paymentMethod) => {
  const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    organization_id: DEFAULT_ORG_ID,
    member_id: memberId,
    member_name: memberName,
    invoice_number: invNumber,
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
  };
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

// ═══════════════════════════════════════════════════════════════════════
// PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export const DashboardProvider = ({ children }) => {
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

  // ═══════════════════════════════════════════════════════════════════
  // PHASE A: Firebase Auth Listener
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
      setCurrentUser(null);
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
  // PHASE C: Public Plans Firestore Listener (runs for guest too)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    const orgId = currentUser?.organization_id || DEFAULT_ORG_ID;
    const plansQ = query(
      collection(db, COLLECTIONS.PLANS),
      where('organization_id', '==', orgId)
    );
    const unsubscribe = onSnapshot(plansQ, (snap) => {
      setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('Plans listener error:', err);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // ─── Seeding Helpers for Employees & Employee Registrations ─────────
  const seedMockEmployees = async () => {
    const orgId = currentUser?.organization_id || DEFAULT_ORG_ID;
    const initialEmployees = [
      {
        organization_id: orgId,
        full_name: 'Sarah Jenkins',
        email: 'superadmin@ascend.com',
        phone: '+94 77 111 2222',
        role: 'Manager',
        salary: 125000,
        next_salary_date: '2026-06-25',
        status: 'active',
        joined_at: '2025-01-10',
        created_at: new Date().toISOString(),
      },
      {
        organization_id: orgId,
        full_name: 'Marcus Rivera',
        email: 'marcus@ascend.com',
        phone: '+94 77 333 4444',
        role: 'Head Trainer',
        salary: 95000,
        next_salary_date: '2026-06-25',
        status: 'active',
        joined_at: '2025-03-15',
        created_at: new Date().toISOString(),
      },
      {
        organization_id: orgId,
        full_name: 'Priya Chandrasekhar',
        email: 'priya@ascend.com',
        phone: '+94 77 555 6666',
        role: 'Yoga Coach',
        salary: 80000,
        next_salary_date: '2026-06-25',
        status: 'active',
        joined_at: '2025-04-01',
        created_at: new Date().toISOString(),
      }
    ];
    for (const emp of initialEmployees) {
      await addDoc(collection(db, COLLECTIONS.EMPLOYEES), emp);
    }
  };

  const seedMockEmployeeRegistrations = async () => {
    const orgId = currentUser?.organization_id || DEFAULT_ORG_ID;
    const initialRegs = [
      {
        organization_id: orgId,
        full_name: 'Dilan Perera',
        email: 'dilan.p@gmail.com',
        phone: '+94 77 777 8888',
        date_of_birth: '1998-05-12',
        role: 'Front Desk',
        expected_salary: 45000,
        cover_note: 'I have 2 years of receptionist experience. Excited to apply at Ascend!',
        status: 'pending_approval',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        organization_id: orgId,
        full_name: 'Nisansala Silva',
        email: 'nisansala@gmail.com',
        phone: '+94 71 222 3333',
        date_of_birth: '1995-11-20',
        role: 'Personal Trainer',
        expected_salary: 75000,
        cover_note: 'Certified fitness coach specializing in female hypertrophy and strength training.',
        status: 'pending_approval',
        created_at: new Date().toISOString(),
      }
    ];
    for (const reg of initialRegs) {
      await addDoc(collection(db, COLLECTIONS.EMPLOYEE_REGISTRATIONS), reg);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // PHASE D: Real-time Firestore Listeners (only when authenticated)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!currentUser) {
      // Reset all data when logged out
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
      setDataLoaded(false);
      return;
    }

    const orgId = currentUser.organization_id || DEFAULT_ORG_ID;
    const unsubscribers = [];
    let loadedCount = 0;
    const totalCollections = 9; // Added employees and employeeRegistrations (7 + 2 = 9)

    const markLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalCollections) {
        setDataLoaded(true);
      }
    };

    // 2. Trainers (org-scoped)
    const trainersQ = query(
      collection(db, COLLECTIONS.TRAINERS),
      where('organization_id', '==', orgId)
    );
    unsubscribers.push(
      onSnapshot(trainersQ, (snap) => {
        setTrainers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        markLoaded();
      }, (err) => { console.error('Trainers listener error:', err); markLoaded(); })
    );

    // 3. Members (org-scoped)
    const membersQ = query(
      collection(db, COLLECTIONS.MEMBERS),
      where('organization_id', '==', orgId)
    );
    unsubscribers.push(
      onSnapshot(membersQ, (snap) => {
        setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        markLoaded();
      }, (err) => { console.error('Members listener error:', err); markLoaded(); })
    );

    // 4. Invoices (org-scoped)
    const invoicesQ = query(
      collection(db, COLLECTIONS.INVOICES),
      where('organization_id', '==', orgId)
    );
    unsubscribers.push(
      onSnapshot(invoicesQ, (snap) => {
        setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        markLoaded();
      }, (err) => { console.error('Invoices listener error:', err); markLoaded(); })
    );

    // 5. Registrations (org-scoped)
    const registrationsQ = query(
      collection(db, COLLECTIONS.REGISTRATIONS),
      where('organization_id', '==', orgId)
    );
    unsubscribers.push(
      onSnapshot(registrationsQ, (snap) => {
        setRegistrations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        markLoaded();
      }, (err) => { console.error('Registrations listener error:', err); markLoaded(); })
    );

    // 6. Access Events (org-scoped, ordered by occurred_at descending)
    const accessQ = query(
      collection(db, COLLECTIONS.ACCESS_EVENTS),
      where('organization_id', '==', orgId)
    );
    unsubscribers.push(
      onSnapshot(accessQ, (snap) => {
        const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort client-side to avoid requiring composite index
        events.sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
        setAccessEvents(events);
        markLoaded();
      }, (err) => { console.error('Access events listener error:', err); markLoaded(); })
    );

    // 7. Audit Logs (org-scoped)
    const auditQ = query(
      collection(db, COLLECTIONS.AUDIT_LOGS),
      where('organization_id', '==', orgId)
    );
    unsubscribers.push(
      onSnapshot(auditQ, (snap) => {
        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort client-side
        logs.sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
        setAuditLogs(logs);
        markLoaded();
      }, (err) => { console.error('Audit logs listener error:', err); markLoaded(); })
    );

    // 8. Admins (org-scoped)
    const adminsQ = query(
      collection(db, COLLECTIONS.ADMINS),
      where('organization_id', '==', orgId)
    );
    unsubscribers.push(
      onSnapshot(adminsQ, (snap) => {
        setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        markLoaded();
      }, (err) => { console.error('Admins listener error:', err); markLoaded(); })
    );

    // 9. Employees (org-scoped)
    const employeesQ = query(
      collection(db, COLLECTIONS.EMPLOYEES),
      where('organization_id', '==', orgId)
    );
    unsubscribers.push(
      onSnapshot(employeesQ, (snap) => {
        setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        markLoaded();
        if (snap.empty) {
          seedMockEmployees();
        }
      }, (err) => { console.error('Employees listener error:', err); markLoaded(); })
    );

    // 10. Employee Registrations (org-scoped)
    const empRegsQ = query(
      collection(db, COLLECTIONS.EMPLOYEE_REGISTRATIONS),
      where('organization_id', '==', orgId)
    );
    unsubscribers.push(
      onSnapshot(empRegsQ, (snap) => {
        setEmployeeRegistrations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        markLoaded();
        if (snap.empty) {
          seedMockEmployeeRegistrations();
        }
      }, (err) => { console.error('Employee registrations listener error:', err); markLoaded(); })
    );

    // Cleanup all listeners on unmount or user change
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
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, [currentUser]);

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
      const currentEmail = firebaseUser?.email;

      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const newUid = userCredential.user.uid;

      // Write admin document to Firestore
      const adminData = {
        uid: newUid,
        name,
        email: email.trim().toLowerCase(),
        role,
        password, // Save password in Firestore for advanced Super Admin actions
        organization_id: currentUser?.organization_id || DEFAULT_ORG_ID,
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
  }, [admins, currentUser, firebaseUser]);

  // ═══════════════════════════════════════════════════════════════════
  // AUDIT LOG HELPER
  // ═══════════════════════════════════════════════════════════════════

  const logAudit = useCallback(async (action, entityType, entityId, details, userOverride = null) => {
    try {
      const logEntry = {
        organization_id: currentUser?.organization_id || DEFAULT_ORG_ID,
        user_name: userOverride || (currentUser ? currentUser.name : 'System'),
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        occurred_at: new Date().toISOString(),
      };
      await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), logEntry);
    } catch (err) {
      // Audit logging should never block the main operation
      console.error('Audit log write failed:', err);
    }
  }, [currentUser]);

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
  }, [plans, currentUser, members]);

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
  }, [members, currentUser]);

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
  }, [members, currentUser]);

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
  }, [members, currentUser]);

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
  }, [members, currentUser]);

  // ═══════════════════════════════════════════════════════════════════
  // REGISTRATION ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  const addRegistrationRequest = useCallback(async (formData) => {
    try {
      const newReq = {
        organization_id: DEFAULT_ORG_ID,
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
  }, [registrations, addMember, currentUser]);

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
  }, [registrations, currentUser]);

  // ═══════════════════════════════════════════════════════════════════
  // EMPLOYEE CRUD & PAYROLL ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  const addEmployee = useCallback(async (employeeData) => {
    try {
      const newEmp = {
        organization_id: currentUser?.organization_id || DEFAULT_ORG_ID,
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
        organization_id: DEFAULT_ORG_ID,
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

  const createInvoiceForMember = useCallback(async (memberId, memberName, plan) => {
    try {
      const invoiceData = helperCreateInvoiceForMember(memberId, memberName, plan);
      await addDoc(collection(db, COLLECTIONS.INVOICES), invoiceData);
    } catch (err) {
      console.error('createInvoiceForMember error:', err);
    }
  }, []);

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
  }, [invoices, currentUser]);

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
          organization_id: DEFAULT_ORG_ID,
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
        organization_id: DEFAULT_ORG_ID,
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
  }, [members, currentUser]);

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
  }, [accessEvents, currentUser]);

  // ═══════════════════════════════════════════════════════════════════
  // MEMBERSHIP RENEWAL
  // ═══════════════════════════════════════════════════════════════════

  const renewMemberMembership = useCallback(async (memberId, paymentMethod, customPrice = null) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) return { success: false, message: 'Member not found.' };

      const plan = plans.find(p => p.id === member.plan_id) || plans[0];
      if (!plan) return { success: false, message: 'No plan found.' };

      const priceToCharge = customPrice !== null ? parseFloat(customPrice) : plan.price;
      const tax = 0.0;
      const total = priceToCharge;

      const newCountdownEnd = helperCalculateRenewalCountdownEnd(member.countdown_end);

      // Update member in Firestore
      const memberRef = doc(db, COLLECTIONS.MEMBERS, memberId);
      await updateDoc(memberRef, {
        status: 'active',
        countdown_end: newCountdownEnd,
      });

      // Create paid renewal invoice
      const invoiceData = helperCreateRenewalInvoice(member.id, member.full_name, plan, priceToCharge, tax, total, paymentMethod);
      const invRef = await addDoc(collection(db, COLLECTIONS.INVOICES), invoiceData);

      await logAudit('payment.receive', 'invoice', invRef.id,
        `Collected LKR ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} via ${paymentMethod.toUpperCase()} for membership renewal of ${member.full_name}`
      );
      await logAudit('member.renew', 'member', memberId,
        `Renewed membership for ${member.full_name} for 30 days (New Expiry: ${new Date(newCountdownEnd).toLocaleDateString()})`
      );

      return { success: true, newCountdownEnd };
    } catch (err) {
      console.error('renewMemberMembership error:', err);
      setError(friendlyFirestoreError(err));
      return { success: false, message: friendlyFirestoreError(err) };
    }
  }, [members, plans, currentUser]);
  
  // ═══════════════════════════════════════════════════════════════════
  // PLAN (MEMBERSHIP PACKAGE) CRUD ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  const addPlan = useCallback(async (planData) => {
    try {
      const newPlan = {
        organization_id: currentUser?.organization_id || DEFAULT_ORG_ID,
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

  // ═══════════════════════════════════════════════════════════════════
  // PERSONAL TRAINER CRUD ACTIONS
  // ═══════════════════════════════════════════════════════════════════

  const addTrainer = useCallback(async (trainerData) => {
    try {
      const newTrainer = {
        organization_id: currentUser?.organization_id || DEFAULT_ORG_ID,
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
      currentUser,
      toasts,

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
