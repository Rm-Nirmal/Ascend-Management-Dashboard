import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Dumbbell, Printer, AlertTriangle, Loader2 } from 'lucide-react';

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
      <div className="receipt-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', background: '#f8fafc' }}>
        <Loader2 size={36} style={{ color: '#0f172a', animation: 'spin 1.2s linear infinite' }} />
        <span style={{ color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>
          Retrieving payslip details...
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !payslipData) {
    return (
      <div className="receipt-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1.25rem', padding: '2rem', textAlign: 'center', background: '#f8fafc' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <AlertTriangle size={28} style={{ color: '#ef4444' }} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
          PAYSLIP UNAVAILABLE
        </h2>
        <p style={{ color: '#475569', fontSize: '0.9rem', maxWidth: '400px', lineHeight: '1.5' }}>
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
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem 1.5rem',
    }}>
      <style>{`
        .receipt-card {
          width: 100%;
          max-width: 650px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          color: #1e293b;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .header h2 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; }
        .header p { margin: 2px 0; font-size: 0.8rem; color: #64748b; }
        .header-right { text-align: right; }
        .header-right h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #0f172a; letter-spacing: 0.05em; }
        
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          background: #f8fafc;
          padding: 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          margin-bottom: 20px;
          border: 1px solid #edf2f7;
        }
        .details-grid div p { margin: 4px 0; }
        .details-grid strong { color: #0f172a; }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 0.8rem;
        }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f1f5f9; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 0.75rem; }
        
        .totals {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 20px;
          font-size: 0.8rem;
          border-top: 1px solid #e2e8f0;
          padding-top: 12px;
          margin-top: 15px;
        }
        .totals-left {
          font-style: italic;
          color: #64748b;
        }
        .totals-right {
          text-align: right;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .total-due {
          border-top: 2px solid #0f172a;
          padding-top: 8px;
          margin-top: 8px;
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
        }
        
        .signature-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 30px;
          padding-top: 15px;
          font-size: 0.75rem;
          color: #64748b;
        }
        .sig-box {
          border-top: 1px solid #e2e8f0;
          padding-top: 6px;
          text-align: center;
        }

        @media print {
          @page {
            size: auto;
            margin: 0mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0px;
            padding: 1.5cm;
          }
          .receipt-page-container {
            background: #ffffff !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .receipt-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="receipt-card">
        <div className="header">
          <div>
            <h2>{gymDetails?.gymName ? gymDetails.gymName.toUpperCase() : 'FITGENCORE'}</h2>
            {gymDetails?.address && <p>{gymDetails.address}</p>}
            <p>Email: {gymDetails?.email || 'finance@fitgencore.com'} | Tel: {gymDetails?.phone || '+94 11 234 5678'}</p>
          </div>
          <div className="header-right">
            <h3>PAYSLIP & RECEIPT</h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Original Copy</p>
          </div>
        </div>

        <div className="details-grid">
          <div>
            <p><strong>Employee ID:</strong> {payslipData.employee_id?.substring(0, 12) || 'N/A'}</p>
            <p><strong>Employee Name:</strong> {payslipData.employee_name || 'Staff Member'}</p>
            <p><strong>Designation (Role):</strong> {payslipData.employee_role || 'Staff'}</p>
          </div>
          <div className="header-right">
            <p><strong>Payroll Period:</strong> {payslipData.period || 'Monthly'}</p>
            <p><strong>Payment Date:</strong> {payslipData.date}</p>
            <p><strong>Payment Mode:</strong> <span style={{ textTransform: 'capitalize' }}>{payslipData.payment_method?.replace('_', ' ') || 'Bank transfer'}</span></p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Earnings (LKR)</th>
              <th style={{ textAlign: 'right' }}>Deductions (LKR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Salary</td>
              <td style={{ textAlign: 'right' }}>LKR {basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td style={{ textAlign: 'right' }}>-</td>
            </tr>
            {bonusPay > 0 && (
              <tr>
                <td>Performance Bonus / Incentives</td>
                <td style={{ textAlign: 'right' }}>LKR {bonusPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right' }}>-</td>
              </tr>
            )}
            {overtimePay > 0 && (
              <tr>
                <td>Overtime / Commission</td>
                <td style={{ textAlign: 'right' }}>LKR {overtimePay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right' }}>-</td>
              </tr>
            )}
            {allowancePay > 0 && (
              <tr>
                <td>Transport & Allowances</td>
                <td style={{ textAlign: 'right' }}>LKR {allowancePay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right' }}>-</td>
              </tr>
            )}
            {epfDeduction > 0 && (
              <tr>
                <td>EPF Employee Contribution (8%)</td>
                <td style={{ textAlign: 'right' }}>-</td>
                <td style={{ textAlign: 'right', color: '#ef4444' }}>-LKR {epfDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
            {taxDeduction > 0 && (
              <tr>
                <td>PAYE Income Tax</td>
                <td style={{ textAlign: 'right' }}>-</td>
                <td style={{ textAlign: 'right', color: '#ef4444' }}>-LKR {taxDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
            {otherDeductions > 0 && (
              <tr>
                <td>Unpaid Leave & Penalties</td>
                <td style={{ textAlign: 'right' }}>-</td>
                <td style={{ textAlign: 'right', color: '#ef4444' }}>-LKR {otherDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="totals">
          <div className="totals-left">
            <p><strong>Amount in Words:</strong><br/>{numberToWords(netSalary)}</p>
            {payslipData.notes && <p style={{ marginTop: '8px' }}><strong>Remarks:</strong><br/>{payslipData.notes}</p>}
          </div>
          <div className="totals-right">
            <div className="totals-row">
              <span>Gross Earnings:</span>
              <span>LKR {totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            {totalDeductions > 0 && (
              <div className="totals-row" style={{ color: '#ef4444' }}>
                <span>Total Deductions:</span>
                <span>-LKR {totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="totals-row total-due">
              <span>NET DISBURSED:</span>
              <span>LKR {netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="signature-section">
          <div className="sig-box">HR / Management Authorization</div>
          <div className="sig-box">Employee Signature (Acknowledgment)</div>
        </div>

        <div className="footer" style={{ borderTop: '1px dashed #e2e8f0', marginTop: '30px', paddingTop: '10px' }}>
          <p>Thank you for your service!</p>
          <p style={{ fontSize: '0.6rem', color: '#cbd5e1', marginTop: '5px' }}>Powered by Fitgencore</p>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '0.625rem 2rem',
            fontSize: '0.85rem',
            background: '#0f172a',
            color: '#ffffff',
            fontWeight: 700,
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}
        >
          <Printer size={14} /> Print Payslip
        </button>
      </div>
    </div>
  );
};

export default PublicPayslip;
