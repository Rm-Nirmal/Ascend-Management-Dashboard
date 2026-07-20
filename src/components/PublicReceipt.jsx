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

const PublicReceipt = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [gymDetails, setGymDetails] = useState(null);

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
        const plansSnap = await getDocs(collection(db, 'plans'));
        const plansList = [];
        plansSnap.forEach(docSnap => {
          plansList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPlans(plansList);

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

  useEffect(() => {
    if (!loading && !error && receiptData && queryParams.get('print') === 'true') {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, error, receiptData]);

  if (loading) {
    return (
      <div className="receipt-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', background: '#f8fafc' }}>
        <Loader2 size={36} style={{ color: '#0f172a', animation: 'spin 1.2s linear infinite' }} />
        <span style={{ color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>
          Retrieving receipt details...
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !receiptData) {
    return (
      <div className="receipt-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1.25rem', padding: '2rem', textAlign: 'center', background: '#f8fafc' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <AlertTriangle size={28} style={{ color: '#ef4444' }} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
          RECEIPT UNAVAILABLE
        </h2>
        <p style={{ color: '#475569', fontSize: '0.9rem', maxWidth: '400px', lineHeight: '1.5' }}>
          {error}
        </p>
      </div>
    );
  }

  const isInvoice = type === 'invoice';
  const memberName = isInvoice ? receiptData.member_name : (receiptData.member_name || 'Walk-in Customer');
  const amount = isInvoice ? receiptData.total_amount : receiptData.amount;
  const paymentMethod = isInvoice ? receiptData.payment_method : receiptData.payment_method;
  const reference = isInvoice ? receiptData.invoice_number : (receiptData.payment_reference || receiptData.id.substring(0, 8).toUpperCase());
  const dateStr = isInvoice 
    ? (receiptData.paid_at ? new Date(receiptData.paid_at).toLocaleDateString() : new Date(receiptData.issued_at).toLocaleDateString())
    : (receiptData.date ? new Date(receiptData.date).toLocaleDateString() : new Date(receiptData.created_at).toLocaleDateString());

  const planName = isInvoice 
    ? (plans.find(p => p.id === receiptData.plan_id)?.name || 'Membership Plan')
    : receiptData.source;
  const subtotal = isInvoice ? receiptData.subtotal : amount;
  const discount = isInvoice ? (receiptData.discount_amount || 0) : (receiptData.discount_amount || 0);
  const discountType = isInvoice ? (receiptData.discount_type || 'none') : 'none';
  const discountRate = isInvoice ? (receiptData.discount_rate || 0) : 0;
  const taxAmount = receiptData.tax_amount || 0;

  // RENDER POS THERMAL SLIP
  if (!isInvoice) {
    const quantity = receiptData.quantity || 1;
    const unitPrice = receiptData.unitPrice || (quantity > 0 ? (subtotal / quantity) : subtotal);
    const productSku = receiptData.productSku || receiptData.sku || 'N/A';

    return (
      <div className="receipt-page-container" style={{
        minHeight: '100vh',
        width: '100vw',
        background: '#f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}>
        <style>{`
          .slip-card {
            width: 100%;
            max-width: 340px;
            background: #ffffff;
            border: 1px dashed #cbd5e1;
            padding: 25px 20px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            font-family: "Courier New", Courier, monospace;
            color: #000000;
          }
          .slip-header {
            text-align: center;
            border-bottom: 1px dashed #000000;
            padding-bottom: 15px;
            margin-bottom: 15px;
          }
          .slip-header h2 { margin: 0; font-size: 16px; text-transform: uppercase; font-weight: 800; }
          .slip-header p { margin: 2px 0; font-size: 10px; }
          .slip-details {
            margin-bottom: 15px;
            border-bottom: 1px dashed #000000;
            padding-bottom: 12px;
            font-size: 11px;
          }
          .slip-details p { margin: 3px 0; }
          .slip-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 11px;
          }
          .slip-table th, .slip-table td { padding: 4px 0; text-align: left; }
          .slip-table th { border-bottom: 1px dashed #000000; font-weight: bold; }
          .slip-totals {
            margin-bottom: 20px;
            border-bottom: 1px dashed #000000;
            padding-bottom: 12px;
            font-size: 11px;
          }
          .slip-totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .slip-total-due {
            font-weight: bold;
            font-size: 13px;
            border-top: 1.5px solid #000000;
            padding-top: 6px;
            margin-top: 6px;
          }
          .slip-barcode {
            text-align: center;
            font-size: 10px;
            margin-top: 15px;
            letter-spacing: 2px;
          }
          .slip-footer {
            text-align: center;
            font-size: 10px;
            margin-top: 20px;
            border-top: 1px dashed #000000;
            padding-top: 10px;
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
              padding: 0.5cm;
            }
            .receipt-page-container {
              background: #ffffff !important;
              padding: 0 !important;
              min-height: auto !important;
            }
            .slip-card {
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

        <div className="slip-card">
          <div className="slip-header">
            <h2>{gymDetails?.gymName ? gymDetails.gymName.toUpperCase() : 'ASCEND FITNESS CENTER'}</h2>
            {gymDetails?.address && <p>{gymDetails.address}</p>}
            {gymDetails?.phone && <p>Tel: {gymDetails.phone}</p>}
          </div>

          <div className="slip-details">
            <p><strong>Receipt No:</strong> {reference}</p>
            <p><strong>Date:</strong> {dateStr}</p>
            <p><strong>Customer:</strong> {memberName}</p>
          </div>

          <table className="slip-table">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Item</th>
                <th style={{ width: '15%', textAlignment: 'center' }}>Qty</th>
                <th style={{ width: '15%', textAlignment: 'right' }}>Rate</th>
                <th style={{ width: '20%', textAlignment: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>{receiptData.productName || 'Product'}</strong>
                  <div style={{ fontSize: '9px', color: '#555' }}>SKU: {productSku}</div>
                </td>
                <td style={{ textAlign: 'center' }}>{quantity}</td>
                <td style={{ textAlign: 'right' }}>LKR {unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right' }}>LKR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          <div className="slip-totals">
            <div className="slip-totals-row">
              <span>Subtotal (Excl. Tax):</span>
              <span>LKR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            {discount > 0 && (
              <div className="slip-totals-row" style={{ color: '#b91c1c' }}>
                <span>Discount Applied:</span>
                <span>-LKR {discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="slip-totals-row">
                <span>VAT / Sales Tax:</span>
                <span>LKR {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="slip-totals-row slip-total-due">
              <span>NET TOTAL PAID:</span>
              <span>LKR {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div style={{ fontSize: '9px', fontStyle: 'italic', marginBottom: '10px' }}>
            Amount: {numberToWords(amount)}
          </div>

          <div className="slip-barcode">
            ||||| | |||| ||| || |||| | ||||| |<br/>
            *{reference}*
          </div>

          <div className="slip-footer">
            <p>Thank you for your purchase!</p>
            <p style={{ fontSize: '8px', marginTop: '4px' }}>Powered by Fitgencore</p>
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
            <Printer size={14} /> Print Receipt
          </button>
        </div>
      </div>
    );
  }

  // RENDER A4 MEMBERSHIP RECEIPT
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
        .footer {
          text-align: center;
          font-size: 0.7rem;
          color: #94a3b8;
          margin-top: 40px;
          border-top: 1px dashed #e2e8f0;
          padding-top: 15px;
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
            <h2>{gymDetails?.gymName ? gymDetails.gymName.toUpperCase() : 'ASCEND FITNESS CENTER'}</h2>
            {gymDetails?.address && <p>{gymDetails.address}</p>}
            <p>Email: {gymDetails?.email || 'billing@ascend.lk'} | Tel: {gymDetails?.phone || '+94 11 234 5678'}</p>
          </div>
          <div className="header-right">
            <h3>MEMBERSHIP RECEIPT</h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Original Copy</p>
          </div>
        </div>

        <div className="details-grid">
          <div>
            <p><strong>Member ID:</strong> {receiptData.member_id?.substring(0, 12) || 'N/A'}</p>
            <p><strong>Member Name:</strong> {memberName}</p>
            <p><strong>Email:</strong> {receiptData.member_email || 'N/A'}</p>
          </div>
          <div className="header-right">
            <p><strong>Invoice Number:</strong> {reference}</p>
            <p><strong>Payment Date:</strong> {dateStr}</p>
            <p><strong>Payment Mode:</strong> <span style={{ textTransform: 'capitalize' }}>{paymentMethod?.replace('_', ' ') || 'Card'}</span></p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>{planName}</strong>
                <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>Gym facility membership/service cleared log</div>
              </td>
              <td style={{ textAlign: 'right' }}>LKR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div className="totals">
          <div className="totals-left">
            <p><strong>Amount in Words:</strong><br/>{numberToWords(amount)}</p>
          </div>
          <div className="totals-right">
            <div className="totals-row">
              <span>Subtotal:</span>
              <span>LKR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            {discount > 0 && (
              <div className="totals-row" style={{ color: '#ef4444' }}>
                <span>Discounts Applied:</span>
                <span>-LKR {discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="totals-row total-due">
              <span>TOTAL PAID:</span>
              <span>LKR {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="footer">
          <p>Thank you for your payment!</p>
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
          <Printer size={14} /> Print Receipt
        </button>
      </div>
    </div>
  );
};

export default PublicReceipt;
