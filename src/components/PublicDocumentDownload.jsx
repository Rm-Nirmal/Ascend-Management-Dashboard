import { useEffect, useState } from 'react';
import { db, COLLECTIONS } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Folder, Download, ShieldCheck, Dumbbell, Apple, FileText, Check, User, Calendar, MapPin, Phone, Mail } from 'lucide-react';

const PublicDocumentDownload = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [docData, setDocData] = useState(null);
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

        // 2. Fetch gym settings
        if (data.gymId) {
          const gymRef = doc(db, COLLECTIONS.GYMS, data.gymId);
          const gymSnap = await getDoc(gymRef);
          if (gymSnap.exists()) {
            setGymSettings(gymSnap.data());
          }
        }

        // 3. Fetch member details
        if (data.memberId) {
          const memberRef = doc(db, COLLECTIONS.MEMBERS, data.memberId);
          const memberSnap = await getDoc(memberRef);
          if (memberSnap.exists()) {
            setMember(memberSnap.data());
          }
        }

        // 4. Fetch trainer details
        if (data.trainerId) {
          const trainerRef = doc(db, COLLECTIONS.TRAINERS, data.trainerId);
          const trainerSnap = await getDoc(trainerRef);
          if (trainerSnap.exists()) {
            setTrainer(trainerSnap.data());
          }
        }

        // 5. Update view statistics in Firestore
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

  const handleDownload = async () => {
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
        details: `Member downloaded document: "${docData.title}"`
      };
      
      // Attempt to save audit log
      try {
        const { addDoc, collection } = await import('firebase/firestore');
        await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), auditLog);
      } catch (auditErr) {
        console.warn('Failed to log download audit:', auditErr);
      }

      // Open PDF in a new tab for download/printing
      if (docData.pdfUrl) {
        // Fallback for simulated URLs
        if (docData.pdfUrl.startsWith('simulated://')) {
          alert('This is a simulated download link. Normally, this opens: ' + docData.pdfUrl);
        } else {
          window.open(docData.pdfUrl, '_blank');
        }
      } else {
        alert('PDF document is still compiling. Please contact your trainer.');
      }

    } catch (err) {
      console.error('Download trigger error:', err);
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #0f172a, #020617)',
      color: '#f8fafc',
      fontFamily: 'sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem'
    }}>
      <div style={{
        maxWidth: '560px',
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
        <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <ShieldCheck size={20} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>
              Secure Document Link
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            {gymSettings?.gymName || 'Fitgencore Member Portal'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
            Powered by FitGenCore Multi-Tenant SaaS
          </p>
        </div>

        {/* Document Overview Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.75rem',
              borderRadius: '10px',
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
                background: docData.type === 'workout' ? 'rgba(16, 185, 129, 0.1)' : docData.type === 'diet' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                color: docData.type === 'workout' ? '#10b981' : docData.type === 'diet' ? '#f59e0b' : '#3b82f6',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                letterSpacing: '0.05em'
              }}>
                {docData.type === 'workout' ? 'Workout Plan' : docData.type === 'diet' ? 'Diet Plan' : 'General Document'}
              </span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0.35rem 0 0 0', color: '#fff' }}>
                {docData.title}
              </h2>
            </div>
          </div>

          {/* Details Table */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            fontSize: '0.8rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            paddingTop: '1rem'
          }}>
            <div>
              <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={12} /> Member</div>
              <strong style={{ color: '#fff' }}>{member?.full_name || 'Valued Member'}</strong>
            </div>
            <div>
              <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={12} /> Coach / Trainer</div>
              <strong style={{ color: '#fff' }}>{trainer?.full_name || 'Gym Instructor'}</strong>
            </div>
            <div>
              <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> Generated</div>
              <strong style={{ color: '#fff' }}>
                {docData.generatedAt ? new Date(docData.generatedAt).toLocaleDateString() : new Date(docData.createdAt).toLocaleDateString()}
              </strong>
            </div>
            <div>
              <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><FileText size={12} /> Status</div>
              <strong style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <Check size={12} /> Verified Ready
              </strong>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          style={{
            background: '#ffffff',
            color: '#000000',
            border: 'none',
            borderRadius: '10px',
            padding: '1rem',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 15px rgba(255, 255, 255, 0.1)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 255, 255, 0.18)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 255, 255, 0.1)'}
        >
          <Download size={18} /> Download Branded PDF
        </button>

        {/* Footer Contact Details */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#94a3b8',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          paddingTop: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          {gymSettings?.address && (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              <MapPin size={12} /> {gymSettings.address}
            </span>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            {gymSettings?.phone && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Phone size={12} /> {gymSettings.phone}
              </span>
            )}
            {gymSettings?.email && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Mail size={12} /> {gymSettings.email}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicDocumentDownload;
