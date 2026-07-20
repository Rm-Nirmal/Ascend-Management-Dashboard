import { useState, useMemo, useEffect, useCallback } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  Plus, Search, Trash2, Eye, X, RotateCcw, Lock, Unlock, CreditCard, Clock, Edit2, Printer, DollarSign
} from 'lucide-react';

const Members = () => {
  const {
    members,
    plans,
    trainers,
    addMember,
    updateMember,
    deleteMember,
    freezeMembership,
    unfreezeMembership,
    renewMemberMembership,
    invoices,
    currentUser,
    showToast,
    gymSettings,
    undoPayment,
    helperCalculateUndoCountdownEnd
  } = useDashboard();

  // Component States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMedical, setShowMedical] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('directory');
  const [currentFinancialsPage, setCurrentFinancialsPage] = useState(1);
  const financialItemsPerPage = 10;

  // Edit Member States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editMemberForm, setEditMemberForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    gender: 'male',
    date_of_birth: '',
    plan_id: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
    fitness_goals: '',
    weight_kg: '',
    height_cm: '',
    body_fat_pct: '',
    trainer_id: ''
  });
  
  // Ticking state for live countdowns
  const [time, setTime] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Membership Renewal States
  const [selectedRenewMember, setSelectedRenewMember] = useState(null);
  const [renewPrice, setRenewPrice] = useState('');
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('card');
  const [renewPeriod, setRenewPeriod] = useState(1);
  const [discountType, setDiscountType] = useState('none'); // 'none', 'amount', 'percentage'
  const [discountVal, setDiscountVal] = useState(0);
  const [viewingReceipt, setViewingReceipt] = useState(null);

  useEffect(() => {
    if (selectedRenewMember) {
      setDiscountType('none');
      setDiscountVal(0);
    }
  }, [selectedRenewMember]);

  const numberToWords = (num) => {
    const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    
    if ((num = Math.round(num)) === 0) return 'Zero';
    
    let n = ('000000000' + num).substr(-9);
    let str = '';
    
    let millions = parseInt(n.substr(0, 3));
    if (millions !== 0) {
      str += (millions < 20 ? a[millions] : b[Math.floor(millions/10)] + ' ' + a[millions%10]) + 'Million ';
    }
    
    let thousands = parseInt(n.substr(3, 3));
    if (thousands !== 0) {
      if (thousands < 20) {
        str += a[thousands] + 'Thousand ';
      } else {
        str += b[Math.floor(thousands/10)] + ' ' + a[thousands%10] + 'Thousand ';
      }
    }
    
    let hundreds = parseInt(n.substr(6, 1));
    if (hundreds !== 0) {
      str += a[hundreds] + 'Hundred ';
    }
    
    let tens = parseInt(n.substr(7, 2));
    if (tens !== 0) {
      if (tens < 20) {
        str += a[tens];
      } else {
        str += b[Math.floor(tens/10)] + ' ' + a[tens%10];
      }
    }
    
    return str.trim() + ' LKR Only';
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!renewPrice || !selectedRenewMember) return;
    try {
      const subtotal = parseFloat(renewPrice || 0);
      let discountAmountCalculated = 0;
      if (discountType === 'amount') {
        discountAmountCalculated = parseFloat(discountVal || 0);
      } else if (discountType === 'percentage') {
        discountAmountCalculated = (subtotal * parseFloat(discountVal || 0)) / 100;
      }
      
      const res = await renewMemberMembership(
        selectedRenewMember.id, 
        renewPaymentMethod, 
        renewPrice, 
        renewPeriod, 
        discountAmountCalculated,
        discountType,
        discountVal
      );
      if (res.success) {
        if (showToast) {
          showToast(`Membership for ${selectedRenewMember.full_name} renewed successfully for ${renewPeriod} month(s)!`, 'success');
        } else {
          alert(`Membership for ${selectedRenewMember.full_name} renewed successfully for ${renewPeriod} month(s)! New Expiry: ${new Date(res.newCountdownEnd).toLocaleDateString()}`);
        }
        setSelectedRenewMember(null);
        if (res.invoice) {
          setViewingReceipt(res.invoice);
        }
        // Keep detail drawer profile updated
        if (selectedMember && selectedMember.id === selectedRenewMember.id) {
          setSelectedMember(prev => ({
            ...prev,
            status: 'active',
            countdown_end: res.newCountdownEnd,
            next_payment_date: res.newCountdownEnd
          }));
        }
      } else {
        alert(res.message || 'Renewal failed. Please try again.');
      }
    } catch (err) {
      console.error('Renewal error:', err);
      alert('An error occurred during renewal. Please try again.');
    }
  };

  const handleEditClick = (member) => {
    setEditingMember(member);
    setEditMemberForm({
      full_name: member.full_name || '',
      email: member.email || '',
      phone: member.phone || '',
      gender: member.gender || 'male',
      date_of_birth: member.date_of_birth || '',
      plan_id: member.plan_id || '',
      emergency_contact_name: member.emergency_contact_name || '',
      emergency_contact_phone: member.emergency_contact_phone || '',
      medical_notes: member.medical_notes || '',
      fitness_goals: member.fitness_goals || '',
      weight_kg: member.weight_kg !== undefined && member.weight_kg !== null ? member.weight_kg.toString() : '',
      height_cm: member.height_cm !== undefined && member.height_cm !== null ? member.height_cm.toString() : '',
      body_fat_pct: member.body_fat_pct !== undefined && member.body_fat_pct !== null ? member.body_fat_pct.toString() : '',
      trainer_id: member.trainer_id || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editMemberForm.full_name || !editMemberForm.plan_id) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      const updatedFields = {
        ...editMemberForm,
        plan_id: editMemberForm.plan_id,
        trainer_id: editMemberForm.trainer_id || null,
        weight_kg: editMemberForm.weight_kg ? parseFloat(editMemberForm.weight_kg) : null,
        height_cm: editMemberForm.height_cm ? parseInt(editMemberForm.height_cm) : null,
        body_fat_pct: editMemberForm.body_fat_pct ? parseFloat(editMemberForm.body_fat_pct) : null,
      };

      await updateMember(editingMember.id, updatedFields);

      setShowEditModal(false);
      
      // Update selectedMember view if currently open
      if (selectedMember && selectedMember.id === editingMember.id) {
        setSelectedMember(prev => ({
          ...prev,
          ...updatedFields,
        }));
      }

      setEditingMember(null);
      if (showToast) {
        showToast('Member details updated successfully!', 'success');
      } else {
        alert('Member details updated successfully!');
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update member. Please try again.');
    }
  };

  const getCountdownDisplay = (member) => {
    if (member.status === 'frozen') {
      return <span style={{ color: 'var(--text-dark)' }}>Paused (Frozen)</span>;
    }
    if (!member.countdown_end) {
      return <span style={{ color: 'var(--text-muted)' }}>No Limit</span>;
    }
    
    const diff = new Date(member.countdown_end).getTime() - time;
    if (diff <= 0) {
      return <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>00</span>;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    
    if (days > 0) {
      return (
        <span style={{ 
          color: days <= 3 ? 'var(--color-warning)' : 'var(--color-success)', 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.25rem', 
          fontWeight: 600, 
          fontSize: '0.8rem' 
        }}>
          <Clock size={12} />
          {days}d {hours}h {minutes}m
        </span>
      );
    }
    return (
      <span style={{ 
        color: 'var(--color-danger)', 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.25rem', 
        fontWeight: 700, 
        fontSize: '0.8rem',
        animation: 'pulse 1s infinite' 
      }}>
        <Clock size={12} />
        {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    );
  };
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Freeze form states
  const [freezeReason, setFreezeReason] = useState('');
  const [freezeUntil, setFreezeUntil] = useState('');
  const [showFreezeForm, setShowFreezeForm] = useState(false);

  // New member form states
  const [newMemberForm, setNewMemberForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    gender: 'male',
    date_of_birth: '',
    plan_id: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
    fitness_goals: '',
    weight_kg: '',
    height_cm: '',
    body_fat_pct: '',
    trainer_id: '',
    rules_health_declaration: false,
    rules_follow_gym_rules: false,
    rules_membership_conduct: false
  });

  const uniqueMembers = useMemo(() => {
    const seen = new Set();
    return (members || []).filter(m => {
      if (!m.member_code) return true;
      if (seen.has(m.member_code)) return false;
      seen.add(m.member_code);
      return true;
    }).sort((a, b) => {
      const codeA = a.member_code || '';
      const codeB = b.member_code || '';
      const numA = parseInt(codeA.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(codeB.replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) {
        return numB - numA;
      }
      return codeB.localeCompare(codeA);
    });
  }, [members]);

  const getResolvedStatus = useCallback((m) => {
    if (!m) return 'active';
    if (m.status === 'frozen') return 'frozen';
    const isExpired = m.status === 'expired' || (m.status === 'active' && m.countdown_end && new Date(m.countdown_end).getTime() < time);
    if (isExpired) return 'expired';
    if (m.status === 'active') return 'active';
    return m.status || 'inactive';
  }, [time]);

  // Filter members list based on filters
  const filteredMembersList = useMemo(() => {
    return uniqueMembers.filter(m => {
      // Status filter
      const resolvedStatus = getResolvedStatus(m);
      const matchesStatus = statusFilter === 'all' || resolvedStatus === statusFilter;
      
      // Search term filter
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        m.full_name.toLowerCase().includes(search) || 
        m.email.toLowerCase().includes(search) || 
        m.member_code.toLowerCase().includes(search) || 
        m.phone.includes(search);
        
      return matchesStatus && matchesSearch;
    });
  }, [uniqueMembers, statusFilter, searchTerm, getResolvedStatus]);



  const totalPages = Math.ceil(filteredMembersList.length / itemsPerPage);
  
  const displayedMembers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMembersList.slice(start, start + itemsPerPage);
  }, [filteredMembersList, currentPage]);

  const latestInvoice = useMemo(() => {
    if (!selectedMember || !invoices) return null;
    const memberInvoices = invoices.filter(inv => inv.member_id === selectedMember.id && inv.status === 'paid');
    if (memberInvoices.length === 0) return null;
    return [...memberInvoices].sort((a, b) => new Date(b.issued_at || b.created_at) - new Date(a.issued_at || a.created_at))[0];
  }, [selectedMember, invoices]);

  const memberInvoices = useMemo(() => {
    if (!selectedMember || !invoices) return [];
    return invoices
      .filter(inv => inv.member_id === selectedMember.id && inv.status === 'paid')
      .sort((a, b) => new Date(b.issued_at || b.created_at) - new Date(a.issued_at || a.created_at));
  }, [selectedMember, invoices]);

  // Calculate member-level financials
  const memberFinancials = useMemo(() => {
    return uniqueMembers.map(member => {
      const memberInvoices = invoices.filter(inv => inv.member_id === member.id);
      
      const revenueCollected = memberInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total_amount, 0);
        
      const outstandingAmount = memberInvoices
        .filter(inv => inv.status === 'open' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + inv.total_amount, 0);
        
      // Get latest payment date
      const paidInvoices = memberInvoices.filter(inv => inv.status === 'paid' && inv.paid_at);
      let lastPaymentDate = 'N/A';
      if (paidInvoices.length > 0) {
        const sortedPaid = [...paidInvoices].sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
        lastPaymentDate = new Date(sortedPaid[0].paid_at).toLocaleDateString();
      }
      
      return {
        ...member,
        revenueCollected,
        outstandingAmount,
        lastPaymentDate
      };
    });
  }, [uniqueMembers, invoices]);

  const totalRevenueCollected = useMemo(() => {
    const currentMonthStr = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
    return uniqueMembers
      .filter(m => getResolvedStatus(m) === 'active')
      .reduce((sum, m) => {
        const memberInvoices = invoices.filter(inv => inv.member_id === m.id);
        const thisMonthPaid = memberInvoices
          .filter(inv => inv.status === 'paid' && inv.paid_at && inv.paid_at.startsWith(currentMonthStr))
          .reduce((s, inv) => s + inv.total_amount, 0);
        return sum + thisMonthPaid;
      }, 0);
  }, [uniqueMembers, invoices, getResolvedStatus]);

  const totalOutstandingAmount = useMemo(() => {
    return uniqueMembers
      .filter(m => getResolvedStatus(m) === 'active')
      .reduce((sum, m) => {
        const memberInvoices = invoices.filter(inv => inv.member_id === m.id);
        const memberTotal = memberInvoices.reduce((s, inv) => s + inv.total_amount, 0);
        return sum + memberTotal;
      }, 0);
  }, [uniqueMembers, invoices, getResolvedStatus]);

  const filteredFinancialsList = useMemo(() => {
    return memberFinancials.filter(m => {
      const search = searchTerm.toLowerCase();
      return (
        m.full_name.toLowerCase().includes(search) || 
        m.email.toLowerCase().includes(search) || 
        m.member_code.toLowerCase().includes(search) || 
        m.phone.includes(search)
      );
    });
  }, [memberFinancials, searchTerm]);

  const totalFinancialsPages = Math.ceil(filteredFinancialsList.length / financialItemsPerPage);
  
  const displayedFinancials = useMemo(() => {
    const start = (currentFinancialsPage - 1) * financialItemsPerPage;
    return filteredFinancialsList.slice(start, start + financialItemsPerPage);
  }, [filteredFinancialsList, currentFinancialsPage]);

  // Handle Add Member submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newMemberForm.full_name || !newMemberForm.plan_id) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      const created = await addMember({
        ...newMemberForm,
        plan_id: newMemberForm.plan_id,
        trainer_id: newMemberForm.trainer_id || null,
        auto_renew: true,
        status: 'expired',
        countdown_end: new Date().toISOString(),
        next_payment_date: new Date().toISOString()
      });

      setShowAddModal(false);
      // Reset form
      setNewMemberForm({
        full_name: '',
        email: '',
        phone: '',
        gender: 'male',
        date_of_birth: '',
        plan_id: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        medical_notes: '',
        fitness_goals: '',
        weight_kg: '',
        height_cm: '',
        body_fat_pct: '',
        trainer_id: '',
        rules_health_declaration: false,
        rules_follow_gym_rules: false,
        rules_membership_conduct: false
      });
      
      // Select the newly created member to view QR details
      if (created) {
        setSelectedMember(created);
      }
    } catch (err) {
      console.error('Add member error:', err);
      alert('Failed to add member. Please try again.');
    }
  };

  const handleRotateQR = (memberId) => {
    const newQR = `qr_token_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    updateMember(memberId, { qr_token: newQR });
    setSelectedMember(prev => ({ ...prev, qr_token: newQR }));
    alert('QR Code token rotated successfully.');
  };


  const handleFreezeSubmit = (e) => {
    e.preventDefault();
    if (!freezeReason || !freezeUntil) {
      alert('Please enter a reason and return date.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    freezeMembership(selectedMember.id, freezeReason, today, freezeUntil);
    
    // Update local state for selection view
    setSelectedMember(prev => ({
      ...prev,
      status: 'frozen',
      frozen_from: today,
      frozen_until: freezeUntil,
      freeze_reason: freezeReason
    }));

    setFreezeReason('');
    setFreezeUntil('');
    setShowFreezeForm(false);
  };

  const handleUnfreeze = (memberId) => {
    unfreezeMembership(memberId);
    setSelectedMember(prev => ({
      ...prev,
      status: 'active',
      frozen_from: null,
      frozen_until: null,
      freeze_reason: null
    }));
  };

  const handlePrintReceipt = (receipt) => {
    const plan = plans.find(p => p.id === receipt.plan_id);
    const member = uniqueMembers.find(m => m.id === receipt.member_id) || {};
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Pop-up blocker is enabled. Please allow pop-ups to print the receipt.', 'error');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Membership Receipt - ${receipt.invoice_number}</title>
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
            <h1 class="gym-name">${gymSettings?.gymName ? gymSettings.gymName.toUpperCase() : 'ASCEND FITNESS CENTER'}</h1>
            <div class="gym-info">${gymSettings?.address || 'HQ Operations - Colombo, Sri Lanka'}</div>
            <div class="gym-info">Email: ${gymSettings?.email || 'billing@ascend.lk'} | Tel: ${gymSettings?.phone || '+94 11 234 5678'}</div>
          </div>
          <div class="report-info">
            <h2 class="report-title">MEMBERSHIP RECEIPT</h2>
            <div class="report-subtitle">Official Copy</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-col">
            <div class="summary-label">Member Details</div>
            <div class="summary-value">${receipt.member_name}</div>
            <div class="summary-subtext">ID: ${receipt.member_id?.substring(0, 12) || 'N/A'} &bull; Code: ${member.member_code || 'N/A'}</div>
          </div>
          <div class="summary-col">
            <div class="summary-label">Invoice Details</div>
            <div class="summary-value">${receipt.invoice_number}</div>
            <div class="summary-subtext">Date: ${new Date(receipt.paid_at || receipt.issued_at).toLocaleDateString()} &bull; Mode: ${receipt.payment_method?.replace('_', ' ').toUpperCase() || 'CARD'}</div>
          </div>
          <div class="summary-col">
            <div class="summary-label">Date Generated</div>
            <div class="summary-value">${new Date().toLocaleDateString()}</div>
            <div class="summary-subtext">${new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50%;">Description</th>
              <th style="width: 15%; text-align: center;">Qty</th>
              <th style="width: 15%; text-align: right;">Rate</th>
              <th style="width: 20%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>${plan?.name || 'Gym Membership Plan'}</strong>
                <div style="font-size: 10px; color: #6b7280; margin-top: 3px;">Gym facility membership / access plan</div>
              </td>
              <td style="text-align: center;">1</td>
              <td style="text-align: right;">LKR ${receipt.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">LKR ${receipt.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="font-size: 10px; max-width: 50%; color: #4b5563;">
            <strong>Amount in Words:</strong><br/>
            ${numberToWords(receipt.total_amount).toUpperCase()}
          </div>
          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">LKR ${receipt.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${receipt.discount_amount > 0 ? `
                <tr style="color: #ef4444;">
                  <td>Discount Applied:</td>
                  <td style="text-align: right;">-LKR ${receipt.discount_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              ` : ''}
              <tr class="total-row">
                <td>TOTAL PAID:</td>
                <td style="text-align: right;">LKR ${receipt.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>
        </div>

        <div class="signature-section">
          <div>
            <div style="height: 40px;"></div>
            <div class="sig-box">Member Signature</div>
          </div>
          <div>
            <div style="height: 40px;"></div>
            <div class="sig-box">Authorized Signature</div>
          </div>
        </div>

        <div style="text-align: center; font-size: 9px; color: #94a3b8; margin-top: 50px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
          Thank you for your payment! &bull; Powered by Fitgencore
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Members Directory</h1>
          <p>Manage member records, subscription status, and access keys.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add Member
        </button>
      </div>

      {/* Tab Switcher - only for Super Admin */}
      {currentUser?.role === 'super_admin' && (
        <div style={{ 
          display: 'inline-flex', 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid var(--border-color)', 
          padding: '0.25rem', 
          borderRadius: '10px',
          marginBottom: '1.5rem'
        }}>
          <button 
            type="button"
            className="btn"
            onClick={() => setActiveSubTab('directory')}
            style={{ 
              padding: '0.4rem 1.25rem', 
              fontSize: '0.8rem', 
              fontWeight: 600,
              background: activeSubTab === 'directory' ? 'var(--color-primary)' : 'transparent',
              color: activeSubTab === 'directory' ? '#000' : 'var(--text-muted)',
              borderRadius: '8px',
              transition: 'var(--transition-fast)'
            }}
          >
            DIRECTORY LIST
          </button>
          <button 
            type="button"
            className="btn"
            onClick={() => {
              setActiveSubTab('financials');
              setCurrentFinancialsPage(1);
            }}
            style={{ 
              padding: '0.4rem 1.25rem', 
              fontSize: '0.8rem', 
              fontWeight: 600,
              background: activeSubTab === 'financials' ? 'var(--color-primary)' : 'transparent',
              color: activeSubTab === 'financials' ? '#000' : 'var(--text-muted)',
              borderRadius: '8px',
              transition: 'var(--transition-fast)'
            }}
          >
            REVENUE & OUTSTANDING
          </button>
        </div>
      )}

      {/* Conditionally render content based on activeSubTab */}
      {activeSubTab === 'directory' ? (
        <>
          {/* Filters bar */}
      <div className="glass-card flex-gap-1" style={{ flexWrap: 'wrap', padding: '1rem' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', flexGrow: 1, minWidth: '240px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by name, email, code or phone..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '0.875rem' }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
          <select 
            value={statusFilter} 
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="glass-select"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="frozen">Frozen</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredMembersList.length}</strong> members
        </div>
      </div>

      {/* Directory Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Attached Plan</th>
                <th>Status</th>
                <th>Validity</th>
                <th>Next Payment</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedMembers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No members matching filters.
                  </td>
                </tr>
              ) : (
                displayedMembers.map(member => {
                  const plan = plans.find(p => p.id === member.plan_id);
                  const memberInvs = invoices ? invoices.filter(inv => inv.member_id === member.id && inv.status === 'paid') : [];
                  const latestInv = memberInvs.length > 0 
                    ? [...memberInvs].sort((a, b) => new Date(b.issued_at || b.created_at) - new Date(a.issued_at || a.created_at))[0]
                    : null;
                  return (
                    <tr key={member.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{member.member_code}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img 
                            src={member.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                            alt={member.full_name} 
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600 }}>{member.full_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{plan ? plan.name : 'N/A'}</td>
                      <td>
                        <span className={`badge badge-${getResolvedStatus(member)}`}>
                          {getResolvedStatus(member)}
                        </span>
                      </td>
                      <td>
                        {getCountdownDisplay(member)}
                      </td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                        {member.next_payment_date 
                          ? new Date(member.next_payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                          : new Date(member.countdown_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td>{member.joined_at}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem', color: 'var(--color-success)' }}
                            title="Collect Payment & Renew"
                            onClick={() => {
                              setSelectedRenewMember(member);
                              setRenewPeriod(1);
                              const plan = plans.find(p => p.id === member.plan_id);
                              setRenewPrice(plan ? plan.price : '');
                            }}
                          >
                            <CreditCard size={14} />
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem' }}
                            title="View Profile Details"
                            onClick={() => { setSelectedMember(member); setShowMedical(false); setShowFreezeForm(false); }}
                          >
                            <Eye size={14} />
                          </button>
                          {latestInv && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem', color: 'var(--color-primary)' }}
                              title="View Payment Receipt"
                              onClick={() => setViewingReceipt(latestInv)}
                            >
                              <Printer size={14} />
                            </button>
                          )}
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem', color: 'var(--color-primary)' }}
                            title="Edit Member Details"
                            onClick={() => handleEditClick(member)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem', color: 'var(--color-danger)' }}
                            title="Cancel Membership"
                            onClick={() => {
                              if (confirm(`Are you sure you want to cancel membership for ${member.full_name}?`)) {
                                deleteMember(member.id);
                                if (selectedMember && selectedMember.id === member.id) {
                                  setSelectedMember(null);
                                }
                              }
                            }}
                          >
                            <Trash2 size={14} />
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

        {/* Pagination Footer */}
        {filteredMembersList.length > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1.2rem 1.5rem', 
            borderTop: '1px solid var(--border-color)', 
            background: 'rgba(0,0,0,0.15)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing <strong>{Math.min(filteredMembersList.length, (currentPage - 1) * itemsPerPage + 1)}</strong> to <strong>{Math.min(filteredMembersList.length, currentPage * itemsPerPage)}</strong> of <strong>{filteredMembersList.length}</strong> members
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                disabled={currentPage === 1}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                Previous
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`btn ${currentPage === page ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setCurrentPage(page)}
                    style={{ 
                      padding: '0.4rem 0.6rem', 
                      fontSize: '0.85rem', 
                      minWidth: '32px',
                      background: currentPage === page ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                      borderColor: currentPage === page ? 'var(--color-primary)' : 'var(--border-color)',
                      boxShadow: currentPage === page ? 'var(--neon-glow)' : 'none'
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                disabled={currentPage === totalPages || totalPages === 0}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      ) : (
        <>
          {/* Financial Metrics Cards */}
          <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-success)' }}>
              <div className="metric-header">
                <span>TOTAL REVENUE COLLECTED (THIS MONTH)</span>
                <DollarSign size={18} style={{ color: 'var(--color-success)' }} />
              </div>
              <div className="metric-value">LKR {totalRevenueCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div className="metric-subtext">Sum of this month's paid invoices for active members</div>
            </div>
            
            <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-primary)' }}>
              <div className="metric-header">
                <span>TOTAL BILLING FOR ACTIVE MEMBERS</span>
                <DollarSign size={18} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div className="metric-value">LKR {totalOutstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div className="metric-subtext">Paid + unpaid/expired whole amount for active members</div>
            </div>
          </div>

          {/* Search Filter for Financials */}
          <div className="glass-card flex-gap-1" style={{ flexWrap: 'wrap', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', flexGrow: 1, minWidth: '240px' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search financials by name, email, code or phone..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentFinancialsPage(1);
                }}
                style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '0.875rem' }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing <strong>{filteredFinancialsList.length}</strong> records
            </div>
          </div>

          {/* Financials Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Attached Plan</th>
                    <th>Status</th>
                    <th>Revenue Collected</th>
                    <th>Outstanding Amount</th>
                    <th>Last Payment</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedFinancials.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No financial records matching search.
                      </td>
                    </tr>
                  ) : (
                    displayedFinancials.map(member => {
                      const plan = plans.find(p => p.id === member.plan_id);
                      const memberInvs = invoices ? invoices.filter(inv => inv.member_id === member.id) : [];
                      const latestInv = memberInvs.length > 0 
                        ? [...memberInvs].sort((a, b) => new Date(b.issued_at || b.created_at) - new Date(a.issued_at || a.created_at))[0]
                        : null;
                      return (
                        <tr key={member.id}>
                          <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{member.member_code}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <img 
                                src={member.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                                alt={member.full_name} 
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                              <div>
                                <div style={{ fontWeight: 600 }}>{member.full_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>{plan ? plan.name : 'N/A'}</td>
                          <td>
                            <span className={`badge badge-${getResolvedStatus(member)}`}>
                              {getResolvedStatus(member)}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                            LKR {member.revenueCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ fontWeight: 600, color: member.outstandingAmount > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                            LKR {member.outstandingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td>{member.lastPaymentDate}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              <button 
                                type="button"
                                className="btn btn-secondary" 
                                style={{ padding: '0.4rem', color: 'var(--color-success)' }}
                                title="Collect Payment & Renew"
                                onClick={() => {
                                  setSelectedRenewMember(member);
                                  setRenewPeriod(1);
                                  setRenewPrice(plan ? plan.price : '');
                                }}
                              >
                                <CreditCard size={14} />
                              </button>
                              <button 
                                type="button"
                                className="btn btn-secondary" 
                                style={{ padding: '0.4rem' }}
                                title="View Profile Details"
                                onClick={() => { setSelectedMember(member); setShowMedical(false); setShowFreezeForm(false); }}
                              >
                                <Eye size={14} />
                              </button>
                              {latestInv && (
                                <button 
                                  type="button"
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.4rem', color: 'var(--color-primary)' }}
                                  title="View Payment Receipt"
                                  onClick={() => setViewingReceipt(latestInv)}
                                >
                                  <Printer size={14} />
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

            {/* Financials Pagination Footer */}
            {filteredFinancialsList.length > 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '1.2rem 1.5rem', 
                borderTop: '1px solid var(--border-color)', 
                background: 'rgba(0,0,0,0.15)',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing <strong>{Math.min(filteredFinancialsList.length, (currentFinancialsPage - 1) * financialItemsPerPage + 1)}</strong> to <strong>{Math.min(filteredFinancialsList.length, currentFinancialsPage * financialItemsPerPage)}</strong> of <strong>{filteredFinancialsList.length}</strong> records
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    onClick={() => setCurrentFinancialsPage(prev => Math.max(prev - 1, 1))} 
                    disabled={currentFinancialsPage === 1}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    Previous
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {Array.from({ length: totalFinancialsPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        type="button"
                        className={`btn ${currentFinancialsPage === page ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setCurrentFinancialsPage(page)}
                        style={{ 
                          padding: '0.4rem 0.6rem', 
                          fontSize: '0.85rem', 
                          minWidth: '32px',
                          background: currentFinancialsPage === page ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                          borderColor: currentFinancialsPage === page ? 'var(--color-primary)' : 'var(--border-color)',
                          boxShadow: currentFinancialsPage === page ? 'var(--neon-glow)' : 'none'
                        }}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    onClick={() => setCurrentFinancialsPage(prev => Math.min(prev + 1, totalFinancialsPages))} 
                    disabled={currentFinancialsPage === totalFinancialsPages || totalFinancialsPages === 0}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Member Details Drawer View */}
      {selectedMember && (
        <>
          <div className="modal-overlay" onClick={() => setSelectedMember(null)} style={{ background: 'rgba(0,0,0,0.3)' }} />
          <div className="drawer-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                Member Profile Details
              </h2>
              <button 
                onClick={() => setSelectedMember(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Info Header */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <img 
                  src={selectedMember.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                  alt={selectedMember.full_name} 
                  style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--color-primary)', objectFit: 'cover' }}
                />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{selectedMember.full_name}</h3>
                  <span className={`badge badge-${getResolvedStatus(selectedMember)}`} style={{ fontSize: '0.65rem' }}>
                    {getResolvedStatus(selectedMember)}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Code: <strong>{selectedMember.member_code}</strong>
                  </div>
                </div>
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.75rem', gap: '0.35rem', borderColor: 'var(--border-color)' }}
                onClick={() => handleEditClick(selectedMember)}
              >
                <Edit2 size={12} /> Edit Details
              </button>
            </div>

            {/* Core details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Contact info</span>
                <div style={{ fontSize: '0.85rem', marginTop: '0.15rem' }}>Email: {selectedMember.email}</div>
                <div style={{ fontSize: '0.85rem' }}>Phone: {selectedMember.phone || 'N/A'}</div>
                <div style={{ fontSize: '0.85rem' }}>DOB: {selectedMember.date_of_birth || 'N/A'}</div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Membership & Trainer</span>
                <div style={{ fontSize: '0.85rem', marginTop: '0.15rem' }}>
                  Branch: Main Headquarters
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  Plan: {plans.find(p => p.id === selectedMember.plan_id)?.name}
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  Trainer: {trainers.find(t => t.id === selectedMember.trainer_id)?.name || 'Unassigned'}
                </div>
              </div>
            </div>

            {/* Validity Countdown and Renew inside drawer */}
            <div style={{ background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.15)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: 700 }}>Membership Validity & Due Date</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'monospace', marginTop: '0.25rem' }}>
                  {getCountdownDisplay(selectedMember)}
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                  Next Payment: <strong style={{ color: 'var(--color-primary)' }}>
                    {selectedMember.next_payment_date 
                      ? new Date(selectedMember.next_payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      : new Date(selectedMember.countdown_end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </strong>
                </div>
                {latestInvoice && (
                  <div style={{ marginTop: '0.35rem' }}>
                    <button 
                      onClick={() => setViewingReceipt(latestInvoice)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--color-primary)', 
                        cursor: 'pointer', 
                        fontSize: '0.75rem', 
                        padding: 0, 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem', 
                        textDecoration: 'underline' 
                      }}
                    >
                      <Printer size={12} /> View Latest Receipt
                    </button>
                  </div>
                )}
              </div>
              <button 
                onClick={() => {
                  setSelectedRenewMember(selectedMember);
                  const plan = plans.find(p => p.id === selectedMember.plan_id);
                  setRenewPrice(plan ? plan.price : '');
                  setRenewPeriod(1);
                }}
                className="btn btn-primary" 
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', gap: '0.35rem' }}
              >
                <CreditCard size={12} /> Collect & Renew
              </button>
            </div>

            {/* Gym Agreements & Declarations Checklist */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.75rem' }}>
                Gym Agreements & Declarations
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: '18px', 
                    height: '18px', 
                    borderRadius: '4px', 
                    background: selectedMember.rules_health_declaration ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: selectedMember.rules_health_declaration ? '1px solid rgb(16, 185, 129)' : '1px solid rgb(239, 68, 68)',
                    color: selectedMember.rules_health_declaration ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
                    fontWeight: 'bold',
                    fontSize: '0.7rem'
                  }}>
                    {selectedMember.rules_health_declaration ? '✓' : '✗'}
                  </span>
                  <span style={{ color: selectedMember.rules_health_declaration ? '#fff' : 'var(--text-muted)' }}>
                    Health Declaration Agreed
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: '18px', 
                    height: '18px', 
                    borderRadius: '4px', 
                    background: selectedMember.rules_follow_gym_rules ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: selectedMember.rules_follow_gym_rules ? '1px solid rgb(16, 185, 129)' : '1px solid rgb(239, 68, 68)',
                    color: selectedMember.rules_follow_gym_rules ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
                    fontWeight: 'bold',
                    fontSize: '0.7rem'
                  }}>
                    {selectedMember.rules_follow_gym_rules ? '✓' : '✗'}
                  </span>
                  <span style={{ color: selectedMember.rules_follow_gym_rules ? '#fff' : 'var(--text-muted)' }}>
                    Follow Gym Rules Agreed
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: '18px', 
                    height: '18px', 
                    borderRadius: '4px', 
                    background: selectedMember.rules_membership_conduct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: selectedMember.rules_membership_conduct ? '1px solid rgb(16, 185, 129)' : '1px solid rgb(239, 68, 68)',
                    color: selectedMember.rules_membership_conduct ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
                    fontWeight: 'bold',
                    fontSize: '0.7rem'
                  }}>
                    {selectedMember.rules_membership_conduct ? '✓' : '✗'}
                  </span>
                  <span style={{ color: selectedMember.rules_membership_conduct ? '#fff' : 'var(--text-muted)' }}>
                    Membership & Conduct Agreed
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History & Receipts Section */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                Payment History & Receipts
              </span>
              {memberInvoices.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>
                  No payment history found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {memberInvoices.map(inv => (
                    <div 
                      key={inv.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.5rem 0.75rem', 
                        background: 'rgba(0,0,0,0.15)', 
                        borderRadius: '6px', 
                        border: '1px solid rgba(255,255,255,0.03)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{inv.invoice_number}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(inv.paid_at || inv.issued_at).toLocaleDateString()} &bull; {inv.payment_method?.replace('_', ' ') || 'Card'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                          LKR {inv.total_amount?.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewingReceipt(inv)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          title="View Receipt"
                        >
                          <Printer size={10} /> View
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Are you sure you want to undo payment for ${inv.invoice_number}?`)) {
                              const res = await undoPayment(inv.id);
                              if (res.success) {
                                alert(`Payment for invoice ${inv.invoice_number} undid successfully.`);
                                // Re-update selectedMember profile details local state so they update in drawer
                                if (selectedMember && selectedMember.id === inv.member_id) {
                                  const periodMonths = 1;
                                  const revertedCountdownEnd = helperCalculateUndoCountdownEnd(selectedMember.countdown_end, periodMonths);
                                  const isExpired = new Date(revertedCountdownEnd).getTime() < Date.now();
                                  setSelectedMember(prev => ({
                                    ...prev,
                                    status: isExpired ? 'expired' : 'active',
                                    countdown_end: revertedCountdownEnd,
                                    next_payment_date: revertedCountdownEnd
                                  }));
                                }
                              } else {
                                alert(res.message || 'Failed to undo payment.');
                              }
                            }
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          title="Undo Payment"
                        >
                          Undo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Health & Body measurements & Goal (FR-MEM-05) */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Fitness Goals & Body Stats</span>
              <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0.75rem 0', fontStyle: 'italic', color: '#fff' }}>
                "{selectedMember.fitness_goals || 'No specific goals recorded.'}"
              </p>
              
              <div className="grid-3" style={{ textAlign: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Weight</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{selectedMember.weight_kg ? `${selectedMember.weight_kg} kg` : 'N/A'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Height</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{selectedMember.height_cm ? `${selectedMember.height_cm} cm` : 'N/A'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Body Fat</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{selectedMember.body_fat_pct ? `${selectedMember.body_fat_pct}%` : 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Emergency & Confidential Medical Notes (FR-MEM-06) */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Emergency Contact</span>
              <div style={{ fontSize: '0.85rem', marginTop: '0.15rem', fontWeight: 600 }}>
                {selectedMember.emergency_contact_name || 'Not provided'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {selectedMember.emergency_contact_phone || ''}
              </div>

              {/* Blur-encrypted Medical notes */}
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Confidential Medical Notes</span>
                  <button 
                    onClick={() => setShowMedical(!showMedical)}
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                  >
                    {showMedical ? 'Hide Notes' : 'Show Notes'}
                  </button>
                </div>
                
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--text-main)', 
                  filter: showMedical ? 'none' : 'blur(4px)',
                  transition: 'filter 0.2s ease',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  userSelect: showMedical ? 'text' : 'none'
                }}>
                  {selectedMember.medical_notes || 'No medical conditions reported.'}
                </div>
              </div>
            </div>

            {/* QR Access Token preview & rotation (FR-MEM-07) */}
            <div style={{ background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.15)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', textTransform: 'uppercase', fontWeight: 700 }}>Gate Access QR Credentials</span>
              <div style={{ fontSize: '0.75rem', wordBreak: 'break-all', fontFamily: 'monospace', margin: '0.25rem 0 0.5rem 0', color: 'var(--text-muted)' }}>
                Hash: {selectedMember.qr_token || 'N/A'}
              </div>
              <button 
                onClick={() => handleRotateQR(selectedMember.id)}
                className="btn btn-secondary" 
                style={{ width: '100%', fontSize: '0.75rem', gap: '0.35rem', borderColor: 'rgba(6,182,212,0.3)' }}
              >
                <RotateCcw size={12} /> Rotate QR Access Key
              </button>
            </div>

            {/* Freeze control UI (FR-MEM-03) */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              {selectedMember.status === 'frozen' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: '0.75rem', borderRadius: '8px', color: 'var(--color-warning)' }}>
                    <strong>Frozen membership:</strong> Until {selectedMember.frozen_until}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Reason: "{selectedMember.freeze_reason}"
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUnfreeze(selectedMember.id)}
                    className="btn btn-success" 
                    style={{ width: '100%', gap: '0.35rem' }}
                  >
                    <Unlock size={14} /> Unfreeze Membership
                  </button>
                </div>
              ) : selectedMember.status === 'active' ? (
                <div>
                  {!showFreezeForm ? (
                    <button 
                      onClick={() => setShowFreezeForm(true)}
                      className="btn btn-secondary" 
                      style={{ width: '100%', gap: '0.35rem', color: 'var(--color-warning)', borderColor: 'rgba(245,158,11,0.3)' }}
                    >
                      <Lock size={14} /> Freeze Membership
                    </button>
                  ) : (
                    <form onSubmit={handleFreezeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Freeze Reason</label>
                        <input 
                          type="text" 
                          placeholder="Medical, travel, work..." 
                          value={freezeReason}
                          onChange={(e) => setFreezeReason(e.target.value)}
                          className="glass-input"
                          style={{ padding: '0.5rem', marginTop: '0.25rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Return Date</label>
                        <input 
                          type="date" 
                          value={freezeUntil}
                          onChange={(e) => setFreezeUntil(e.target.value)}
                          className="glass-input"
                          style={{ padding: '0.5rem', marginTop: '0.25rem' }}
                        />
                      </div>
                      <div className="grid-2">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowFreezeForm(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" style={{ background: 'var(--color-warning)' }}>Confirm Freeze</button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-dark)' }}>
                  This membership is currently {selectedMember.status}. It must be active to freeze.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700 }}>
                Register New Member Profile
              </h2>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Section: Credentials */}
              <div>
                <h4 style={{ color: 'var(--color-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
                  1. Personal & Contact Details
                </h4>
                <div className="grid-2">
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Nimal Perera"
                      value={newMemberForm.full_name}
                      onChange={(e) => setNewMemberForm({...newMemberForm, full_name: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</label>
                    <input 
                      type="email" 
                      placeholder="nimal@gmail.com"
                      value={newMemberForm.email}
                      onChange={(e) => setNewMemberForm({...newMemberForm, email: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="077 123 4567"
                      value={newMemberForm.phone}
                      onChange={(e) => setNewMemberForm({...newMemberForm, phone: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                  <div className="grid-2">
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gender</label>
                      <select 
                        value={newMemberForm.gender} 
                        onChange={(e) => setNewMemberForm({...newMemberForm, gender: e.target.value})}
                        className="glass-select"
                        style={{ marginTop: '0.25rem', width: '100%', padding: '0.625rem' }}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date of Birth</label>
                      <input 
                        type="date" 
                        value={newMemberForm.date_of_birth}
                        onChange={(e) => setNewMemberForm({...newMemberForm, date_of_birth: e.target.value})}
                        className="glass-input"
                        style={{ marginTop: '0.25rem', padding: '0.5rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Plan Details */}
              <div>
                <h4 style={{ color: 'var(--color-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
                  2. Membership & Trainer Assignment
                </h4>
                <div className="grid-2">
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Membership Plan *</label>
                    <select 
                      required
                      value={newMemberForm.plan_id}
                      onChange={(e) => setNewMemberForm({...newMemberForm, plan_id: e.target.value})}
                      className="glass-select"
                      style={{ marginTop: '0.25rem', width: '100%', padding: '0.625rem' }}
                    >
                      <option value="">Select Plan...</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (LKR {p.price.toLocaleString()}/mo)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Personal Trainer Assignment (Optional)</label>
                    <select 
                      value={newMemberForm.trainer_id}
                      onChange={(e) => setNewMemberForm({...newMemberForm, trainer_id: e.target.value})}
                      className="glass-select"
                      style={{ marginTop: '0.25rem', width: '100%', padding: '0.625rem' }}
                    >
                      <option value="">Unassigned (Self-guided)</option>
                      {trainers.map(t => (
                        <option key={t.id} value={t.id}>{t.name || t.full_name} ({t.specialization || 'General'})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Medical / Goals */}
              <div>
                <h4 style={{ color: 'var(--color-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
                  3. Health Metrics & Notes
                </h4>
                <div className="grid-3" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Weight (kg)</label>
                    <input 
                      type="number" step="0.1"
                      placeholder="72.5"
                      value={newMemberForm.weight_kg}
                      onChange={(e) => setNewMemberForm({...newMemberForm, weight_kg: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Height (cm)</label>
                    <input 
                      type="number"
                      placeholder="178"
                      value={newMemberForm.height_cm}
                      onChange={(e) => setNewMemberForm({...newMemberForm, height_cm: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Body Fat %</label>
                    <input 
                      type="number" step="0.1"
                      placeholder="18.5"
                      value={newMemberForm.body_fat_pct}
                      onChange={(e) => setNewMemberForm({...newMemberForm, body_fat_pct: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emergency Contact Name</label>
                    <input 
                      type="text" 
                      placeholder="K. Silva"
                      value={newMemberForm.emergency_contact_name}
                      onChange={(e) => setNewMemberForm({...newMemberForm, emergency_contact_name: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emergency Contact Phone</label>
                    <input 
                      type="text" 
                      placeholder="071 987 6543"
                      value={newMemberForm.emergency_contact_phone}
                      onChange={(e) => setNewMemberForm({...newMemberForm, emergency_contact_phone: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confidential Medical Notes (FR-MEM-06)</label>
                  <textarea 
                    placeholder="Allergies, chronic conditions, structural constraints..."
                    value={newMemberForm.medical_notes}
                    onChange={(e) => setNewMemberForm({...newMemberForm, medical_notes: e.target.value})}
                    className="glass-input"
                    style={{ marginTop: '0.25rem', resize: 'none', height: '60px', padding: '0.5rem' }}
                  />
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fitness Goals</label>
                  <input 
                    type="text" 
                    placeholder="Strength progression, fat reduction..."
                    value={newMemberForm.fitness_goals}
                    onChange={(e) => setNewMemberForm({...newMemberForm, fitness_goals: e.target.value})}
                    className="glass-input"
                    style={{ marginTop: '0.25rem' }}
                  />
                </div>

                <div style={{ marginTop: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Gym Agreements & Declarations</span>
                  
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: '#fff', lineHeight: '1.4' }}>
                    <input 
                      type="checkbox" 
                      checked={newMemberForm.rules_health_declaration} 
                      onChange={(e) => setNewMemberForm({...newMemberForm, rules_health_declaration: e.target.checked})}
                      style={{ marginTop: '0.15rem', accentColor: 'var(--color-primary)' }}
                    />
                    <span>
                      <strong>Health Declaration:</strong> I confirm that I do not have any medical condition, injury, or health issue that would make exercise unsafe for me, and I will inform the gym if my health condition changes.
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: '#fff', lineHeight: '1.4' }}>
                    <input 
                      type="checkbox" 
                      checked={newMemberForm.rules_follow_gym_rules} 
                      onChange={(e) => setNewMemberForm({...newMemberForm, rules_follow_gym_rules: e.target.checked})}
                      style={{ marginTop: '0.15rem', accentColor: 'var(--color-primary)' }}
                    />
                    <span>
                      <strong>Follow Gym Rules:</strong> I agree to follow all gym rules, safety guidelines, and instructions given by GYM and its staff.
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: '#fff', lineHeight: '1.4' }}>
                    <input 
                      type="checkbox" 
                      checked={newMemberForm.rules_membership_conduct} 
                      onChange={(e) => setNewMemberForm({...newMemberForm, rules_membership_conduct: e.target.checked})}
                      style={{ marginTop: '0.15rem', accentColor: 'var(--color-primary)' }}
                    />
                    <span>
                      <strong>Membership & Conduct:</strong> I understand that my membership is non-transferable, unauthorized access is prohibited, and violation of gym rules may result in suspension or termination of my membership without refund.
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit panel */}
              <div className="flex-gap-1" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Profile & Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Payment & Renew Modal */}
      {selectedRenewMember && (() => {
        const plan = plans.find(p => p.id === selectedRenewMember.plan_id) || plans[0];
        const subtotal = parseFloat(renewPrice || 0);
        let discountAmountCalculated = 0;
        if (discountType === 'amount') {
          discountAmountCalculated = parseFloat(discountVal || 0);
        } else if (discountType === 'percentage') {
          discountAmountCalculated = (subtotal * parseFloat(discountVal || 0)) / 100;
        }
        const total = Math.max(0, subtotal - discountAmountCalculated);

        // Calculate dynamic new expiry date
        const baseDate = selectedRenewMember.countdown_end && new Date(selectedRenewMember.countdown_end).getTime() > time
          ? new Date(selectedRenewMember.countdown_end)
          : new Date(time);
        baseDate.setMonth(baseDate.getMonth() + parseInt(renewPeriod));
        const newExpiryStr = baseDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '480px', padding: '1.75rem', animation: 'slideUp 0.25s ease-out' }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <CreditCard size={20} style={{ color: 'var(--color-primary)' }} />
                  Collect Payment & Renew
                </h2>
                <button 
                  onClick={() => setSelectedRenewMember(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Member Card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <img 
                  src={selectedRenewMember.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                  alt={selectedRenewMember.full_name} 
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--color-primary)' }}
                />
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedRenewMember.full_name}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.15rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {selectedRenewMember.member_code}</span>
                    <span className={`badge badge-${selectedRenewMember.status}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>
                      {selectedRenewMember.status}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Plan Type</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>{plan?.name || 'N/A'}</span>
                </div>
              </div>

              <form onSubmit={handleRenewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                
                {/* Period Selector & Price Override Row */}
                <div className="grid-2" style={{ gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Renewal Period</label>
                    <select
                      className="glass-select"
                      style={{ marginTop: '0.35rem', width: '100%', padding: '0.5rem 0.75rem' }}
                      value={renewPeriod}
                      onChange={(e) => {
                        const newPeriod = parseInt(e.target.value);
                        setRenewPeriod(newPeriod);
                        const plan = plans.find(p => p.id === selectedRenewMember.plan_id) || plans[0];
                        if (plan) {
                          setRenewPrice(plan.price * newPeriod);
                        }
                      }}
                    >
                      <option value={1}>1 Month (Standard)</option>
                      <option value={3}>3 Months (Quarterly)</option>
                      <option value={6}>6 Months (Semi-Annual)</option>
                      <option value={12}>12 Months (Annual)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Amount (LKR)</label>
                    <input 
                      type="number"
                      required
                      className="glass-input"
                      style={{ marginTop: '0.35rem', fontWeight: 700, color: 'var(--color-success)', width: '100%', padding: '0.5rem 0.75rem' }}
                      value={renewPrice}
                      onChange={(e) => setRenewPrice(e.target.value)}
                    />
                  </div>
                </div>

                {/* Discount Section (Optional) */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Apply Discount (Optional)</span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => { setDiscountType('none'); setDiscountVal(0); }}
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.7rem',
                          background: discountType === 'none' ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + (discountType === 'none' ? 'var(--color-primary)' : 'var(--border-color)'),
                          color: discountType === 'none' ? '#000000' : 'var(--text-main)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        None
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDiscountType('amount'); setDiscountVal(0); }}
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.7rem',
                          background: discountType === 'amount' ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + (discountType === 'amount' ? 'var(--color-primary)' : 'var(--border-color)'),
                          color: discountType === 'amount' ? '#000000' : 'var(--text-main)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        LKR Value
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDiscountType('percentage'); setDiscountVal(0); }}
                        style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.7rem',
                          background: discountType === 'percentage' ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                          border: '1px solid ' + (discountType === 'percentage' ? 'var(--color-primary)' : 'var(--border-color)'),
                          color: discountType === 'percentage' ? '#000000' : 'var(--text-main)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        % Percent
                      </button>
                    </div>
                  </div>

                  {discountType !== 'none' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                        {discountType === 'amount' ? 'Discount Amount (LKR):' : 'Discount Percent (%):'}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={discountType === 'percentage' ? "100" : undefined}
                        className="glass-input"
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem', textAlign: 'right' }}
                        value={discountVal}
                        onChange={(e) => setDiscountVal(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}
                </div>

                {/* Professional Billing breakdown card */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Base Subtotal:</span>
                    <span>LKR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {discountAmountCalculated > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', color: 'var(--color-danger)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Discount Applied:</span>
                      <span>-LKR {discountAmountCalculated.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.6rem 0', paddingTop: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-success)' }}>
                      <span>Total Collection:</span>
                      <span>LKR {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>New Expiry / Next Payment:</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>{newExpiryStr}</span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Payment Method</label>
                  <select
                    className="glass-select"
                    style={{ marginTop: '0.35rem', width: '100%', padding: '0.5rem 0.75rem' }}
                    value={renewPaymentMethod}
                    onChange={(e) => setRenewPaymentMethod(e.target.value)}
                  >
                    <option value="card">💳 Credit / Debit Card</option>
                    <option value="cash">💵 Cash Payment</option>
                    <option value="bank_transfer">🏦 Bank Wire Transfer</option>
                  </select>
                </div>

                {/* Action buttons */}
                <div className="grid-2 margin-t-1" style={{ gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedRenewMember(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" style={{ fontWeight: 600 }}>
                    Renew & Settle
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Edit Member Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700 }}>
                Edit Member Profile
              </h2>
              <button 
                onClick={() => { setShowEditModal(false); setEditingMember(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Section: Credentials */}
              <div>
                <h4 style={{ color: 'var(--color-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
                  1. Personal & Contact Details
                </h4>
                <div className="grid-2">
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Nimal Perera"
                      value={editMemberForm.full_name}
                      onChange={(e) => setEditMemberForm({...editMemberForm, full_name: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</label>
                    <input 
                      type="email" 
                      placeholder="nimal@gmail.com"
                      value={editMemberForm.email}
                      onChange={(e) => setEditMemberForm({...editMemberForm, email: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="077 123 4567"
                      value={editMemberForm.phone}
                      onChange={(e) => setEditMemberForm({...editMemberForm, phone: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                  <div className="grid-2">
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gender</label>
                      <select 
                        value={editMemberForm.gender} 
                        onChange={(e) => setEditMemberForm({...editMemberForm, gender: e.target.value})}
                        className="glass-select"
                        style={{ marginTop: '0.25rem', width: '100%', padding: '0.625rem' }}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date of Birth</label>
                      <input 
                        type="date" 
                        value={editMemberForm.date_of_birth}
                        onChange={(e) => setEditMemberForm({...editMemberForm, date_of_birth: e.target.value})}
                        className="glass-input"
                        style={{ marginTop: '0.25rem', padding: '0.5rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Plan Details */}
              <div>
                <h4 style={{ color: 'var(--color-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
                  2. Membership & Trainer Assignment
                </h4>
                <div className="grid-2">
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Membership Plan *</label>
                    <select 
                      required
                      value={editMemberForm.plan_id}
                      onChange={(e) => setEditMemberForm({...editMemberForm, plan_id: e.target.value})}
                      className="glass-select"
                      style={{ marginTop: '0.25rem', width: '100%', padding: '0.625rem' }}
                    >
                      <option value="">Select Plan...</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (LKR {p.price.toLocaleString()}/mo)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Personal Trainer Assignment</label>
                    <select 
                      value={editMemberForm.trainer_id}
                      onChange={(e) => setEditMemberForm({...editMemberForm, trainer_id: e.target.value})}
                      className="glass-select"
                      style={{ marginTop: '0.25rem', width: '100%', padding: '0.625rem' }}
                    >
                      <option value="">Unassigned (Self-guided)</option>
                      {trainers.map(t => (
                        <option key={t.id} value={t.id}>{t.name || t.full_name} ({t.specialization || 'General'})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Medical / Goals */}
              <div>
                <h4 style={{ color: 'var(--color-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
                  3. Health Metrics & Notes
                </h4>
                <div className="grid-3" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Weight (kg)</label>
                    <input 
                      type="number" step="0.1"
                      placeholder="72.5"
                      value={editMemberForm.weight_kg}
                      onChange={(e) => setEditMemberForm({...editMemberForm, weight_kg: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Height (cm)</label>
                    <input 
                      type="number"
                      placeholder="178"
                      value={editMemberForm.height_cm}
                      onChange={(e) => setEditMemberForm({...editMemberForm, height_cm: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Body Fat %</label>
                    <input 
                      type="number" step="0.1"
                      placeholder="18.5"
                      value={editMemberForm.body_fat_pct}
                      onChange={(e) => setEditMemberForm({...editMemberForm, body_fat_pct: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emergency Contact Name</label>
                    <input 
                      type="text" 
                      placeholder="K. Silva"
                      value={editMemberForm.emergency_contact_name}
                      onChange={(e) => setEditMemberForm({...editMemberForm, emergency_contact_name: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emergency Contact Phone</label>
                    <input 
                      type="text" 
                      placeholder="071 987 6543"
                      value={editMemberForm.emergency_contact_phone}
                      onChange={(e) => setEditMemberForm({...editMemberForm, emergency_contact_phone: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confidential Medical Notes</label>
                  <textarea 
                    placeholder="Allergies, chronic conditions, structural constraints..."
                    value={editMemberForm.medical_notes}
                    onChange={(e) => setEditMemberForm({...editMemberForm, medical_notes: e.target.value})}
                    className="glass-input"
                    style={{ marginTop: '0.25rem', resize: 'none', height: '60px', padding: '0.5rem' }}
                  />
                </div>

                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fitness Goals</label>
                  <input 
                    type="text" 
                    placeholder="Strength progression, fat reduction..."
                    value={editMemberForm.fitness_goals}
                    onChange={(e) => setEditMemberForm({...editMemberForm, fitness_goals: e.target.value})}
                    className="glass-input"
                    style={{ marginTop: '0.25rem' }}
                  />
                </div>
              </div>

              {/* Submit panel */}
              <div className="flex-gap-1" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); setEditingMember(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PRINTABLE MEMBERSHIP RECEIPT MODAL ───────────────────────────── */}
      {viewingReceipt && (
        <div className="print-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          
          {/* Print CSS Rules injected specifically inside the modal */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              .print-modal-overlay {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                backdrop-filter: none !important;
                display: block !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .print-modal-content {
                visibility: visible !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                background: white !important;
                color: black !important;
                border: none !important;
                box-shadow: none !important;
                padding: 10px !important;
                margin: 0 !important;
              }
              .print-modal-content * {
                visibility: visible !important;
                color: black !important;
                border-color: #ccc !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="glass-card print-modal-content" style={{ width: '100%', maxWidth: '650px', margin: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', padding: '2rem' }}>
            
            {/* Header: Gym Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--color-primary)' }}>
                  {gymSettings?.gymName ? gymSettings.gymName.toUpperCase() : 'ASCEND FITNESS CENTER'}
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                  {gymSettings?.address || 'HQ Operations - Colombo, Sri Lanka'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                  Email: {gymSettings?.email || 'billing@ascend.lk'} | Tel: {gymSettings?.phone || '+94 11 234 5678'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em', color: '#fff' }}>MEMBERSHIP RECEIPT</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Original Copy</span>
              </div>
            </div>

            {/* Member & Invoice details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <div style={{ marginBottom: '0.35rem' }}><span style={{ color: 'var(--text-muted)' }}>Member Code:</span> <span style={{ fontWeight: 600 }}>{uniqueMembers.find(m => m.id === viewingReceipt.member_id)?.member_code || 'N/A'}</span></div>
                <div style={{ marginBottom: '0.35rem' }}><span style={{ color: 'var(--text-muted)' }}>Member Name:</span> <span style={{ fontWeight: 600 }}>{viewingReceipt.member_name}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <span style={{ fontWeight: 600 }}>{uniqueMembers.find(m => m.id === viewingReceipt.member_id)?.email || 'N/A'}</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: '0.35rem' }}><span style={{ color: 'var(--text-muted)' }}>Invoice Number:</span> <span style={{ fontWeight: 600 }}>{viewingReceipt.invoice_number}</span></div>
                <div style={{ marginBottom: '0.35rem' }}><span style={{ color: 'var(--text-muted)' }}>Payment Date:</span> <span style={{ fontWeight: 600 }}>{new Date(viewingReceipt.paid_at || viewingReceipt.issued_at).toLocaleDateString()}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Payment Mode:</span> <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{viewingReceipt.payment_method?.replace('_', ' ') || 'Card'}</span></div>
              </div>
            </div>

            {/* Plan details table */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>Description</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Qty</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>Rate</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.5rem' }}>
                      <strong style={{ color: '#fff' }}>
                        {plans.find(p => p.id === viewingReceipt.plan_id)?.name || 'Gym Membership Plan'}
                      </strong>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        30-day recurring gym facility access & trainer guidance
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>LKR {viewingReceipt.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>LKR {viewingReceipt.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Calculations Totals Block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontSize: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Subtotal:</span>
                  <span style={{ fontWeight: 600 }}>LKR {viewingReceipt.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
                </div>
                {viewingReceipt.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--color-danger)' }}>
                    <span>
                      {viewingReceipt.discount_type === 'percentage' 
                        ? `Discount (${viewingReceipt.discount_rate}%):` 
                        : 'Discount:'}
                    </span>
                    <span style={{ fontWeight: 600 }}>-LKR {viewingReceipt.discount_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
                  </div>
                )}
                {viewingReceipt.tax_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tax & Fees:</span>
                    <span style={{ fontWeight: 600 }}>LKR {viewingReceipt.tax_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL AMOUNT PAID</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)' }}>
                  LKR {viewingReceipt.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </span>
              </div>
            </div>

            {/* Net Amount in Words */}
            <div style={{ fontSize: '0.75rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.01)', padding: '0.5rem', borderRadius: '4px', border: '1px dashed rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Amount in Words:</span> <span style={{ fontWeight: 600 }}>{numberToWords(viewingReceipt.total_amount || 0)}</span>
            </div>
            
            <div style={{ textAlign: 'center', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '1.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Powered by Fitgencore
            </div>


            {/* Actions for Modal */}
            <div className="no-print" style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ flexGrow: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                onClick={() => handlePrintReceipt(viewingReceipt)}
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setViewingReceipt(null)}>
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Members;
