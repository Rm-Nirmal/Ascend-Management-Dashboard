import React, { createContext, useContext, useState, useEffect } from 'react';

const DashboardContext = createContext();

// Utility for generating UUIDs in mock data
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const INITIAL_PLANS = [
  { id: 'p1', name: 'Basic Starter', price: 4500.00, billing_period: 'monthly', duration_days: 30, tax_rate: 8.5, allows_multi_branch: false, is_active: true },
  { id: 'p2', name: 'Ascend Elite', price: 8500.00, billing_period: 'monthly', duration_days: 30, tax_rate: 8.5, allows_multi_branch: true, is_active: true },
  { id: 'p3', name: 'VIP Platinum', price: 15000.00, billing_period: 'monthly', duration_days: 30, tax_rate: 8.5, allows_multi_branch: true, is_active: true }
];

const INITIAL_TRAINERS = [
  { id: 't1', name: 'Alex Mercer', specialization: 'Strength & Conditioning', rating: 4.9, bio: 'Former competitive powerlifter with 8+ years coaching experience.' },
  { id: 't2', name: 'Coach Brenda', specialization: 'HIIT & Weight Loss', rating: 4.8, bio: 'Specialist in metabolic conditioning and nutrition planning.' },
  { id: 't3', name: 'Dmitri Vance', specialization: 'Mobility & Rehab', rating: 5.0, bio: 'Physical therapist and kinesiologist helping athletes recover.' }
];

// Helper to get dates relative to today's date
const getRelativeDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

