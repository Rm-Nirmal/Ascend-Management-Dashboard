import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Dumbbell, Printer, AlertTriangle, Loader2, Award } from 'lucide-react';

// Simple number to words mapping
const numberToWords = (num) => {
  const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
  const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return ''; 
  let str = '';
  str += n[1] != 0 ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
  str += n[2] != 0 ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
  str += n[3] != 0 ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
  str += n[4] != 0 ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
  str += n[5] != 0 ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'only ' : '';
  return str.toUpperCase();
};

const PublicPayslip = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payslipData, setPayslipData] = useState(null);
  const [gymDetails, setGymDetails] = useState(null);

  const queryParams = new URLSearchParams(window.location.search);
  const payslipId = queryParams.get('id');

  useEffect(() => {
    const fetchPayslip = async () => {
      if (!payslipId) {
        setError('Invalid payslip or reference ID.');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'expenses', payslipId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const pData = { id: docSnap.id, ...docSnap.data() };
          setPayslipData(pData);

          if (pData.gymId) {
            try {
              const gymSettingsQuery = query(collection(db, 'gymSettings'), where('gymId', '==', pData.gymId));
              const gymSettingsSnap = await getDocs(gymSettingsQuery);
              if (!gymSettingsSnap.empty) {
                setGymDetails(gymSettingsSnap.docs[0].data());
              } else {
                const gymsQuery = query(collection(db, 'gyms'), where('gymId', '==', pData.gymId));
                const gymsSnap = await getDocs(gymsQuery);
                if (!gymsSnap.empty) {
                  setGymDetails(gymsSnap.docs[0].data());
                }
              }
            } catch (gymErr) {
              console.error('Error fetching gym details for payslip:', gymErr);
            }
          }
        } else {
          setError('Payslip record not found. Please contact administration.');
        }
      } catch (err) {
        console.error('Error fetching payslip details:', err);
        setError('Unable to load payslip details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPayslip();
  }, [payslipId]);

  useEffect(() => {
    if (!loading && !error && payslipData && queryParams.get('print') === 'true') {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, error, payslipData]);

  if (loading) {
    return (
      <div className="receipt-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', background: '#0a0b0f' }}>
        <Loader2 size={36} style={{ color: '#ffffff', animation: 'spin 1.2s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
          Retrieving payslip details...
        </span>
      </div>
    );
  }

  if (error || !payslipData) {
    return (
      <div className="receipt-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1.25rem', padding: '2rem', textAlign: 'center', background: '#0a0b0f' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <AlertTriangle size={28} style={{ color: 'var(--text-muted)' }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 700, color: '#fff' }}>
          PAYSLIP UNAVAILABLE
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', lineHeight: '1.5' }}>
          {error}
        </p>
      </div>
    );
  }

  const basicSalary = parseFloat(payslipData.basic_salary || payslipData.amount || 0);
  const bonusPay = parseFloat(payslipData.bonus_pay || 0);
  const overtimePay = parseFloat(payslipData.overtime_pay || 0);
  const allowancePay = parseFloat(payslipData.allowance_pay || 0);
  const epfDeduction = parseFloat(payslipData.epf_deduction || 0);
  const taxDeduction = parseFloat(payslipData.tax_deduction || 0);
  const otherDeductions = parseFloat(payslipData.other_deductions || 0);

  const totalEarnings = basicSalary + bonusPay + overtimePay + allowancePay;
  const totalDeductions = epfDeduction + taxDeduction + otherDeductions;
  const netSalary = parseFloat(payslipData.amount || 0);

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
      backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05) 0%, transparent 60%)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Oswald:wght@500;700&display=swap');
        
        .receipt-card {
          width: 100%;
          max-width: 600px;
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
            max-width: 520px !important;
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
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.25rem' }} className="muted-text">
            Payroll Salary Slip
          </span>
          {gymDetails && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.15rem', textAlign: 'center' }} className="muted-text">
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
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.1)',
            color: '#ffffff'
          }}>
            <Award size={14} /> Paid & Disbursed
          </div>
        </div>

        {/* Information Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem', marginBottom: '2rem', fontSize: '0.825rem' }}>
          <div>
            <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }} className="muted-text">Employee Details</span>
            <strong style={{ fontSize: '0.925rem', display: 'block', color: '#fff' }} className="value-text">{payslipData.employee_name || 'Staff Member'}</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }} className="muted-text">Designation: {payslipData.employee_role || 'Staff'}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }} className="muted-text">Payroll Details</span>
            <div style={{ color: '#fff' }} className="value-text">Period: <strong>{payslipData.period || 'Monthly'}</strong></div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }} className="muted-text">Disbursed: {payslipData.date}</div>
          </div>
        </div>

        {/* Itemized Table */}
        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.75rem', background: 'rgba(0,0,0,0.15)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
            <thead>
              <tr className="table-header" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Earnings (LKR)</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Deductions (LKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.85rem 1rem', color: '#fff' }} className="value-text">Basic Salary</td>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#fff' }} className="value-text">LKR {basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }} className="muted-text">-</td>
              </tr>
              {bonusPay > 0 && (
                <tr className="table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.85rem 1rem', color: '#fff' }} className="value-text">Performance Bonus / Incentives</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#fff' }} className="value-text">LKR {bonusPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }} className="muted-text">-</td>
                </tr>
              )}
              {overtimePay > 0 && (
                <tr className="table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.85rem 1rem', color: '#fff' }} className="value-text">Overtime / Commission</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#fff' }} className="value-text">LKR {overtimePay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }} className="muted-text">-</td>
                </tr>
              )}
              {allowancePay > 0 && (
                <tr className="table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.85rem 1rem', color: '#fff' }} className="value-text">Transport & Allowances</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#fff' }} className="value-text">LKR {allowancePay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }} className="muted-text">-</td>
                </tr>
              )}
              {epfDeduction > 0 && (
                <tr className="table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.85rem 1rem', color: '#fff' }} className="value-text">EPF Employee Contribution (8%)</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }} className="muted-text">-</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#ef4444' }}>-LKR {epfDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
              {taxDeduction > 0 && (
                <tr className="table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.85rem 1rem', color: '#fff' }} className="value-text">PAYE Income Tax</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }} className="muted-text">-</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#ef4444' }}>-LKR {taxDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
              {otherDeductions > 0 && (
                <tr className="table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.85rem 1rem', color: '#fff' }} className="value-text">Unpaid Leave & Penalties</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }} className="muted-text">-</td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#ef4444' }}>-LKR {otherDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cost Summary Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }} className="muted-text">Gross Earnings:</span>
            <span style={{ color: '#fff' }} className="value-text">LKR {totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          {totalDeductions > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }} className="muted-text">Total Deductions:</span>
              <span style={{ color: '#ef4444' }}>-LKR {totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
            <span>Net Disbursed:</span>
            <span>LKR {netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Amount in words & notes */}
        <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }} className="muted-text">
          <div>Amount in Words: <strong style={{ color: '#fff' }} className="value-text">{numberToWords(netSalary)}</strong></div>
          {payslipData.notes && <div style={{ marginTop: '0.5rem' }}>Remarks: <span style={{ color: '#fff' }} className="value-text">{payslipData.notes}</span></div>}
        </div>

        {/* Signature Box */}
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: 'var(--text-muted)' }} className="muted-text">
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.5rem', textAlign: 'center' }}>
            HR / Management Authorization
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.5rem', textAlign: 'center' }}>
            Employee Signature (Acknowledgment)
          </div>
        </div>
        
        <div style={{ textAlign: 'center', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '1.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }} className="muted-text">
          Powered by Fitgencore
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

export default PublicPayslip;
