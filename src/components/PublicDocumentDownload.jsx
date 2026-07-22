import { useEffect, useState } from 'react';
import { db, COLLECTIONS } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { Folder, Printer, Dumbbell, Apple, FileText, Check, User, Calendar, MapPin, Phone, Mail } from 'lucide-react';

const PublicDocumentDownload = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [docData, setDocData] = useState(null);
  const [subItems, setSubItems] = useState([]);
  const [gymSettings, setGymSettings] = useState(null);
  const [member, setMember] = useState(null);
  const [trainer, setTrainer] = useState(null);

  // Extract docId from URL query or hash
  const getDocId = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('docId')) return params.get('docId');
    
    const hash = window.location.hash;
    const match = hash.match(/docId=([^&]+)/);
    return match ? match[1] : '';
  };

  useEffect(() => {
    const fetchDocDetails = async () => {
      const docId = getDocId();
      if (!docId) {
        setError('No document ID provided. Please verify your download link.');
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch document metadata
        const docRef = doc(db, 'memberDocuments', docId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          setError('The requested document does not exist or has been deleted.');
          setLoading(false);
          return;
        }

        const data = { id: docSnap.id, ...docSnap.data() };
        setDocData(data);

        // 2. Fetch sub-items (exercises, meals, etc.)
        let subColName = '';
        if (data.type === 'workout') subColName = 'exercises';
        else if (data.type === 'diet') subColName = 'meals';
        else if (data.type === 'general') subColName = 'attachments';

        if (subColName) {
          const subColRef = collection(db, 'memberDocuments', docId, subColName);
          const subSnap = await getDocs(subColRef);
          setSubItems(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }

        // 3. Fetch gym settings
        if (data.gymId) {
          const gymRef = doc(db, COLLECTIONS.GYMS, data.gymId);
          const gymSnap = await getDoc(gymRef);
          if (gymSnap.exists()) {
            setGymSettings(gymSnap.data());
          }
        }

        // 4. Fetch member details
        if (data.memberId) {
          const memberRef = doc(db, COLLECTIONS.MEMBERS, data.memberId);
          const memberSnap = await getDoc(memberRef);
          if (memberSnap.exists()) {
            setMember(memberSnap.data());
          }
        }

        // 5. Fetch trainer details
        if (data.trainerId) {
          const trainerRef = doc(db, COLLECTIONS.TRAINERS, data.trainerId);
          const trainerSnap = await getDoc(trainerRef);
          if (trainerSnap.exists()) {
            setTrainer(trainerSnap.data());
          }
        }

        // 6. Update view statistics in Firestore
        await updateDoc(docRef, {
          viewCount: (data.viewCount || 0) + 1,
          lastViewedAt: new Date().toISOString()
        });

      } catch (err) {
        console.error('Fetch public document error:', err);
        setError('Failed to load document details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocDetails();
  }, []);

  const handlePrint = async () => {
    if (!docData) return;
    
    try {
      // Increment download count in Firestore
      const docRef = doc(db, 'memberDocuments', docData.id);
      await updateDoc(docRef, {
        downloadCount: (docData.downloadCount || 0) + 1
      });

      // Log download to Audit Logs
      const auditLog = {
        gymId: docData.gymId || 'gym_ascend_hq',
        userId: 'member_download',
        memberId: docData.memberId || 'unknown',
        documentId: docData.id,
        action: 'document.download',
        timestamp: new Date().toISOString(),
        details: `Member printed/saved document PDF: "${docData.title}"`
      };
      
      // Attempt to save audit log
      try {
        const { addDoc, collection } = await import('firebase/firestore');
        await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), auditLog);
      } catch (auditErr) {
        console.warn('Failed to log download audit:', auditErr);
      }

      // Trigger browser print/export PDF
      window.print();

    } catch (err) {
      console.error('Print trigger error:', err);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#090d16',
        color: '#fff',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '1rem'
        }} />
        <span>Loading secure download portal...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#090d16',
        color: '#fff',
        fontFamily: 'sans-serif',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          borderRadius: '50%',
          padding: '1rem',
          marginBottom: '1.5rem'
        }}>
          <Folder size={40} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Access Denied</h2>
        <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto 1.5rem auto', lineHeight: '1.5' }}>
          {error}
        </p>
        <button 
          onClick={() => window.close()}
          style={{
            background: '#ffffff',
            color: '#000000',
            border: 'none',
            padding: '0.6rem 1.5rem',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Close Portal
        </button>
      </div>
    );
  }

  const getDocIcon = () => {
    if (docData.type === 'workout') return <Dumbbell size={24} style={{ color: '#10b981' }} />;
    if (docData.type === 'diet') return <Apple size={24} style={{ color: '#f59e0b' }} />;
    return <FileText size={24} style={{ color: '#3b82f6' }} />;
  };

  const calculateBMI = (w, h) => {
    if (!w || !h) return 'N/A';
    const hm = h / 100;
    return (w / (hm * hm)).toFixed(1);
  };

  return (
    <div className="printable-body" style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #0f172a, #020617)',
      color: '#f8fafc',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1.5rem'
    }}>
      <div className="printable-card" style={{
        maxWidth: '800px',
        width: '100%',
        background: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '2.5rem',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        
        {/* Branding & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              {gymSettings?.gymName || 'Fitgencore Member Portal'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
              {gymSettings?.address || 'Colombo Branch'}
            </p>
          </div>
          <div className="printable-hide" style={{ textAlign: 'right' }}>
            <button
              onClick={handlePrint}
              style={{
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: '8px',
                padding: '0.6rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)'
              }}
            >
              <Printer size={15} /> Print / Export PDF
            </button>
          </div>
        </div>

        {/* Member Profile Grid */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.25rem',
          fontSize: '0.85rem'
        }}>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Member Profile</span>
            <strong style={{ fontSize: '1rem', color: '#fff' }}>{member?.full_name || 'Valued Member'}</strong>
            <span style={{ color: '#94a3b8', display: 'block', marginTop: '0.15rem' }}>ID Code: {member?.member_code || 'N/A'}</span>
            <span style={{ color: '#94a3b8', display: 'block' }}>BMI: {calculateBMI(member?.weight, member?.height)} (W: {member?.weight}kg, H: {member?.height}cm)</span>
          </div>
          <div>
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem' }}>Assigned Coach / Trainer</span>
            <strong style={{ fontSize: '1rem', color: '#fff' }}>{trainer?.full_name || 'Gym Instructor'}</strong>
            <span style={{ color: '#94a3b8', display: 'block', marginTop: '0.15rem' }}>Title: {docData.title}</span>
            <span style={{ color: '#94a3b8', display: 'block' }}>Goal: {docData.goal || 'General Health'}</span>
          </div>
        </div>

        {/* DOCUMENT MAIN CONTENT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.6rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {getDocIcon()}
            </div>
            <div>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: docData.type === 'workout' ? 'rgba(16, 185, 129, 0.15)' : docData.type === 'diet' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: docData.type === 'workout' ? '#10b981' : docData.type === 'diet' ? '#f59e0b' : '#3b82f6',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                letterSpacing: '0.05em'
              }}>
                {docData.type === 'workout' ? 'Workout Plan' : docData.type === 'diet' ? 'Diet Plan' : 'General Document'}
              </span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: '#fff' }}>
                {docData.title}
              </h2>
            </div>
          </div>

          {/* Workout Specific Details */}
          {docData.type === 'workout' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                <div>Difficulty: <strong>{docData.difficulty}</strong></div>
                <div>Duration Cycle: <strong>{docData.duration}</strong></div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>Exercise Schedules</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {subItems.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>No exercises defined in this workout schedule.</p>
                  ) : (
                    subItems.map((ex, idx) => (
                      <div key={ex.id} style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        padding: '1rem',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <strong style={{ color: '#fff' }}>{idx + 1}. {ex.name}</strong>
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Target: {ex.muscleGroup}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '4px', textAlign: 'center', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                          <div>Sets: <strong>{ex.sets}</strong></div>
                          <div>Reps: <strong>{ex.reps}</strong></div>
                          <div>Weight: <strong>{ex.weight} kg</strong></div>
                          <div>Rest: <strong>{ex.restTime}</strong></div>
                        </div>
                        {ex.instructions && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                            Instructions: {ex.instructions}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Diet Specific Details */}
          {docData.type === 'diet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '0.5rem',
                background: 'rgba(0,0,0,0.2)',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '0.8rem'
              }}>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Calories</span><strong>{docData.dailyCalories || 'N/A'} kcal</strong></div>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Protein</span><strong>{docData.protein || 'N/A'} g</strong></div>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Carbs</span><strong>{docData.carbs || 'N/A'} g</strong></div>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Fat</span><strong>{docData.fat || 'N/A'} g</strong></div>
                <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '0.7rem' }}>Water</span><strong>{docData.waterIntake || 'N/A'} L</strong></div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>Daily Meal Planner</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
                  {[
                    { label: 'Breakfast', val: docData.meals?.breakfast },
                    { label: 'Morning Snack', val: docData.meals?.morningSnack },
                    { label: 'Lunch', val: docData.meals?.lunch },
                    { label: 'Evening Snack', val: docData.meals?.eveningSnack },
                    { label: 'Dinner', val: docData.meals?.dinner },
                    { label: 'Supplements', val: docData.meals?.supplements }
                  ].map(m => m.val ? (
                    <div key={m.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.85rem', borderRadius: '6px' }}>
                      <strong style={{ color: '#fff', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>{m.label}</strong>
                      <span style={{ color: '#cbd5e1' }}>{m.val}</span>
                    </div>
                  ) : null)}
                </div>
              </div>

              {docData.restrictions && (
                <div style={{ fontSize: '0.8rem', color: '#fb7185', background: 'rgba(251,113,133,0.05)', border: '1px solid rgba(251,113,133,0.15)', padding: '0.75rem', borderRadius: '8px' }}>
                  <strong>Allergens & Restrictions:</strong> {docData.restrictions}
                </div>
              )}
            </div>
          )}

          {/* General Document Details */}
          {docData.type === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.85rem' }}>
              <div>Category Log: <strong>{docData.generalCategory}</strong></div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Description Log</h3>
                <p style={{ color: '#cbd5e1', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{docData.generalDescription}</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#94a3b8',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          {gymSettings?.phone && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
              <span>Phone: {gymSettings.phone}</span>
              <span>Email: {gymSettings.email}</span>
            </div>
          )}
          <span>Powered by FitGenCore Multi-Tenant Gym Management SaaS Platform</span>
        </div>

      </div>

      {/* Global CSS for Print Mode overrides */}
      <style>{`
        @media print {
          body, .printable-body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .printable-card {
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .printable-hide {
            display: none !important;
          }
          strong, h1, h2, h3, h4, span {
            color: #000000 !important;
          }
          div {
            border-color: #e2e8f0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PublicDocumentDownload;
