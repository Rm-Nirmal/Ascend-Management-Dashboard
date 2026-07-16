import { useState, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { db, COLLECTIONS } from '../../lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  DollarSign, TrendingUp, Plus, Eye, X, 
  Calendar, Filter, Search, CheckCircle, ArrowUpRight, ArrowDownRight, 
  AlertCircle, Users, Printer, FileText, ShieldCheck, Briefcase
} from 'lucide-react';

const isWithinRange = (dateStr, start, end) => {
  const d = new Date(dateStr);
  return d >= start && d <= end;
};

const SaaSFinance = () => {
  const { invoices, expenses, subscriptions, gyms, logAudit, showToast } = useDashboard();

  // Navigation / Filter states
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview', 'transactions'
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  // Modal States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordType, setRecordType] = useState('income'); // 'income' or 'expense'
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Manual Income Form State
  const [incomeForm, setIncomeForm] = useState({
    gymId: '',
    planId: 'starter',
    amount: '',
    paymentMethod: 'card',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    billingPeriod: 'monthly',
    notes: ''
  });

  // Manual Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'Hosting',
    amount: '',
    paymentMethod: 'bank_transfer',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  // ─── 1. CORE METRICS CALCULATIONS ──────────────────────────────────
  
  // Total Revenue (all paid SaaS invoices)
  const totalRevenue = useMemo(() => {
    return invoices
      .filter(inv => inv.isSaaS && inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  }, [invoices]);

  // Total Expenses (all SaaS operating expenses)
  const totalSaaSExpenses = useMemo(() => {
    return expenses
      .filter(exp => exp.isSaaS)
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [expenses]);

  // Monthly Recurring Revenue (MRR) - Active subscriptions sum
  const mrr = useMemo(() => {
    return subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((sum, sub) => sum + (sub.price || 0), 0);
  }, [subscriptions]);

  // Active Subscription Count
  const activeSubsCount = useMemo(() => {
    return subscriptions.filter(sub => sub.status === 'active').length;
  }, [subscriptions]);

  // Average Revenue Per Account (ARPU)
  const arpu = useMemo(() => {
    if (activeSubsCount === 0) return 0;
    return mrr / activeSubsCount;
  }, [mrr, activeSubsCount]);

  // Net SaaS Profit
  const netProfit = totalRevenue - totalSaaSExpenses;

  // ─── 2. CHART CALCULATIONS ──────────────────────────────────────────

  // Last 6 months Income vs Expense comparison
  const chartDataMonthly = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const monthName = targetDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const monthlyIncome = invoices
        .filter(inv => inv.isSaaS && inv.status === 'paid' && inv.paid_at && isWithinRange(inv.paid_at, start, end))
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        
      const monthlyExp = expenses
        .filter(exp => exp.isSaaS && exp.date && isWithinRange(exp.date, start, end))
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);
        
      data.push({
        name: monthName,
        Income: monthlyIncome,
        Expenses: monthlyExp,
        Profit: monthlyIncome - monthlyExp
      });
    }
    return data;
  }, [invoices, expenses]);

  // SaaS Subscription Tier distribution
  const planDistribution = useMemo(() => {
    const counts = { trial: 0, starter: 0, professional: 0, enterprise: 0, custom: 0 };
    subscriptions.forEach(sub => {
      const plan = (sub.planId || 'starter').toLowerCase();
      if (counts[plan] !== undefined) {
        counts[plan]++;
      } else {
        counts.custom++;
      }
    });

    const colors = {
      trial: '#10b981',
      starter: '#3b82f6',
      professional: '#a855f7',
      enterprise: '#f43f5e',
      custom: '#f59e0b'
    };

    return Object.keys(counts)
      .map(key => ({
        name: key.charAt(0).toUpperCase() + key.slice(1) + ' Tier',
        value: counts[key],
        color: colors[key]
      }))
      .filter(item => item.value > 0);
  }, [subscriptions]);

  // ─── 3. TRANSACTION HISTORY MERGING ──────────────────────────────────
  
  const transactions = useMemo(() => {
    let list = [];
    
    // Add SaaS Income
    invoices.forEach(inv => {
      if (inv.isSaaS) {
        list.push({
          id: inv.id,
          date: inv.paid_at ? inv.paid_at.split('T')[0] : (inv.created_at ? inv.created_at.split('T')[0] : ''),
          type: 'Income',
          description: `Subscription - ${inv.gymName || 'Client Gym'} (${inv.plan_id ? inv.plan_id.charAt(0).toUpperCase() + inv.plan_id.slice(1) : 'SaaS'})`,
          category: 'SaaS Subscriptions',
          amount: inv.total_amount || 0,
          paymentMethod: inv.payment_method || 'card',
          reference: inv.invoice_number || inv.payment_reference || 'SAAS-TXN',
          notes: inv.notes || '',
          raw: inv
        });
      }
    });

    // Add SaaS Expenses
    expenses.forEach(exp => {
      if (exp.isSaaS) {
        list.push({
          id: exp.id,
          date: exp.date,
          type: 'Expense',
          description: exp.title,
          category: exp.category || 'Operations',
          amount: exp.amount || 0,
          paymentMethod: exp.payment_method || 'bank_transfer',
          reference: exp.reference || exp.id.substring(0, 8).toUpperCase(),
          notes: exp.notes || '',
          raw: exp
        });
      }
    });

    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return list;
  }, [invoices, expenses]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.reference.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = typeFilter === 'all' || t.type.toLowerCase() === typeFilter;
      const matchMethod = methodFilter === 'all' || t.paymentMethod.toLowerCase() === methodFilter;
      return matchSearch && matchType && matchMethod;
    });
  }, [transactions, searchTerm, typeFilter, methodFilter]);

  // ─── 4. FORM ACTIONS ───────────────────────────────────────────────

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (recordType === 'income') {
        const gymObj = gyms.find(g => g.gymId === incomeForm.gymId);
        const gymName = gymObj ? gymObj.gymName : 'Custom Gym Partner';
        
        const saasInvoice = {
          gymId: incomeForm.gymId || 'custom',
          isSaaS: true,
          gymName,
          invoice_number: incomeForm.reference || `SAAS-INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          subtotal: parseFloat(incomeForm.amount),
          tax_amount: 0,
          total_amount: parseFloat(incomeForm.amount),
          status: 'paid',
          issued_at: new Date(incomeForm.date).toISOString(),
          paid_at: new Date(incomeForm.date).toISOString(),
          plan_id: incomeForm.planId,
          created_at: new Date().toISOString(),
          billingPeriod: incomeForm.billingPeriod,
          currency: 'LKR',
          payment_method: incomeForm.paymentMethod,
          notes: incomeForm.notes
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.INVOICES), saasInvoice);
        await logAudit(
          'saas.income_record', 
          'payment', 
          docRef.id, 
          `Manually recorded SaaS Subscription Income: LKR ${parseFloat(incomeForm.amount).toLocaleString()} for ${gymName}`
        );
        showToast(`SaaS Subscription Income recorded successfully.`, 'success');
      } else {
        const saasExpense = {
          gymId: 'super_admin',
          isSaaS: true,
          title: expenseForm.title,
          amount: parseFloat(expenseForm.amount),
          date: expenseForm.date,
          category: expenseForm.category,
          payment_method: expenseForm.paymentMethod,
          reference: expenseForm.reference || `SAAS-EXP-${Math.floor(1000 + Math.random() * 9000)}`,
          notes: expenseForm.notes,
          created_at: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.EXPENSES), saasExpense);
        await logAudit(
          'saas.expense_record', 
          'expense', 
          docRef.id, 
          `Recorded SaaS operating expense: ${expenseForm.title} (LKR ${parseFloat(expenseForm.amount).toLocaleString()})`
        );
        showToast(`SaaS Operating Expense recorded successfully.`, 'success');
      }

      setIsRecordModalOpen(false);
      
      // Reset forms
      setIncomeForm({
        gymId: '', planId: 'starter', amount: '', paymentMethod: 'card', reference: '',
        date: new Date().toISOString().split('T')[0], billingPeriod: 'monthly', notes: ''
      });
      setExpenseForm({
        title: '', category: 'Hosting', amount: '', paymentMethod: 'bank_transfer', reference: '',
        date: new Date().toISOString().split('T')[0], notes: ''
      });
    } catch (err) {
      console.error('Error saving transaction:', err);
      showToast(`Failed to record transaction: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Dynamic Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
            background: #fff !important;
            color: #000 !important;
          }
          #print-receipt-modal, #print-receipt-modal * {
            visibility: visible !important;
          }
          #print-receipt-modal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .receipt-title {
            color: #000000 !important;
            text-shadow: none !important;
          }
          .receipt-table th {
            background-color: #f4f4f5 !important;
            color: #000000 !important;
            border-bottom: 2px solid #000000 !important;
          }
          .receipt-table td {
            border-bottom: 1px solid #e4e4e7 !important;
            color: #000000 !important;
          }
          .badge-paid {
            border: 2px solid #000000 !important;
            color: #000000 !important;
            background: transparent !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(59, 130, 246, 0.05))',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            SaaS Finance Control Panel
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            Multi-tenant revenue metrics, subscription billing details, and platform operations profit ledger.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => { setActiveSubTab('transactions') }}
            style={{ fontSize: '0.85rem' }}
          >
            <FileText size={16} /> View Ledger
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setIsRecordModalOpen(true)}
            style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderColor: 'transparent', gap: '0.5rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Record Transaction
          </button>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '1.5rem' }}>
        <button 
          onClick={() => setActiveSubTab('overview')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'overview' ? '2.5px solid #a855f7' : '2.5px solid transparent',
            color: activeSubTab === 'overview' ? '#a855f7' : 'var(--text-muted)',
            padding: '0.5rem 0.25rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Finance Overview
        </button>
        <button 
          onClick={() => setActiveSubTab('transactions')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'transactions' ? '2.5px solid #a855f7' : '2.5px solid transparent',
            color: activeSubTab === 'transactions' ? '#a855f7' : 'var(--text-muted)',
            padding: '0.5rem 0.25rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Transaction Ledger ({filteredTransactions.length})
        </button>
      </div>

      {activeSubTab === 'overview' ? (
        <>
          {/* KPI Widget Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem'
          }}>
            {/* Total Revenue */}
            <div className="stats-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SaaS Revenue</span>
                <DollarSign size={18} style={{ color: 'var(--color-success)' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0 }}>LKR {totalRevenue.toLocaleString()}</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cumulative subscription revenue</span>
              </div>
            </div>

            {/* MRR */}
            <div className="stats-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Recurring (MRR)</span>
                <TrendingUp size={18} style={{ color: '#a855f7' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0 }}>LKR {mrr.toLocaleString()}</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-success)' }}>From {activeSubsCount} active contracts</span>
              </div>
            </div>

            {/* ARPU */}
            <div className="stats-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Contract Value (ARPU)</span>
                <Users size={18} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0 }}>LKR {arpu.toLocaleString()}</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Average monthly rate per tenant</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="stats-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform Expenses</span>
                <ArrowDownRight size={18} style={{ color: 'var(--color-danger)' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0 }}>LKR {totalSaaSExpenses.toLocaleString()}</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hosting, API, maintenance costs</span>
              </div>
            </div>

            {/* Net Profit */}
            <div className="stats-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', gridColumn: 'span 1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SaaS Net Profit</span>
                <Briefcase size={18} style={{ color: '#22c55e' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: netProfit >= 0 ? '#22c55e' : 'var(--color-danger)' }}>
                  LKR {netProfit.toLocaleString()}
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Net profit margin</span>
              </div>
            </div>
          </div>

          {/* Visualizations Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem',
            alignItems: 'start'
          }}>
            {/* Revenue & Expenses Trend Chart */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} style={{ color: '#a855f7' }} /> SaaS Earnings vs Expenses Trend
              </h4>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartDataMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-dark)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--text-dark)" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} 
                      labelStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="Income" stroke="#22c55e" strokeWidth={2.5} activeDot={{ r: 6 }} name="Gross Revenue" />
                    <Line type="monotone" dataKey="Expenses" stroke="#f43f5e" strokeWidth={2.5} name="Operating Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Plan Distribution Chart */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} style={{ color: '#3b82f6' }} /> Subscription Tier Distribution
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                {planDistribution.length === 0 ? (
                  <div style={{ height: '280px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No subscriptions in system directory.
                  </div>
                ) : (
                  <>
                    <div style={{ width: '220px', height: '220px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={planDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {planDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ background: 'rgba(10,11,15,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
                      {planDistribution.map((entry, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: entry.color }} />
                          <span style={{ fontWeight: 600, flexGrow: 1 }}>{entry.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{entry.value} Client(s)</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Transaction Ledger View */
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          {/* Table Filters header */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexGrow: 1, minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search description, reference..."
                style={{ paddingLeft: '2.25rem' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <select 
                className="form-control" 
                style={{ width: '130px' }}
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="income">Income (+)</option>
                <option value="expense">Expense (-)</option>
              </select>

              <select 
                className="form-control" 
                style={{ width: '160px' }}
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value)}
              >
                <option value="all">All Methods</option>
                <option value="card">Credit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash / Offline</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reference</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Payment Method</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No matching SaaS financial records found in the ledger.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isInc = tx.type === 'Income';
                    return (
                      <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)', verticalAlign: 'middle' }}>
                        <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            <Calendar size={12} /> {tx.date}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            background: isInc ? 'rgba(34, 197, 94, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                            color: isInc ? '#22c55e' : '#f43f5e',
                            border: `1px solid ${isInc ? 'rgba(34, 197, 94, 0.15)' : 'rgba(244, 63, 94, 0.15)'}`
                          }}>
                            {isInc ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{tx.description}</td>
                        <td style={{ padding: '1rem', color: 'var(--text-dark)' }}>{tx.category}</td>
                        <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{tx.reference}</td>
                        <td style={{ padding: '1rem', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                          {tx.paymentMethod.replace('_', ' ')}
                        </td>
                        <td style={{ 
                          padding: '1rem', 
                          textAlign: 'right', 
                          fontWeight: 700, 
                          color: isInc ? '#22c55e' : '#f43f5e' 
                        }}>
                          {isInc ? '+' : '-'} LKR {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <button 
                            className="btn btn-secondary"
                            onClick={() => setSelectedReceipt(tx)}
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', gap: '0.25rem' }}
                            title="Generate Official Receipt / Voucher"
                          >
                            <Eye size={12} /> Receipt
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL: RECORD TRANSACTION ─────────────────────────────────── */}
      {isRecordModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '2rem',
            width: '500px',
            boxShadow: 'var(--shadow-premium)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Record SaaS Transaction</h4>
              <button 
                onClick={() => setIsRecordModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector for Income/Expense */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              background: 'rgba(255,255,255,0.03)', 
              borderRadius: '8px', 
              padding: '0.25rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <button
                type="button"
                onClick={() => setRecordType('income')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  background: recordType === 'income' ? 'linear-gradient(135deg, #a855f7, #3b82f6)' : 'transparent',
                  color: recordType === 'income' ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                Subscription Income (+)
              </button>
              <button
                type="button"
                onClick={() => setRecordType('expense')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  background: recordType === 'expense' ? 'linear-gradient(135deg, #a855f7, #3b82f6)' : 'transparent',
                  color: recordType === 'expense' ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                Platform Expense (-)
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recordType === 'income' ? (
                /* INCOME FORM */
                <>
                  <div className="form-group">
                    <label className="form-label">Client Workspace Gym *</label>
                    <select
                      className="form-control"
                      value={incomeForm.gymId}
                      onChange={e => setIncomeForm(prev => ({ ...prev, gymId: e.target.value }))}
                      required
                    >
                      <option value="">Select Onboarded Gym</option>
                      {gyms.map(gym => (
                        <option key={gym.id} value={gym.gymId}>
                          {gym.gymName} ({gym.gymId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">SaaS Billing Plan</label>
                      <select
                        className="form-control"
                        value={incomeForm.planId}
                        onChange={e => setIncomeForm(prev => ({ ...prev, planId: e.target.value }))}
                      >
                        <option value="trial">Trial Tier</option>
                        <option value="starter">Starter Tier</option>
                        <option value="professional">Professional Tier</option>
                        <option value="enterprise">Enterprise Tier</option>
                        <option value="custom">Custom Deal</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Billing Period</label>
                      <select
                        className="form-control"
                        value={incomeForm.billingPeriod}
                        onChange={e => setIncomeForm(prev => ({ ...prev, billingPeriod: e.target.value }))}
                      >
                        <option value="monthly">Monthly Cycle</option>
                        <option value="yearly">Yearly Cycle</option>
                        <option value="one-time">One-Time / Corporate Upgrade</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Amount Paid (LKR) *</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="e.g. 12000"
                        value={incomeForm.amount}
                        onChange={e => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Payment Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={incomeForm.date}
                        onChange={e => setIncomeForm(prev => ({ ...prev, date: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Payment Gateway / Method</label>
                      <select
                        className="form-control"
                        value={incomeForm.paymentMethod}
                        onChange={e => setIncomeForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      >
                        <option value="card">Credit Card Online</option>
                        <option value="bank_transfer">Bank Transfer (Offline)</option>
                        <option value="cash">Cash / Cheque</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Reference ID / Invoice #</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. TXN-9843-RENEW"
                        value={incomeForm.reference}
                        onChange={e => setIncomeForm(prev => ({ ...prev, reference: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Internal Billing Notes</label>
                    <textarea
                      className="form-control"
                      placeholder="Special contract negotiations, discount credits..."
                      style={{ minHeight: '60px' }}
                      value={incomeForm.notes}
                      onChange={e => setIncomeForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </>
              ) : (
                /* EXPENSE FORM */
                <>
                  <div className="form-group">
                    <label className="form-label">Expense Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. AWS Hosting / Server Costs"
                      value={expenseForm.title}
                      onChange={e => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select
                        className="form-control"
                        value={expenseForm.category}
                        onChange={e => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                      >
                        <option value="Hosting">Cloud Infrastructure / Hosting</option>
                        <option value="Domain">Domain / DNS / SSL certificates</option>
                        <option value="Software">Software Licenses / SaaS Sub-tools</option>
                        <option value="Marketing">Advertising & Marketing</option>
                        <option value="Salaries">Platform Support Salaries</option>
                        <option value="Rent">Office Rent / Co-working spaces</option>
                        <option value="Other">Other Expenses</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Amount Spent (LKR) *</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="e.g. 45000"
                        value={expenseForm.amount}
                        onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Payment Method</label>
                      <select
                        className="form-control"
                        value={expenseForm.paymentMethod}
                        onChange={e => setExpenseForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      >
                        <option value="bank_transfer">Corporate Bank Transfer</option>
                        <option value="card">Company Credit Card</option>
                        <option value="cash">Cash Voucher</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Debit Ref / Voucher ID</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. VOUCH-AWS-JUNE"
                        value={expenseForm.reference}
                        onChange={e => setExpenseForm(prev => ({ ...prev, reference: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Transaction Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={expenseForm.date}
                        onChange={e => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Debit Account Notes</label>
                    <textarea
                      className="form-control"
                      placeholder="e.g. AWS Invoice #98234-June2026, cleared automatically"
                      style={{ minHeight: '60px' }}
                      value={expenseForm.notes}
                      onChange={e => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsRecordModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                  style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderColor: 'transparent' }}
                >
                  {isSaving ? 'Logging Transaction...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: PRINTABLE RECEIPT / VOUCHER PDF ────────────────────────── */}
      {selectedReceipt && (
        <div className="no-print" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          overflowY: 'auto',
          padding: '2rem 0'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '550px', maxWidth: '95%' }}>
            
            {/* Modal Controls Banner (no-print) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-main)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Official PDF Document Viewer
              </span>
              <button 
                onClick={() => setSelectedReceipt(null)}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', cursor: 'pointer', padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* A4 Document Wrapper */}
            <div id="print-receipt-modal" style={{
              background: '#ffffff',
              color: '#000000',
              borderRadius: '8px',
              padding: '2.5rem 2rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              fontFamily: 'Montserrat, sans-serif'
            }}>
              
              {/* Header Section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e4e4e7', paddingBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#000000', fontWeight: 800, fontSize: '1.4rem' }}>
                    <ShieldCheck size={22} style={{ color: '#a855f7' }} /> 
                    <span className="receipt-title" style={{ background: 'linear-gradient(to right, #a855f7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>
                      FITGENCORE
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, display: 'block', marginTop: '0.2rem' }}>
                    SaaS Multi-Tenant Operations
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge-paid" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    border: '1.5px solid #22c55e',
                    color: '#22c55e',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'rgba(34, 197, 94, 0.05)'
                  }}>
                    {selectedReceipt.type === 'Income' ? 'Paid & Cleared' : 'Debited & Paid'}
                  </span>
                </div>
              </div>

              {/* Title descriptor */}
              <div style={{ textAlign: 'center', margin: '0.25rem 0' }}>
                <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, fontSize: '1.1rem' }}>
                  {selectedReceipt.type === 'Income' ? 'Official SaaS Subscription Receipt' : 'Operating Expense Voucher'}
                </h3>
              </div>

              {/* Information Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.8rem', lineHeight: '1.5' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                    {selectedReceipt.type === 'Income' ? 'Client Billing Address' : 'Debit Account Details'}
                  </span>
                  {selectedReceipt.type === 'Income' ? (
                    <>
                      <strong style={{ fontSize: '0.9rem', color: '#000' }}>
                        {selectedReceipt.raw.gymName || 'Client Gym Partner'}
                      </strong>
                      <div>Client ID: {selectedReceipt.raw.gymId}</div>
                      <div style={{ color: '#71717a' }}>FitGenCore Active Tenant Workspace</div>
                    </>
                  ) : (
                    <>
                      <strong style={{ fontSize: '0.9rem', color: '#000' }}>
                        FitGenCore Corporate Treasury
                      </strong>
                      <div>Super Admin Controller Account</div>
                      <div style={{ color: '#71717a' }}>Category: {selectedReceipt.category}</div>
                    </>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.65rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                    Reference Details
                  </span>
                  <div>Doc Ref: <strong>{selectedReceipt.reference}</strong></div>
                  <div>Transaction Date: <strong>{selectedReceipt.date}</strong></div>
                  <div>Gateway: <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{selectedReceipt.paymentMethod}</span></div>
                </div>
              </div>

              {/* Itemized Table */}
              <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', overflow: 'hidden' }}>
                <table className="receipt-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f4f4f5', borderBottom: '1px solid #e4e4e7', textAlign: 'left' }}>
                      <th style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>Description</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>Billing Period</th>
                      <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                      <td style={{ padding: '1rem 0.75rem', maxWidth: '300px' }}>
                        <strong style={{ color: '#000' }}>{selectedReceipt.description}</strong>
                        {selectedReceipt.notes && (
                          <div style={{ fontSize: '0.725rem', color: '#71717a', marginTop: '0.25rem' }}>
                            {selectedReceipt.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'right', textTransform: 'capitalize' }}>
                        {selectedReceipt.raw.billingPeriod || 'one-time'}
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#000' }}>
                        LKR {selectedReceipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Cost Summary Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid #e4e4e7', paddingTop: '1rem', fontSize: '0.825rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#71717a' }}>Subtotal:</span>
                  <span>LKR {selectedReceipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#71717a' }}>Taxes / Vat (0%):</span>
                  <span>LKR 0.00</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: '1rem',
                  color: '#000000',
                  borderTop: '1px dotted #e4e4e7',
                  paddingTop: '0.5rem',
                  marginTop: '0.15rem'
                }}>
                  <span>Amount Cleared:</span>
                  <span>LKR {selectedReceipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem', fontSize: '0.75rem' }}>
                <div>
                  <div style={{ borderBottom: '1px solid #e4e4e7', height: '40px' }} />
                  <span style={{ color: '#71717a', marginTop: '0.25rem', display: 'block', textAlign: 'center' }}>
                    Prepared / Authorized By
                  </span>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #e4e4e7', height: '40px' }} />
                  <span style={{ color: '#71717a', marginTop: '0.25rem', display: 'block', textAlign: 'center' }}>
                    Client Acknowledgement
                  </span>
                </div>
              </div>

              {/* Footer Legal Notes */}
              <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '1rem', fontSize: '0.675rem', color: '#71717a', textAlign: 'center', lineHeight: '1.4' }}>
                This is a computer-generated transaction record. FitGenCore SaaS Headquarters. 
                For billing inquiries, please contact corporate support at billing@fitgencore.com.
              </div>

            </div>

            {/* Print Controls (no-print) */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{
                  padding: '0.65rem 2rem',
                  fontWeight: 700,
                  background: '#ffffff',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
              >
                <Printer size={15} /> Print / Export PDF
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SaaSFinance;
