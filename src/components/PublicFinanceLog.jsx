import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Dumbbell, Search, AlertTriangle, Loader2, ArrowLeft, TrendingUp, DollarSign } from 'lucide-react';

const PublicFinanceLog = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logData, setLogData] = useState([]);
  const [gymDetails, setGymDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Extract query parameters
  const queryParams = new URLSearchParams(window.location.search);
  const gymId = queryParams.get('gymId') || 'gym_ascend_hq';
  const isIncome = queryParams.get('view') === 'income_log';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Gym details
        const gymSettingsQuery = query(collection(db, 'gymSettings'), where('gymId', '==', gymId));
        const gymSettingsSnap = await getDocs(gymSettingsQuery);
        if (!gymSettingsSnap.empty) {
          setGymDetails(gymSettingsSnap.docs[0].data());
        } else {
          const gymsQuery = query(collection(db, 'gyms'), where('gymId', '==', gymId));
          const gymsSnap = await getDocs(gymsQuery);
          if (!gymsSnap.empty) {
            setGymDetails(gymsSnap.docs[0].data());
          }
        }

        // 2. Fetch Finance log data
        if (isIncome) {
          // Fetch from payments collection (COLLECTIONS.INCOME / COLLECTIONS.INVOICES)
          const paymentsQuery = query(collection(db, 'payments'), where('gymId', '==', gymId));
          const paymentsSnap = await getDocs(paymentsQuery);
          const rawItems = paymentsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
          
          // Map to Income items and filter duplicates (since both manuals & invoices are stored in payments)
          const mappedItems = [];
          const seen = new Set();
          
          rawItems.forEach(item => {
            if (seen.has(item.id)) return;
            seen.add(item.id);

            if (item.invoice_number) {
              // Membership Invoice payment
              if (item.status === 'paid') {
                mappedItems.push({
                  id: item.id,
                  date: (item.paid_at || item.issued_at || '').split('T')[0],
                  member: item.member_name || 'Registered Member',
                  source: 'Membership Payments',
                  paymentMethod: item.payment_method || 'card',
                  reference: item.invoice_number,
                  amount: item.total_amount || 0
                });
              }
            } else {
              // Manual Income / Product Sales
              mappedItems.push({
                id: item.id,
                date: item.date || '',
                member: item.member_name || 'Walk-in Customer',
                source: item.source || 'Product Sales',
                paymentMethod: item.payment_method || 'cash',
                reference: item.payment_reference || '',
                amount: item.amount || 0
              });
            }
          });

          // Sort descending by date
          mappedItems.sort((a, b) => b.date.localeCompare(a.date));
          setLogData(mappedItems);

        } else {
          // Fetch from expenses collection (COLLECTIONS.EXPENSES)
          const expensesQuery = query(collection(db, 'expenses'), where('gymId', '==', gymId));
          const expensesSnap = await getDocs(expensesQuery);
          const mappedItems = expensesSnap.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              date: data.date || '',
              title: data.title || 'Operating Expense',
              category: data.category || 'General',
              paymentMethod: data.payment_method || 'cash',
              amount: data.amount || 0
            };
          });

          // Sort descending by date
          mappedItems.sort((a, b) => b.date.localeCompare(a.date));
          setLogData(mappedItems);
        }

      } catch (err) {
        console.error('Error fetching public finance logs:', err);
        setError('Unable to load finance log details. Please verify the URL or try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [gymId, isIncome]);

  // Filter list based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return logData;
    const queryStr = searchTerm.toLowerCase();
    
    if (isIncome) {
      return logData.filter(item => 
        item.member.toLowerCase().includes(queryStr) ||
        item.source.toLowerCase().includes(queryStr) ||
        item.paymentMethod.toLowerCase().includes(queryStr) ||
        item.reference.toLowerCase().includes(queryStr)
      );
    } else {
      return logData.filter(item => 
        item.title.toLowerCase().includes(queryStr) ||
        item.category.toLowerCase().includes(queryStr) ||
        item.paymentMethod.toLowerCase().includes(queryStr)
      );
    }
  }, [logData, searchTerm, isIncome]);

  // Sum total for the displayed list
  const totalSum = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredData]);

  if (loading) {
    return (
      <div className="receipt-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', background: 'var(--bg-primary)' }}>
        <Loader2 size={36} style={{ color: 'var(--color-primary)', animation: 'spin 1.2s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
          Retrieving financial records...
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="receipt-page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1.25rem', padding: '2rem', textAlign: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <AlertTriangle size={28} style={{ color: 'var(--color-primary)' }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 700, color: '#fff' }}>
          ACCESS LIMITATION
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', lineHeight: '1.5', fontFamily: 'var(--font-body)' }}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="receipt-page-container" style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '2.5rem 1.5rem',
      backgroundAttachment: 'fixed',
      backgroundImage: 'radial-gradient(circle at 50% 15%, rgba(255, 255, 255, 0.05) 0%, transparent 60%)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Oswald:wght@500;700&display=swap');
        
        .log-card {
          width: 100%;
          max-width: 960px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 2.5rem;
          box-shadow: 0 10px 40px 0 rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(15px);
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .dashboard-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .dashboard-table th {
          padding: 0.85rem 1rem;
          font-family: var(--font-display);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-color);
          font-weight: 700;
        }

        .dashboard-table td {
          padding: 1rem;
          font-size: 0.85rem;
          border-bottom: 1px solid rgba(255,255,255,0.02);
          color: var(--text-secondary);
        }

        .dashboard-table tbody tr:hover {
          background: rgba(255,255,255,0.01);
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (max-width: 768px) {
          .log-card {
            padding: 1.5rem 1rem;
          }
          .table-desktop {
            display: none;
          }
          .mobile-cards {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          .mobile-card {
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 8px;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
        }

        @media (min-width: 769px) {
          .mobile-cards {
            display: none;
          }
        }
      `}</style>

      <div className="log-card">
        {/* Gym Brand Identity */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff', fontWeight: 800, fontSize: '1.35rem', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
              <Dumbbell size={22} style={{ color: 'var(--color-primary)' }} /> {gymDetails?.gymName ? gymDetails.gymName.toUpperCase() : 'ASCEND FITNESS HQ'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginTop: '0.25rem', fontFamily: 'var(--font-body)' }}>
              Official Financial Logs Terminal
            </span>
          </div>
          <div style={{ background: 'var(--color-primary-glow)', border: '1px solid var(--color-primary)', padding: '0.6rem 1.25rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
            <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>
              {isIncome ? 'TOTAL REVENUE' : 'TOTAL EXPENSES'}: LKR {totalSum.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Header Title & Real-time Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>
            {isIncome ? 'Income Logs Directory' : 'Operating Expenses Directory'}
          </h2>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={isIncome ? "Search by member or source..." : "Search by expense, category..."}
              className="glass-input"
              style={{ paddingLeft: '2rem', width: '260px', padding: '0.4rem 1rem 0.4rem 2rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="table-desktop" style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', background: 'rgba(0,0,0,0.15)' }}>
          {isIncome ? (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member / Client</th>
                  <th>Source</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td style={{ color: '#fff', fontWeight: 600 }}>{item.member}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.7rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        background: 'rgba(255,255,255,0.02)',
                        color: item.source === 'Membership Payments' ? 'var(--color-primary)' : 'var(--text-muted)'
                      }}>
                        {item.source}
                      </span>
                    </td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>{item.paymentMethod}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {item.reference || 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                      LKR {item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                      No matching income records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense Title</th>
                  <th>Category</th>
                  <th>Payment Method</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td style={{ color: '#fff', fontWeight: 600 }}>{item.title}</td>
                    <td>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.7rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        background: 'rgba(255,255,255,0.02)',
                        color: 'var(--text-muted)'
                      }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>{item.paymentMethod}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>
                      LKR {item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                      No matching expense records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile View Cards */}
        <div className="mobile-cards">
          {filteredData.map((item) => (
            <div key={item.id} className="mobile-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.date}</span>
                <span style={{ fontWeight: 700, color: isIncome ? 'var(--color-primary)' : 'var(--text-muted)', fontSize: '0.95rem' }}>
                  LKR {item.amount.toLocaleString()}
                </span>
              </div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                {isIncome ? item.member : item.title}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                <span style={{
                  padding: '0.1rem 0.4rem',
                  fontSize: '0.65rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.01)',
                  color: 'var(--text-muted)'
                }}>
                  {isIncome ? item.source : item.category}
                </span>
                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {item.paymentMethod}
                </span>
                {isIncome && item.reference && (
                  <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--text-dark)', marginLeft: 'auto' }}>
                    Ref: {item.reference}
                  </span>
                )}
              </div>
            </div>
          ))}
          {filteredData.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              No matching records found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-dark)', marginTop: '2.5rem', letterSpacing: '0.05em', textTransform: 'uppercase', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
          Ascend Gym Management System • Powered by Fitgencore
        </div>
      </div>
    </div>
  );
};

export default PublicFinanceLog;
