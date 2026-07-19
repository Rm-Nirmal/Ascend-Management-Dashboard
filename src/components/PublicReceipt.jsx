import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Dumbbell, Printer, Check, AlertTriangle, Loader2 } from 'lucide-react';

const PublicReceipt = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [gymDetails, setGymDetails] = useState(null);

  // Extract query parameters
  const queryParams = new URLSearchParams(window.location.search);
  const receiptId = queryParams.get('id');
  const type = queryParams.get('type') || 'invoice'; // 'invoice' or 'income'

  useEffect(() => {
    const fetchData = async () => {
      if (!receiptId) {
        setError('Invalid receipt or reference ID.');
        setLoading(false);
        return;
      }

      try {
        // Fetch plans first (for mapping plan details on invoices)
        const plansSnap = await getDocs(collection(db, 'plans'));
        const plansList = [];
        plansSnap.forEach(docSnap => {
          plansList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPlans(plansList);

        // Fetch receipt document
        const collectionName = 'payments';
        const docRef = doc(db, collectionName, receiptId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const rData = { id: docSnap.id, ...docSnap.data() };
          setReceiptData(rData);

          if (rData.gymId) {
            try {
              const gymSettingsQuery = query(collection(db, 'gymSettings'), where('gymId', '==', rData.gymId));
              const gymSettingsSnap = await getDocs(gymSettingsQuery);
              if (!gymSettingsSnap.empty) {
                setGymDetails(gymSettingsSnap.docs[0].data());
              } else {
                const gymsQuery = query(collection(db, 'gyms'), where('gymId', '==', rData.gymId));
                const gymsSnap = await getDocs(gymsQuery);
                if (!gymsSnap.empty) {
                  setGymDetails(gymsSnap.docs[0].data());
                }
              }
            } catch (gymErr) {
              console.error('Error fetching gym details for receipt:', gymErr);
            }
          }
        } else {
          setError('Receipt not found. Please check the URL or contact gym management.');
        }
      } catch (err) {
        console.error('Error fetching public receipt details:', err);
        setError('Unable to load receipt details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [receiptId, type]);

  if (loading) {
    return (
      <div className="receipt-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', background: 'var(--bg-primary)' }}>
        <Loader2 size={36} style={{ color: '#ffffff', animation: 'spin 1.2s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
          Retrieving receipt details...
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !receiptData) {
    return (
      <div className="receipt-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1.25rem', padding: '2rem', textAlign: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifycontent: 'center', margin: '0 auto' }}>
          <AlertTriangle size={28} style={{ color: 'var(--text-muted)' }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 700, color: '#fff' }}>
          RECEIPT UNAVAILABLE
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', lineHeight: '1.5', fontFamily: 'var(--font-body)' }}>
          {error}
        </p>
      </div>
    );
  }

  // Map values depending on whether it's an invoice or income
  const isInvoice = type === 'invoice';
  const memberName = isInvoice ? receiptData.member_name : (receiptData.member_name || 'Walk-in Customer');
  const amount = isInvoice ? receiptData.total_amount : receiptData.amount;
  const paymentMethod = isInvoice ? receiptData.payment_method : receiptData.payment_method;
  const reference = isInvoice ? receiptData.invoice_number : (receiptData.payment_reference || receiptData.id.substring(0, 8).toUpperCase());
  const dateStr = isInvoice 
    ? (receiptData.paid_at ? new Date(receiptData.paid_at).toLocaleDateString() : new Date(receiptData.issued_at).toLocaleDateString())
    : (receiptData.date ? new Date(receiptData.date).toLocaleDateString() : new Date(receiptData.created_at).toLocaleDateString());

  // Details mapped
  const planName = isInvoice 
    ? (plans.find(p => p.id === receiptData.plan_id)?.name || 'Membership Plan')
    : receiptData.source;
  const subtotal = isInvoice ? receiptData.subtotal : amount;
  const discount = isInvoice ? (receiptData.discount_amount || 0) : 0;
  const discountType = isInvoice ? (receiptData.discount_type || 'none') : 'none';
  const discountRate = isInvoice ? (receiptData.discount_rate || 0) : 0;

  return (
    <div className="receipt-page-container" style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      backgroundAttachment: 'fixed',
      backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05) 0%, transparent 60%)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Oswald:wght@500;700&display=swap');
        
        .receipt-card {
          width: 100%;
          max-width: 500px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2.5rem 2rem;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media print {
          @page {
            size: auto;
            margin: 0mm;
          }
          body {
            background: #ffffff !important;
            background-image: none !important;
            color: #000000 !important;
            margin: 0px;
            padding: 1.5cm;
          }
          .receipt-page-container {
            background: #ffffff !important;
            background-image: none !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .receipt-card {
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            color: #000000 !important;
            max-width: 440px !important;
            margin: 0 auto !important;
            backdrop-filter: none !important;
          }
          .no-print {
            display: none !important;
          }
          .text-glow {
            text-shadow: none !important;
            color: #000000 !important;
          }
          .badge-clear {
            border: 1.5px solid #000000 !important;
            color: #000000 !important;
            background: transparent !important;
          }
          .table-header {
            background: #f4f4f5 !important;
            color: #000000 !important;
            border-bottom: 1.5px solid #000000 !important;
          }
          .table-row {
            border-bottom: 1px solid #e4e4e7 !important;
            color: #000000 !important;
          }
          .muted-text {
            color: #52525b !important;
          }
          .value-text {
            color: #000000 !important;
          }
        }
      `}</style>

      <div className="receipt-card">
        {/* Brand identity */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#ffffff', fontWeight: 800, fontSize: '1.45rem', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }} className="text-glow">
            <Dumbbell size={22} /> {gymDetails?.gymName ? gymDetails.gymName.toUpperCase() : 'ASCEND FITNESS HQ'}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.25rem', fontFamily: 'var(--font-body)' }} className="muted-text">
            Official Payment Receipt
          </span>
          {gymDetails && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', gap: '0.15rem', textAlign: 'center' }} className="muted-text">
              {gymDetails.address && <span>{gymDetails.address}</span>}
              {(gymDetails.phone || gymDetails.email) && (
                <span>
                  {gymDetails.phone && `Tel: ${gymDetails.phone}`}
                  {gymDetails.phone && gymDetails.email && ' | '}
                  {gymDetails.email && `Email: ${gymDetails.email}`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div className="badge-clear" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.4rem 0.9rem',
            borderRadius: '9999px',
            border: '1.5px solid #ffffff',
            background: 'rgba(255, 255, 255, 0.05)',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: 'var(--font-body)',
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.1)',
            color: '#ffffff'
          }}>
            <Check size={14} /> Paid & Cleared
          </div>
        </div>

        {/* Information Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', fontSize: '0.825rem', fontFamily: 'var(--font-body)' }}>
          <div>
            <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }} className="muted-text">Billed To</span>
            <strong style={{ fontSize: '0.925rem', display: 'block', color: '#fff' }} className="value-text">{memberName}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }} className="muted-text">Receipt Details</span>
            <div style={{ color: '#fff' }} className="value-text">Ref: <strong>{reference}</strong></div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }} className="muted-text">Date: {dateStr}</div>
          </div>
        </div>

        {/* Itemized Table */}
        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.75rem', background: 'rgba(0,0,0,0.15)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', fontFamily: 'var(--font-body)' }}>
            <thead>
              <tr className="table-header" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '1rem', color: '#fff' }} className="value-text">
                  <strong>{!isInvoice && receiptData.source === 'Product Sales' && receiptData.productName ? receiptData.productName : planName}</strong>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.15rem' }} className="muted-text">
                    {!isInvoice && receiptData.source === 'Product Sales' 
                      ? (receiptData.notes || `Quantity: ${receiptData.quantity || 1}`)
                      : 'Gym facility membership/service cleared log'}
                  </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', color: '#fff', fontWeight: 600 }} className="value-text">
                  LKR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cost Summary Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }} className="muted-text">Subtotal:</span>
            <span style={{ color: '#fff' }} className="value-text">LKR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }} className="value-text">
              <span>
                {discountType === 'percentage' 
                  ? `Discounts (${discountRate}%):` 
                  : 'Discounts:'}
              </span>
              <span>-LKR {discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '1.05rem',
            color: '#ffffff',
            borderTop: '1px dotted rgba(255,255,255,0.15)',
            paddingTop: '0.625rem',
            marginTop: '0.25rem'
          }} className="value-text">
            <span>Total Cleared:</span>
            <span>LKR {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Payment reference notes */}
        <div style={{ marginTop: '2rem', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '8px', fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', display: 'flex', justifyContent: 'space-between' }} className="muted-text">
          <span>Payment method: <strong style={{ color: '#fff' }} className="value-text">{paymentMethod ? paymentMethod.toUpperCase() : 'N/A'}</strong></span>
          <span>Gateway: <strong style={{ color: '#fff' }} className="value-text">{gymDetails?.gymName || 'Ascend HQ'}</strong></span>
        </div>
        
        <div style={{ textAlign: 'center', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '1.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }} className="muted-text">
          Powered by Fitgen Core
        </div>

        {/* Action controls */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
          <button
            onClick={() => window.print()}
            className="btn btn-primary"
            style={{
              padding: '0.625rem 2.25rem',
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#ffffff',
              color: '#000000',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(255,255,255,0.1)'
            }}
          >
            <Printer size={14} /> Print / Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicReceipt;
