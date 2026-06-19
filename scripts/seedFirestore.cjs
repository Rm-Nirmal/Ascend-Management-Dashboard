#!/usr/bin/env node
/**
 * Ascend Management Dashboard — Firestore Data Seeder
 * =====================================================
 * Populates Firestore with realistic gym management data.
 *
 * Usage:
 *   node scripts/seedFirestore.js --key ./serviceAccountKey.json
 *   node scripts/seedFirestore.js --key ./serviceAccountKey.json --clean
 *
 * Options:
 *   --key <path>   Path to Firebase service account key JSON file (required)
 *   --clean        Clear all existing data before seeding
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');

// ─── CLI Argument Parsing ────────────────────────────────────────────
const args = process.argv.slice(2);
const keyIndex = args.indexOf('--key');
const cleanMode = args.includes('--clean');

if (keyIndex === -1 || !args[keyIndex + 1]) {
  console.error('❌ Usage: node scripts/seedFirestore.js --key <path-to-serviceAccountKey.json> [--clean]');
  process.exit(1);
}

const keyPath = path.resolve(args[keyIndex + 1]);

// ─── Initialize Firebase Admin ───────────────────────────────────────
const app = initializeApp({ credential: cert(require(keyPath)) });
const db = getFirestore(app);
const auth = getAuth(app);

const ORG_ID = 'org_ascend_hq';

// ─── Collection Names (must match src/lib/firebase.js) ───────────────
const COLLECTIONS = {
  PLANS: 'plans',
  TRAINERS: 'trainers',
  MEMBERS: 'members',
  INVOICES: 'invoices',
  REGISTRATIONS: 'registrations',
  ACCESS_EVENTS: 'access_events',
  AUDIT_LOGS: 'audit_logs',
  ADMINS: 'admins',
};

// ─── Unsplash Avatar URLs ────────────────────────────────────────────
const AVATARS = {
  male: [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  ],
  female: [
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  ],
};

// ─── Helper: Random pick from array ──────────────────────────────────
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

// ═══════════════════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════════════════

const PLANS_DATA = [
  {
    name: 'Basic',
    price: 3500,
    tax_rate: 5,
    duration_days: 30,
    organization_id: ORG_ID,
    features: ['Gym floor access', 'Locker usage', 'Basic equipment', 'Shower facilities'],
    created_at: new Date().toISOString(),
  },
  {
    name: 'Standard',
    price: 5500,
    tax_rate: 5,
    duration_days: 30,
    organization_id: ORG_ID,
    features: ['Full gym access', 'Group classes', 'Sauna & steam', 'Nutrition guide', 'Locker usage'],
    created_at: new Date().toISOString(),
  },
  {
    name: 'Premium',
    price: 8500,
    tax_rate: 5,
    duration_days: 30,
    organization_id: ORG_ID,
    features: ['Full gym + classes', '1 PT session/week', 'Spa access', 'Diet consultation', 'Priority booking', 'Towel service'],
    created_at: new Date().toISOString(),
  },
  {
    name: 'Elite VIP',
    price: 15000,
    tax_rate: 5,
    duration_days: 30,
    organization_id: ORG_ID,
    features: ['Unlimited everything', '3 PT sessions/week', 'Private locker', 'VIP lounge', 'Guest passes (2/mo)', 'Body composition analysis', 'Priority parking'],
    created_at: new Date().toISOString(),
  },
];

const TRAINERS_DATA = [
  {
    name: 'Marcus Rivera',
    specialization: 'Strength & Conditioning',
    bio: 'NSCA-certified strength coach with 8 years of experience in powerlifting and athletic performance.',
    hourly_rate: 3500,
    organization_id: ORG_ID,
    photo_url: AVATARS.male[0],
    date_of_birth: '1988-06-21',
    last_payment_date: '2026-05-30',
    next_payment_date: '2026-06-30',
    payment_status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    name: 'Priya Chandrasekhar',
    specialization: 'Yoga & Mobility',
    bio: 'RYT-500 certified yoga instructor specializing in vinyasa flow and corrective mobility for athletes.',
    hourly_rate: 3000,
    organization_id: ORG_ID,
    photo_url: AVATARS.female[0],
    date_of_birth: '1992-06-25',
    last_payment_date: '2026-05-30',
    next_payment_date: '2026-06-30',
    payment_status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    name: 'Daniel Okonkwo',
    specialization: 'HIIT & Cardio',
    bio: 'ACE-certified personal trainer focused on high-intensity interval training and cardiovascular endurance.',
    hourly_rate: 2800,
    organization_id: ORG_ID,
    photo_url: AVATARS.male[1],
    date_of_birth: '1990-06-19', // June 19th - Today!
    last_payment_date: '2026-05-30',
    next_payment_date: '2026-06-30',
    payment_status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    name: 'Sofia Hernandez',
    specialization: 'Nutrition & Weight Loss',
    bio: 'Certified nutritionist and fitness coach specializing in body recomposition and sustainable weight management.',
    hourly_rate: 3200,
    organization_id: ORG_ID,
    photo_url: AVATARS.female[1],
    date_of_birth: '1994-07-02',
    last_payment_date: '2026-05-30',
    next_payment_date: '2026-06-30',
    payment_status: 'pending',
    created_at: new Date().toISOString(),
  },
];

const ADMINS_DATA = [
  {
    name: 'Sarah Jenkins',
    email: 'superadmin@ascend.com',
    role: 'super_admin',
    organization_id: ORG_ID,
    photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    created_at: new Date().toISOString(),
  },
  {
    name: 'James Mercer',
    email: 'admin@ascend.com',
    role: 'admin',
    organization_id: ORG_ID,
    photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    created_at: new Date().toISOString(),
  },
];

// Members will reference plan IDs and trainer IDs dynamically
const MEMBERS_TEMPLATE = [
  {
    full_name: 'Ashan Perera',
    email: 'ashan.perera@gmail.com',
    phone: '+94 77 123 4567',
    gender: 'male',
    date_of_birth: '1995-03-15',
    status: 'active',
    weight_kg: 78.5,
    height_cm: 176,
    body_fat_pct: 16.2,
    fitness_goals: 'Build lean muscle mass and improve deadlift PR to 200kg.',
    medical_notes: 'Mild lower back strain (recovered). No current limitations.',
    emergency_contact_name: 'Nimal Perera',
    emergency_contact_phone: '+94 77 234 5678',
    auto_renew: true,
    _planIndex: 2, // Premium
    _trainerIndex: 0, // Marcus
    _avatarGender: 'male',
    _avatarIndex: 2,
    _daysRemaining: 22,
    _joinedDaysAgo: 45,
  },
  {
    full_name: 'Kavindi Silva',
    email: 'kavindi.silva@outlook.com',
    phone: '+94 71 987 6543',
    gender: 'female',
    date_of_birth: '1998-07-22',
    status: 'active',
    weight_kg: 58.0,
    height_cm: 163,
    body_fat_pct: 22.5,
    fitness_goals: 'Tone up, improve flexibility, and reduce stress through yoga.',
    medical_notes: 'None.',
    emergency_contact_name: 'Dilini Silva',
    emergency_contact_phone: '+94 71 876 5432',
    auto_renew: true,
    _planIndex: 1, // Standard
    _trainerIndex: 1, // Priya
    _avatarGender: 'female',
    _avatarIndex: 2,
    _daysRemaining: 15,
    _joinedDaysAgo: 90,
  },
  {
    full_name: 'Ravindu Fernando',
    email: 'ravindu.f@yahoo.com',
    phone: '+94 76 555 1234',
    gender: 'male',
    date_of_birth: '1992-11-08',
    status: 'active',
    weight_kg: 85.3,
    height_cm: 181,
    body_fat_pct: 19.8,
    fitness_goals: 'Train for an upcoming triathlon. Improve cardio endurance.',
    medical_notes: 'Asthma (controlled with inhaler). Carries inhaler during sessions.',
    emergency_contact_name: 'Chaminda Fernando',
    emergency_contact_phone: '+94 76 444 5678',
    auto_renew: false,
    _planIndex: 3, // Elite VIP
    _trainerIndex: 2, // Daniel
    _avatarGender: 'male',
    _avatarIndex: 3,
    _daysRemaining: 8,
    _joinedDaysAgo: 120,
  },
  {
    full_name: 'Tharushi Jayawardena',
    email: 'tharushi.j@gmail.com',
    phone: '+94 70 321 9876',
    gender: 'female',
    date_of_birth: '2000-01-30',
    status: 'active',
    weight_kg: 62.0,
    height_cm: 168,
    body_fat_pct: 24.1,
    fitness_goals: 'Weight loss journey - target 55kg. Focus on HIIT and clean eating.',
    medical_notes: 'None.',
    emergency_contact_name: 'Kumari Jayawardena',
    emergency_contact_phone: '+94 70 654 3210',
    auto_renew: true,
    _planIndex: 1, // Standard
    _trainerIndex: 3, // Sofia
    _avatarGender: 'female',
    _avatarIndex: 3,
    _daysRemaining: 27,
    _joinedDaysAgo: 30,
  },
  {
    full_name: 'Nuwan Bandara',
    email: 'nuwan.bandara@hotmail.com',
    phone: '+94 75 111 2222',
    gender: 'male',
    date_of_birth: '1988-05-12',
    status: 'frozen',
    weight_kg: 92.0,
    height_cm: 179,
    body_fat_pct: 25.3,
    fitness_goals: 'General fitness and stress relief.',
    medical_notes: 'Knee surgery (ACL reconstruction) in 2023. Avoid high-impact leg exercises.',
    emergency_contact_name: 'Sanduni Bandara',
    emergency_contact_phone: '+94 75 333 4444',
    auto_renew: false,
    frozen_from: daysAgo(10).toISOString().split('T')[0],
    frozen_until: daysFromNow(20).toISOString().split('T')[0],
    freeze_reason: 'Overseas work assignment — returning in 3 weeks.',
    _planIndex: 0, // Basic
    _trainerIndex: null,
    _avatarGender: 'male',
    _avatarIndex: 4,
    _daysRemaining: 18,
    _joinedDaysAgo: 200,
  },
  {
    full_name: 'Ishara De Mel',
    email: 'ishara.demel@gmail.com',
    phone: '+94 77 999 8888',
    gender: 'female',
    date_of_birth: '1996-09-05',
    status: 'expired',
    weight_kg: 55.0,
    height_cm: 160,
    body_fat_pct: 20.0,
    fitness_goals: 'Maintain fitness level and attend group classes regularly.',
    medical_notes: 'Iron deficiency (under treatment). Gets fatigued quickly during intense sessions.',
    emergency_contact_name: 'Ranjith De Mel',
    emergency_contact_phone: '+94 77 777 6666',
    auto_renew: false,
    _planIndex: 0, // Basic
    _trainerIndex: null,
    _avatarGender: 'female',
    _avatarIndex: 4,
    _daysRemaining: -5, // expired
    _joinedDaysAgo: 150,
  },
  {
    full_name: 'Dineth Rajapaksha',
    email: 'dineth.r@gmail.com',
    phone: '+94 76 222 3333',
    gender: 'male',
    date_of_birth: '1993-12-18',
    status: 'active',
    weight_kg: 74.0,
    height_cm: 174,
    body_fat_pct: 14.5,
    fitness_goals: 'Competitive bodybuilding prep. Need to cut to 70kg by September.',
    medical_notes: 'None.',
    emergency_contact_name: 'Lalith Rajapaksha',
    emergency_contact_phone: '+94 76 444 5555',
    auto_renew: true,
    _planIndex: 3, // Elite VIP
    _trainerIndex: 0, // Marcus
    _avatarGender: 'male',
    _avatarIndex: 0,
    _daysRemaining: 3,
    _joinedDaysAgo: 365,
  },
  {
    full_name: 'Shenali Wickramasinghe',
    email: 'shenali.w@yahoo.com',
    phone: '+94 71 555 6666',
    gender: 'female',
    date_of_birth: '1997-04-25',
    status: 'active',
    weight_kg: 65.0,
    height_cm: 170,
    body_fat_pct: 21.0,
    fitness_goals: 'Improve posture and core strength. Reduce chronic back pain.',
    medical_notes: 'Chronic lumbar pain — physiotherapist recommended core-focused training.',
    emergency_contact_name: 'Malka Wickramasinghe',
    emergency_contact_phone: '+94 71 777 8888',
    auto_renew: true,
    _planIndex: 2, // Premium
    _trainerIndex: 1, // Priya
    _avatarGender: 'female',
    _avatarIndex: 0,
    _daysRemaining: 12,
    _joinedDaysAgo: 60,
  },
  {
    full_name: 'Kasun Wijesinghe',
    email: 'kasun.w@gmail.com',
    phone: '+94 70 888 9999',
    gender: 'male',
    date_of_birth: '1990-08-03',
    status: 'active',
    weight_kg: 88.0,
    height_cm: 183,
    body_fat_pct: 18.0,
    fitness_goals: 'Functional fitness for cricket training. Improve agility and speed.',
    medical_notes: 'Previous shoulder dislocation (right). Cleared for all exercises with caution.',
    emergency_contact_name: 'Pradeep Wijesinghe',
    emergency_contact_phone: '+94 70 111 2222',
    auto_renew: true,
    _planIndex: 1, // Standard
    _trainerIndex: 2, // Daniel
    _avatarGender: 'male',
    _avatarIndex: 1,
    _daysRemaining: 19,
    _joinedDaysAgo: 75,
  },
];

const REGISTRATIONS_DATA = [
  {
    full_name: 'Amaya Gunaratne',
    email: 'amaya.g@gmail.com',
    phone: '+94 77 444 5555',
    gender: 'female',
    date_of_birth: '1999-06-14',
    fitness_goals: 'Get fit for wedding in 4 months.',
    medical_conditions: 'None.',
    emergency_contact_name: 'Dulani Gunaratne',
    emergency_contact_phone: '+94 77 666 7777',
    status: 'pending_approval',
    captcha_verified: true,
    ip_address: '192.168.1.42',
    organization_id: ORG_ID,
    created_at: daysAgo(2).toISOString(),
  },
  {
    full_name: 'Lakshan Mendis',
    email: 'lakshan.m@outlook.com',
    phone: '+94 76 333 2222',
    gender: 'male',
    date_of_birth: '1994-02-28',
    fitness_goals: 'Build muscle. Currently underweight at 58kg.',
    medical_conditions: 'Mild scoliosis — doctor approved for gym training.',
    emergency_contact_name: 'Chandrika Mendis',
    emergency_contact_phone: '+94 76 111 0000',
    status: 'pending_approval',
    captcha_verified: true,
    ip_address: '192.168.1.55',
    organization_id: ORG_ID,
    created_at: daysAgo(1).toISOString(),
  },
  {
    full_name: 'Nethmi Abeywickrama',
    email: 'nethmi.a@yahoo.com',
    phone: '+94 71 222 1111',
    gender: 'female',
    date_of_birth: '2001-10-09',
    fitness_goals: 'Start a healthy lifestyle. Completely new to gym.',
    medical_conditions: 'None.',
    emergency_contact_name: 'Roshan Abeywickrama',
    emergency_contact_phone: '+94 71 333 4444',
    status: 'pending_approval',
    captcha_verified: true,
    ip_address: '192.168.1.78',
    organization_id: ORG_ID,
    created_at: daysAgo(0).toISOString(),
  },
];

// ═══════════════════════════════════════════════════════════════════════
// SEED FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

async function clearCollection(collectionName) {
  const snap = await db.collection(collectionName).get();
  if (snap.empty) return 0;

  const batchSize = 400;
  let deleted = 0;
  const docs = snap.docs;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    docs.slice(i, i + batchSize).forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += Math.min(batchSize, docs.length - i);
  }
  return deleted;
}

async function seedCollection(collectionName, dataArray) {
  const refs = [];
  const batchSize = 400;

  for (let i = 0; i < dataArray.length; i += batchSize) {
    const batch = db.batch();
    const chunk = dataArray.slice(i, i + batchSize);
    chunk.forEach((item) => {
      const ref = db.collection(collectionName).doc();
      batch.set(ref, item);
      refs.push(ref);
    });
    await batch.commit();
  }
  return refs;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN SEEDER
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n🏋️  Ascend Management Dashboard — Firestore Data Seeder');
  console.log('═══════════════════════════════════════════════════════\n');

  // ─── Clean Mode ──────────────────────────────────────────────────
  if (cleanMode) {
    console.log('🧹 Clean mode enabled. Clearing all collections...\n');
    for (const [key, name] of Object.entries(COLLECTIONS)) {
      const count = await clearCollection(name);
      console.log(`   ✓ Cleared ${name}: ${count} documents deleted`);
    }
    console.log('');
  }

  // ─── 1. Seed Plans ──────────────────────────────────────────────
  console.log('📋 Seeding plans...');
  const planRefs = await seedCollection(COLLECTIONS.PLANS, PLANS_DATA);
  const planIds = planRefs.map((r) => r.id);
  console.log(`   ✅ Created ${planRefs.length} plans`);

  // ─── 2. Seed Trainers ──────────────────────────────────────────
  console.log('🏃 Seeding trainers...');
  const trainerRefs = await seedCollection(COLLECTIONS.TRAINERS, TRAINERS_DATA);
  const trainerIds = trainerRefs.map((r) => r.id);
  console.log(`   ✅ Created ${trainerRefs.length} trainers`);

  // ─── 3. Seed Admins ─────────────────────────────────────────────
  console.log('🔑 Seeding admins...');
  const adminRefs = await seedCollection(COLLECTIONS.ADMINS, ADMINS_DATA);
  console.log(`   ✅ Created ${adminRefs.length} admins`);

  // ─── 4. Create Firebase Auth users for admins ──────────────────
  console.log('🔐 Creating Firebase Auth users for admins...');
  for (const admin of ADMINS_DATA) {
    try {
      // Check if user already exists
      try {
        const existing = await auth.getUserByEmail(admin.email);
        console.log(`   ⚡ Auth user already exists: ${admin.email} (uid: ${existing.uid})`);
        // Update the admin doc with the uid
        const adminSnap = await db.collection(COLLECTIONS.ADMINS)
          .where('email', '==', admin.email).limit(1).get();
        if (!adminSnap.empty) {
          await adminSnap.docs[0].ref.update({ uid: existing.uid });
        }
        continue;
      } catch (e) {
        // User doesn't exist — create it
      }

      const userRecord = await auth.createUser({
        email: admin.email,
        password: admin.role === 'super_admin' ? 'SuperAdmin@123' : 'Admin@123',
        displayName: admin.name,
      });
      console.log(`   ✅ Created auth user: ${admin.email} (uid: ${userRecord.uid})`);

      // Update admin doc with uid
      const adminSnap = await db.collection(COLLECTIONS.ADMINS)
        .where('email', '==', admin.email).limit(1).get();
      if (!adminSnap.empty) {
        await adminSnap.docs[0].ref.update({ uid: userRecord.uid });
      }
    } catch (err) {
      console.log(`   ⚠️  Auth user creation failed for ${admin.email}: ${err.message}`);
    }
  }

  // ─── 5. Seed Members ───────────────────────────────────────────
  console.log('👥 Seeding members...');
  const membersData = MEMBERS_TEMPLATE.map((tmpl, idx) => {
    const memberCode = `ASC-${(10001 + idx).toString()}`;
    const joinedAt = daysAgo(tmpl._joinedDaysAgo).toISOString().split('T')[0];
    const countdownEnd = daysFromNow(tmpl._daysRemaining).toISOString();

    const member = {
      organization_id: ORG_ID,
      full_name: tmpl.full_name,
      email: tmpl.email,
      phone: tmpl.phone,
      gender: tmpl.gender,
      date_of_birth: tmpl.date_of_birth,
      status: tmpl.status,
      member_code: memberCode,
      qr_token: `qr_token_${memberCode}_${Date.now() + idx}`,
      joined_at: joinedAt,
      countdown_end: countdownEnd,
      weight_kg: tmpl.weight_kg,
      height_cm: tmpl.height_cm,
      body_fat_pct: tmpl.body_fat_pct,
      fitness_goals: tmpl.fitness_goals,
      medical_notes: tmpl.medical_notes,
      emergency_contact_name: tmpl.emergency_contact_name,
      emergency_contact_phone: tmpl.emergency_contact_phone,
      auto_renew: tmpl.auto_renew,
      plan_id: planIds[tmpl._planIndex],
      trainer_id: tmpl._trainerIndex !== null ? trainerIds[tmpl._trainerIndex] : null,
      photo_url: AVATARS[tmpl._avatarGender][tmpl._avatarIndex],
      created_at: daysAgo(tmpl._joinedDaysAgo).toISOString(),
    };

    // Add freeze fields if frozen
    if (tmpl.frozen_from) member.frozen_from = tmpl.frozen_from;
    if (tmpl.frozen_until) member.frozen_until = tmpl.frozen_until;
    if (tmpl.freeze_reason) member.freeze_reason = tmpl.freeze_reason;

    return member;
  });

  const memberRefs = await seedCollection(COLLECTIONS.MEMBERS, membersData);
  const memberIds = memberRefs.map((r) => r.id);
  console.log(`   ✅ Created ${memberRefs.length} members`);

  // ─── 6. Seed Invoices ──────────────────────────────────────────
  console.log('💳 Seeding invoices...');
  const invoicesData = [];

  membersData.forEach((member, idx) => {
    const plan = PLANS_DATA[MEMBERS_TEMPLATE[idx]._planIndex];
    const tax = plan.price * (plan.tax_rate / 100);
    const total = plan.price + tax;

    // Initial enrollment invoice
    invoicesData.push({
      organization_id: ORG_ID,
      member_id: memberIds[idx],
      member_name: member.full_name,
      invoice_number: `INV-2026-${(1001 + idx * 2).toString()}`,
      subtotal: plan.price,
      tax_amount: tax,
      discount_amount: 0,
      total_amount: total,
      status: member.status === 'active' ? 'paid' : (member.status === 'expired' ? 'overdue' : 'paid'),
      due_date: daysAgo(MEMBERS_TEMPLATE[idx]._joinedDaysAgo - 7).toISOString().split('T')[0],
      issued_at: daysAgo(MEMBERS_TEMPLATE[idx]._joinedDaysAgo).toISOString(),
      paid_at: member.status !== 'expired'
        ? daysAgo(MEMBERS_TEMPLATE[idx]._joinedDaysAgo - 1).toISOString()
        : null,
      payment_method: member.status !== 'expired' ? pick(['card', 'cash', 'upi', 'bank_transfer']) : null,
      plan_id: planIds[MEMBERS_TEMPLATE[idx]._planIndex],
      created_at: daysAgo(MEMBERS_TEMPLATE[idx]._joinedDaysAgo).toISOString(),
    });

    // Some members have a second (renewal) invoice
    if (MEMBERS_TEMPLATE[idx]._joinedDaysAgo > 60) {
      invoicesData.push({
        organization_id: ORG_ID,
        member_id: memberIds[idx],
        member_name: member.full_name,
        invoice_number: `INV-2026-${(1002 + idx * 2).toString()}`,
        subtotal: plan.price,
        tax_amount: tax,
        discount_amount: 0,
        total_amount: total,
        status: 'paid',
        due_date: daysAgo(MEMBERS_TEMPLATE[idx]._joinedDaysAgo - 37).toISOString().split('T')[0],
        issued_at: daysAgo(MEMBERS_TEMPLATE[idx]._joinedDaysAgo - 30).toISOString(),
        paid_at: daysAgo(MEMBERS_TEMPLATE[idx]._joinedDaysAgo - 31).toISOString(),
        payment_method: pick(['card', 'cash', 'upi']),
        plan_id: planIds[MEMBERS_TEMPLATE[idx]._planIndex],
        created_at: daysAgo(MEMBERS_TEMPLATE[idx]._joinedDaysAgo - 30).toISOString(),
      });
    }
  });

  // Add a couple of open invoices
  invoicesData.push({
    organization_id: ORG_ID,
    member_id: memberIds[5], // Ishara - expired member
    member_name: membersData[5].full_name,
    invoice_number: 'INV-2026-2001',
    subtotal: PLANS_DATA[0].price,
    tax_amount: PLANS_DATA[0].price * 0.05,
    discount_amount: 0,
    total_amount: PLANS_DATA[0].price * 1.05,
    status: 'overdue',
    due_date: daysAgo(10).toISOString().split('T')[0],
    issued_at: daysAgo(17).toISOString(),
    paid_at: null,
    payment_method: null,
    plan_id: planIds[0],
    created_at: daysAgo(17).toISOString(),
  });

  const invoiceRefs = await seedCollection(COLLECTIONS.INVOICES, invoicesData);
  console.log(`   ✅ Created ${invoiceRefs.length} invoices`);

  // ─── 7. Seed Registrations ─────────────────────────────────────
  console.log('📝 Seeding registration requests...');
  // Add plan_id references to registrations
  const regsWithPlan = REGISTRATIONS_DATA.map((r, i) => ({
    ...r,
    plan_id: planIds[i % planIds.length],
  }));
  const regRefs = await seedCollection(COLLECTIONS.REGISTRATIONS, regsWithPlan);
  console.log(`   ✅ Created ${regRefs.length} registration requests`);

  // ─── 8. Seed Access Events ─────────────────────────────────────
  console.log('🚪 Seeding access events...');
  const accessEventsData = [];
  const activeMembers = membersData.filter((m) => m.status === 'active');
  const activeMemberIndices = membersData
    .map((m, i) => (m.status === 'active' ? i : -1))
    .filter((i) => i !== -1);

  // Generate 18 events over the past 7 days
  for (let d = 0; d < 7; d++) {
    // 2-3 check-ins per day
    const checksPerDay = randInt(2, 3);
    for (let c = 0; c < checksPerDay; c++) {
      const memberIdx = pick(activeMemberIndices);
      const hour = randInt(6, 21);
      const minute = randInt(0, 59);
      const eventDate = new Date(daysAgo(d));
      eventDate.setHours(hour, minute, 0, 0);

      const evt = {
        organization_id: ORG_ID,
        member_id: memberIds[memberIdx],
        member_name: membersData[memberIdx].full_name,
        member_code: membersData[memberIdx].member_code,
        source: pick(['qr', 'qr', 'qr', 'manual']), // Weighted toward QR
        result: 'granted',
        occurred_at: eventDate.toISOString(),
      };

      // Some events have checkout
      if (Math.random() > 0.3) {
        const checkoutDate = new Date(eventDate);
        checkoutDate.setHours(checkoutDate.getHours() + randInt(1, 3));
        evt.check_out_at = checkoutDate.toISOString();
      }

      accessEventsData.push(evt);
    }
  }

  // Add 2 denied events
  accessEventsData.push({
    organization_id: ORG_ID,
    member_id: memberIds[5], // Ishara - expired
    member_name: membersData[5].full_name,
    member_code: membersData[5].member_code,
    source: 'qr',
    result: 'denied',
    deny_reason: 'expired',
    occurred_at: daysAgo(1).toISOString(),
  });

  accessEventsData.push({
    organization_id: ORG_ID,
    member_id: memberIds[4], // Nuwan - frozen
    member_name: membersData[4].full_name,
    member_code: membersData[4].member_code,
    source: 'manual',
    result: 'denied',
    deny_reason: 'frozen',
    occurred_at: daysAgo(3).toISOString(),
  });

  const accessRefs = await seedCollection(COLLECTIONS.ACCESS_EVENTS, accessEventsData);
  console.log(`   ✅ Created ${accessRefs.length} access events`);

  // ─── 9. Seed Audit Logs ────────────────────────────────────────
  console.log('📜 Seeding audit logs...');
  const auditData = [
    {
      organization_id: ORG_ID,
      user_name: 'Sarah Jenkins',
      action: 'system.login',
      entity_type: 'auth',
      entity_id: 'system',
      details: 'Super Admin logged in successfully.',
      occurred_at: daysAgo(0).toISOString(),
    },
    {
      organization_id: ORG_ID,
      user_name: 'Sarah Jenkins',
      action: 'member.create',
      entity_type: 'member',
      entity_id: memberIds[0],
      details: `Created profile for ${membersData[0].full_name} (${membersData[0].member_code})`,
      occurred_at: daysAgo(45).toISOString(),
    },
    {
      organization_id: ORG_ID,
      user_name: 'James Mercer',
      action: 'member.freeze',
      entity_type: 'member',
      entity_id: memberIds[4],
      details: `Froze membership for ${membersData[4].full_name}. Reason: ${membersData[4].freeze_reason}`,
      occurred_at: daysAgo(10).toISOString(),
    },
    {
      organization_id: ORG_ID,
      user_name: 'Sarah Jenkins',
      action: 'payment.receive',
      entity_type: 'invoice',
      entity_id: invoiceRefs[0].id,
      details: 'Recorded payment of LKR 8,925.00 via CARD',
      occurred_at: daysAgo(44).toISOString(),
    },
    {
      organization_id: ORG_ID,
      user_name: 'System',
      action: 'member.expire',
      entity_type: 'member',
      entity_id: memberIds[5],
      details: `Membership for ${membersData[5].full_name} automatically expired (Countdown over)`,
      occurred_at: daysAgo(5).toISOString(),
    },
    {
      organization_id: ORG_ID,
      user_name: 'James Mercer',
      action: 'access.denied',
      entity_type: 'access_event',
      entity_id: accessRefs[accessRefs.length - 2].id,
      details: `Access denied for ${membersData[5].full_name}. Reason: Membership has expired.`,
      occurred_at: daysAgo(1).toISOString(),
    },
  ];

  const auditRefs = await seedCollection(COLLECTIONS.AUDIT_LOGS, auditData);
  console.log(`   ✅ Created ${auditRefs.length} audit log entries`);

  // ─── Summary ───────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎉 Seeding complete! Summary:');
  console.log(`   📋 Plans:          ${planRefs.length}`);
  console.log(`   🏃 Trainers:       ${trainerRefs.length}`);
  console.log(`   🔑 Admins:         ${adminRefs.length}`);
  console.log(`   👥 Members:        ${memberRefs.length}`);
  console.log(`   💳 Invoices:       ${invoiceRefs.length}`);
  console.log(`   📝 Registrations:  ${regRefs.length}`);
  console.log(`   🚪 Access Events:  ${accessRefs.length}`);
  console.log(`   📜 Audit Logs:     ${auditRefs.length}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n🔑 Admin Credentials:');
  console.log('   Super Admin: superadmin@ascend.com / SuperAdmin@123');
  console.log('   Admin:       admin@ascend.com / Admin@123');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Seeding failed:', err);
    process.exit(1);
  });