const INITIAL_MEMBERS = [
  {
    id: 'm1',
    member_code: 'ASC-10492',
    full_name: 'Johnathan Doe',
    email: 'john.doe@gmail.com',
    phone: '+1 555-019-2834',
    gender: 'male',
    date_of_birth: '1990-05-14',
    joined_at: getRelativeDate(120),
    status: 'active',
    plan_id: 'p2',
    auto_renew: true,
    emergency_contact_name: 'Jane Doe',
    emergency_contact_phone: '+1 555-019-2835',
    medical_notes: 'Mild asthma, carries inhaler. Knee surgery in 2023.',
    fitness_goals: 'Build lean muscle mass and improve core endurance.',
    rfid_card_id: 'RFID-990812',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 84.5,
    height_cm: 182,
    body_fat_pct: 16.4,
    trainer_id: 't1',
    qr_token: 'qr_token_johnathan_doe_active_2026'
  },
  {
    id: 'm2',
    member_code: 'ASC-10821',
    full_name: 'Sophia Patel',
    email: 'sophia.patel@outlook.com',
    phone: '+1 555-021-9988',
    gender: 'female',
    date_of_birth: '1994-11-22',
    joined_at: getRelativeDate(80),
    status: 'active',
    plan_id: 'p3',
    auto_renew: true,
    emergency_contact_name: 'Raj Patel',
    emergency_contact_phone: '+1 555-021-9989',
    medical_notes: 'None.',
    fitness_goals: 'Cardio training for half-marathon, functional mobility.',
    rfid_card_id: 'RFID-100293',
    photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 62.1,
    height_cm: 168,
    body_fat_pct: 21.0,
    trainer_id: 't2',
    qr_token: 'qr_token_sophia_patel_active'
  },
  {
    id: 'm3',
    member_code: 'ASC-10943',
    full_name: 'Marcus Brody',
    email: 'brody_m@yahoo.com',
    phone: '+1 555-088-1294',
    gender: 'male',
    date_of_birth: '1985-02-09',
    joined_at: getRelativeDate(180),
    status: 'frozen',
    auto_renew: false,
    frozen_from: getRelativeDate(11),
    frozen_until: getRelativeDate(-20),
    freeze_reason: 'Recovering from minor shoulder strain (doctor recommended rest).',
    emergency_contact_name: 'Lisa Brody',
    emergency_contact_phone: '+1 555-088-1295',
    medical_notes: 'Rotator cuff irritation.',
    fitness_goals: 'Rehabilitate shoulder strength, maintain lower body fitness.',
    rfid_card_id: 'RFID-881944',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 91.2,
    height_cm: 188,
    body_fat_pct: 19.8,
    trainer_id: 't3',
    qr_token: 'qr_token_marcus_brody_frozen'
  },
  {
    id: 'm4',
    member_code: 'ASC-11002',
    full_name: 'Emma Watson',
    email: 'emma.watson@gmail.com',
    phone: '+1 555-123-4567',
    gender: 'female',
    date_of_birth: '1992-04-15',
    joined_at: getRelativeDate(300),
    status: 'expired',
    plan_id: 'p1',
    auto_renew: false,
    emergency_contact_name: 'Chris Watson',
    emergency_contact_phone: '+1 555-123-4568',
    medical_notes: 'None.',
    fitness_goals: 'General health, flexibility and toning.',
    rfid_card_id: 'RFID-110022',
    photo_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 58.3,
    height_cm: 165,
    body_fat_pct: 23.5,
    trainer_id: null,
    qr_token: 'qr_token_emma_watson_expired'
  },
  {
    id: 'm5',
    member_code: 'ASC-11109',
    full_name: 'David Beck',
    email: 'dbeck.sport@gmail.com',
    phone: '+1 555-098-7654',
    gender: 'male',
    date_of_birth: '1988-08-30',
    joined_at: getRelativeDate(90),
    status: 'active',
    plan_id: 'p1',
    auto_renew: true,
    emergency_contact_name: 'Victoria Beck',
    emergency_contact_phone: '+1 555-098-7655',
    medical_notes: 'Lower back stiffness, avoids heavy deadlifts.',
    fitness_goals: 'Fat loss, core stability and cardiovascular capacity.',
    rfid_card_id: 'RFID-209384',
    photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 79.8,
    height_cm: 175,
    body_fat_pct: 18.2,
    trainer_id: 't1',
    qr_token: 'qr_token_david_beck'
  },
  {
    id: 'm6',
    member_code: 'ASC-11221',
    full_name: 'Li Na',
    email: 'lina_ny@icloud.com',
    phone: '+1 555-224-8899',
    gender: 'female',
    date_of_birth: '1996-03-08',
    joined_at: getRelativeDate(45),
    status: 'active',
    plan_id: 'p2',
    auto_renew: true,
    emergency_contact_name: 'Na Wang',
    emergency_contact_phone: '+1 555-224-8890',
    medical_notes: 'None.',
    fitness_goals: 'Yoga coordination, strength building, core training.',
    rfid_card_id: 'RFID-112211',
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 54.0,
    height_cm: 162,
    body_fat_pct: 19.5,
    trainer_id: null,
    qr_token: 'qr_token_lina'
  },
  {
    id: 'm7',
    member_code: 'ASC-11304',
    full_name: 'Carlos Mendez',
    email: 'carlos.mendez@outlook.com',
    phone: '+1 555-771-0099',
    gender: 'male',
    date_of_birth: '1991-09-19',
    joined_at: getRelativeDate(20),
    status: 'active',
    plan_id: 'p3',
    auto_renew: true,
    emergency_contact_name: 'Maria Mendez',
    emergency_contact_phone: '+1 555-771-0090',
    medical_notes: 'Slightly high blood pressure, monitored during workouts.',
    fitness_goals: 'Functional strength, aerobic endurance, wellness.',
    rfid_card_id: 'RFID-113044',
    photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 88.4,
    height_cm: 180,
    body_fat_pct: 22.1,
    trainer_id: 't2',
    qr_token: 'qr_token_carlos'
  },
  // Adding 8 more members to exceed 10 members and showcase pagination
  {
    id: 'm8',
    member_code: 'ASC-11402',
    full_name: 'Olivia Martinez',
    email: 'olivia.m@gmail.com',
    phone: '+1 555-402-9911',
    gender: 'female',
    date_of_birth: '1995-07-12',
    joined_at: getRelativeDate(10),
    status: 'active',
    plan_id: 'p1',
    auto_renew: true,
    emergency_contact_name: 'Jose Martinez',
    emergency_contact_phone: '+1 555-402-9900',
    medical_notes: 'None.',
    fitness_goals: 'Core training, flexibility, active mobility.',
    rfid_card_id: 'RFID-114022',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 59.5,
    height_cm: 167,
    body_fat_pct: 20.2,
    trainer_id: 't2',
    qr_token: 'qr_token_olivia'
  },
  {
    id: 'm9',
    member_code: 'ASC-11590',
    full_name: 'William Taylor',
    email: 'william.t@hotmail.com',
    phone: '+1 555-709-3322',
    gender: 'male',
    date_of_birth: '1987-12-05',
    joined_at: getRelativeDate(15),
    status: 'active',
    plan_id: 'p2',
    auto_renew: true,
    emergency_contact_name: 'Laura Taylor',
    emergency_contact_phone: '+1 555-709-3311',
    medical_notes: 'Tennis elbow in right arm.',
    fitness_goals: 'Cardiovascular enhancement, stamina building.',
    rfid_card_id: 'RFID-115900',
    photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 81.2,
    height_cm: 179,
    body_fat_pct: 17.5,
    trainer_id: 't1',
    qr_token: 'qr_token_william'
  },
  {
    id: 'm10',
    member_code: 'ASC-11654',
    full_name: 'Sophia Loren',
    email: 'sophia.loren@gmail.com',
    phone: '+1 555-667-2288',
    gender: 'female',
    date_of_birth: '1993-01-25',
    joined_at: getRelativeDate(100),
    status: 'active',
    plan_id: 'p2',
    auto_renew: true,
    emergency_contact_name: 'Carlo Loren',
    emergency_contact_phone: '+1 555-667-2299',
    medical_notes: 'None.',
    fitness_goals: 'Endurance, muscle definition.',
    rfid_card_id: 'RFID-116544',
    photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 61.8,
    height_cm: 170,
    body_fat_pct: 21.3,
    trainer_id: 't3',
    qr_token: 'qr_token_loren'
  },
  {
    id: 'm11',
    member_code: 'ASC-11721',
    full_name: 'James Anderson',
    email: 'j.anderson@yahoo.com',
    phone: '+1 555-901-4477',
    gender: 'male',
    date_of_birth: '1989-10-14',
    joined_at: getRelativeDate(5),
    status: 'active',
    plan_id: 'p3',
    auto_renew: true,
    emergency_contact_name: 'Susan Anderson',
    emergency_contact_phone: '+1 555-901-4488',
    medical_notes: 'Mild hypertension.',
    fitness_goals: 'Functional strength, full body mobility.',
    rfid_card_id: 'RFID-117211',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 89.0,
    height_cm: 183,
    body_fat_pct: 23.0,
    trainer_id: 't3',
    qr_token: 'qr_token_james'
  },
  {
    id: 'm12',
    member_code: 'ASC-11843',
    full_name: 'Zoe Kravitz',
    email: 'zoe.k@gmail.com',
    phone: '+1 555-403-1289',
    gender: 'female',
    date_of_birth: '1997-06-30',
    joined_at: getRelativeDate(12),
    status: 'active',
    plan_id: 'p1',
    auto_renew: false,
    emergency_contact_name: 'Lenny Kravitz',
    emergency_contact_phone: '+1 555-403-1290',
    medical_notes: 'None.',
    fitness_goals: 'Cardio endurance, high flexibility.',
    rfid_card_id: 'RFID-118433',
    photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 52.3,
    height_cm: 159,
    body_fat_pct: 18.7,
    trainer_id: null,
    qr_token: 'qr_token_zoe'
  },
  {
    id: 'm13',
    member_code: 'ASC-11999',
    full_name: 'Michael Jordan',
    email: 'mj.goat@gmail.com',
    phone: '+1 555-023-4523',
    gender: 'male',
    date_of_birth: '1963-02-17',
    joined_at: getRelativeDate(365),
    status: 'active',
    plan_id: 'p3',
    auto_renew: true,
    emergency_contact_name: 'Yvette Prieto',
    emergency_contact_phone: '+1 555-023-4524',
    medical_notes: 'Minor historical meniscus surgery.',
    fitness_goals: 'Athletic maintenance, core stability, cardio.',
    rfid_card_id: 'RFID-232323',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 98.0,
    height_cm: 198,
    body_fat_pct: 14.2,
    trainer_id: 't1',
    qr_token: 'qr_token_mj'
  },
  {
    id: 'm14',
    member_code: 'ASC-12001',
    full_name: 'Natalie Portman',
    email: 'natalie@portman.com',
    phone: '+1 555-890-4321',
    gender: 'female',
    date_of_birth: '1981-06-09',
    joined_at: getRelativeDate(250),
    status: 'frozen',
    frozen_from: getRelativeDate(5),
    frozen_until: getRelativeDate(-25),
    freeze_reason: 'Film shoot out of state.',
    emergency_contact_name: 'Benjamin Millepied',
    emergency_contact_phone: '+1 555-890-4322',
    medical_notes: 'None.',
    fitness_goals: 'Core strength, lean muscle development.',
    rfid_card_id: 'RFID-981290',
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 53.5,
    height_cm: 160,
    body_fat_pct: 17.8,
    trainer_id: 't2',
    qr_token: 'qr_token_natalie'
  },
  {
    id: 'm15',
    member_code: 'ASC-12099',
    full_name: 'Robert Downey',
    email: 'rdj@ironman.com',
    phone: '+1 555-300-3000',
    gender: 'male',
    date_of_birth: '1965-04-04',
    joined_at: getRelativeDate(110),
    status: 'active',
    plan_id: 'p2',
    auto_renew: true,
    emergency_contact_name: 'Susan Downey',
    emergency_contact_phone: '+1 555-300-3001',
    medical_notes: 'None.',
    fitness_goals: 'Functional performance, martial arts conditioning.',
    rfid_card_id: 'RFID-300000',
    photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    weight_kg: 78.5,
    height_cm: 174,
    body_fat_pct: 16.0,
    trainer_id: 't1',
    qr_token: 'qr_token_rdj'
  }
];

