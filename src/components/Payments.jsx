import { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  DollarSign, Landmark, CreditCard, Sparkles, X, Check, Mail, Printer, Eye, Calendar 
} from 'lucide-react';

const createManualReminderLog = (invoice) => {
  return {
    id: `l_${Date.now()}`,
    member: invoice.member_name,
    invoice: invoice.invoice_number,
    type: 'manual_alert',
    channel: 'email',
    sent_at: new Date().toISOString(),
    status: 'sent'
  };
};

const Payments = () => {
  const {
    invoices,
    recordPayment,
    undoPayment,
    trainers,
    processStaffPayroll,
    gymSettings,
    shiftLogs,
    breakLogs,
    leaveRequests
  } = useDashboard();

  const [now] = useState(() => Date.now());

  // Component states
  const [billingTab, setBillingTab] = useState('members'); // members or staff
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [reminderConfig, setReminderConfig] = useState({
    tMinus7: true,
    tMinus3: true,
    tZero: true,
    overdue: true
  });
  
  // Staff payroll states
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [payrollHours, setPayrollHours] = useState(20);
  const [payrollPaymentMethod, setPayrollPaymentMethod] = useState('bank_transfer');

  const selectedTrainerProgress = useMemo(() => {
    if (!selectedTrainer) return null;
    
    const trainerId = selectedTrainer.id;
    const currentMonth = new Date().toISOString().substring(0, 7); // e.g. "2026-07"
    
    const trainerShifts = (shiftLogs || []).filter(
      s => s.employeeId === trainerId && s.startTime.startsWith(currentMonth)
    );
    const trainerBreaks = (breakLogs || []).filter(
      b => b.employeeId === trainerId && b.status === 'completed' && b.startTime.startsWith(currentMonth)
    );
    const trainerLeaves = (leaveRequests || []).filter(
      r => r.employeeId === trainerId && r.status === 'approved' && r.startDate.startsWith(currentMonth)
    );

    const totalShiftSeconds = trainerShifts.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalBreakSeconds = trainerBreaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    const netWorkedSeconds = Math.max(0, totalShiftSeconds - totalBreakSeconds);
    const netWorkedHours = Math.round((netWorkedSeconds / 3600) * 10) / 10;

    const expectedDailyHours = selectedTrainer.working_hours || 8;
    const expectedDailySeconds = expectedDailyHours * 3600;

    const dailyStats = {};
    trainerShifts.forEach(s => {
      const date = s.startTime.substring(0, 10);
      if (!dailyStats[date]) dailyStats[date] = { shiftSeconds: 0, breakSeconds: 0, lateCount: 0 };
      dailyStats[date].shiftSeconds += (s.duration || 0);

      const startDate = new Date(s.startTime);
      if (startDate.getHours() > 9 || (startDate.getHours() === 9 && startDate.getMinutes() > 5)) {
        dailyStats[date].lateCount = 1;
      }
    });

    trainerBreaks.forEach(b => {
      const date = b.startTime.substring(0, 10);
      if (dailyStats[date]) {
        dailyStats[date].breakSeconds += (b.duration || 0);
      }
    });

    let totalOvertimeSeconds = 0;
    let lateDaysCount = 0;
    Object.keys(dailyStats).forEach(date => {
      const netDailySeconds = Math.max(0, dailyStats[date].shiftSeconds - dailyStats[date].breakSeconds);
      if (netDailySeconds > expectedDailySeconds) {
        totalOvertimeSeconds += (netDailySeconds - expectedDailySeconds);
      }
      if (dailyStats[date].lateCount > 0) {
        lateDaysCount++;
      }
    });

    const overtimeHours = Math.round((totalOvertimeSeconds / 3600) * 10) / 10;
    const uniqueDaysWorked = Object.keys(dailyStats).length;

    let approvedLeavesDays = 0;
    trainerLeaves.forEach(req => {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      const diff = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
      approvedLeavesDays += diff;
    });

    return {
      uniqueDaysWorked,
      netWorkedHours,
      totalBreakSeconds,
      overtimeHours,
      lateDaysCount,
      approvedLeavesDays,
      expectedDailyHours,
      dailyBreakTimeAllowed: selectedTrainer.daily_break_time || 60
    };
  }, [selectedTrainer, shiftLogs, breakLogs, leaveRequests]);

  useEffect(() => {
    if (selectedTrainerProgress) {
      setPayrollHours(Math.max(1, Math.round(selectedTrainerProgress.netWorkedHours)));
    }
  }, [selectedTrainerProgress]);

  const handleProcessPayrollSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTrainer) return;
    try {
      const amount = (selectedTrainer.hourly_rate || 0) * payrollHours;
      const res = await processStaffPayroll(selectedTrainer.id, amount, payrollPaymentMethod);
      if (res.success) {
        alert(`Payroll of LKR ${amount.toLocaleString()} processed successfully for ${selectedTrainer.name || selectedTrainer.full_name || 'Staff'}!`);
        setSelectedTrainer(null);
      } else {
        alert(res.message || 'Failed to process payroll. Please try again.');
      }
    } catch (err) {
      console.error('Payroll error:', err);
      alert('An error occurred. Please try again.');
    }
  };

  // List of sent reminders logs (mock state)
  const [reminderLogs, setReminderLogs] = useState([
    { id: 'l1', member: 'Emma Watson', invoice: 'INV-2026-004', type: 'overdue', channel: 'email', sent_at: '2026-05-20T09:00:00Z', status: 'sent' },
    { id: 'l2', member: 'Carlos Mendez', invoice: 'INV-2026-007', type: 't_minus_7', channel: 'email', sent_at: '2026-05-21T10:00:00Z', status: 'sent' }
  ]);

  // Scoped filtering - Focus solely on single Gym HQ (no branch selector)
  const filteredInvoices = invoices;

  // Financial Metrics
  const revenueCollected = useMemo(() => {
    return filteredInvoices
      .filter(i => i.status === 'paid')
      .reduce((sum, inv) => sum + inv.total_amount, 0);
  }, [filteredInvoices]);

  const outstandingAmount = useMemo(() => {
    return filteredInvoices
      .filter(i => i.status === 'open')
      .reduce((sum, inv) => sum + inv.total_amount, 0);
  }, [filteredInvoices]);



  // Revenue by Payment Method Calculations
  const methodRevenue = useMemo(() => {
    const stats = { card: 0, cash: 0, upi: 0, bank_transfer: 0 };
    let totalPaid = 0;
    
    filteredInvoices.forEach(inv => {
      if (inv.status === 'paid') {
        const method = inv.payment_method || 'card';
        stats[method] = (stats[method] || 0) + inv.total_amount;
        totalPaid += inv.total_amount;
      }
    });

    return { stats, total: totalPaid };
  }, [filteredInvoices]);

  // Revenue by Plan Calculations
  const planRevenue = useMemo(() => {
    const stats = { p1: 0, p2: 0, p3: 0 };
    let totalPaid = 0;

    filteredInvoices.forEach(inv => {
      if (inv.status === 'paid') {
        const planId = inv.plan_id || 'p2';
        stats[planId] = (stats[planId] || 0) + inv.total_amount;
        totalPaid += inv.total_amount;
      }
    });

    return { stats, total: totalPaid };
  }, [filteredInvoices]);

  const handlePayInvoice = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      await recordPayment(selectedInvoice.id, paymentMethod);
      setSelectedInvoice(null);
      alert(`Payment recorded successfully via ${paymentMethod.toUpperCase()}!`);
    } catch (err) {
      console.error('Record payment error:', err);
      alert('Failed to record payment. Please try again.');
    }
  };

  const triggerManualReminder = (invoice) => {
    const newLog = createManualReminderLog(invoice);
    setReminderLogs(prev => [newLog, ...prev]);
    alert(`Payment reminder notification sent to ${invoice.member_name} for invoice ${invoice.invoice_number}.`);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Payments & Financials</h1>
          <p>Generate invoices, collect payments, and review outstanding accounts.</p>
        </div>
      </div>

      {/* Tab Selector */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setBillingTab('members')}
          style={{
            background: 'none',
            border: 'none',
            color: billingTab === 'members' ? 'var(--color-primary)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            paddingBottom: '0.5rem',
            borderBottom: billingTab === 'members' ? '2px solid var(--color-primary)' : 'none',
            outline: 'none'
          }}
        >
          Member Invoices
        </button>
        <button 
          onClick={() => setBillingTab('staff')}
          style={{
            background: 'none',
            border: 'none',
            color: billingTab === 'staff' ? 'var(--color-primary)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            paddingBottom: '0.5rem',
            borderBottom: billingTab === 'staff' ? '2px solid var(--color-primary)' : 'none',
            outline: 'none'
          }}
        >
          Staff Payroll
        </button>
      </div>

      {billingTab === 'members' ? (
        <>
          {/* Stats row */}
          <div className="metrics-grid">
            <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-success)' }}>
              <div className="metric-header">
                <span>REVENUE COLLECTED</span>
                <DollarSign size={18} style={{ color: 'var(--color-success)' }} />
              </div>
              <div className="metric-value">LKR {revenueCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div className="metric-subtext">Paid memberships MTD</div>
            </div>

            <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-primary)' }}>
              <div className="metric-header">
                <span>OUTSTANDING ACCOUNT</span>
                <Landmark size={18} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div className="metric-value">LKR {outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div className="metric-subtext">Awaiting payment (Open status)</div>
            </div>
          </div>
      
          {/* Revenue Breakdowns (FR-PAY-03) */}
          <div className="glass-card grid-2" style={{ gap: '2.5rem', marginBottom: '2rem', padding: '1.5rem 2rem' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
                Revenue by Payment Method
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Card */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>Credit/Debit Card</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      LKR {methodRevenue.stats.card.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({methodRevenue.total > 0 ? ((methodRevenue.stats.card / methodRevenue.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${methodRevenue.total > 0 ? (methodRevenue.stats.card / methodRevenue.total) * 100 : 0}%`, 
                      height: '100%', 
                      background: 'var(--color-primary)', 
                      borderRadius: '4px',
                      boxShadow: '0 0 8px var(--color-primary)' 
                    }} />
                  </div>
                </div>
                {/* Cash */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>Cash Punch</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      LKR {methodRevenue.stats.cash.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({methodRevenue.total > 0 ? ((methodRevenue.stats.cash / methodRevenue.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${methodRevenue.total > 0 ? (methodRevenue.stats.cash / methodRevenue.total) * 100 : 0}%`, 
                      height: '100%', 
                      background: 'var(--color-success)', 
                      borderRadius: '4px',
                      boxShadow: '0 0 8px var(--color-success)' 
                    }} />
                  </div>
                </div>
                {/* UPI */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>Mobile UPI</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      LKR {methodRevenue.stats.upi.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({methodRevenue.total > 0 ? ((methodRevenue.stats.upi / methodRevenue.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${methodRevenue.total > 0 ? (methodRevenue.stats.upi / methodRevenue.total) * 100 : 0}%`, 
                      height: '100%', 
                      background: 'var(--color-warning)', 
                      borderRadius: '4px',
                      boxShadow: '0 0 8px var(--color-warning)' 
                    }} />
                  </div>
                </div>
                {/* Bank Wire */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>Bank Wire</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      LKR {methodRevenue.stats.bank_transfer.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({methodRevenue.total > 0 ? ((methodRevenue.stats.bank_transfer / methodRevenue.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${methodRevenue.total > 0 ? (methodRevenue.stats.bank_transfer / methodRevenue.total) * 100 : 0}%`, 
                      height: '100%', 
                      background: 'var(--color-ai)', 
                      borderRadius: '4px',
                      boxShadow: '0 0 8px var(--color-ai)' 
                    }} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} style={{ color: 'var(--color-success)' }} />
                Revenue by Membership Plan
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {/* Starter (p1) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>Basic Starter (LKR 4,500)</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      LKR {planRevenue.stats.p1.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({planRevenue.total > 0 ? ((planRevenue.stats.p1 / planRevenue.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${planRevenue.total > 0 ? (planRevenue.stats.p1 / planRevenue.total) * 100 : 0}%`, 
                      height: '100%', 
                      background: '#38bdf8', 
                      borderRadius: '4px',
                      boxShadow: '0 0 8px #38bdf8' 
                    }} />
                  </div>
                </div>
                {/* Elite (p2) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>Fitgencore Elite (LKR 8,500)</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      LKR {planRevenue.stats.p2.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({planRevenue.total > 0 ? ((planRevenue.stats.p2 / planRevenue.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${planRevenue.total > 0 ? (planRevenue.stats.p2 / planRevenue.total) * 100 : 0}%`, 
                      height: '100%', 
                      background: 'var(--color-primary)', 
                      borderRadius: '4px',
                      boxShadow: '0 0 8px var(--color-primary)' 
                    }} />
                  </div>
                </div>
                {/* VIP (p3) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>VIP Platinum (LKR 15,000)</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      LKR {planRevenue.stats.p3.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({planRevenue.total > 0 ? ((planRevenue.stats.p3 / planRevenue.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${planRevenue.total > 0 ? (planRevenue.stats.p3 / planRevenue.total) * 100 : 0}%`, 
                      height: '100%', 
                      background: '#a855f7', 
                      borderRadius: '4px',
                      boxShadow: '0 0 8px #a855f7' 
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem' }}>
            
            {/* Invoices List */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                  Recent Invoices & Billing logs
                </h3>
              </div>
              
              <div className="table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Inv Number</th>
                      <th>Member Name</th>
                      <th>Total Amount</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No invoices found.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map(inv => {
                        return (
                          <tr key={inv.id}>
                            <td>
                              <button 
                                className="btn-link"
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  color: 'var(--color-primary)', 
                                  fontWeight: 700, 
                                  cursor: 'pointer', 
                                  padding: 0,
                                  textDecoration: 'underline'
                                }}
                                onClick={() => setViewingInvoice(inv)}
                              >
                                {inv.invoice_number}
                              </button>
                            </td>
                            <td style={{ fontWeight: 600 }}>{inv.member_name}</td>
                            <td style={{ fontWeight: 600 }}>LKR {inv.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td>{inv.due_date}</td>
                            <td>
                              <span className={`badge badge-${inv.status === 'paid' ? 'active' : inv.status === 'overdue' ? 'expired' : 'frozen'}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.35rem' }}
                                  title="View Invoice Details"
                                  onClick={() => setViewingInvoice(inv)}
                                >
                                  <Eye size={12} />
                                </button>
                                {inv.status !== 'paid' && inv.status !== 'void' ? (
                                  <>
                                    <button 
                                      className="btn btn-primary" 
                                      style={{ fontSize: '0.7rem', padding: '0.35rem 0.65rem' }}
                                      onClick={() => setSelectedInvoice(inv)}
                                    >
                                      Collect Pay
                                    </button>
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.35rem' }}
                                      title="Send Email Reminder"
                                      onClick={() => triggerManualReminder(inv)}
                                    >
                                      <Mail size={12} />
                                    </button>
                                  </>
                                ) : (
                                   <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                     <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>
                                       Processed
                                     </span>
                                     {inv.status === 'paid' && (
                                       <button 
                                         className="btn btn-secondary" 
                                         style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                         onClick={async () => {
                                           if (confirm(`Are you sure you want to undo the payment for invoice ${inv.invoice_number}?`)) {
                                             const res = await undoPayment(inv.id);
                                             if (res.success) {
                                               alert(`Payment for invoice ${inv.invoice_number} undid successfully.`);
                                             } else {
                                               alert(res.message || 'Failed to undo payment.');
                                             }
                                           }
                                         }}
                                       >
                                         Undo
                                       </button>
                                     )}
                                   </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reminders & Automation configurations (FR-PAY-04) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Automated Reminders Schedule */}
              <div className="glass-card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  Billing Reminders Engine (FR-PAY-04)
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>T-7 Days Early Warning</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Send email reminder 7 days before due date</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={reminderConfig.tMinus7} 
                      onChange={(e) => setReminderConfig({...reminderConfig, tMinus7: e.target.checked})}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>T-3 Days Urgent Alert</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Send urgent notification 3 days before due date</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={reminderConfig.tMinus3} 
                      onChange={(e) => setReminderConfig({...reminderConfig, tMinus3: e.target.checked})}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>T-0 Renewal Day Alert</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Send billing reminder on invoice due date</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={reminderConfig.tZero} 
                      onChange={(e) => setReminderConfig({...reminderConfig, tZero: e.target.checked})}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Overdue Suspension Warning</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-alert when payments are overdue</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={reminderConfig.overdue} 
                      onChange={(e) => setReminderConfig({...reminderConfig, overdue: e.target.checked})}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Reminders queued/sent logs */}
              <div className="glass-card" style={{ flexGrow: 1, maxHeight: '280px', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  Notifications Log Feed (FR-NOT-02)
                </h3>
                
                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
                  {reminderLogs.map(log => (
                    <div key={log.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.625rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>{log.member}</span>
                        <span style={{ color: 'var(--color-primary)' }}>{log.type.toUpperCase()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        <span>Invoice: {log.invoice} via {log.channel}</span>
                        <span>{new Date(log.sent_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
          {/* Staff Metrics */}
          <div className="metrics-grid">
            <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-primary)' }}>
              <div className="metric-header">
                <span>EST. MONTHLY PAYROLL</span>
                <DollarSign size={18} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div className="metric-value">
                LKR {trainers.reduce((sum, t) => sum + ((t.hourly_rate || 0) * 20), 0).toLocaleString()}
              </div>
              <div className="metric-subtext">Based on 20 average hours/trainer</div>
            </div>

            <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-warning)' }}>
              <div className="metric-header">
                <span>PENDING PAYOUTS</span>
                <Landmark size={18} style={{ color: 'var(--color-warning)' }} />
              </div>
              <div className="metric-value">
                {trainers.filter(t => t.payment_status === 'pending').length} Staff
              </div>
              <div className="metric-subtext">Awaiting payroll processing</div>
            </div>

            <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-success)' }}>
              <div className="metric-header">
                <span>NEXT PAYROLL DATE</span>
                <Calendar size={18} style={{ color: 'var(--color-success)' }} />
              </div>
              <div className="metric-value">
                {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="metric-subtext">End of current month cycle</div>
            </div>
          </div>

          {/* Payroll Registry Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                Staff Payroll Registry & Payout Log
              </h3>
            </div>
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Specialization</th>
                    <th>Compensation Model</th>
                    <th>Last Payment Date</th>
                    <th>Next Payment Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trainers.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No staff members found.
                      </td>
                    </tr>
                  ) : (
                    trainers.map(t => (
                      <tr key={t.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <img 
                              src={t.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                              alt={t.name || t.full_name || 'Staff'} 
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                              <div style={{ fontWeight: 600 }}>{t.name || t.full_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trainer/Employee</div>
                            </div>
                          </div>
                        </td>
                        <td>{t.specialization || 'General'}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>LKR {Number(t.hourly_rate || 0).toLocaleString()} / hr</div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hourly wages</span>
                        </td>
                        <td>
                          {t.last_payment_date ? new Date(t.last_payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                          {t.next_payment_date ? new Date(t.next_payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                        </td>
                        <td>
                          <span className={`badge badge-${t.payment_status === 'paid' ? 'active' : 'expired'}`}>
                            {t.payment_status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                            onClick={() => { setSelectedTrainer(t); }}
                          >
                            Process Pay
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Collect Payment Modal (FR-PAY-01 to 02) */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                Record Payment Received
              </h2>
              <button 
                onClick={() => setSelectedInvoice(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePayInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Invoice breakdown */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Invoice Number:</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{selectedInvoice.invoice_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Member Name:</span>
                  <span style={{ fontWeight: 600 }}>{selectedInvoice.member_name}</span>
                </div>
                
                <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.75rem 0', paddingTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Membership Subtotal:</span>
                    <span>LKR {selectedInvoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {selectedInvoice.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--color-success)' }}>
                      <span>Discount code:</span>
                      <span>-LKR {selectedInvoice.discount_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-success)', marginTop: '0.5rem', borderTop: '1px dotted var(--border-color)', paddingTop: '0.5rem' }}>
                    <span>Total Bill:</span>
                    <span>LKR {selectedInvoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Select (FR-PAY-02) */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                  Select Payment Collection Method
                </label>
                <div className="grid-2" style={{ gap: '0.75rem' }}>
                  <label style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem', background: paymentMethod === 'card' ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.02)',
                    border: paymentMethod === 'card' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                    padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem'
                  }}>
                    <input 
                      type="radio" name="paymethod" value="card" checked={paymentMethod === 'card'} 
                      onChange={() => setPaymentMethod('card')} style={{ display: 'none' }}
                    />
                    <CreditCard size={16} /> Credit/Debit Card
                  </label>

                  <label style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem', background: paymentMethod === 'cash' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.02)',
                    border: paymentMethod === 'cash' ? '1px solid var(--color-success)' : '1px solid var(--border-color)',
                    padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem'
                  }}>
                    <input 
                      type="radio" name="paymethod" value="cash" checked={paymentMethod === 'cash'} 
                      onChange={() => setPaymentMethod('cash')} style={{ display: 'none' }}
                    />
                    <DollarSign size={16} /> Cash Punch
                  </label>

                  <label style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem', background: paymentMethod === 'bank_transfer' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
                    border: paymentMethod === 'bank_transfer' ? '1px solid var(--color-ai)' : '1px solid var(--border-color)',
                    padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem'
                  }}>
                    <input 
                      type="radio" name="paymethod" value="bank_transfer" checked={paymentMethod === 'bank_transfer'} 
                      onChange={() => setPaymentMethod('bank_transfer')} style={{ display: 'none' }}
                    />
                    <Landmark size={16} /> Bank Wire
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex-gap-1" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  <Check size={14} /> Submit Payment
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* High-fidelity itemized invoice details overlay */}
      {viewingInvoice && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '600px', padding: '2rem', border: '1px solid var(--border-color)', background: 'rgba(23, 23, 23, 0.95)', backdropFilter: 'blur(20px)', boxShadow: '0 0 40px rgba(0, 0, 0, 0.6)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '0.05em' }}>
                  <Sparkles size={20} /> {gymSettings?.gymName ? gymSettings.gymName.toUpperCase() : 'ASCEND FITNESS HQ'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {gymSettings?.address || 'Ascend HQ Single Gym franchise console'}
                </div>
              </div>
              <button 
                onClick={() => setViewingInvoice(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Invoice Meta Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Billed To</span>
                <strong style={{ fontSize: '0.95rem', display: 'block', color: '#fff' }}>{viewingInvoice.member_name}</strong>
                <span style={{ color: 'var(--text-muted)' }}>Registered Member ID: {viewingInvoice.member_id}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Invoice Details</span>
                <div>Invoice No: <strong style={{ color: 'var(--color-primary)' }}>{viewingInvoice.invoice_number}</strong></div>
                <div>Issue Date: {viewingInvoice.issued_at ? new Date(viewingInvoice.issued_at).toLocaleDateString() : 'N/A'}</div>
                <div>Due Date: {viewingInvoice.due_date}</div>
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Description</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Qty</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Rate</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>
                      <strong style={{ color: '#fff' }}>
                        {viewingInvoice.plan_id === 'p1' ? 'Basic Starter Plan' : viewingInvoice.plan_id === 'p3' ? 'VIP Platinum Plan' : 'Fitgencore Elite Plan'}
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        30 Days recurring gym facility access & training desk integration
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: '#fff' }}>1</td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#fff' }}>LKR {viewingInvoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#fff' }}>LKR {viewingInvoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Subtotals & Billing details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Payment Status Info</span>
                {viewingInvoice.status === 'paid' ? (
                  <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', padding: '0.75rem', borderRadius: '8px', color: 'var(--color-success)' }}>
                    <div style={{ fontWeight: 600 }}>Payment Settled Successfully</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Method: {viewingInvoice.payment_method ? viewingInvoice.payment_method.toUpperCase() : 'CARD'}
                    </div>
                    {viewingInvoice.paid_at && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Cleared at: {new Date(viewingInvoice.paid_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', padding: '0.75rem', borderRadius: '8px', color: 'var(--color-warning)' }}>
                    <div style={{ fontWeight: 600 }}>Awaiting Payment ({viewingInvoice.status.toUpperCase()})</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      This invoice is currently outstanding. Process the payment via the dashboard terminal or send a billing alert.
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                  <span style={{ color: '#fff' }}>LKR {viewingInvoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                {viewingInvoice.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
                    <span>Discounts:</span>
                    <span>-LKR {viewingInvoice.discount_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-success)', borderTop: '1px dotted var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span>Total Bill:</span>
                  <span>LKR {viewingInvoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '1.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Powered by Fitgencore
              </div>
            </div>

            {/* Footer controls */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => window.print()} style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Printer size={12} /> Print Receipt
              </button>
              <button className="btn btn-primary" onClick={() => setViewingInvoice(null)} style={{ fontSize: '0.8rem' }}>
                Dismiss
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Process Payroll Modal */}
      {selectedTrainer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                Process Staff Payroll
              </h2>
              <button onClick={() => setSelectedTrainer(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <img src={selectedTrainer.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} alt={selectedTrainer.name || selectedTrainer.full_name || 'Staff'} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <div style={{ fontWeight: 700 }}>{selectedTrainer.name || selectedTrainer.full_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Specialization: {selectedTrainer.specialization || 'General'}</div>
              </div>
            </div>

            {selectedTrainerProgress && (
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.85rem',
                fontSize: '0.8rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', color: 'var(--color-primary)', letterSpacing: '0.05em' }}>
                  Monthly Progress Report ({new Date().toLocaleString('default', { month: 'long' })})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Days Clocked In:</span>
                    <strong style={{ color: '#fff' }}>{selectedTrainerProgress.uniqueDaysWorked} Days</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Work Hours Logged:</span>
                    <strong style={{ color: '#fff' }}>{selectedTrainerProgress.netWorkedHours} hrs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Break Time:</span>
                    <strong style={{ color: '#f59e0b' }}>
                      {Math.round(selectedTrainerProgress.totalBreakSeconds / 60)} mins
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Extra Hours (OT):</span>
                    <strong style={{ color: 'var(--color-success)' }}>+{selectedTrainerProgress.overtimeHours} hrs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Late Clock-ins:</span>
                    <strong style={{ color: 'var(--color-danger)' }}>{selectedTrainerProgress.lateDaysCount} Late(s)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Leaves Taken:</span>
                    <strong style={{ color: '#fff' }}>{selectedTrainerProgress.approvedLeavesDays} Day(s)</strong>
                  </div>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px dashed var(--border-color)', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                  Quota: {selectedTrainerProgress.expectedDailyHours} hrs/day, max break {selectedTrainerProgress.dailyBreakTimeAllowed} mins/day.
                </div>
              </div>
            )}

            <form onSubmit={handleProcessPayrollSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div className="grid-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hourly Rate (LKR)</label>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, padding: '0.5rem 0', color: '#fff' }}>
                    LKR {Number(selectedTrainer.hourly_rate || 0).toLocaleString()} / hr
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hours Worked</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    className="glass-input"
                    value={payrollHours}
                    onChange={(e) => setPayrollHours(parseInt(e.target.value) || 0)}
                    style={{ marginTop: '0.25rem', padding: '0.45rem 0.65rem' }}
                  />
                </div>
              </div>

              {/* Total payout card */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Payout:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-success)' }}>
                  LKR {((selectedTrainer.hourly_rate || 0) * payrollHours).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Payout Dates */}
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment Date: <strong>Today</strong></span>
                <span>Next Payment Date: <strong>{new Date(now + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong></span>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payout Payment Method</label>
                <select
                  className="glass-select"
                  style={{ marginTop: '0.35rem', width: '100%', padding: '0.5rem' }}
                  value={payrollPaymentMethod}
                  onChange={(e) => setPayrollPaymentMethod(e.target.value)}
                >
                  <option value="bank_transfer">🏦 Bank Wire Transfer (Recommended)</option>
                  <option value="cash">💵 Cash Payout</option>
                  <option value="card">💳 Credit/Debit Card</option>
                </select>
              </div>

              <div className="grid-2 margin-t-1" style={{ gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedTrainer(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" style={{ fontWeight: 600 }}>
                  Approve Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
