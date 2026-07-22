import { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  Building2, 
  User, 
  Mail, 
  Trash2, 
  Play, 
  Pause, 
  Key, 
  X,
  Search,
  Eye,
  Sliders,
  DollarSign,
  Activity,
  Calendar,
  Phone,
  MapPin,
  Globe,
  Clock,
  ShieldAlert,
  Check,
  Receipt,
  Edit,
  ArrowRight,
  TrendingUp,
  Award,
  Plus,
  Printer,
  Sparkles,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';

const ClientsList = ({ setActiveTab }) => {
  const { 
    gyms, 
    subscriptions, 
    members, 
    invoices, 
    admins,
    updateGymStatus,
    deleteGym, 
    resetGymOwnerPassword, 
    updateAndRenewSubscription,
    updateGymDetails,
    getGymHealthScore, 
    showToast,
    saasPlans
  } = useDashboard();
  
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [currentDirTab, setCurrentDirTab] = useState('all');
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [revealDrawerPassword, setRevealDrawerPassword] = useState(false);

  const plansToUse = saasPlans && saasPlans.length > 0 ? saasPlans : [
    { id: 'trial', name: 'Trial', price: 0 },
    { id: 'starter', name: 'Starter', price: 6000 },
    { id: 'professional', name: 'Professional', price: 12000 },
    { id: 'enterprise', name: 'Enterprise', price: 30000 }
  ];
  
  // Password reset inline state
  const [resettingOwnerEmail, setResettingOwnerEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Selected gym for detailed profile drawer
  const [selectedGym, setSelectedGym] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('profile'); // 'profile', 'billing', 'usage', 'edit'

  // Invoice / Receipt viewing state
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // Renewal & Update modal states
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewForm, setRenewForm] = useState({
    planId: 'starter',
    installmentPlan: 'Monthly Subscription',
    price: 6000,
    currency: 'LKR',
    durationDays: 30
  });
  const [renewIsSubmitting, setRenewIsSubmitting] = useState(false);

  // Edit gym form state
  const [editForm, setEditForm] = useState({
    gymName: '',
    ownerName: '',
    phone: '',
    address: '',
    country: 'Sri Lanka',
    currency: 'LKR',
    timezone: 'Asia/Colombo',
    freezeMessage: '',
    deactivateMessage: '',
    fitgencoreHotline: ''
  });
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Filter gyms
  const filteredGyms = gyms.filter(gym => 
    gym.gymName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusChange = async (gymId, newStatus) => {
    const res = await updateGymStatus(gymId, newStatus);
    if (!res.success) {
      showToast(res.message, 'error');
    } else {
      // If selected gym is open in drawer, update its status locally
      if (selectedGym && selectedGym.gymId === gymId) {
        setSelectedGym(prev => ({
          ...prev,
          status: newStatus
        }));
      }
    }
  };

  const handleDelete = async (gymId) => {
    const res = await deleteGym(gymId);
    if (res.success) {
      setConfirmDeleteId('');
      if (selectedGym && selectedGym.gymId === gymId) {
        setSelectedGym(null);
      }
    } else {
      showToast(res.message, 'error');
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword) return;
    
    setIsResetting(true);
    const res = await resetGymOwnerPassword(resettingOwnerEmail, newPassword);
    setIsResetting(false);
    
    if (res.success) {
      setResettingOwnerEmail('');
      setNewPassword('');
    } else {
      showToast(res.message, 'error');
    }
  };

  const togglePasswordReveal = (gymId) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [gymId]: !prev[gymId]
    }));
  };

  const openGymProfile = (gym) => {
    setSelectedGym(gym);
    setActiveDrawerTab('profile');
    setRevealDrawerPassword(false);
    setEditForm({
      gymName: gym.gymName || '',
      ownerName: gym.ownerName || '',
      phone: gym.phone || '',
      address: gym.address || '',
      country: gym.country || 'Sri Lanka',
      currency: gym.currency || 'LKR',
      timezone: gym.timezone || 'Asia/Colombo',
      freezeMessage: gym.freezeMessage || '',
      deactivateMessage: gym.deactivateMessage || '',
      fitgencoreHotline: gym.fitgencoreHotline || ''
    });
  };

  const openRenewModal = (gym, sub) => {
    if (!sub) {
      showToast('No subscription record found to renew.', 'error');
      return;
    }
    
    const billingPeriodMapped = sub.billingPeriod === 'one_time' 
      ? '1 Time Payment' 
      : (sub.billingPeriod === 'installment_3mo' ? '3 Month Installment Plan' : 'Monthly Subscription');

    setRenewForm({
      planId: sub.planId || 'starter',
      installmentPlan: billingPeriodMapped,
      price: sub.price || 6000,
      currency: sub.currency || 'LKR',
      durationDays: sub.billingPeriod === 'one_time' ? 365 : (sub.billingPeriod === 'installment_3mo' ? 90 : 30)
    });
    setShowRenewModal(true);
  };

  const handleRenewFormChange = (updatedFields) => {
    const nextForm = { ...renewForm, ...updatedFields };
    
    // Auto calculate price rate & duration if planId or installmentPlan changed
    if (updatedFields.planId || updatedFields.installmentPlan) {
      const selectedPlanObj = plansToUse.find(p => p.name.toLowerCase() === nextForm.planId.toLowerCase() || p.id === nextForm.planId) || 
                              { price: 6000 };
      const basePrice = selectedPlanObj.price || 0;
      
      if (nextForm.installmentPlan === '1 Time Payment') {
        nextForm.price = basePrice * 10; // Annual discount (10 months fee)
        nextForm.durationDays = 365;
      } else if (nextForm.installmentPlan === '3 Month Installment Plan') {
        nextForm.price = basePrice * 3; // 3 months total
        nextForm.durationDays = 90;
      } else {
        nextForm.price = basePrice;
        nextForm.durationDays = 30;
      }
    }
    
    setRenewForm(nextForm);
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGym) return;

    setRenewIsSubmitting(true);
    const billingPeriod = renewForm.installmentPlan === '1 Time Payment' 
      ? 'one_time' 
      : (renewForm.installmentPlan === '3 Month Installment Plan' ? 'installment_3mo' : 'monthly');

    const res = await updateAndRenewSubscription(selectedGym.gymId, {
      ...renewForm,
      billingPeriod
    });
    setRenewIsSubmitting(false);

    if (res.success) {
      setShowRenewModal(false);
      // Refresh local selected gym and open the generated invoice/receipt immediately
      const updatedGym = gyms.find(g => g.gymId === selectedGym.gymId);
      if (updatedGym) {
        setSelectedGym(updatedGym);
      }
      if (res.invoice) {
        setViewingReceipt(res.invoice);
      }
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleEditDetailsSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.gymName || !editForm.ownerName || !editForm.phone) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setIsSavingDetails(true);
    const res = await updateGymDetails(selectedGym.gymId, editForm);
    setIsSavingDetails(false);

    if (res.success) {
      setSelectedGym(prev => ({
        ...prev,
        ...editForm
      }));
      setActiveDrawerTab('profile');
    }
  };

  // Find subscription associated with the gym
  const getSubscriptionForGym = (gymId) => {
    return subscriptions.find(s => s.gymId === gymId);
  };

  // Find SaaS receipts associated with the gym
  const getSaaSReceiptsForGym = (gymId) => {
    return invoices.filter(i => i.gymId === gymId && i.isSaaS === true);
  };

  // Print SaaS Receipt in a new window with a professional theme
  const handlePrintReceipt = (receipt) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Pop-up blocker is enabled. Please allow pop-ups to print the receipt.', 'error');
      return;
    }

    const sub = getSubscriptionForGym(receipt.gymId);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SaaS Invoice - ${receipt.invoice_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Oswald:wght@500;700&display=swap');
          body {
            font-family: 'Montserrat', Arial, sans-serif;
            color: #0b0f19;
            background: #ffffff;
            padding: 40px;
            font-size: 12px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0b0f19;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .gym-name {
            font-family: 'Oswald', sans-serif;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin: 0;
            color: #0b0f19;
          }
          .gym-info {
            font-size: 11px;
            color: #6b7280;
            margin-top: 3px;
          }
          .report-info {
            text-align: right;
          }
          .report-title {
            font-family: 'Oswald', sans-serif;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 1px;
            margin: 0;
            text-transform: uppercase;
          }
          .report-subtitle {
            font-size: 11px;
            color: #6b7280;
            margin-top: 2px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
            background: #fafafa;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
          }
          .summary-col {
            display: flex;
            flex-direction: column;
          }
          .summary-label {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            color: #6b7280;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .summary-value {
            font-size: 13px;
            font-weight: 600;
            color: #0b0f19;
          }
          .summary-subtext {
            font-size: 11px;
            color: #6b7280;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background: #f3f4f6;
            color: #0b0f19;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            padding: 10px;
            text-align: left;
            border-bottom: 2px solid #e5e7eb;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 11px;
            vertical-align: top;
          }
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
          }
          .totals-table {
            width: 300px;
            margin-bottom: 0;
          }
          .totals-table td {
            padding: 6px 0;
            border-bottom: none;
          }
          .total-row {
            font-weight: bold;
            font-size: 14px;
            border-top: 2px solid #0b0f19;
          }
          .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
          }
          .sig-box {
            width: 200px;
            border-top: 1px solid #0b0f19;
            text-align: center;
            padding-top: 6px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          @media print {
            @page {
              margin: 0;
            }
            body {
              padding: 1.5cm;
            }
            .no-print-btn {
              display: none !important;
            }
          }
          .no-print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #0b0f19;
            color: #ffffff;
            border: none;
            padding: 10px 20px;
            font-family: 'Oswald', sans-serif;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: 0.2s;
          }
          .no-print-btn:hover {
            background: #1f2937;
          }
        </style>
      </head>
      <body>
        <button class="no-print-btn" onclick="window.print()">Print / Export PDF</button>

        <div class="header">
          <div>
            <h1 class="gym-name">FITGENCORE SAAS</h1>
            <div class="gym-info">Antigravity Labs (Pvt) Ltd.</div>
            <div class="gym-info">100 Elite Tower, Colombo 03, Sri Lanka | billing@fitgencore.com</div>
          </div>
          <div class="report-info">
            <h2 class="report-title">MEMBERSHIP INVOICE</h2>
            <div class="report-subtitle">Official Billing Statement</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-col">
            <div class="summary-label">Bill To</div>
            <div class="summary-value">${receipt.gymName}</div>
            <div class="summary-subtext">Owner: ${selectedGym?.ownerName || 'N/A'} &bull; Email: ${selectedGym?.ownerEmail || 'N/A'}</div>
          </div>
          <div class="summary-col">
            <div class="summary-label">Invoice Details</div>
            <div class="summary-value">${receipt.invoice_number}</div>
            <div class="summary-subtext">Date: ${receipt.paid_at ? new Date(receipt.paid_at).toLocaleDateString() : new Date(receipt.created_at).toLocaleDateString()}</div>
          </div>
          <div class="summary-col">
            <div class="summary-label">Billing Cycle</div>
            <div class="summary-value" style="text-transform: capitalize;">
              ${receipt.billingPeriod === 'one_time' ? '1 Time (Annual)' : (receipt.billingPeriod === 'installment_3mo' ? '3 Month Installment' : 'Monthly')}
            </div>
            <div class="summary-subtext">Currency: ${(receipt.currency || sub?.currency || 'LKR').toUpperCase()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50%;">Description</th>
              <th style="width: 25%; text-align: center;">Billing Term</th>
              <th style="width: 25%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Fitgencore SaaS Platform - ${receipt.plan_id ? receipt.plan_id.charAt(0).toUpperCase() + receipt.plan_id.slice(1) : 'Starter'} Plan</strong>
                <div style="font-size: 10px; color: #6b7280; margin-top: 3px;">
                  Automated directory isolation, cloud workspace access, member quota management, online support desk.
                </div>
              </td>
              <td style="text-align: center; text-transform: capitalize;">
                ${receipt.billingPeriod === 'one_time' ? '1 Year' : (receipt.billingPeriod === 'installment_3mo' ? '3 Months' : '1 Month')}
              </td>
              <td style="text-align: right; font-weight: 600;">
                ${formatCurrency(receipt.subtotal, receipt.currency || sub?.currency)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; align-items: flex-start; margin-top: 20px;">
          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">${formatCurrency(receipt.subtotal, receipt.currency || sub?.currency)}</td>
              </tr>
              <tr>
                <td>Taxes / VAT (0%):</td>
                <td style="text-align: right;">LKR 0.00</td>
              </tr>
              <tr class="total-row">
                <td>TOTAL PAID:</td>
                <td style="text-align: right;">${formatCurrency(receipt.total_amount, receipt.currency || sub?.currency)}</td>
              </tr>
            </table>
          </div>
        </div>

        <div class="signature-section">
          <div>
            <div style="height: 40px;"></div>
            <div class="sig-box">Authorized Signature</div>
          </div>
          <div>
            <div style="height: 40px;"></div>
            <div class="sig-box">Client Signature</div>
          </div>
        </div>

        <div style="text-align: center; font-size: 9px; color: #94a3b8; margin-top: 50px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
          Thank you for your partnership! &bull; Powered by Fitgencore SaaS
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Format currency (no decimals needed for integer currencies if preferred, but keeping standard)
  const formatCurrency = (val, code = 'LKR') => {
    return `${val?.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${code}`;
  };

  return (
    <div style={{ padding: '2rem', position: 'relative' }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '2rem'
      }}>
        {/* Header and Search bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} style={{ color: '#a855f7' }} /> Client Workspace Directory
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Detailed multi-tenant overview. Manage system isolation, status changes, credentials, and custom renewals.
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
              <input 
                type="text" 
                className="form-control" 
                style={{ paddingLeft: '2.3rem', fontSize: '0.8rem' }} 
                placeholder="Search by gym name, email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {setActiveTab && (
              <button
                className="btn btn-primary"
                onClick={() => setActiveTab('create_gym')}
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.6rem 1rem'
                }}
              >
                <Plus size={16} /> Onboard Workspace
              </button>
            )}
          </div>
        </div>

        {/* Directory Sub-tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          paddingBottom: '0.25rem'
        }}>
          <button
            onClick={() => setCurrentDirTab('all')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: currentDirTab === 'all' ? '2px solid #ffffff' : '2px solid transparent',
              color: currentDirTab === 'all' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            All Workspaces ({filteredGyms.length})
          </button>
          <button
            onClick={() => setCurrentDirTab('installments')}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: currentDirTab === 'installments' ? '2px solid #ffffff' : '2px solid transparent',
              color: currentDirTab === 'installments' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Installment Progress Tracker ({
              gyms.filter(g => {
                const sub = getSubscriptionForGym(g.gymId);
                return sub && (sub.billingPeriod === 'installment_3mo' || sub.billingPeriod === 'monthly');
              }).length
            })
          </button>
        </div>

        {currentDirTab === 'all' ? (
          /* Table View */
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Gym Details</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Owner Info</th>
                  <th style={{ padding: '1rem 0.5rem' }}>SaaS Plan</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Next Payment</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Workspace Status</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Health Score</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGyms.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No client gyms found.
                    </td>
                  </tr>
                ) : (
                  filteredGyms.map(gym => {
                    const healthScore = getGymHealthScore(gym.gymId);
                    let healthColor = '#10b981'; // Green
                    if (healthScore < 50) healthColor = '#ef4444'; // Red
                    else if (healthScore < 75) healthColor = '#f59e0b'; // Orange

                    const ownerAdmin = admins?.find(a => a.gymId === gym.gymId && a.role === 'gym_owner') ||
                                       admins?.find(a => a.email?.toLowerCase() === gym.ownerEmail?.toLowerCase());
                    const ownerPassword = ownerAdmin?.password || (gym.ownerEmail === 'admin@ascend.com' ? 'Admin@123' : (gym.ownerEmail === 'owner@powergym.com' ? 'Owner@123' : '********'));

                    return (
                      <tr key={gym.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.85rem' }}>
                        {/* Gym Details */}
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)'
                            }}>
                              <Building2 size={16} />
                            </div>
                            <div>
                              <span 
                                style={{ display: 'block', fontWeight: 600, cursor: 'pointer', transition: 'color 0.2s' }}
                                onClick={() => openGymProfile(gym)}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
                              >
                                {gym.gymName}
                              </span>
                              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dark)' }}>ID: {gym.gymId}</span>
                            </div>
                          </div>
                        </td>

                        {/* Owner details */}
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <div>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}>
                              <User size={13} style={{ color: 'var(--text-dark)' }} /> {gym.ownerName}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              <Mail size={12} style={{ color: 'var(--text-dark)' }} /> {gym.ownerEmail}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              <Key size={12} style={{ color: 'var(--text-dark)' }} /> Password: <span
                                onClick={() => togglePasswordReveal(gym.gymId)}
                                style={{
                                  cursor: 'pointer',
                                  fontFamily: 'monospace',
                                  fontSize: '0.75rem',
                                  background: 'rgba(255,255,255,0.05)',
                                  padding: '0.05rem 0.25rem',
                                  borderRadius: '4px',
                                  color: 'var(--text-main)',
                                  filter: revealedPasswords[gym.gymId] ? 'none' : 'blur(4px)',
                                  transition: 'filter 0.2s',
                                  marginLeft: '0.15rem',
                                  userSelect: revealedPasswords[gym.gymId] ? 'text' : 'none'
                                }}
                                title={revealedPasswords[gym.gymId] ? "Click to blur" : "Click to reveal"}
                              >
                                {ownerPassword}
                              </span>
                            </span>
                          </div>
                        </td>

                        {/* Plan */}
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{gym.subscriptionPlan}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{gym.installmentPlan || 'Monthly Plan'}</span>
                          </div>
                        </td>

                        {/* Next Payment */}
                        <td style={{ padding: '1rem 0.5rem' }}>
                          {(() => {
                            const sub = getSubscriptionForGym(gym.gymId);
                            if (sub && sub.nextRenewalDate) {
                              try {
                                return new Date(sub.nextRenewalDate).toLocaleDateString();
                              } catch (e) {
                                return sub.nextRenewalDate;
                              }
                            }
                            return 'N/A';
                          })()}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: gym.status === 'suspended' ? 'rgba(239, 68, 68, 0.1)' : 
                                        gym.status === 'frozen' ? 'rgba(245, 158, 11, 0.1)' : 
                                        gym.status === 'trial' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: gym.status === 'suspended' ? '#ef4444' : 
                                   gym.status === 'frozen' ? '#f59e0b' : 
                                   gym.status === 'trial' ? '#3b82f6' : '#10b981',
                            border: `1px solid ${gym.status === 'suspended' ? 'rgba(239, 68, 68, 0.2)' : 
                                                  gym.status === 'frozen' ? 'rgba(245, 158, 11, 0.2)' : 
                                                  gym.status === 'trial' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                          }}>
                            {gym.status === 'suspended' ? 'deactivated' : gym.status}
                          </span>
                        </td>

                        {/* Health Score */}
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 700, 
                            color: healthColor,
                            background: `${healthColor}08`,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            border: `1px solid ${healthColor}15`
                          }}>
                            {healthScore}%
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                            
                            {/* View Profile */}
                            <button
                              onClick={() => openGymProfile(gym)}
                              className="btn btn-secondary"
                              style={{ 
                                padding: '0.4rem', 
                                borderRadius: '6px', 
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '30px',
                                width: '30px'
                              }}
                              title="View Profile and Workspace Details"
                            >
                              <Eye size={14} style={{ color: 'var(--color-primary)' }} />
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => setResettingOwnerEmail(gym.ownerEmail)}
                              className="btn btn-secondary"
                              style={{ 
                                padding: '0.4rem', 
                                borderRadius: '6px', 
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '30px',
                                width: '30px'
                              }}
                              title="Reset Gym Owner Password"
                            >
                              <Key size={14} style={{ color: 'var(--color-warning)' }} />
                            </button>

                            {/* Delete Button */}
                            {confirmDeleteId === gym.gymId ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <button 
                                  onClick={() => handleDelete(gym.gymId)}
                                  className="btn btn-primary" 
                                  style={{ 
                                    padding: '0 0.5rem', 
                                    fontSize: '0.75rem', 
                                    height: '30px', 
                                    background: '#ef4444', 
                                    border: 'none', 
                                    color: '#fff',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  Confirm
                                </button>
                                <button 
                                  onClick={() => setConfirmDeleteId('')}
                                  className="btn btn-secondary" 
                                  style={{ 
                                    padding: '0.4rem', 
                                    height: '30px', 
                                    width: '30px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setConfirmDeleteId(gym.gymId)}
                                className="btn btn-secondary" 
                                style={{ 
                                  padding: '0.4rem', 
                                  borderRadius: '6px', 
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '30px',
                                  width: '30px',
                                  border: '1px solid rgba(239, 68, 68, 0.2)'
                                }}
                                title="Delete Gym Workspace"
                              >
                                <Trash2 size={14} style={{ color: '#ef4444' }} />
                              </button>
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
        ) : (
          /* Installment Tracker View */
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  <th style={{ padding: '1rem 0.5rem' }}>Gym Workspace</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Installment Plan</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Total Paid to Date</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Next Installment Due</th>
                  <th style={{ padding: '1rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGyms.filter(g => {
                  const sub = getSubscriptionForGym(g.gymId);
                  return sub && (sub.billingPeriod === 'installment_3mo' || sub.billingPeriod === 'monthly');
                }).length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No gyms on installment or monthly plans found.
                    </td>
                  </tr>
                ) : (
                  filteredGyms
                    .filter(g => {
                      const sub = getSubscriptionForGym(g.gymId);
                      return sub && (sub.billingPeriod === 'installment_3mo' || sub.billingPeriod === 'monthly');
                    })
                    .map(gym => {
                      const sub = getSubscriptionForGym(gym.gymId);
                      const receipts = getSaaSReceiptsForGym(gym.gymId);
                      const totalPaid = receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
                      
                      // Calculate due status
                      const nextRenewalDate = sub?.nextRenewalDate ? new Date(sub.nextRenewalDate) : null;
                      const today = new Date();
                      const diffTime = nextRenewalDate ? nextRenewalDate.getTime() - today.getTime() : 0;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      let statusText = 'Paid / Up to Date';
                      let badgeColor = '#10b981'; // Green
                      
                      if (!nextRenewalDate) {
                        statusText = 'No Renewal Date';
                        badgeColor = 'var(--text-dark)';
                      } else if (diffDays < 0) {
                        statusText = 'Overdue / Unpaid';
                        badgeColor = '#ef4444'; // Red
                      } else if (diffDays <= 7) {
                        statusText = `Due in ${diffDays} Days`;
                        badgeColor = '#f59e0b'; // Orange
                      }

                      return (
                        <tr key={gym.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.85rem' }}>
                          <td style={{ padding: '1rem 0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-muted)'
                              }}>
                                <Building2 size={16} />
                              </div>
                              <div>
                                <span 
                                  style={{ display: 'block', fontWeight: 600, cursor: 'pointer', transition: 'color 0.2s' }}
                                  onClick={() => openGymProfile(gym)}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
                                >
                                  {gym.gymName}
                                </span>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dark)' }}>ID: {gym.gymId}</span>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '1rem 0.5rem' }}>
                            <div>
                              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                                {gym.subscriptionPlan} Plan
                              </span>
                              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {sub?.billingPeriod === 'installment_3mo' ? '3 Month Installment' : 'Monthly Recurring'}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>
                            {formatCurrency(totalPaid, sub?.currency || 'LKR')}
                          </td>

                          <td style={{ padding: '1rem 0.5rem' }}>
                            {nextRenewalDate ? nextRenewalDate.toLocaleDateString() : 'N/A'}
                          </td>

                          <td style={{ padding: '1rem 0.5rem' }}>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: `${badgeColor}15`,
                              color: badgeColor,
                              border: `1px solid ${badgeColor}30`
                            }}>
                              {statusText}
                            </span>
                          </td>

                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                              {/* Record Next Installment */}
                              <button
                                onClick={() => {
                                  setSelectedGym(gym);
                                  openRenewModal(gym, sub);
                                }}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.4rem',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '30px',
                                  width: '30px'
                                }}
                                title="Collect Payment & Renew (Record Payment)"
                              >
                                <DollarSign size={14} style={{ color: 'var(--color-success)' }} />
                              </button>

                              {/* Print Onboard Register Receipt */}
                              <button
                                onClick={() => {
                                  // Oldest SaaS invoice is the onboard registration receipt
                                  const onboardingInvoice = [...receipts].sort((a,b) => new Date(a.created_at) - new Date(b.created_at))[0];
                                  if (onboardingInvoice) {
                                    setSelectedGym(gym);
                                    setViewingReceipt(onboardingInvoice);
                                  } else {
                                    showToast('No onboarding register receipt found.', 'warning');
                                  }
                                }}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.4rem',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '30px',
                                  width: '30px'
                                }}
                                title="Print original Onboard Registration receipt"
                              >
                                <Printer size={14} style={{ color: 'var(--text-main)' }} />
                              </button>

                              {/* View Billing History Drawer */}
                              <button
                                onClick={() => {
                                  openGymProfile(gym);
                                  setActiveDrawerTab('billing');
                                }}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.4rem',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '30px',
                                  width: '30px'
                                }}
                                title="View Billing History"
                              >
                                <Eye size={14} style={{ color: 'var(--text-main)' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILED PROFILE DRAWER (Slide-out panel from the right) */}
      {selectedGym && (
        <>
          {/* Backdrop overlay */}
          <div 
            onClick={() => setSelectedGym(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(3px)',
              zIndex: 99
            }}
          />
          
          <div style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: '560px',
            background: '#0c0c0c',
            borderLeft: '1px solid var(--border-color)',
            boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.8)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Styles inside for slideIn animation */}
            <style>{`
              @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>

            {/* Drawer Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a855f7'
                }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    {selectedGym.gymName}
                  </h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Workspace Subdomain ID: {selectedGym.gymId}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedGym(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Tabs Navigation */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color)',
              background: 'rgba(0,0,0,0.2)',
              padding: '0 0.75rem'
            }}>
              {[
                { id: 'profile', label: 'Profile & Status' },
                { id: 'usage', label: 'Usage & Quotas' },
                { id: 'billing', label: 'SaaS Receipts' },
                { id: 'edit', label: 'Edit Workspace' }
              ].map(t => {
                const isActive = activeDrawerTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveDrawerTab(t.id)}
                    style={{
                      padding: '1rem 0.75rem',
                      background: 'none',
                      border: 'none',
                      borderBottom: isActive ? '2px solid #ffffff' : '2px solid transparent',
                      color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none',
                      flex: 1,
                      textAlign: 'center'
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Drawer Content viewport */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              
              {/* TAB 1: Profile & Workspace status */}
              {activeDrawerTab === 'profile' && (() => {
                const sub = getSubscriptionForGym(selectedGym.gymId);
                const ownerAdmin = admins?.find(a => a.gymId === selectedGym.gymId && a.role === 'gym_owner') ||
                                   admins?.find(a => a.email?.toLowerCase() === selectedGym.ownerEmail?.toLowerCase());
                const selectedGymOwnerPassword = ownerAdmin?.password || (selectedGym.ownerEmail === 'admin@ascend.com' ? 'Admin@123' : (selectedGym.ownerEmail === 'owner@powergym.com' ? 'Owner@123' : '********'));
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Workspace status controls */}
                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Workspace Status</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: selectedGym.status === 'active' ? '#10b981' : 
                                          selectedGym.status === 'frozen' ? '#f59e0b' : 
                                          selectedGym.status === 'trial' ? '#3b82f6' : '#ef4444'
                            }} />
                            <strong style={{ fontSize: '0.95rem', textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                              {selectedGym.status === 'suspended' ? 'deactivated' : selectedGym.status}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.25rem' }}>
                        <button
                          onClick={() => handleStatusChange(selectedGym.gymId, 'active')}
                          className="btn"
                          style={{
                            flex: 1,
                            fontSize: '0.75rem',
                            padding: '0.45rem',
                            borderRadius: '6px',
                            background: selectedGym.status === 'active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.01)',
                            color: selectedGym.status === 'active' ? '#10b981' : 'var(--text-muted)',
                            border: `1px solid ${selectedGym.status === 'active' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.05)'}`,
                            fontWeight: 600
                          }}
                        >
                          Activate
                        </button>
                        <button
                          onClick={() => handleStatusChange(selectedGym.gymId, 'frozen')}
                          className="btn"
                          style={{
                            flex: 1,
                            fontSize: '0.75rem',
                            padding: '0.45rem',
                            borderRadius: '6px',
                            background: selectedGym.status === 'frozen' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255,255,255,0.01)',
                            color: selectedGym.status === 'frozen' ? '#f59e0b' : 'var(--text-muted)',
                            border: `1px solid ${selectedGym.status === 'frozen' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.05)'}`,
                            fontWeight: 600
                          }}
                        >
                          Freeze
                        </button>
                        <button
                          onClick={() => handleStatusChange(selectedGym.gymId, 'suspended')}
                          className="btn"
                          style={{
                            flex: 1,
                            fontSize: '0.75rem',
                            padding: '0.45rem',
                            borderRadius: '6px',
                            background: selectedGym.status === 'suspended' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.01)',
                            color: selectedGym.status === 'suspended' ? '#ef4444' : 'var(--text-muted)',
                            border: `1px solid ${selectedGym.status === 'suspended' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.05)'}`,
                            fontWeight: 600
                          }}
                        >
                          Deactivate
                        </button>
                      </div>
                    </div>

                    {/* Dashboard Feature Controls */}
                    <div>
                      <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#a855f7', fontWeight: 700, marginBottom: '0.75rem' }}>Dashboard Feature Controls</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem' }}>
                        {[
                          { key: 'ai', name: 'AI Insights Module', desc: 'Predictive churn risk and revenue forecasting' },
                          { key: 'audit', name: 'System Audit Logs', desc: 'Detailed log tracking of gym activities' },
                          { key: 'employees', name: 'Employees Desk & Payroll', desc: 'Staff directory and payslip processing' },
                          { key: 'access', name: 'Access Control Console', desc: 'QR code scanning and attendance logs' },
                          { key: 'registrations', name: 'Registration Queue', desc: 'New member registration approval workflow' },
                          { key: 'finance', name: 'Finance Module', desc: 'Expense logging and income tracking' },
                          { key: 'inventory', name: 'Inventory & POS Module', desc: 'Product catalogs, stock levels, and POS retail sales' },
                          { key: 'support_tickets', name: 'Support Ticket Center', desc: 'Direct support communication channel' }
                        ].map(feature => {
                          const disabledFeatures = selectedGym.disabledFeatures || [];
                          const isEnabled = !disabledFeatures.includes(feature.key);
                          
                          const toggleFeature = async () => {
                            let newDisabled = [...disabledFeatures];
                            if (isEnabled) {
                              newDisabled.push(feature.key);
                            } else {
                              newDisabled = newDisabled.filter(k => k !== feature.key);
                            }
                            
                            const res = await updateGymDetails(selectedGym.gymId, {
                              gymName: selectedGym.gymName,
                              ownerName: selectedGym.ownerName,
                              phone: selectedGym.phone || '',
                              address: selectedGym.address || '',
                              country: selectedGym.country || '',
                              currency: selectedGym.currency || '',
                              timezone: selectedGym.timezone || '',
                              disabledFeatures: newDisabled
                            });
                            
                            if (res.success) {
                              setSelectedGym(prev => ({
                                ...prev,
                                disabledFeatures: newDisabled
                              }));
                            }
                          };

                          return (
                            <div key={feature.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', color: 'var(--text-main)' }}>{feature.name}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{feature.desc}</span>
                              </div>
                              <button
                                type="button"
                                onClick={toggleFeature}
                                style={{
                                  background: isEnabled ? '#10b981' : 'rgba(255,255,255,0.05)',
                                  border: 'none',
                                  color: '#fff',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '20px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  minWidth: '55px',
                                  textAlign: 'center',
                                  transition: 'background var(--transition-fast)'
                                }}
                              >
                                {isEnabled ? 'ON' : 'OFF'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Owner credentials card */}
                    <div>
                      <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#a855f7', fontWeight: 700, marginBottom: '0.75rem' }}>Owner Info</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={14} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '0.85rem' }}>{selectedGym.ownerName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '0.85rem' }}>{selectedGym.ownerEmail}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '0.85rem' }}>{selectedGym.phone || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '0.85rem' }}>{selectedGym.address || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Key size={14} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '0.85rem' }}>
                            Password:{' '}
                            <span
                              onClick={() => setRevealDrawerPassword(!revealDrawerPassword)}
                              style={{
                                cursor: 'pointer',
                                fontFamily: 'monospace',
                                background: 'rgba(255,255,255,0.05)',
                                padding: '0.05rem 0.25rem',
                                borderRadius: '4px',
                                color: 'var(--text-main)',
                                filter: revealDrawerPassword ? 'none' : 'blur(4px)',
                                transition: 'filter 0.2s',
                                userSelect: revealDrawerPassword ? 'text' : 'none'
                              }}
                              title={revealDrawerPassword ? "Click to blur" : "Click to reveal"}
                            >
                              {selectedGymOwnerPassword}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active Subscription Panel */}
                    {sub ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#a855f7', fontWeight: 700, margin: 0 }}>SaaS Subscription Plan</h5>
                          <button
                            onClick={() => openRenewModal(selectedGym, sub)}
                            className="btn btn-primary"
                            style={{
                              padding: '0.4rem 0.75rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <TrendingUp size={12} /> Renew & Update
                          </button>
                        </div>
                        
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '1rem', 
                          background: 'rgba(168, 85, 247, 0.02)', 
                          border: '1px solid rgba(168, 85, 247, 0.1)', 
                          borderRadius: '8px', 
                          padding: '1.25rem' 
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Tier</span>
                              <h4 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'capitalize', color: 'var(--text-main)', margin: '0.1rem 0 0 0' }}>
                                {sub.planId} Plan
                              </h4>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pricing Rate</span>
                              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '0.1rem' }}>
                                {sub.price?.toLocaleString()} {sub.currency}
                              </div>
                            </div>
                          </div>

                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                              <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Billing Schedule</span>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>
                                {sub.billingPeriod === 'one_time' ? '1 Time / Annual' : (sub.billingPeriod === 'installment_3mo' ? '3 Month Installment' : 'Monthly Recurring')}
                              </span>
                            </div>
                            <div>
                              <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Renewal Date</span>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                                <Calendar size={13} /> {sub.nextRenewalDate ? new Date(sub.nextRenewalDate).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No subscription record found.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 2: Usage & System Activity */}
              {activeDrawerTab === 'usage' && (() => {
                const gymMembers = members.filter(m => m.gymId === selectedGym.gymId);
                const activeMembers = gymMembers.filter(m => m.status === 'active');
                const frozenMembers = gymMembers.filter(m => m.status === 'frozen');
                const cancelledMembers = gymMembers.filter(m => m.status === 'cancelled');

                const sub = getSubscriptionForGym(selectedGym.gymId);
                const maxMembersAllowed = sub ? sub.maxMembers : 100;
                const percentQuotaUsed = Math.round((gymMembers.length / (maxMembersAllowed || 1)) * 100);

                const healthScore = getGymHealthScore(selectedGym.gymId);
                let healthColor = '#10b981';
                if (healthScore < 50) healthColor = '#ef4444';
                else if (healthScore < 75) healthColor = '#f59e0b';

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Health Card */}
                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.5rem'
                    }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        border: `3px solid ${healthColor}20`,
                        borderTopColor: healthColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: healthColor,
                        fontWeight: 800,
                        fontSize: '1.2rem',
                        background: `${healthColor}08`
                      }}>
                        {healthScore}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>SaaS Health Index</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                          Calculated using tenant engagement, database activity, and status transitions.
                        </p>
                      </div>
                    </div>

                    {/* Member quota progress */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 600 }}>Tenant Member Limit</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {gymMembers.length} / {maxMembersAllowed === 99999 ? 'Unlimited' : maxMembersAllowed} ({percentQuotaUsed}%)
                        </span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${Math.min(percentQuotaUsed, 100)}%`, 
                          background: percentQuotaUsed > 90 ? '#ef4444' : '#a855f7',
                          borderRadius: '4px'
                        }} />
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div>
                      <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#a855f7', fontWeight: 700, marginBottom: '0.75rem' }}>Database metrics</h5>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.75rem'
                      }}>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Database Members</span>
                          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.15rem 0 0 0' }}>{gymMembers.length}</h4>
                        </div>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active Members</span>
                          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.15rem 0 0 0', color: '#10b981' }}>{activeMembers.length}</h4>
                        </div>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Frozen Members</span>
                          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.15rem 0 0 0', color: '#f59e0b' }}>{frozenMembers.length}</h4>
                        </div>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cancelled / Inactive</span>
                          <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.15rem 0 0 0', color: '#525252' }}>{cancelledMembers.length}</h4>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 3: SaaS Receipts / Billing History */}
              {activeDrawerTab === 'billing' && (() => {
                const receipts = getSaaSReceiptsForGym(selectedGym.gymId);
                const sub = getSubscriptionForGym(selectedGym.gymId);
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#a855f7', fontWeight: 700, margin: 0 }}>Billing History</h5>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{receipts.length} Payments recorded</span>
                    </div>

                    {receipts.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dark)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                        No billing payments generated yet. Renew subscription to record a payment.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {receipts.map(rec => (
                          <div 
                            key={rec.id}
                            style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              padding: '0.85rem 1rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'border 0.2s',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                            onClick={() => setViewingReceipt(rec)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#10b981'
                              }}>
                                <Receipt size={15} />
                              </div>
                              <div>
                                <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>{rec.invoice_number}</span>
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                  Paid on {rec.paid_at ? new Date(rec.paid_at).toLocaleDateString() : new Date(rec.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                {formatCurrency(rec.total_amount, rec.currency || sub?.currency)}
                              </strong>
                              <ArrowRight size={14} style={{ color: 'var(--text-dark)' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 4: Edit Gym Directory Profile details */}
              {activeDrawerTab === 'edit' && (
                <form onSubmit={handleEditDetailsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#a855f7', fontWeight: 700, marginBottom: '0.25rem' }}>Edit Directory Information</h5>
                  
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Gym Name *</label>
                    <div style={{ position: 'relative' }}>
                      <Building2 size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ paddingLeft: '2.25rem' }} 
                        value={editForm.gymName}
                        onChange={e => setEditForm({ ...editForm, gymName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Owner Full Name *</label>
                    <div style={{ position: 'relative' }}>
                      <User size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ paddingLeft: '2.25rem' }} 
                        value={editForm.ownerName}
                        onChange={e => setEditForm({ ...editForm, ownerName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Contact Phone *</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                      <input 
                        type="text" 
                        className="form-control" 
                        style={{ paddingLeft: '2.25rem' }} 
                        value={editForm.phone}
                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Physical Address *</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={14} style={{ position: 'absolute', left: '0.75rem', top: '12px', color: 'var(--text-dark)' }} />
                      <textarea 
                        className="form-control" 
                        style={{ paddingLeft: '2.25rem', minHeight: '60px' }} 
                        value={editForm.address}
                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Country</label>
                      <div style={{ position: 'relative' }}>
                        <Globe size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ paddingLeft: '2.25rem' }} 
                          value={editForm.country}
                          onChange={e => setEditForm({ ...editForm, country: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Currency</label>
                      <div style={{ position: 'relative' }}>
                        <DollarSign size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                        <input 
                          type="text" 
                          className="form-control" 
                          style={{ paddingLeft: '2.25rem' }} 
                          value={editForm.currency}
                          onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Timezone</label>
                    <div style={{ position: 'relative' }}>
                      <Clock size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                      <select 
                        className="form-control" 
                        style={{ paddingLeft: '2.25rem' }} 
                        value={editForm.timezone}
                        onChange={e => setEditForm({ ...editForm, timezone: e.target.value })}
                      >
                        <option value="Asia/Colombo">Asia/Colombo</option>
                        <option value="Asia/Kolkata">Asia/Kolkata</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="Europe/London">Europe/London</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '1.25rem 0', paddingTop: '1rem' }}>
                    <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#a855f7', fontWeight: 700, marginBottom: '0.75rem' }}>SaaS Freeze & Deactivation Details</h5>
                    
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Fitgencore Support Hotline</label>
                      <input 
                        type="text" 
                        placeholder="e.g. +94 11 222 3333 / support@fitgencore.com"
                        className="form-control"
                        value={editForm.fitgencoreHotline || ''}
                        onChange={e => setEditForm({ ...editForm, fitgencoreHotline: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Custom Freeze Message</label>
                      <textarea 
                        className="form-control"
                        style={{ height: '60px', resize: 'none' }}
                        placeholder="Message shown when account is frozen"
                        value={editForm.freezeMessage || ''}
                        onChange={e => setEditForm({ ...editForm, freezeMessage: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Custom Deactivation Message</label>
                      <textarea 
                        className="form-control"
                        style={{ height: '60px', resize: 'none' }}
                        placeholder="Message shown when account is deactivated"
                        value={editForm.deactivateMessage || ''}
                        onChange={e => setEditForm({ ...editForm, deactivateMessage: e.target.value })}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isSavingDetails}
                    style={{
                      marginTop: '0.5rem',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                      borderColor: 'transparent',
                      padding: '0.7rem'
                    }}
                  >
                    {isSavingDetails ? 'Saving Changes...' : 'Save Directory Record'}
                  </button>
                </form>
              )}

            </div>
          </div>
        </>
      )}

      {/* Reset Password Modal */}
      {resettingOwnerEmail && (
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
            width: '400px',
            boxShadow: 'var(--shadow-premium)'
          }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0' }}>Reset Owner Password</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Set a new temporary password for the owner account: <strong style={{ color: 'var(--text-primary)' }}>{resettingOwnerEmail}</strong>.
            </p>
            
            <form onSubmit={handlePasswordResetSubmit}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">New Password</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. TempPass@123"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setResettingOwnerEmail('');
                    setNewPassword('');
                  }}
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isResetting}
                  style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderColor: 'transparent' }}
                >
                  {isResetting ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED SUBSCRIPTION RENEWAL & UPDATE MODAL */}
      {showRenewModal && selectedGym && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: '#0c0c0c',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            boxShadow: '0 10px 40px rgba(168, 85, 247, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            width: '680px',
            maxWidth: '95%',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
              }
            `}</style>
            
            <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(to right, #a855f7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              <Sparkles size={20} style={{ color: '#a855f7' }} /> Renew & Update Subscription
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Gym Workspace: <strong style={{ color: 'var(--text-primary)' }}>{selectedGym.gymName}</strong>
            </p>

            <form onSubmit={handleRenewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Left Column: Interactive Form Parameters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>
                    Subscription Parameters
                  </h5>
                  
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Subscription Plan</label>
                    <select 
                      className="form-control" 
                      value={renewForm.planId} 
                      onChange={e => handleRenewFormChange({ planId: e.target.value })}
                    >
                      {plansToUse.map(p => (
                        <option key={p.id} value={p.name.toLowerCase()}>
                          {p.name} Plan
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Installment / Billing Cycle</label>
                    <select 
                      className="form-control" 
                      value={renewForm.installmentPlan} 
                      onChange={e => handleRenewFormChange({ installmentPlan: e.target.value })}
                    >
                      <option value="Monthly Subscription">Monthly Recurring</option>
                      <option value="3 Month Installment Plan">3 Month Installment</option>
                      <option value="1 Time Payment">1 Time (Annual)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Price rate ({renewForm.currency})</label>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                      <input 
                        type="number" 
                        className="form-control" 
                        style={{ paddingLeft: '1.75rem' }}
                        value={renewForm.price}
                        onChange={e => setRenewForm({ ...renewForm, price: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Extension Duration (Days)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={renewForm.durationDays}
                      onChange={e => setRenewForm({ ...renewForm, durationDays: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                {/* Right Column: Comparison Panel */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem'
                }}>
                  <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a855f7', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>
                    Live Status Preview
                  </h5>
                  
                  {/* Current State */}
                  <div>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dark)', fontWeight: 700, display: 'block' }}>
                      Current State
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      <span>Active Plan:</span>
                      <strong style={{ textTransform: 'capitalize' }}>{selectedGym.subscriptionPlan || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                      <span>Renewal Date:</span>
                      <strong>
                        {(() => {
                          const sub = getSubscriptionForGym(selectedGym.gymId);
                          if (sub && sub.nextRenewalDate) {
                            try {
                              return new Date(sub.nextRenewalDate).toLocaleDateString();
                            } catch (e) {
                              return sub.nextRenewalDate;
                            }
                          }
                          return 'N/A';
                        })()}
                      </strong>
                    </div>
                  </div>

                  {/* Proposed State */}
                  <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#3b82f6', fontWeight: 700, display: 'block' }}>
                      Proposed State
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      <span>Selected Plan:</span>
                      <strong style={{ textTransform: 'capitalize' }}>{renewForm.planId}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                      <span>Max Members / Staff:</span>
                      <strong>
                        {renewForm.planId === 'enterprise' 
                          ? 'Unlimited' 
                          : (renewForm.planId === 'professional' 
                            ? '500 / 10' 
                            : (renewForm.planId === 'trial' ? '20 / 2' : '100 / 3'))}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                      <span>New Next Renewal:</span>
                      <strong style={{ color: '#10b981' }}>
                        {(() => {
                          const sub = getSubscriptionForGym(selectedGym.gymId);
                          const currentRenewalDate = sub && sub.nextRenewalDate ? new Date(sub.nextRenewalDate) : new Date();
                          try {
                            const days = parseInt(renewForm.durationDays) || 0;
                            const nextDate = new Date(currentRenewalDate.getTime());
                            nextDate.setDate(nextDate.getDate() + days);
                            return nextDate.toLocaleDateString();
                          } catch (e) {
                            return 'N/A';
                          }
                        })()}
                      </strong>
                    </div>
                  </div>

                  {/* Billing Summary Cost Badge */}
                  <div style={{ 
                    marginTop: 'auto', 
                    background: 'rgba(168, 85, 247, 0.1)', 
                    border: '1px solid rgba(168, 85, 247, 0.2)', 
                    borderRadius: '8px', 
                    padding: '0.75rem', 
                    textAlign: 'center' 
                  }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#c084fc', fontWeight: 700, display: 'block' }}>
                      Billing Summary
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'block', marginTop: '0.15rem' }}>
                      {formatCurrency(renewForm.price, renewForm.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowRenewModal(false)}
                  disabled={renewIsSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={renewIsSubmitting}
                  style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderColor: 'transparent', fontWeight: 600 }}
                >
                  {renewIsSubmitting ? 'Processing Renewal...' : 'Renew & Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREMIUM SAAS INVOICE/RECEIPT MODAL (PDF style viewer) */}
      {viewingReceipt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          {/* Print only styling wrapper */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              .printable-receipt-area, .printable-receipt-area * {
                visibility: visible !important;
              }
              .printable-receipt-area {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 3.5rem !important;
                background: #ffffff !important;
                color: #1e293b !important;
                box-shadow: none !important;
                border: none !important;
                z-index: 99999 !important;
              }
              .no-print-header, .no-print-header * {
                display: none !important;
                visibility: hidden !important;
              }
            }
          `}</style>

          <div 
            className="printable-receipt-area"
            style={{
              background: '#ffffff',
              color: '#1a1a1a',
              borderRadius: '12px',
              width: '620px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header actions - hidden on print by print CSS above since we only make .printable-receipt-area visible */}
            <div 
              style={{
                background: '#f8fafc',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              className="no-print-header"
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Receipt size={16} /> Fitgencore SaaS Subscription Invoice
              </span>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handlePrintReceipt(viewingReceipt)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    borderRadius: '6px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Printer size={13} /> Print / Save PDF
                </button>
                <button
                  onClick={() => setViewingReceipt(null)}
                  style={{
                    background: '#cbd5e1',
                    border: 'none',
                    color: '#1e293b',
                    borderRadius: '6px',
                    padding: '0.35rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Print/Download area (SaaS Receipt Layout) */}
            <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', background: '#ffffff' }}>
              
              {/* Header Branding */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#7c3aed' }}>
                    FITGENCORE SAAS
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Antigravity Labs (Pvt) Ltd.<br />
                    100 Elite Tower, Colombo 03, Sri Lanka<br />
                    billing@fitgencore.com
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: '#d1fae5',
                    color: '#065f46',
                    border: '1px solid #a7f3d0',
                    marginBottom: '0.5rem'
                  }}>
                    PAID
                  </span>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                    {viewingReceipt.invoice_number}
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: 0 }} />

              {/* Bill To & Dates Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>BILL TO</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginTop: '0.25rem' }}>
                    {viewingReceipt.gymName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Attn: {selectedGym?.ownerName}<br />
                    Email: {selectedGym?.ownerEmail}<br />
                    Address: {selectedGym?.address || 'N/A'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>DATE PAID</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                      {viewingReceipt.paid_at ? new Date(viewingReceipt.paid_at).toLocaleDateString() : new Date(viewingReceipt.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>BILLING CYCLE</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>
                      {viewingReceipt.billingPeriod === 'one_time' ? '1 Time (Annual)' : (viewingReceipt.billingPeriod === 'installment_3mo' ? '3 Month Installment' : 'Monthly')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoice Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '120px' }}>Billing Term</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', width: '150px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#334155' }}>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <strong>Fitgencore SaaS Platform - {viewingReceipt.plan_id ? viewingReceipt.plan_id.charAt(0).toUpperCase() + viewingReceipt.plan_id.slice(1) : 'Starter'} Plan</strong>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Automated directory isolation, cloud workspace access, member quota management, online support desk.
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center', textTransform: 'capitalize' }}>
                      {viewingReceipt.billingPeriod === 'one_time' ? '1 Year' : (viewingReceipt.billingPeriod === 'installment_3mo' ? '3 Months' : '1 Month')}
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(viewingReceipt.subtotal, viewingReceipt.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Invoice Totals (NO TAX OR TAX % MENTIONED OR INCLUDED ANYWHERE) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>Subtotal:</span>
                    <span>{formatCurrency(viewingReceipt.subtotal, viewingReceipt.currency)}</span>
                  </div>
                  
                  <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '0.25rem 0' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                    <span>Total Amount Paid:</span>
                    <span>{formatCurrency(viewingReceipt.total_amount, viewingReceipt.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Invoice Footer */}
              <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                Thank you for your partner gym workspace onboarding with Fitgencore. If you have any billing concerns, please file a support ticket in the Support Center.
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientsList;