const INITIAL_REGISTRATIONS = [
  {
    id: 'r1',
    full_name: 'Amara Walker',
    email: 'amara.walker@gmail.com',
    phone: '+1 555-492-1029',
    gender: 'female',
    date_of_birth: '1998-10-10',
    plan_id: 'p2',
    status: 'pending_approval',
    medical_conditions: 'None.',
    fitness_goals: 'General muscle building, weight loss.',
    emergency_contact_name: 'Marcus Walker',
    emergency_contact_phone: '+1 555-492-1020',
    captcha_verified: true,
    ip_address: '192.168.1.45',
    created_at: '2026-05-20T14:30:00Z'
  },
  {
    id: 'r2',
    full_name: 'Tyler Durden',
    email: 'fightclub@soap.com',
    phone: '+1 555-666-0000',
    gender: 'male',
    date_of_birth: '1984-06-06',
    plan_id: 'p1',
    status: 'pending_approval',
    medical_conditions: 'Bruises, insomnia.',
    fitness_goals: 'Combat conditioning.',
    emergency_contact_name: 'Marla Singer',
    emergency_contact_phone: '+1 555-666-1111',
    captcha_verified: true,
    ip_address: '10.0.0.8',
    created_at: '2026-05-21T08:15:00Z'
  }
];

const INITIAL_ACCESS_EVENTS = [
  { id: 'ae1', member_id: 'm1', member_name: 'Johnathan Doe', member_code: 'ASC-10492', source: 'qr', result: 'granted', occurred_at: new Date().toISOString() },
  { id: 'ae2', member_id: 'm2', member_name: 'Sophia Patel', member_code: 'ASC-10821', source: 'fingerprint', result: 'granted', occurred_at: getRelativeDate(1) + 'T08:15:34Z' },
  { id: 'ae3', member_id: 'm3', member_name: 'Marcus Brody', member_code: 'ASC-10943', source: 'qr', result: 'denied', deny_reason: 'frozen', occurred_at: getRelativeDate(1) + 'T08:45:00Z' },
  { id: 'ae4', member_id: 'm4', member_name: 'Emma Watson', member_code: 'ASC-11002', source: 'qr', result: 'denied', deny_reason: 'expired', occurred_at: getRelativeDate(2) + 'T09:12:44Z' },
  { id: 'ae5', member_id: 'm5', member_name: 'David Beck', member_code: 'ASC-11109', source: 'manual', result: 'granted', occurred_at: getRelativeDate(2) + 'T09:30:12Z' },
  { id: 'ae6', member_id: 'm6', member_name: 'Li Na', member_code: 'ASC-11221', source: 'qr', result: 'granted', occurred_at: getRelativeDate(3) + 'T10:15:22Z' },
  { id: 'ae7', member_id: 'm1', member_name: 'Johnathan Doe', member_code: 'ASC-10492', source: 'qr', result: 'granted', occurred_at: getRelativeDate(4) + 'T11:05:00Z' }
];

// Helper to formulate dates for payments simulation
const today = new Date();
const formatWithHour = (daysAgo, hour) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const INITIAL_INVOICES = [
  // Payments received TODAY (for Daily tests)
  { id: 'inv1', organization_id: 'org1', member_id: 'm1', member_name: 'Johnathan Doe', invoice_number: 'INV-2026-001', subtotal: 8500.00, tax_amount: 722.50, discount_amount: 0.00, total_amount: 9222.50, status: 'paid', due_date: getRelativeDate(0), issued_at: formatWithHour(0, 8), paid_at: formatWithHour(0, 9), payment_method: 'card', plan_id: 'p2' },
  { id: 'inv2', organization_id: 'org1', member_id: 'm2', member_name: 'Sophia Patel', invoice_number: 'INV-2026-002', subtotal: 15000.00, tax_amount: 1275.00, discount_amount: 1500.00, total_amount: 14775.00, status: 'paid', due_date: getRelativeDate(0), issued_at: formatWithHour(0, 7), paid_at: formatWithHour(0, 10), payment_method: 'upi', plan_id: 'p3' },
  
  // Payments received THIS MONTH (excluding today)
  { id: 'inv5', organization_id: 'org1', member_id: 'm5', member_name: 'David Beck', invoice_number: 'INV-2026-005', subtotal: 4500.00, tax_amount: 382.50, discount_amount: 0.00, total_amount: 4882.50, status: 'paid', due_date: getRelativeDate(4), issued_at: formatWithHour(6, 8), paid_at: formatWithHour(4, 18), payment_method: 'cash', plan_id: 'p1' },
  { id: 'inv6', organization_id: 'org1', member_id: 'm6', member_name: 'Li Na', invoice_number: 'INV-2026-006', subtotal: 8500.00, tax_amount: 722.50, discount_amount: 1000.00, total_amount: 8222.50, status: 'paid', due_date: getRelativeDate(10), issued_at: formatWithHour(12, 8), paid_at: formatWithHour(10, 12), payment_method: 'bank_transfer', plan_id: 'p2' },
  { id: 'inv8', organization_id: 'org1', member_id: 'm8', member_name: 'Olivia Martinez', invoice_number: 'INV-2026-008', subtotal: 4500.00, tax_amount: 382.50, discount_amount: 0.00, total_amount: 4882.50, status: 'paid', due_date: getRelativeDate(8), issued_at: formatWithHour(10, 9), paid_at: formatWithHour(8, 14), payment_method: 'card', plan_id: 'p1' },
  { id: 'inv9', organization_id: 'org1', member_id: 'm9', member_name: 'William Taylor', invoice_number: 'INV-2026-009', subtotal: 8500.00, tax_amount: 722.50, discount_amount: 0.00, total_amount: 9222.50, status: 'paid', due_date: getRelativeDate(14), issued_at: formatWithHour(16, 9), paid_at: formatWithHour(14, 15), payment_method: 'card', plan_id: 'p2' },

  // Payments received EARLIER THIS YEAR (for Yearly tests)
  { id: 'inv10', organization_id: 'org1', member_id: 'm10', member_name: 'Sophia Loren', invoice_number: 'INV-2026-010', subtotal: 8500.00, tax_amount: 722.50, discount_amount: 0.00, total_amount: 9222.50, status: 'paid', due_date: getRelativeDate(45), issued_at: formatWithHour(47, 9), paid_at: formatWithHour(45, 11), payment_method: 'upi', plan_id: 'p2' },
  { id: 'inv11', organization_id: 'org1', member_id: 'm11', member_name: 'James Anderson', invoice_number: 'INV-2026-011', subtotal: 15000.00, tax_amount: 1275.00, discount_amount: 0.00, total_amount: 16275.00, status: 'paid', due_date: getRelativeDate(60), issued_at: formatWithHour(62, 9), paid_at: formatWithHour(60, 16), payment_method: 'bank_transfer', plan_id: 'p3' },
  { id: 'inv12', organization_id: 'org1', member_id: 'm13', member_name: 'Michael Jordan', invoice_number: 'INV-2026-012', subtotal: 15000.00, tax_amount: 1275.00, discount_amount: 0.00, total_amount: 16275.00, status: 'paid', due_date: getRelativeDate(90), issued_at: formatWithHour(95, 9), paid_at: formatWithHour(90, 10), payment_method: 'card', plan_id: 'p3' },

  // Open & Overdue invoices
  { id: 'inv3', organization_id: 'org1', member_id: 'm3', member_name: 'Marcus Brody', invoice_number: 'INV-2026-003', subtotal: 8500.00, tax_amount: 722.50, discount_amount: 0.00, total_amount: 9222.50, status: 'void', due_date: getRelativeDate(10), issued_at: formatWithHour(15, 8), paid_at: null, plan_id: 'p2' },
  { id: 'inv4', organization_id: 'org1', member_id: 'm4', member_name: 'Emma Watson', invoice_number: 'INV-2026-004', subtotal: 4500.00, tax_amount: 382.50, discount_amount: 0.00, total_amount: 4882.50, status: 'overdue', due_date: getRelativeDate(12), issued_at: formatWithHour(18, 8), paid_at: null, plan_id: 'p1' },
  { id: 'inv7', organization_id: 'org1', member_id: 'm7', member_name: 'Carlos Mendez', invoice_number: 'INV-2026-007', subtotal: 15000.00, tax_amount: 1275.00, discount_amount: 0.00, total_amount: 16275.00, status: 'open', due_date: getRelativeDate(-10), issued_at: formatWithHour(2, 8), paid_at: null, plan_id: 'p3' }
];

const INITIAL_AUDIT_LOGS = [
  { id: 'al1', user_name: 'Admin Sarah', action: 'system.login', entity_type: 'auth', entity_id: 'u1', details: 'User successfully logged in from IP 192.168.1.100', occurred_at: new Date().toISOString() },
  { id: 'al2', user_name: 'Admin Sarah', action: 'member.update', entity_type: 'member', entity_id: 'm3', details: 'Changed status to frozen (requested freeze due to shoulder rest)', occurred_at: getRelativeDate(1) + 'T08:32:00Z' },
  { id: 'al3', user_name: 'System Cron', action: 'invoice.generate', entity_type: 'invoice', entity_id: 'inv7', details: 'Generated recurring monthly billing for Carlos Mendez', occurred_at: getRelativeDate(3) + 'T08:00:00Z' },
  { id: 'al4', user_name: 'Admin Sarah', action: 'member.create', entity_type: 'member', entity_id: 'm8', details: 'Activated member Olivia Martinez on Basic plan', occurred_at: getRelativeDate(10) + 'T14:20:00Z' },
  { id: 'al5', user_name: 'Admin Sarah', action: 'payment.receive', entity_type: 'invoice', entity_id: 'inv1', details: 'Collected LKR 9,222.50 via Card payment for INV-2026-001', occurred_at: getRelativeDate(0) + 'T09:12:00Z' }
];

export const DashboardProvider = ({ children }) => {
  const [plans] = useState(INITIAL_PLANS);
  const [trainers] = useState(INITIAL_TRAINERS);

  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem('ascend_members_single');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });

  const [registrations, setRegistrations] = useState(() => {
    const saved = localStorage.getItem('ascend_registrations_single');
    return saved ? JSON.parse(saved) : INITIAL_REGISTRATIONS;
  });

  const [accessEvents, setAccessEvents] = useState(() => {
    const saved = localStorage.getItem('ascend_access_events_single');
    return saved ? JSON.parse(saved) : INITIAL_ACCESS_EVENTS;
  });

  const [invoices, setInvoices] = useState(() => {
    const saved = localStorage.getItem('ascend_invoices_single');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem('ascend_audit_logs_single');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('ascend_members_single', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('ascend_registrations_single', JSON.stringify(registrations));
  }, [registrations]);

  useEffect(() => {
    localStorage.setItem('ascend_access_events_single', JSON.stringify(accessEvents));
  }, [accessEvents]);

  useEffect(() => {
    localStorage.setItem('ascend_invoices_single', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('ascend_audit_logs_single', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Log audit helper
  const logAudit = (action, entityType, entityId, details) => {
    const newLog = {
      id: generateUUID(),
      user_name: 'Admin Sarah',
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      occurred_at: new Date().toISOString()
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Member CRUD
  const addMember = (memberData) => {
    const memberCode = `ASC-${Math.floor(10000 + Math.random() * 90000)}`;
    const newMember = {
      id: generateUUID(),
      member_code: memberCode,
      joined_at: new Date().toISOString().split('T')[0],
      status: 'active',
      qr_token: `qr_token_${memberCode}_${Date.now()}`,
      weight_kg: memberData.weight_kg ? parseFloat(memberData.weight_kg) : 75.0,
      height_cm: memberData.height_cm ? parseInt(memberData.height_cm) : 175,
      body_fat_pct: memberData.body_fat_pct ? parseFloat(memberData.body_fat_pct) : 18.0,
      ...memberData
    };

    setMembers(prev => [...prev, newMember]);
    logAudit('member.create', 'member', newMember.id, `Created profile for ${newMember.full_name} (${memberCode})`);
    
    // Auto-generate invoice for membership attach
    const plan = plans.find(p => p.id === newMember.plan_id);
    if (plan) {
      createInvoiceForMember(newMember, plan);
    }
    return newMember;
  };

  const updateMember = (id, updatedFields) => {
    setMembers(prev => prev.map(m => {
      if (m.id === id) {
        const changes = [];
        Object.keys(updatedFields).forEach(key => {
          if (m[key] !== updatedFields[key]) {
            changes.push(`${key}: ${m[key]} -> ${updatedFields[key]}`);
          }
        });
        if (changes.length > 0) {
          logAudit('member.update', 'member', id, `Updated fields on ${m.full_name}: ${changes.join(', ')}`);
        }
        return { ...m, ...updatedFields };
      }
      return m;
    }));
  };

  const deleteMember = (id) => {
    const member = members.find(m => m.id === id);
    if (member) {
      setMembers(prev => prev.map(m => {
        if (m.id === id) {
          return { ...m, status: 'cancelled', deleted_at: new Date().toISOString() };
        }
        return m;
      }));
      logAudit('member.delete', 'member', id, `Soft-deleted member ${member.full_name}`);
    }
  };

  // Freeze/Unfreeze
  const freezeMembership = (memberId, reason, fromDate, toDate) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        logAudit('member.freeze', 'member', memberId, `Froze membership for ${m.full_name}. Reason: ${reason}`);
        return {
          ...m,
          status: 'frozen',
          frozen_from: fromDate,
          frozen_until: toDate,
          freeze_reason: reason
        };
      }
      return m;
    }));
  };

  const unfreezeMembership = (memberId) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        logAudit('member.unfreeze', 'member', memberId, `Unfroze membership for ${m.full_name}`);
        return {
          ...m,
          status: 'active',
          frozen_from: null,
          frozen_until: null,
          freeze_reason: null
        };
      }
      return m;
    }));
  };

  // Self-Registration approvals
  const addRegistrationRequest = (formData) => {
    const newReq = {
      id: generateUUID(),
      status: 'pending_approval',
      captcha_verified: true,
      ip_address: '192.168.1.10',
      created_at: new Date().toISOString(),
      ...formData
    };
    setRegistrations(prev => [...prev, newReq]);
    return newReq;
  };

  const approveRegistration = (requestId) => {
    const req = registrations.find(r => r.id === requestId);
    if (req) {
      // Create member
      const newMember = addMember({
        full_name: req.full_name,
        email: req.email,
        phone: req.phone,
        gender: req.gender,
        date_of_birth: req.date_of_birth,
        plan_id: req.plan_id,
        medical_notes: req.medical_conditions || 'None.',
        fitness_goals: req.fitness_goals || 'General conditioning.',
        emergency_contact_name: req.emergency_contact_name || '',
        emergency_contact_phone: req.emergency_contact_phone || ''
      });

      // Update request status
      setRegistrations(prev => prev.map(r => {
        if (r.id === requestId) {
          return { ...r, status: 'approved' };
        }
        return r;
      }));

      logAudit('registration.approve', 'registration_request', requestId, `Approved registration for ${req.full_name}. Active member code: ${newMember.member_code}`);
    }
  };

  const rejectRegistration = (requestId, reason) => {
    setRegistrations(prev => prev.map(r => {
      if (r.id === requestId) {
        logAudit('registration.reject', 'registration_request', requestId, `Rejected registration for ${r.full_name}. Reason: ${reason}`);
        return { ...r, status: 'rejected', rejection_reason: reason };
      }
      return r;
    }));
  };

  // Invoicing & Payments
  const createInvoiceForMember = (member, plan) => {
    const tax = plan.price * (plan.tax_rate / 100);
    const total = plan.price + tax;
    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newInvoice = {
      id: generateUUID(),
      organization_id: 'org1',
      member_id: member.id,
      member_name: member.full_name,
      invoice_number: invNumber,
      subtotal: plan.price,
      tax_amount: tax,
      discount_amount: 0.00,
      total_amount: total,
      status: 'open',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      issued_at: new Date().toISOString(),
      paid_at: null,
      plan_id: plan.id
    };

    setInvoices(prev => [newInvoice, ...prev]);
  };

  const recordPayment = (invoiceId, paymentMethod) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        logAudit('payment.receive', 'invoice', invoiceId, `Recorded payment of LKR ${inv.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} via ${paymentMethod.toUpperCase()}`);
        return {
          ...inv,
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: paymentMethod
        };
      }
      return inv;
    }));
  };

  // Simulated access scanner check-in
  const checkInMember = (memberCode, source = 'qr') => {
    const member = members.find(m => m.member_code.toLowerCase() === memberCode.trim().toLowerCase());
    
    if (!member) {
      // Access Denied: Invalid code
      const newEvent = {
        id: generateUUID(),
        member_id: null,
        member_name: 'Unknown Member',
        member_code: memberCode,
        source,
        result: 'denied',
        deny_reason: 'invalid_qr',
        occurred_at: new Date().toISOString()
      };
      setAccessEvents(prev => [newEvent, ...prev]);
      logAudit('access.denied', 'access_event', newEvent.id, `Access denied at gate. Reason: Invalid credentials code (${memberCode})`);
      return { success: false, reason: 'Invalid membership code.' };
    }

    if (member.status === 'frozen') {
      const newEvent = {
        id: generateUUID(),
        member_id: member.id,
        member_name: member.full_name,
        member_code: member.member_code,
        source,
        result: 'denied',
        deny_reason: 'frozen',
        occurred_at: new Date().toISOString()
      };
      setAccessEvents(prev => [newEvent, ...prev]);
      logAudit('access.denied', 'access_event', newEvent.id, `Access denied for ${member.full_name} (${member.member_code}). Reason: Account Frozen`);
      return { success: false, reason: `Membership is frozen. Freeze reason: ${member.freeze_reason || 'N/A'}` };
    }

    if (member.status === 'expired') {
      const newEvent = {
        id: generateUUID(),
        member_id: member.id,
        member_name: member.full_name,
        member_code: member.member_code,
        source,
        result: 'denied',
        deny_reason: 'expired',
        occurred_at: new Date().toISOString()
      };
      setAccessEvents(prev => [newEvent, ...prev]);
      logAudit('access.denied', 'access_event', newEvent.id, `Access denied for ${member.full_name} (${member.member_code}). Reason: Membership Expired`);
      return { success: false, reason: 'Membership has expired. Please renew.' };
    }

    if (member.status === 'cancelled' || member.status === 'suspended') {
      const newEvent = {
        id: generateUUID(),
        member_id: member.id,
        member_name: member.full_name,
        member_code: member.member_code,
        source,
        result: 'denied',
        deny_reason: 'expired',
        occurred_at: new Date().toISOString()
      };
      setAccessEvents(prev => [newEvent, ...prev]);
      logAudit('access.denied', 'access_event', newEvent.id, `Access denied for ${member.full_name} (${member.member_code}). Reason: Account ${member.status}`);
      return { success: false, reason: `Membership is ${member.status}. Access blocked.` };
    }

    // Access Granted
    const newEvent = {
      id: generateUUID(),
      member_id: member.id,
      member_name: member.full_name,
      member_code: member.member_code,
      source,
      result: 'granted',
      occurred_at: new Date().toISOString()
    };
    setAccessEvents(prev => [newEvent, ...prev]);
    logAudit('member.checkin', 'access_event', newEvent.id, `Member checked in: ${member.full_name}`);
    return { success: true, member };
  };

  const checkOutMember = (eventId) => {
    setAccessEvents(prev => prev.map(evt => {
      if (evt.id === eventId) {
        logAudit('member.checkout', 'access_event', eventId, `Recorded checkout for ${evt.member_name}`);
        return {
          ...evt,
          check_out_at: new Date().toISOString()
        };
      }
      return evt;
    }));
  };

  return (
    <DashboardContext.Provider value={{
      plans,
      trainers,
      members,
      registrations,
      accessEvents,
      invoices,
      auditLogs,
      
      // Actions
      addMember,
      updateMember,
      deleteMember,
      freezeMembership,
      unfreezeMembership,
      addRegistrationRequest,
      approveRegistration,
      rejectRegistration,
      recordPayment,
      checkInMember,
      checkOutMember,
      logAudit
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
