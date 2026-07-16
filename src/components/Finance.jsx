import { useState, useMemo, useRef, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  PieChart as LucidePieChart, DollarSign, TrendingUp, Plus, Edit2, Trash2, Eye, X, 
  Calendar, Filter, Search, FileDown, CheckCircle, ArrowUpRight, ArrowDownRight, 
  AlertCircle, UploadCloud, Users, Printer, FileText, Link
} from 'lucide-react';
import { uploadToCloudinary } from '../lib/cloudinary';

// ─── Pure Helper Functions ─────────────────────────────────────────

const getStartAndEndOfTimeframe = (timeframe, customRange = null) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();
  
  if (timeframe === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (timeframe === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
    end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  } else if (timeframe === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (timeframe === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else if (timeframe === 'custom' && customRange && customRange.startDate && customRange.endDate) {
    start = new Date(customRange.startDate);
    start.setHours(0, 0, 0, 0);
    end = new Date(customRange.endDate);
    end.setHours(23, 59, 59, 999);
  }
  return { start, end };
};

const isWithinRange = (dateStr, start, end) => {
  const d = new Date(dateStr);
  return d >= start && d <= end;
};

// Expense Categories List
const expenseCategories = ['Rent', 'Electricity', 'Water', 'Internet', 'Salary', 'Equipment', 'Maintenance', 'Marketing', 'Other'];
const userExpenseCategories = expenseCategories.filter(cat => cat !== 'Salary');
const incomeSources = ['Registration Fees', 'Personal Training Sessions', 'Product Sales', 'Other'];

// ─── Component ──────────────────────────────────────────────────────

const Finance = ({ activeTabOverride }) => {
  const {
    invoices: rawInvoices,
    expenses: rawExpenses,
    income: rawIncome,
    currentUser,
    addExpense,
    updateExpense,
    deleteExpense,
    addIncome,
    showToast,
    members,
    employees,
    updateEmployee,
    gymSettings
  } = useDashboard();

  const invoices = useMemo(() => {
    return (rawInvoices || []).filter(inv => !inv.isSaaS && inv.invoice_number);
  }, [rawInvoices]);

  const income = useMemo(() => {
    return (rawIncome || []).filter(inc => !inc.isSaaS && inc.source && inc.amount !== undefined);
  }, [rawIncome]);

  const expenses = useMemo(() => {
    return (rawExpenses || []).filter(exp => !exp.isSaaS);
  }, [rawExpenses]);

  const isStandardStaff = currentUser && !['super_admin', 'gym_owner', 'owner', 'admin'].includes(currentUser.role);

  // Navigation states
  const [activeFinanceTab, setActiveFinanceTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'log_income' || viewParam === 'log_expense') {
      return viewParam;
    }
    const subTab = params.get('tab');
    if (isStandardStaff) {
      if (subTab && ['income', 'expenses', 'log_income', 'log_expense'].includes(subTab)) {
        return subTab;
      }
      return 'income';
    }
    if (subTab && ['overview', 'income', 'expenses', 'payroll', 'reports', 'exports', 'log_income', 'log_expense'].includes(subTab)) {
      return subTab;
    }
    return 'overview';
  });

  useEffect(() => {
    const viewParam = activeTabOverride;
    if (viewParam === 'log_income' || viewParam === 'log_expense') {
      setActiveFinanceTab(viewParam);
      if (viewParam === 'log_expense') {
        setExpenseModalMode('add');
        setExpenseForm({
          title: '',
          description: '',
          category: 'Rent',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          payment_method: 'card',
          remarks: '',
          receipt_url: '',
        });
      }
    }
  }, [activeTabOverride]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const viewParam = url.searchParams.get('view');
    const tabParam = url.searchParams.get('tab');
    if (viewParam === 'finance' && tabParam !== activeFinanceTab) {
      url.searchParams.set('tab', activeFinanceTab);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }, [activeFinanceTab]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const subTab = params.get('tab');
      const viewParam = params.get('view');
      if (viewParam === 'log_income' || viewParam === 'log_expense') {
        setActiveFinanceTab(viewParam);
        return;
      }
      const allowed = isStandardStaff ? ['income', 'expenses'] : ['overview', 'income', 'expenses', 'payroll', 'reports', 'exports'];
      if (subTab && allowed.includes(subTab)) {
        setActiveFinanceTab(subTab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, isStandardStaff]);

  // Payroll Tab States
  const [payrollSubTab, setPayrollSubTab] = useState('directory'); // 'directory', 'history', 'analytics'
  const [payrollSearch, setPayrollSearch] = useState('');
  const [isProcessPayrollOpen, setIsProcessPayrollOpen] = useState(false);
  const [processingEmployee, setProcessingEmployee] = useState(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const [payrollForm, setPayrollForm] = useState({
    month: new Date().toLocaleString('en-US', { month: 'long' }),
    year: new Date().getFullYear().toString(),
    basicSalary: '',
    bonus: '0',
    overtime: '0',
    allowance: '0',
    epf: '0',
    tax: '0',
    deduction: '0',
    paymentMethod: 'bank_transfer',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    remarks: '',
    nextSalaryDate: ''
  });

  const payrollMetrics = useMemo(() => {
    if (!employees) return { totalStaff: 0, monthlyCommitment: 0, paidThisMonth: 0, pendingThisMonth: 0, activeStaff: [], paidSalaries: [] };
    const activeStaff = employees.filter(emp => emp.status !== 'terminated');
    const totalStaff = activeStaff.length;
    const monthlyCommitment = activeStaff.reduce((sum, emp) => sum + (parseFloat(emp.salary) || 0), 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const paidSalaries = expenses.filter(exp => 
      exp.category === 'Salary' && 
      exp.date && 
      isWithinRange(exp.date, startOfMonth, endOfMonth)
    );
    const paidThisMonth = paidSalaries.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

    // Find employees who have NOT been paid this month
    const pendingStaff = activeStaff.filter(emp => {
      const hasBeenPaid = paidSalaries.some(exp => exp.employee_id === emp.id || exp.title.includes(emp.full_name));
      return !hasBeenPaid;
    });
    const pendingThisMonth = pendingStaff.reduce((sum, emp) => sum + (parseFloat(emp.salary) || 0), 0);

    return {
      totalStaff,
      monthlyCommitment,
      paidThisMonth,
      pendingThisMonth,
      activeStaff,
      paidSalaries
    };
  }, [employees, expenses]);

  const payrollHistory = useMemo(() => {
    return expenses
      .filter(exp => exp.category === 'Salary')
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses]);

  const filteredPayrollStaff = useMemo(() => {
    if (!payrollMetrics.activeStaff) return [];
    return payrollMetrics.activeStaff.filter(emp => 
      emp.full_name.toLowerCase().includes(payrollSearch.toLowerCase()) ||
      emp.role.toLowerCase().includes(payrollSearch.toLowerCase())
    );
  }, [payrollMetrics.activeStaff, payrollSearch]);

  const filteredPayrollHistory = useMemo(() => {
    return payrollHistory.filter(exp => 
      (exp.employee_name && exp.employee_name.toLowerCase().includes(payrollSearch.toLowerCase())) ||
      (exp.period && exp.period.toLowerCase().includes(payrollSearch.toLowerCase())) ||
      (exp.title && exp.title.toLowerCase().includes(payrollSearch.toLowerCase()))
    );
  }, [payrollHistory, payrollSearch]);

  const payrollRoleDistribution = useMemo(() => {
    if (!payrollMetrics.activeStaff) return [];
    const roles = {};
    payrollMetrics.activeStaff.forEach(emp => {
      roles[emp.role] = (roles[emp.role] || 0) + (parseFloat(emp.salary) || 0);
    });
    const COLORS = ['#f43f5e', '#f59e0b', '#06b6d4', '#8b5cf6', '#10b981', '#ec4899', '#ef4444', '#14b8a6', '#71717a'];
    return Object.keys(roles).map((role, idx) => ({
      name: role,
      value: roles[role],
      color: COLORS[idx % COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [payrollMetrics.activeStaff]);

  const payrollTrendData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthName = targetDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const monthlyPaidSalaries = expenses.filter(exp => 
        exp.category === 'Salary' && 
        exp.date && 
        isWithinRange(exp.date, start, end)
      );
      const totalAmount = monthlyPaidSalaries.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
      data.push({
        name: monthName,
        Payroll: totalAmount
      });
    }
    return data;
  }, [expenses]);


  const getEmployeeLastPaidDate = (empId, empName) => {
    const records = payrollHistory.filter(exp => exp.employee_id === empId || exp.title.includes(empName));
    if (records.length === 0) return 'Never';
    return records[0].date;
  };

  const isEmployeePaidThisMonth = (empId, empName) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return expenses.some(exp => 
      exp.category === 'Salary' && 
      (exp.employee_id === empId || exp.title.includes(empName)) &&
      exp.date && 
      isWithinRange(exp.date, startOfMonth, endOfMonth)
    );
  };

  const openProcessPayroll = (emp) => {
    setProcessingEmployee(emp);
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 25);
    const nextMonthStr = nextMonth.toISOString().split('T')[0];

    const basic = parseFloat(emp.salary) || 0;
    const defaultEpf = Math.round(basic * 0.08);

    setPayrollForm({
      month: today.toLocaleString('en-US', { month: 'long' }),
      year: today.getFullYear().toString(),
      basicSalary: emp.salary.toString(),
      bonus: '0',
      overtime: '0',
      allowance: '0',
      epf: defaultEpf.toString(),
      tax: '0',
      deduction: '0',
      paymentMethod: 'bank_transfer',
      reference: '',
      date: today.toISOString().split('T')[0],
      remarks: '',
      nextSalaryDate: nextMonthStr
    });
    setIsProcessPayrollOpen(true);
  };

  const handleProcessPayrollSubmit = async (e) => {
    e.preventDefault();
    if (!processingEmployee) return;

    const basic = parseFloat(payrollForm.basicSalary) || 0;
    const bonus = parseFloat(payrollForm.bonus) || 0;
    const overtime = parseFloat(payrollForm.overtime) || 0;
    const allowance = parseFloat(payrollForm.allowance) || 0;
    const epf = parseFloat(payrollForm.epf) || 0;
    const tax = parseFloat(payrollForm.tax) || 0;
    const deduction = parseFloat(payrollForm.deduction) || 0;

    const netPayable = basic + bonus + overtime + allowance - epf - tax - deduction;

    const payrollExpense = {
      title: `Salary Payout - ${processingEmployee.full_name} (${payrollForm.month} ${payrollForm.year})`,
      description: `Basic: LKR ${basic.toLocaleString()}, Allowances: LKR ${(bonus + overtime + allowance).toLocaleString()}, Deductions: LKR ${(epf + tax + deduction).toLocaleString()}`,
      category: 'Salary',
      amount: netPayable,
      date: payrollForm.date,
      payment_method: payrollForm.paymentMethod,
      notes: payrollForm.remarks || `Payroll payment for ${processingEmployee.full_name}`,
      is_payroll: true,
      employee_id: processingEmployee.id,
      employee_name: processingEmployee.full_name,
      employee_role: processingEmployee.role,
      basic_salary: basic,
      bonus_pay: bonus,
      overtime_pay: overtime,
      allowance_pay: allowance,
      epf_deduction: epf,
      tax_deduction: tax,
      other_deductions: deduction,
      net_salary: netPayable,
      period: `${payrollForm.month} ${payrollForm.year}`,
      reference: payrollForm.reference
    };

    try {
      const res = await addExpense(payrollExpense);
      if (res.success) {
        await updateEmployee(processingEmployee.id, {
          next_salary_date: payrollForm.nextSalaryDate
        });
        showToast(`Payroll processed successfully for ${processingEmployee.full_name}! Net salary LKR ${netPayable.toLocaleString()} paid.`, 'success');
        setIsProcessPayrollOpen(false);
      } else {
        showToast(`Failed to process payroll: ${res.message}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error processing payroll.', 'error');
    }
  };

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

  // Overview Tab Timeline: 'monthly' (fixed for charts comparison)

  // Income Tab Filters & State
  const [incomeTimeframe, setIncomeTimeframe] = useState('month');
  const [incomeSearch, setIncomeSearch] = useState('');
  const [incomeCustomRange, setIncomeCustomRange] = useState({ startDate: '', endDate: '' });
  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [newIncomeForm, setNewIncomeForm] = useState({
    source: 'Registration Fees',
    member_name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'card',
    payment_reference: '',
    notes: ''
  });

  // Expenses Tab Filters & State
  const [expenseTimeframe, setExpenseTimeframe] = useState('month');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');
  const [expenseCustomRange, setExpenseCustomRange] = useState({ startDate: '', endDate: '' });
  
  // Expense Modal States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseModalMode, setExpenseModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    description: '',
    category: 'Rent',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'card',
    receipt_url: '',
    notes: ''
  });

  const [receiptUploading, setReceiptUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Reports Tab Filters & State
  const [reportTimeframe, setReportTimeframe] = useState('month');
  const [reportCustomRange, setReportCustomRange] = useState({ startDate: '', endDate: '' });

  // Exports Tab State
  const [exportCustomRange, setExportCustomRange] = useState({ startDate: '', endDate: '' });

  // Recent Transactions date filter state
  const [txDateFilter, setTxDateFilter] = useState('');



  // ─── 1. OVERVIEW METRICS CALCULATIONS ────────────────────────────────

  const overviewMetrics = useMemo(() => {
    const calcMetrics = (period) => {
      const { start, end } = getStartAndEndOfTimeframe(period);
      
      // Membership payments (Invoices with paid_at in range)
      const paidInvoices = invoices.filter(inv => {
        if (inv.status !== 'paid' || !inv.paid_at) return false;
        return isWithinRange(inv.paid_at, start, end);
      });
      const membershipIncome = paidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      
      // Manual logged income
      const manualInc = income.filter(inc => {
        if (!inc.date) return false;
        return isWithinRange(inc.date, start, end);
      });
      const otherIncome = manualInc.reduce((sum, inc) => sum + inc.amount, 0);
      
      const totalInc = membershipIncome + otherIncome;
      
      // Operating Expenses
      const periodExpenses = expenses.filter(exp => {
        if (!exp.date) return false;
        return isWithinRange(exp.date, start, end);
      });
      const totalExp = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      const profit = totalInc - totalExp;
      
      return { income: totalInc, expenses: totalExp, profit };
    };

    return {
      today: calcMetrics('today'),
      week: calcMetrics('week'),
      month: calcMetrics('month'),
      year: calcMetrics('year')
    };
  }, [invoices, income, expenses]);

  // ─── 2. CHARTS GENERATION ───────────────────────────────────────────

  // Monthly breakdown for last 6 months (Income vs Expenses vs Profit)
  const chartDataMonthly = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const monthName = targetDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      // Paid invoices
      const paidInvoices = invoices.filter(inv => inv.status === 'paid' && inv.paid_at && isWithinRange(inv.paid_at, start, end));
      const membership = paidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      
      // Manual income
      const manual = income.filter(inc => inc.date && isWithinRange(inc.date, start, end));
      const other = manual.reduce((sum, inc) => sum + inc.amount, 0);
      
      const totalInc = membership + other;
      
      // Expenses
      const expList = expenses.filter(exp => exp.date && isWithinRange(exp.date, start, end));
      const totalExp = expList.reduce((sum, exp) => sum + exp.amount, 0);
      
      data.push({
        name: monthName,
        Income: totalInc,
        Expenses: totalExp,
        Profit: totalInc - totalExp
      });
    }
    return data;
  }, [invoices, income, expenses]);

  // Expense Category breakdown for Current Month
  const expenseCategoryData = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const categories = {};
    expenses.forEach(exp => {
      if (exp.date && isWithinRange(exp.date, start, end)) {
        categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
      }
    });
    
    const colors = {
      Rent: '#f43f5e',
      Electricity: '#f59e0b',
      Water: '#06b6d4',
      Internet: '#8b5cf6',
      Salary: '#10b981',
      Equipment: '#ec4899',
      Maintenance: '#ef4444',
      Marketing: '#14b8a6',
      Other: '#71717a'
    };
    
    return Object.keys(categories).map(cat => ({
      name: cat,
      value: categories[cat],
      color: colors[cat] || '#888888'
    })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Unified Recent Transactions List
  const recentTransactions = useMemo(() => {
    let trans = [];
    const seenTx = new Set();
    
    // Paid invoices (Membership payments)
    invoices.forEach(inv => {
      if (inv.status === 'paid' && inv.paid_at) {
        const key = `invoice-${inv.invoice_number || inv.id}`;
        if (!seenTx.has(key)) {
          seenTx.add(key);
          trans.push({
            id: inv.id,
            date: inv.paid_at.split('T')[0],
            type: 'Income',
            description: `Membership - ${inv.member_name}`,
            category: 'Membership Payments',
            amount: inv.total_amount
          });
        }
      }
    });
    
    // Manual income logs
    income.forEach(inc => {
      const key = `income-${inc.source}-${inc.amount}-${inc.date}-${inc.member_name || ''}`;
      if (!seenTx.has(key)) {
        seenTx.add(key);
        trans.push({
          id: inc.id,
          date: inc.date,
          type: 'Income',
          description: inc.member_name ? `${inc.source} - ${inc.member_name}` : inc.source,
          category: inc.source,
          amount: inc.amount
        });
      }
    });
    
    // Expenses
    expenses.forEach(exp => {
      const key = `expense-${exp.title}-${exp.amount}-${exp.date}-${exp.category}`;
      if (!seenTx.has(key)) {
        seenTx.add(key);
        trans.push({
          id: exp.id,
          date: exp.date,
          type: 'Expense',
          description: exp.title,
          category: exp.category,
          amount: exp.amount
        });
      }
    });
    
    // Filter by specific date if selected
    if (txDateFilter) {
      trans = trans.filter(tx => tx.date === txDateFilter);
    }
    
    // Sort descending by date
    trans.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Show all matching when filtered, otherwise default to top 10
    return txDateFilter ? trans : trans.slice(0, 10);
  }, [invoices, income, expenses, txDateFilter]);

  // ─── 3. INCOME TAB FILTERING & MERGING ──────────────────────────────

  const filteredIncomeList = useMemo(() => {
    const allInc = [];
    
    // Membership payments
    invoices.forEach(inv => {
      if (inv.status === 'paid' && inv.paid_at) {
        allInc.push({
          id: inv.id,
          date: inv.paid_at.split('T')[0],
          member: inv.member_name,
          source: 'Membership Payments',
          paymentMethod: inv.payment_method || 'card',
          amount: inv.total_amount,
          reference: inv.invoice_number || ''
        });
      }
    });
    
    // Manual income
    income.forEach(inc => {
      allInc.push({
        id: inc.id,
        date: inc.date,
        member: inc.member_name || 'Walk-in Customer',
        source: inc.source,
        paymentMethod: inc.payment_method || 'cash',
        amount: inc.amount,
        reference: inc.payment_reference || ''
      });
    });
    
    // Apply date timeframe filters
    const { start, end } = getStartAndEndOfTimeframe(incomeTimeframe, incomeCustomRange);
    let list = allInc.filter(item => isWithinRange(item.date, start, end));
    
    // Apply search filter (Member Name, Source, Payment Reference)
    if (incomeSearch.trim() !== '') {
      const q = incomeSearch.toLowerCase();
      list = list.filter(item => 
        item.member.toLowerCase().includes(q) || 
        item.source.toLowerCase().includes(q) || 
        item.reference.toLowerCase().includes(q)
      );
    }
    
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return list;
  }, [invoices, income, incomeTimeframe, incomeCustomRange, incomeSearch]);

  // ─── 4. EXPENSES TAB FILTERING ──────────────────────────────────────

  const filteredExpensesList = useMemo(() => {
    const { start, end } = getStartAndEndOfTimeframe(expenseTimeframe, expenseCustomRange);
    let list = expenses.filter(exp => exp.date && isWithinRange(exp.date, start, end) && exp.category !== 'Salary');
    
    if (expenseCategoryFilter !== 'All') {
      list = list.filter(exp => exp.category === expenseCategoryFilter);
    }
    
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return list;
  }, [expenses, expenseTimeframe, expenseCustomRange, expenseCategoryFilter]);

  // ─── 5. REPORTS TAB DYNAMIC PERFORMANCE COMPUTATION ──────────────────

  const reportData = useMemo(() => {
    const { start, end } = getStartAndEndOfTimeframe(reportTimeframe, reportCustomRange);
    
    // Membership payments in range
    const paidInvoices = invoices.filter(inv => inv.status === 'paid' && inv.paid_at && isWithinRange(inv.paid_at, start, end));
    const membershipIncome = paidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    
    // Manual income in range
    const manualInc = income.filter(inc => inc.date && isWithinRange(inc.date, start, end));
    const registrationIncome = manualInc.filter(i => i.source === 'Registration Fees').reduce((sum, i) => sum + i.amount, 0);
    const ptIncome = manualInc.filter(i => i.source === 'Personal Training Sessions').reduce((sum, i) => sum + i.amount, 0);
    const productIncome = manualInc.filter(i => i.source === 'Product Sales').reduce((sum, i) => sum + i.amount, 0);
    const otherIncome = manualInc.filter(i => i.source === 'Other').reduce((sum, i) => sum + i.amount, 0);
    
    const totalIncome = membershipIncome + registrationIncome + ptIncome + productIncome + otherIncome;
    
    const incomeBreakdown = [
      { source: 'Membership Payments', amount: membershipIncome },
      { source: 'Registration Fees', amount: registrationIncome },
      { source: 'Personal Training Sessions', amount: ptIncome },
      { source: 'Product Sales', amount: productIncome },
      { source: 'Other Income', amount: otherIncome }
    ];
    
    // Expenses in range
    const periodExpenses = expenses.filter(exp => exp.date && isWithinRange(exp.date, start, end));
    const totalExpenses = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const expenseBreakdown = expenseCategories.map(cat => {
      const amt = periodExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
      return { category: cat, amount: amt };
    }).sort((a, b) => b.amount - a.amount);
    
    const totalProfit = totalIncome - totalExpenses;
    
    // Grouped Chart Data for Report Visuals
    const reportCharts = [];
    if (reportTimeframe === 'today' || reportTimeframe === 'week') {
      const days = reportTimeframe === 'today' ? 1 : 7;
      const now = new Date(end);
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
        
        const dayMembership = invoices.filter(inv => inv.status === 'paid' && inv.paid_at && inv.paid_at.startsWith(dateStr)).reduce((sum, i) => sum + i.total_amount, 0);
        const dayManual = income.filter(inc => inc.date === dateStr).reduce((sum, i) => sum + i.amount, 0);
        const dayInc = dayMembership + dayManual;
        
        const dayExp = expenses.filter(exp => exp.date === dateStr).reduce((sum, i) => sum + i.amount, 0);
        
        reportCharts.push({
          name: dayLabel,
          Income: dayInc,
          Expenses: dayExp,
          Profit: dayInc - dayExp
        });
      }
    } else if (reportTimeframe === 'month') {
      // Group by Week of Month
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      weeks.forEach((weekStr, idx) => {
        const startDay = idx * 7 + 1;
        const endDay = idx === 3 ? 31 : (idx + 1) * 7;
        const monthPrefix = end.toISOString().substring(0, 7);
        
        const weeklyMembership = invoices.filter(inv => {
          if (inv.status !== 'paid' || !inv.paid_at || !inv.paid_at.startsWith(monthPrefix)) return false;
          const dateNum = new Date(inv.paid_at).getDate();
          return dateNum >= startDay && dateNum <= endDay;
        }).reduce((sum, i) => sum + i.total_amount, 0);
        
        const weeklyManual = income.filter(inc => {
          if (!inc.date || !inc.date.startsWith(monthPrefix)) return false;
          const dateNum = new Date(inc.date).getDate();
          return dateNum >= startDay && dateNum <= endDay;
        }).reduce((sum, i) => sum + i.amount, 0);
        
        const weeklyInc = weeklyMembership + weeklyManual;
        
        const weeklyExp = expenses.filter(exp => {
          if (!exp.date || !exp.date.startsWith(monthPrefix)) return false;
          const dateNum = new Date(exp.date).getDate();
          return dateNum >= startDay && dateNum <= endDay;
        }).reduce((sum, i) => sum + i.amount, 0);
        
        reportCharts.push({
          name: weekStr,
          Income: weeklyInc,
          Expenses: weeklyExp,
          Profit: weeklyInc - weeklyExp
        });
      });
    } else {
      // Group by Month (Yearly / Custom view)
      const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentYear = end.getFullYear();
      monthsList.forEach((monthName, idx) => {
        const monthPrefix = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
        
        const monthlyMembership = invoices.filter(inv => inv.status === 'paid' && inv.paid_at && inv.paid_at.startsWith(monthPrefix)).reduce((sum, i) => sum + i.total_amount, 0);
        const monthlyManual = income.filter(inc => inc.date && inc.date.startsWith(monthPrefix)).reduce((sum, i) => sum + i.amount, 0);
        const monthlyInc = monthlyMembership + monthlyManual;
        
        const monthlyExp = expenses.filter(exp => exp.date && exp.date.startsWith(monthPrefix)).reduce((sum, i) => sum + i.amount, 0);
        
        reportCharts.push({
          name: monthName,
          Income: monthlyInc,
          Expenses: monthlyExp,
          Profit: monthlyInc - monthlyExp
        });
      });
    }
    
    const colors = {
      Rent: '#f43f5e',
      Electricity: '#f59e0b',
      Water: '#06b6d4',
      Internet: '#8b5cf6',
      Salary: '#10b981',
      Equipment: '#ec4899',
      Maintenance: '#ef4444',
      Marketing: '#14b8a6',
      Other: '#71717a'
    };
    
    const expenseCategoryChart = expenseBreakdown
      .filter(eb => eb.amount > 0)
      .map(eb => ({
        name: eb.category,
        value: eb.amount,
        color: colors[eb.category] || '#888888'
      }));
    
    return {
      totalIncome,
      totalExpenses,
      totalProfit,
      incomeBreakdown,
      expenseBreakdown,
      reportCharts,
      expenseCategoryChart
    };
  }, [invoices, income, expenses, reportTimeframe, reportCustomRange]);

  // ─── 6. ACTIONS (CRUD & MODALS) ─────────────────────────────────────

  // Add Income Submit
  const handleAddIncomeSubmit = async (e) => {
    e.preventDefault();
    if (!newIncomeForm.amount || parseFloat(newIncomeForm.amount) <= 0) {
      showToast('Please enter a valid income amount.', 'error');
      return;
    }
    
    try {
      const res = await addIncome(newIncomeForm);
      if (res.success) {
        showToast('Income logged successfully.', 'success');
        setIsAddIncomeModalOpen(false);
        setNewIncomeForm({
          source: 'Registration Fees',
          member_name: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          payment_method: 'card',
          payment_reference: '',
          notes: ''
        });
      } else {
        showToast(res.message || 'Failed to log income.', 'error');
      }
    } catch (err) {
      console.error('Add income error:', err);
      showToast('System error logging income.', 'error');
    }
  };

  // Receipt File Selection & Cloudinary Upload
  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setReceiptUploading(true);
    try {
      const res = await uploadToCloudinary(file, { folder: 'ascend/receipts' });
      setExpenseForm(prev => ({ ...prev, receipt_url: res.secure_url }));
      showToast('Receipt uploaded successfully.', 'success');
    } catch (err) {
      console.error('Receipt upload failed, falling back to mock receipt image:', err);
      setExpenseForm(prev => ({ 
        ...prev, 
        receipt_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=500&auto=format&fit=crop' 
      }));
      showToast('Could not reach Cloudinary server. Standard placeholder receipt used instead.', 'info');
    } finally {
      setReceiptUploading(false);
    }
  };

  // Add/Edit Expense triggers
  const openAddExpenseModal = () => {
    setExpenseModalMode('add');
    setSelectedExpense(null);
    setExpenseForm({
      title: '',
      description: '',
      category: 'Rent',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      payment_method: 'card',
      receipt_url: '',
      notes: ''
    });
    setIsExpenseModalOpen(true);
  };

  const openEditExpenseModal = (exp) => {
    setExpenseModalMode('edit');
    setSelectedExpense(exp);
    setExpenseForm({
      title: exp.title,
      description: exp.description || '',
      category: exp.category,
      amount: exp.amount,
      date: exp.date,
      payment_method: exp.payment_method || 'card',
      receipt_url: exp.receipt_url || '',
      notes: exp.notes || ''
    });
    setIsExpenseModalOpen(true);
  };

  const openViewExpenseModal = (exp) => {
    setExpenseModalMode('view');
    setSelectedExpense(exp);
    setExpenseForm({
      title: exp.title,
      description: exp.description || '',
      category: exp.category,
      amount: exp.amount,
      date: exp.date,
      payment_method: exp.payment_method || 'card',
      receipt_url: exp.receipt_url || '',
      notes: exp.notes || ''
    });
    setIsExpenseModalOpen(true);
  };

  // Expense CRUD Submit
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.title.trim() || !expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      showToast('Please enter a valid title and amount.', 'error');
      return;
    }

    try {
      if (expenseModalMode === 'add') {
        const res = await addExpense(expenseForm);
        if (res.success) {
          showToast('Expense recorded successfully.', 'success');
          setIsExpenseModalOpen(false);
          if (activeFinanceTab === 'log_expense') {
            setExpenseForm({
              title: '',
              description: '',
              category: 'Rent',
              amount: '',
              date: new Date().toISOString().split('T')[0],
              payment_method: 'card',
              notes: '',
              receipt_url: '',
            });
          }
        } else {
          showToast(res.message || 'Failed to add expense.', 'error');
        }
      } else if (expenseModalMode === 'edit' && selectedExpense) {
        const res = await updateExpense(selectedExpense.id, expenseForm);
        if (res.success) {
          showToast('Expense updated successfully.', 'success');
          setIsExpenseModalOpen(false);
        } else {
          showToast(res.message || 'Failed to update expense.', 'error');
        }
      }
    } catch (err) {
      console.error('Manage expense error:', err);
      showToast('System error managing expense.', 'error');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const res = await deleteExpense(id);
      if (res.success) {
        showToast('Expense record deleted.', 'success');
        if (isExpenseModalOpen) setIsExpenseModalOpen(false);
      } else {
        showToast(res.message || 'Failed to delete expense.', 'error');
      }
    } catch (err) {
      console.error('Delete expense error:', err);
      showToast('System error deleting expense.', 'error');
    }
  };

  // ─── 7. PDF EXPORT STATEMENT GENERATION ────────────────────────────

  const handleExportPDF = (periodType, customRangeObj = null) => {
    const { start, end } = getStartAndEndOfTimeframe(periodType, customRangeObj);
    const dateRangeLabel = periodType === 'today'
      ? start.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
      : periodType === 'month'
        ? start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : periodType === 'year'
          ? start.toLocaleDateString('en-US', { year: 'numeric' })
          : `${start.toLocaleDateString('en-US')} - ${end.toLocaleDateString('en-US')}`;

    // Paid Invoices
    const paidInvs = invoices.filter(inv => inv.status === 'paid' && inv.paid_at && isWithinRange(inv.paid_at, start, end));
    const membershipTotal = paidInvs.reduce((sum, inv) => sum + inv.total_amount, 0);
    
    // Manual Income logs
    const manualIncs = income.filter(inc => inc.date && isWithinRange(inc.date, start, end));
    const manualTotal = manualIncs.reduce((sum, inc) => sum + inc.amount, 0);
    
    const totalInc = membershipTotal + manualTotal;
    
    // Expenses
    const periodExps = expenses.filter(exp => exp.date && isWithinRange(exp.date, start, end));
    const totalExps = periodExps.reduce((sum, exp) => sum + exp.amount, 0);
    const profitVal = totalInc - totalExps;
    
    // Group Income
    const incSources = {
      'Membership Payments': membershipTotal,
      'Registration Fees': manualIncs.filter(i => i.source === 'Registration Fees').reduce((sum, i) => sum + i.amount, 0),
      'Personal Training Sessions': manualIncs.filter(i => i.source === 'Personal Training Sessions').reduce((sum, i) => sum + i.amount, 0),
      'Product Sales': manualIncs.filter(i => i.source === 'Product Sales').reduce((sum, i) => sum + i.amount, 0),
      'Other': manualIncs.filter(i => i.source === 'Other').reduce((sum, i) => sum + i.amount, 0),
    };
    
    // Group Expenses
    const expCategoriesSum = {};
    expenseCategories.forEach(cat => {
      expCategoriesSum[cat] = periodExps.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Pop-up blocker is enabled. Please allow pop-ups to generate reports.', 'error');
      return;
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Statement - ${gymSettings?.gymName || 'Fitgencore'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Oswald:wght@500;700&display=swap');
          body {
            font-family: 'Montserrat', Arial, sans-serif;
            color: #000000;
            background: #ffffff;
            padding: 45px;
            font-size: 13px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000000;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .gym-name {
            font-family: 'Oswald', sans-serif;
            font-size: 26px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin: 0;
          }
          .report-title {
            font-family: 'Oswald', sans-serif;
            font-size: 16px;
            font-weight: 500;
            color: #4b5563;
            margin: 5px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 1.5px;
          }
          .date-range {
            font-size: 13px;
            color: #6b7280;
            margin-top: 5px;
          }
          .meta-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 35px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #4b5563;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 40px;
          }
          .summary-card {
            border: 1px solid #e5e7eb;
            background: #fafafa;
            padding: 18px;
            text-align: center;
          }
          .summary-card.accent {
            background: #18181b;
            color: #ffffff;
            border: 1px solid #18181b;
          }
          .summary-label {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 1px;
            color: #71717a;
            margin-bottom: 6px;
          }
          .summary-card.accent .summary-label {
            color: #a1a1aa;
          }
          .summary-val {
            font-size: 20px;
            font-weight: 700;
            font-family: 'Oswald', sans-serif;
          }
          .section-title {
            font-family: 'Oswald', sans-serif;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            border-bottom: 1px solid #000000;
            padding-bottom: 5px;
            margin-bottom: 15px;
            margin-top: 35px;
            letter-spacing: 1px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 12px;
          }
          th {
            background: #f4f4f5;
            font-weight: 600;
            text-align: left;
            padding: 10px 14px;
            border-bottom: 1px solid #000000;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
          }
          td {
            padding: 10px 14px;
            border-bottom: 1px solid #f4f4f5;
          }
          tr.total-row td {
            font-weight: bold;
            border-top: 1px solid #000000;
            border-bottom: 3px double #000000;
            background: #fafafa;
            font-size: 13px;
          }
          .right {
            text-align: right;
          }
          .footer {
            margin-top: 80px;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #71717a;
            letter-spacing: 0.5px;
          }
          .signature-section {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
          }
          .sig-box {
            width: 200px;
            border-top: 1px solid #000000;
            text-align: center;
            padding-top: 8px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }
          @media print {
            body {
              padding: 20px;
            }
            .no-print-btn {
              display: none !important;
            }
          }
          .no-print-btn {
            position: fixed;
            top: 25px;
            right: 25px;
            background: #000000;
            color: #ffffff;
            border: none;
            padding: 12px 24px;
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
            background: #27272a;
          }
        </style>
      </head>
      <body>
        <button class="no-print-btn" onclick="window.print()">Export to PDF</button>

        <div class="header">
          <div class="gym-name">${gymSettings?.gymName || 'Fitgencore Headquarters'}</div>
          <div class="report-title">Financial Report</div>
          <div class="date-range">Statement Period: ${dateRangeLabel}</div>
        </div>

        <div class="meta-section">
          <div>
            <strong>Report Date:</strong> ${new Date().toLocaleString()}
          </div>
          <div>
            <strong>Generated By:</strong> ${currentUser?.name || 'Super Administrator'}
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Total Revenue (Income)</div>
            <div class="summary-val">LKR ${totalInc.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Operating Expenses</div>
            <div class="summary-val">LKR ${totalExps.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="summary-card accent">
            <div class="summary-label">Net Profit / (Loss)</div>
            <div class="summary-val" style="color: ${profitVal >= 0 ? '#ffffff' : '#f87171'}">
              LKR ${profitVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div class="section-title">Revenue (Income) Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Revenue Source</th>
              <th class="right">Amount (LKR)</th>
            </tr>
          </thead>
          <tbody>
            ${Object.keys(incSources).map(source => `
              <tr>
                <td>${source}</td>
                <td class="right">${incSources[source].toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td>Total Income</td>
              <td class="right">LKR ${totalInc.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">Operating Expenses Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Expense Category</th>
              <th class="right">Amount (LKR)</th>
            </tr>
          </thead>
          <tbody>
            ${Object.keys(expCategoriesSum).map(cat => `
              <tr>
                <td>${cat}</td>
                <td class="right">${expCategoriesSum[cat].toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td>Total Expenses</td>
              <td class="right">LKR ${totalExps.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="signature-section">
          <div>
            <div style="height: 50px;"></div>
            <div class="sig-box">Prepared By</div>
          </div>
          <div>
            <div style="height: 50px;"></div>
            <div class="sig-box">Approved By Management</div>
          </div>
        </div>

        <div class="footer">
          <div>Generated by ${gymSettings?.gymName || 'Fitgencore'} Management System</div>
          <div>Statement Period: ${dateRangeLabel}</div>
          <div>Confidential Document</div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="page-container">
      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      {activeFinanceTab !== 'log_income' && activeFinanceTab !== 'log_expense' && (
        <div className="page-header">
          <div className="page-info">
            <h1>Finance Module</h1>
            <p>Analyze gym profit/loss, view income payments, log facility expenses, and export financial audit sheets.</p>
          </div>
        </div>
      )}

      {/* ─── SUB-MENU / NAVIGATION TABS ───────────────────────────────── */}
      {activeFinanceTab !== 'log_income' && activeFinanceTab !== 'log_expense' && (
        <div className="tab-menu" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          {(isStandardStaff ? ['income', 'expenses'] : ['overview', 'income', 'expenses', 'payroll', 'reports', 'exports']).map((tab) => (
            <button
              key={tab}
              className={`btn ${activeFinanceTab === tab ? 'btn-primary' : 'btn-secondary'}`}
              style={{ 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                fontSize: '0.8rem',
                padding: '0.5rem 1rem'
              }}
              onClick={() => setActiveFinanceTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* ─── TAB CONTENT: OVERVIEW ──────────────────────────────────── */}
      {activeFinanceTab === 'overview' && !isStandardStaff && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Grouped summary cards (Daily, Weekly, Monthly, Yearly) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            
            {/* Daily Card */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', justify: 'space-between', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>DAILY PERFORMANCE</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TODAY</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Income:</span>
                  <span style={{ fontWeight: 600 }}>LKR {overviewMetrics.today.income.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Expenses:</span>
                  <span style={{ fontWeight: 600 }}>LKR {overviewMetrics.today.expenses.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                  <span style={{ fontWeight: 700 }}>Net Profit:</span>
                  <span style={{ fontWeight: 700, color: overviewMetrics.today.profit >= 0 ? '#fff' : 'var(--text-muted)' }}>
                    LKR {overviewMetrics.today.profit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly Card */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', justify: 'space-between', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>WEEKLY PERFORMANCE</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>THIS WEEK</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Income:</span>
                  <span style={{ fontWeight: 600 }}>LKR {overviewMetrics.week.income.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Expenses:</span>
                  <span style={{ fontWeight: 600 }}>LKR {overviewMetrics.week.expenses.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                  <span style={{ fontWeight: 700 }}>Net Profit:</span>
                  <span style={{ fontWeight: 700, color: overviewMetrics.week.profit >= 0 ? '#fff' : 'var(--text-muted)' }}>
                    LKR {overviewMetrics.week.profit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Card */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', justify: 'space-between', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>MONTHLY PERFORMANCE</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>THIS MONTH</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Income:</span>
                  <span style={{ fontWeight: 600 }}>LKR {overviewMetrics.month.income.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Expenses:</span>
                  <span style={{ fontWeight: 600 }}>LKR {overviewMetrics.month.expenses.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                  <span style={{ fontWeight: 700 }}>Net Profit:</span>
                  <span style={{ fontWeight: 700, color: overviewMetrics.month.profit >= 0 ? '#fff' : 'var(--text-muted)' }}>
                    LKR {overviewMetrics.month.profit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Yearly Card */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', justify: 'space-between', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>YEARLY PERFORMANCE</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>THIS YEAR</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Income:</span>
                  <span style={{ fontWeight: 600 }}>LKR {overviewMetrics.year.income.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Expenses:</span>
                  <span style={{ fontWeight: 600 }}>LKR {overviewMetrics.year.expenses.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                  <span style={{ fontWeight: 700 }}>Net Profit:</span>
                  <span style={{ fontWeight: 700, color: overviewMetrics.year.profit >= 0 ? '#fff' : 'var(--text-muted)' }}>
                    LKR {overviewMetrics.year.profit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Recharts Plots */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
            
            {/* Income vs Expenses Bar/Area */}
            <div className="glass-card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} /> Income vs Expenses (Last 6 Months)
              </h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} tickFormatter={(v) => `LKR ${v/1000}k`} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: '#fff' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Income" fill="#ffffff" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill="#404040" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Profit Trend Chart */}
            <div className="glass-card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={16} /> Net Profit Trend
              </h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartDataMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} tickFormatter={(v) => `LKR ${v/1000}k`} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: '#fff' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Profit" stroke="#ffffff" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense breakdown chart */}
            <div className="glass-card" style={{ gridColumn: 'span 1' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucidePieChart size={16} /> Expense Category Breakdown (Current Month)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expenseCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `LKR ${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {expenseCategoryData.map((entry, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: entry.color, borderRadius: '50%' }} />
                      <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>{entry.name}</span>
                      <span style={{ fontWeight: 600, marginLeft: 'auto' }}>LKR {entry.value.toLocaleString()}</span>
                    </div>
                  ))}
                  {expenseCategoryData.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>No expenses logged this month.</p>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Recent transactions list (Full Width) */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 1.5rem 0.5rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} style={{ color: 'var(--color-primary)' }} /> Recent Transactions Table
              </h3>

              {/* Date Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filter by Date:</span>
                <input
                  type="date"
                  className="glass-input"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', width: '140px', outline: 'none' }}
                  value={txDateFilter}
                  onChange={(e) => setTxDateFilter(e.target.value)}
                />
                {txDateFilter && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                    onClick={() => setTxDateFilter('')}
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>
            
            <div className="table-container" style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx, idx) => (
                    <tr key={idx}>
                      <td>{tx.date}</td>
                      <td>
                        <span className={`badge ${tx.type === 'Income' ? 'badge-success' : 'badge-danger'}`} style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          borderRadius: '4px',
                          background: tx.type === 'Income' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${tx.type === 'Income' ? 'rgba(255,255,255,0.2)' : 'var(--border-color)'}`,
                          color: tx.type === 'Income' ? '#fff' : 'var(--text-muted)'
                        }}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ color: '#fff', fontWeight: 500 }}>{tx.description}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{tx.category}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: tx.type === 'Income' ? '#fff' : 'var(--text-muted)' }}>
                        {tx.type === 'Income' ? '+' : '-'} LKR {tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {recentTransactions.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No transactions found for the selected date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB CONTENT: INCOME ────────────────────────────────────── */}
      {activeFinanceTab === 'income' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '8px' }}>
                <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                <select
                  className="glass-select"
                  style={{ border: 'none', background: 'transparent', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
                  value={incomeTimeframe}
                  onChange={(e) => setIncomeTimeframe(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {incomeTimeframe === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="date"
                    className="glass-input"
                    style={{ width: '130px', padding: '0.35rem' }}
                    value={incomeCustomRange.startDate}
                    onChange={(e) => setIncomeCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
                  <input
                    type="date"
                    className="glass-input"
                    style={{ width: '130px', padding: '0.35rem' }}
                    value={incomeCustomRange.endDate}
                    onChange={(e) => setIncomeCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              )}

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by member or source..."
                  className="glass-input"
                  style={{ paddingLeft: '2rem', width: '240px', padding: '0.4rem 1rem 0.4rem 2rem' }}
                  value={incomeSearch}
                  onChange={(e) => setIncomeSearch(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?view=income_log&gymId=${gymSettings?.gymId || 'gym_ascend_hq'}`;
                  navigator.clipboard.writeText(url);
                  showToast('Income log link copied to clipboard!', 'success');
                }}
                style={{ gap: '0.45rem', display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}
              >
                <Link size={14} /> Share Log Link
              </button>
              <button className="btn btn-primary" onClick={() => setIsAddIncomeModalOpen(true)}>
                <Plus size={16} /> Log Income
              </button>
            </div>
          </div>

          {/* Income Directory Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Member</th>
                    <th>Source</th>
                    <th>Payment Method</th>
                    <th>Reference</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncomeList.map((incItem) => (
                    <tr key={incItem.id}>
                      <td>{incItem.date}</td>
                      <td style={{ color: '#fff', fontWeight: 600 }}>{incItem.member}</td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: 'rgba(255,255,255,0.02)',
                          color: incItem.source === 'Membership Payments' ? '#fff' : 'var(--text-muted)'
                        }}>
                          {incItem.source}
                        </span>
                      </td>
                      <td style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>{incItem.paymentMethod}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {incItem.reference || 'N/A'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#fff' }}>
                        LKR {incItem.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {filteredIncomeList.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No income records found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB CONTENT: EXPENSES ──────────────────────────────────── */}
      {activeFinanceTab === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              
              {/* Date Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '8px' }}>
                <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                <select
                  className="glass-select"
                  style={{ border: 'none', background: 'transparent', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
                  value={expenseTimeframe}
                  onChange={(e) => setExpenseTimeframe(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Custom date range picker */}
              {expenseTimeframe === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="date"
                    className="glass-input"
                    style={{ width: '130px', padding: '0.35rem' }}
                    value={expenseCustomRange.startDate}
                    onChange={(e) => setExpenseCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
                  <input
                    type="date"
                    className="glass-input"
                    style={{ width: '130px', padding: '0.35rem' }}
                    value={expenseCustomRange.endDate}
                    onChange={(e) => setExpenseCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              )}

              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '8px' }}>
                <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                <select
                  className="glass-select"
                  style={{ border: 'none', background: 'transparent', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {userExpenseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?view=expenses_log&gymId=${gymSettings?.gymId || 'gym_ascend_hq'}`;
                  navigator.clipboard.writeText(url);
                  showToast('Expenses log link copied to clipboard!', 'success');
                }}
                style={{ gap: '0.45rem', display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}
              >
                <Link size={14} /> Share Log Link
              </button>
              <button className="btn btn-primary" onClick={openAddExpenseModal}>
                <Plus size={16} /> Record Expense
              </button>
            </div>
          </div>

          {/* Expenses Directory Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Expense Title</th>
                    <th>Category</th>
                    <th>Method</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'center' }}>Receipt</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpensesList.map((exp) => (
                    <tr key={exp.id}>
                      <td>{exp.date}</td>
                      <td style={{ color: '#fff', fontWeight: 600 }}>{exp.title}</td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: 'rgba(255,255,255,0.02)',
                          color: 'var(--text-muted)'
                        }}>
                          {exp.category}
                        </span>
                      </td>
                      <td style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>{exp.payment_method || 'card'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>
                        LKR {exp.amount.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {exp.receipt_url ? (
                          <a href={exp.receipt_url} target="_blank" rel="noreferrer" title="View Receipt file">
                            <Eye size={16} style={{ color: '#fff', cursor: 'pointer' }} />
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)' }}>None</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem', borderRadius: '4px' }}
                            onClick={() => openViewExpenseModal(exp)}
                            title="View Expense details"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem', borderRadius: '4px' }}
                            onClick={() => openEditExpenseModal(exp)}
                            title="Edit Expense record"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem', borderRadius: '4px', color: '#f87171' }}
                            onClick={() => handleDeleteExpense(exp.id)}
                            title="Delete Expense record"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredExpensesList.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No operating expenses found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB CONTENT: REPORTS ───────────────────────────────────── */}
      {activeFinanceTab === 'reports' && !isStandardStaff && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Filters Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '8px' }}>
              <Filter size={14} style={{ color: 'var(--text-muted)' }} />
              <select
                className="glass-select"
                style={{ border: 'none', background: 'transparent', padding: '0.2rem 0.5rem', fontSize: '0.85rem' }}
                value={reportTimeframe}
                onChange={(e) => setReportTimeframe(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {reportTimeframe === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="glass-input"
                  style={{ width: '130px', padding: '0.35rem' }}
                  value={reportCustomRange.startDate}
                  onChange={(e) => setReportCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
                <input
                  type="date"
                  className="glass-input"
                  style={{ width: '130px', padding: '0.35rem' }}
                  value={reportCustomRange.endDate}
                  onChange={(e) => setReportCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            )}

            <button 
              className="btn btn-secondary" 
              style={{ marginLeft: 'auto', display: 'inline-flex', gap: '0.35rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}
              onClick={() => handleExportPDF(reportTimeframe, reportCustomRange)}
            >
              <FileDown size={14} /> Export Report PDF
            </button>
          </div>

          {/* Report Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Income</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: '#fff' }}>
                LKR {reportData.totalIncome.toLocaleString()}
              </span>
            </div>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Operating Expenses</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-muted)' }}>
                LKR {reportData.totalExpenses.toLocaleString()}
              </span>
            </div>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '3px solid #fff' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Net Profit</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: '#fff' }}>
                LKR {reportData.totalProfit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Breakdowns layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            
            {/* Income Breakdown by Source */}
            <div className="glass-card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowUpRight size={16} /> Income Breakdown by Source
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reportData.incomeBreakdown.map((item, idx) => {
                  const pct = reportData.totalIncome > 0 ? (item.amount / reportData.totalIncome) * 100 : 0;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600 }}>{item.source}</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          LKR {item.amount.toLocaleString()} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#ffffff', borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expense Breakdown by Category */}
            <div className="glass-card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowDownRight size={16} /> Operating Expenses Breakdown
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '250px', overflowY: 'auto' }}>
                {reportData.expenseBreakdown.map((item, idx) => {
                  const pct = reportData.totalExpenses > 0 ? (item.amount / reportData.totalExpenses) * 100 : 0;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600 }}>{item.category}</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          LKR {item.amount.toLocaleString()} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#52525b', borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Visual Reports section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
            
            {/* Income vs Expenses Chart */}
            <div className="glass-card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Income vs Expenses Chart (Statement Range)
              </h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.reportCharts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} tickFormatter={(v) => `LKR ${v/1000}k`} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: '#fff' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Income" fill="#ffffff" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill="#404040" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Profit Trend Chart */}
            <div className="glass-card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Profit Trend Chart (Statement Range)
              </h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportData.reportCharts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10 }} tickFormatter={(v) => `LKR ${v/1000}k`} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: '#fff' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Profit" stroke="#ffffff" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Category Pie */}
            <div className="glass-card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Expense Category Chart (Statement Range)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.expenseCategoryChart}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {reportData.expenseCategoryChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `LKR ${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {reportData.expenseCategoryChart.map((entry, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: entry.color, borderRadius: '50%' }} />
                      <span style={{ color: 'var(--text-muted)' }}>{entry.name}</span>
                      <span style={{ fontWeight: 600, marginLeft: 'auto' }}>LKR {entry.value.toLocaleString()}</span>
                    </div>
                  ))}
                  {reportData.expenseCategoryChart.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>No operating expenses found.</p>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ─── TAB CONTENT: EXPORTS ───────────────────────────────────── */}
      {activeFinanceTab === 'exports' && !isStandardStaff && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Export Professional Financial Reports
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Select a period to compile a formal, print-ready Profit & Loss statement containing consolidated membership billing revenue, manual service income, and operating cost summaries.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
              
              {/* Daily Report */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Daily Audit Sheet</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generates a performance report specifically tracking logs created today.</span>
                <button className="btn btn-secondary" style={{ marginTop: 'auto', width: '100%' }} onClick={() => handleExportPDF('today')}>
                  Daily Report PDF
                </button>
              </div>

              {/* Monthly Report */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Monthly Financials</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generates a summary statement covering all operations in the current month.</span>
                <button className="btn btn-secondary" style={{ marginTop: 'auto', width: '100%' }} onClick={() => handleExportPDF('month')}>
                  Monthly Report PDF
                </button>
              </div>

              {/* Yearly Report */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Yearly Tax Summary</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generates a statement reflecting totals for the entire calendar year.</span>
                <button className="btn btn-secondary" style={{ marginTop: 'auto', width: '100%' }} onClick={() => handleExportPDF('year')}>
                  Yearly Report PDF
                </button>
              </div>

              {/* Custom Range Report */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Custom Range Balance</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    type="date"
                    className="glass-input"
                    style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                    value={exportCustomRange.startDate}
                    onChange={(e) => setExportCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="glass-input"
                    style={{ padding: '0.35rem', fontSize: '0.8rem' }}
                    value={exportCustomRange.endDate}
                    onChange={(e) => setExportCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ marginTop: 'auto', width: '100%' }} 
                  onClick={() => {
                    if (!exportCustomRange.startDate || !exportCustomRange.endDate) {
                      showToast('Please select start and end dates first.', 'error');
                      return;
                    }
                    handleExportPDF('custom', exportCustomRange);
                  }}
                >
                  Custom Report PDF
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ─── TAB CONTENT: PAYROLL ────────────────────────────────────── */}
      {activeFinanceTab === 'payroll' && !isStandardStaff && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Payroll Dashboard Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            
            {/* Metric Card: Total Staff */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Employees</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-display)', margin: '0.1rem 0' }}>{payrollMetrics.totalStaff}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Staff with active profiles</div>
              </div>
            </div>

            {/* Metric Card: Monthly Commitment */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={20} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monthly Budget</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', margin: '0.1rem 0' }}>LKR {payrollMetrics.monthlyCommitment.toLocaleString()}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Staff base salary commitments</div>
              </div>
            </div>

            {/* Metric Card: Paid This Month */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} style={{ color: '#10b981' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Released This Month</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', margin: '0.1rem 0' }}>LKR {payrollMetrics.paidThisMonth.toLocaleString()}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Paid in {new Date().toLocaleString('en-US', { month: 'long' })}</div>
              </div>
            </div>

            {/* Metric Card: Pending Payouts */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={20} style={{ color: '#f59e0b' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Payroll</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', margin: '0.1rem 0' }}>LKR {payrollMetrics.pendingThisMonth.toLocaleString()}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Outstanding salary payout</div>
              </div>
            </div>

          </div>

          {/* Section card with sub-tabs */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Header & Sub Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[
                  { id: 'directory', label: 'Staff Directory' },
                  { id: 'history', label: 'Payroll History' },
                  { id: 'analytics', label: 'Reports & Analytics' }
                ].map(sub => (
                  <button
                    key={sub.id}
                    className={`btn ${payrollSubTab === sub.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => {
                      setPayrollSubTab(sub.id);
                      setPayrollSearch(''); // reset search on tab change
                    }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* Sub-tab Search */}
              {payrollSubTab !== 'analytics' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.2rem 0.75rem', borderRadius: '8px', width: '260px' }}>
                  <Search size={14} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="glass-input"
                    style={{ border: 'none', background: 'transparent', padding: '0.25rem 0', fontSize: '0.8rem', width: '100%' }}
                    placeholder={payrollSubTab === 'directory' ? 'Search employee name or role...' : 'Search paid salaries...'}
                    value={payrollSearch}
                    onChange={(e) => setPayrollSearch(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Sub-Tab 1: Staff Directory */}
            {payrollSubTab === 'directory' && (
              <div className="table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Job Role</th>
                      <th>Monthly Salary</th>
                      <th>Last Paid Date</th>
                      <th>Next Pay Date</th>
                      <th>Current Month Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayrollStaff.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          No employees found matching the search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredPayrollStaff.map(emp => {
                        const paidThisMonth = isEmployeePaidThisMonth(emp.id, emp.full_name);
                        const lastPaid = getEmployeeLastPaidDate(emp.id, emp.full_name);
                        return (
                          <tr key={emp.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                  width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.8rem'
                                }}>
                                  {emp.full_name.charAt(0)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{emp.full_name}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem' }}>{emp.role}</span>
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              LKR {parseFloat(emp.salary).toLocaleString()}
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              {lastPaid === 'Never' ? 'Never' : lastPaid}
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Calendar size={12} /> {emp.next_salary_date}
                              </span>
                            </td>
                            <td>
                              <span className={`badge badge-${paidThisMonth ? 'active' : 'frozen'}`} style={{ fontSize: '0.65rem' }}>
                                {paidThisMonth ? 'Paid' : 'Pending'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className={`btn ${paidThisMonth ? 'btn-secondary' : 'btn-primary'}`}
                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                                onClick={() => openProcessPayroll(emp)}
                              >
                                {paidThisMonth ? 'Repay / Process' : 'Process Salary'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sub-Tab 2: Payroll History */}
            {payrollSubTab === 'history' && (
              <div className="table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Pay Date</th>
                      <th>Employee Name</th>
                      <th>Payroll Period</th>
                      <th>Basic Salary</th>
                      <th>Net Paid</th>
                      <th>Payment Method</th>
                      <th>Reference ID</th>
                      <th style={{ textAlign: 'right' }}>Payslip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayrollHistory.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          No payroll payouts recorded matching the search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredPayrollHistory.map(pay => (
                        <tr key={pay.id}>
                          <td style={{ fontSize: '0.85rem' }}>{pay.date}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{pay.employee_name || 'Legacy Payout'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{pay.employee_role || 'Staff'}</div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{pay.period || 'N/A'}</span>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>
                            LKR {(pay.basic_salary || pay.amount).toLocaleString()}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                            LKR {pay.amount.toLocaleString()}
                          </td>
                          <td style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                            {pay.payment_method?.replace('_', ' ') || 'Bank Wire'}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {pay.reference || pay.id.substring(0, 10) + '...'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                              onClick={() => {
                                setSelectedPayslip(pay);
                                setIsPayslipModalOpen(true);
                              }}
                            >
                              <FileText size={12} /> Payslip
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sub-Tab 3: Analytics & Reports */}
            {payrollSubTab === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  
                  {/* Chart 1: Role Salary Distribution */}
                  <div className="glass-card">
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      Payroll Budget by Department/Role
                    </h4>
                    {payrollRoleDistribution.length === 0 ? (
                      <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        No data available
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={payrollRoleDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {payrollRoleDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(val) => `LKR ${val.toLocaleString()}`} 
                            contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid var(--border-color)' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '0.75rem', marginTop: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Chart 2: Payroll Trend */}
                  <div className="glass-card">
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      Payroll Payout Trend (Last 6 Months)
                    </h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={payrollTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} formatter={(val) => `LKR ${val.toLocaleString()}`} />
                        <Tooltip 
                          formatter={(val) => `LKR ${val.toLocaleString()}`} 
                          contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid var(--border-color)' }}
                        />
                        <Bar dataKey="Payroll" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                </div>

                {/* Payroll Export Card */}
                <div className="glass-card" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Full Payroll Audit Log</h4>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generate a printed audit log of all employee salary transactions for tax purposes.</p>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                      onClick={() => window.print()}
                    >
                      <Printer size={14} /> Print Payroll Summary
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ─── TAB CONTENT: INLINE LOG INCOME (FOR STAFF) ───────────────── */}
      {activeFinanceTab === 'log_income' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '2rem' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0, fontSize: '1.35rem', color: '#fff' }}>Log Income Payment</h2>
            </div>
            
            <form onSubmit={handleAddIncomeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Income Source *</label>
                <select
                  className="glass-select"
                  style={{ width: '100%' }}
                  value={newIncomeForm.source}
                  onChange={(e) => setNewIncomeForm(prev => ({ ...prev, source: e.target.value }))}
                >
                  {incomeSources.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Member Name (Optional)</label>
                <select
                  className="glass-select"
                  style={{ width: '100%' }}
                  value={newIncomeForm.member_name}
                  onChange={(e) => setNewIncomeForm(prev => ({ ...prev, member_name: e.target.value }))}
                >
                  <option value="">-- Walk-in / Unlinked --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.full_name}>{m.full_name} ({m.member_code})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Amount (LKR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    className="glass-input"
                    value={newIncomeForm.amount}
                    onChange={(e) => setNewIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Payment Date *</label>
                  <input
                    type="date"
                    required
                    className="glass-input"
                    value={newIncomeForm.date}
                    onChange={(e) => setNewIncomeForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Payment Method</label>
                  <select
                    className="glass-select"
                    style={{ width: '100%' }}
                    value={newIncomeForm.payment_method}
                    onChange={(e) => setNewIncomeForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  >
                    <option value="card">Card Payment</option>
                    <option value="cash">Cash Payment</option>
                    <option value="bank_transfer">Bank Wire</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Ref Reference (ID)</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN982"
                    className="glass-input"
                    value={newIncomeForm.payment_reference}
                    onChange={(e) => setNewIncomeForm(prev => ({ ...prev, payment_reference: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Notes</label>
                <textarea
                  className="glass-input"
                  style={{ height: '60px', resize: 'none' }}
                  value={newIncomeForm.notes}
                  onChange={(e) => setNewIncomeForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: INLINE RECORD EXPENSE (FOR STAFF) ────────────── */}
      {activeFinanceTab === 'log_expense' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '2rem' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0, fontSize: '1.35rem', color: '#fff' }}>Record Gym Expense</h2>
            </div>
            
            <form onSubmit={handleExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity Bill June"
                  className="glass-input"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Description</label>
                <textarea
                  className="glass-input"
                  style={{ height: '50px', resize: 'none' }}
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Category *</label>
                  <select
                    className="glass-select"
                    style={{ width: '100%' }}
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {userExpenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Amount (LKR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 150000"
                    className="glass-input"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Date *</label>
                  <input
                    type="date"
                    required
                    className="glass-input"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Payment Method</label>
                  <select
                    className="glass-select"
                    style={{ width: '100%' }}
                    value={expenseForm.payment_method}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  >
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Wire</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Notes</label>
                <textarea
                  className="glass-input"
                  style={{ height: '50px', resize: 'none' }}
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              {/* Receipt upload section */}
              <div style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <UploadCloud size={24} style={{ color: 'var(--text-muted)' }} />
                <div style={{ flexGrow: 1 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>Receipt Attachment</span>
                  {expenseForm.receipt_url ? (
                    <a href={expenseForm.receipt_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#fff', textDecoration: 'underline' }}>
                      View uploaded receipt file
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No file attached.</span>
                  )}
                </div>
                
                <div>
                  <input
                    type="file"
                    id="expense-inline-file-upload"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleReceiptUpload}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    disabled={receiptUploading}
                    onClick={() => document.getElementById('expense-inline-file-upload').click()}
                  >
                    {receiptUploading ? 'Uploading...' : 'Choose File'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD INCOME MODAL ────────────────────────────────────────── */}
      {isAddIncomeModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', margin: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Log Income Payment</h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsAddIncomeModalOpen(false)} />
            </div>

            <form onSubmit={handleAddIncomeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Income Source *</label>
                <select
                  className="glass-select"
                  style={{ width: '100%' }}
                  value={newIncomeForm.source}
                  onChange={(e) => setNewIncomeForm(prev => ({ ...prev, source: e.target.value }))}
                >
                  {incomeSources.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Member Name (Optional)</label>
                <select
                  className="glass-select"
                  style={{ width: '100%' }}
                  value={newIncomeForm.member_name}
                  onChange={(e) => setNewIncomeForm(prev => ({ ...prev, member_name: e.target.value }))}
                >
                  <option value="">-- Walk-in / Unlinked --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.full_name}>{m.full_name} ({m.member_code})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Amount (LKR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    className="glass-input"
                    value={newIncomeForm.amount}
                    onChange={(e) => setNewIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Payment Date *</label>
                  <input
                    type="date"
                    required
                    className="glass-input"
                    value={newIncomeForm.date}
                    onChange={(e) => setNewIncomeForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Payment Method</label>
                  <select
                    className="glass-select"
                    style={{ width: '100%' }}
                    value={newIncomeForm.payment_method}
                    onChange={(e) => setNewIncomeForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  >
                    <option value="card">Card Payment</option>
                    <option value="cash">Cash Payment</option>
                    <option value="bank_transfer">Bank Wire</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Ref Reference (ID)</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN982"
                    className="glass-input"
                    value={newIncomeForm.payment_reference}
                    onChange={(e) => setNewIncomeForm(prev => ({ ...prev, payment_reference: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Notes</label>
                <textarea
                  className="glass-input"
                  style={{ height: '60px', resize: 'none' }}
                  value={newIncomeForm.notes}
                  onChange={(e) => setNewIncomeForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>Save Record</button>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddIncomeModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT/VIEW EXPENSE MODAL ─────────────────────────────── */}
      {isExpenseModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', margin: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {expenseModalMode === 'add' ? 'Record Gym Expense' : expenseModalMode === 'edit' ? 'Edit Expense Record' : 'View Expense Details'}
              </h3>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsExpenseModalOpen(false)} />
            </div>

            <form onSubmit={handleExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Expense Title *</label>
                <input
                  type="text"
                  required
                  disabled={expenseModalMode === 'view'}
                  placeholder="e.g. Electricity Bill June"
                  className="glass-input"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Description</label>
                <input
                  type="text"
                  disabled={expenseModalMode === 'view'}
                  className="glass-input"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Category *</label>
                  <select
                    className="glass-select"
                    style={{ width: '100%' }}
                    disabled={expenseModalMode === 'view'}
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {userExpenseCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Amount (LKR) *</label>
                  <input
                    type="number"
                    required
                    disabled={expenseModalMode === 'view'}
                    placeholder="e.g. 150000"
                    className="glass-input"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Date *</label>
                  <input
                    type="date"
                    required
                    disabled={expenseModalMode === 'view'}
                    className="glass-input"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Payment Method</label>
                  <select
                    className="glass-select"
                    style={{ width: '100%' }}
                    disabled={expenseModalMode === 'view'}
                    value={expenseForm.payment_method}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  >
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Wire</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Notes</label>
                <textarea
                  className="glass-input"
                  disabled={expenseModalMode === 'view'}
                  style={{ height: '50px', resize: 'none' }}
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              {/* Receipt upload section */}
              <div style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <UploadCloud size={24} style={{ color: 'var(--text-muted)' }} />
                <div style={{ flexGrow: 1 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>Receipt Attachment</span>
                  {expenseForm.receipt_url ? (
                    <a href={expenseForm.receipt_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#fff', textDecoration: 'underline' }}>
                      View uploaded receipt file
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No file attached.</span>
                  )}
                </div>
                
                {expenseModalMode !== 'view' && (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handleReceiptUpload}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                      disabled={receiptUploading}
                      onClick={() => fileInputRef.current.click()}
                    >
                      {receiptUploading ? 'Uploading...' : 'Choose File'}
                    </button>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                {expenseModalMode !== 'view' ? (
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
                    {expenseModalMode === 'add' ? 'Save Record' : 'Apply Updates'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flexGrow: 1 }}
                    onClick={() => openEditExpenseModal(selectedExpense)}
                  >
                    Edit Record
                  </button>
                )}
                
                {expenseModalMode === 'edit' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ color: '#f87171' }}
                    onClick={() => handleDeleteExpense(selectedExpense.id)}
                  >
                    Delete
                  </button>
                )}
                
                <button type="button" className="btn btn-secondary" onClick={() => setIsExpenseModalOpen(false)}>
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PROCESS PAYROLL MODAL ────────────────────────────────────── */}
      {isProcessPayrollOpen && processingEmployee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', margin: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: 0 }}>Process Staff Payroll</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Employee: {processingEmployee.full_name} ({processingEmployee.role})</span>
              </div>
              <X size={18} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsProcessPayrollOpen(false)} />
            </div>

            <form onSubmit={handleProcessPayrollSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Payroll Period & Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Payroll Month *</label>
                  <select
                    className="glass-select"
                    style={{ width: '100%' }}
                    value={payrollForm.month}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, month: e.target.value }))}
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Payroll Year *</label>
                  <select
                    className="glass-select"
                    style={{ width: '100%' }}
                    value={payrollForm.year}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, year: e.target.value }))}
                  >
                    {['2025', '2026', '2027', '2028', '2029', '2030'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Basic Monthly Salary (LKR) *</label>
                  <input
                    type="number"
                    required
                    className="glass-input"
                    value={payrollForm.basicSalary}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, basicSalary: e.target.value }))}
                  />
                </div>
              </div>

              {/* Earnings vs Deductions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', minWidth: 0 }}>
                
                {/* Column 1: Additional Earnings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem', color: '#10b981' }}>Additional Earnings</h4>
                  
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Bonus / Incentives (LKR)</label>
                    <input
                      type="number"
                      className="glass-input"
                      value={payrollForm.bonus}
                      onChange={(e) => setPayrollForm(prev => ({ ...prev, bonus: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Overtime / Commission (LKR)</label>
                    <input
                      type="number"
                      className="glass-input"
                      value={payrollForm.overtime}
                      onChange={(e) => setPayrollForm(prev => ({ ...prev, overtime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Transport & Other Allowances (LKR)</label>
                    <input
                      type="number"
                      className="glass-input"
                      value={payrollForm.allowance}
                      onChange={(e) => setPayrollForm(prev => ({ ...prev, allowance: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Column 2: Deductions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.35rem', color: '#f43f5e' }}>Payroll Deductions</h4>
                  
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>EPF Employee contribution (8%)</label>
                    <input
                      type="number"
                      className="glass-input"
                      value={payrollForm.epf}
                      onChange={(e) => setPayrollForm(prev => ({ ...prev, epf: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>PAYE Income Tax (LKR)</label>
                    <input
                      type="number"
                      className="glass-input"
                      value={payrollForm.tax}
                      onChange={(e) => setPayrollForm(prev => ({ ...prev, tax: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Unpaid Leaves / Penalties (LKR)</label>
                    <input
                      type="number"
                      className="glass-input"
                      value={payrollForm.deduction}
                      onChange={(e) => setPayrollForm(prev => ({ ...prev, deduction: e.target.value }))}
                    />
                  </div>
                </div>

              </div>

              {/* Payout Details & Scheduling */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Payment Method *</label>
                  <select
                    className="glass-select"
                    style={{ width: '100%' }}
                    value={payrollForm.paymentMethod}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Reference / Receipt ID</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="e.g. TXN-1294819"
                    value={payrollForm.reference}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, reference: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Payment Date *</label>
                  <input
                    type="date"
                    required
                    className="glass-input"
                    value={payrollForm.date}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Next Payroll Date *</label>
                  <input
                    type="date"
                    required
                    className="glass-input"
                    value={payrollForm.nextSalaryDate}
                    onChange={(e) => setPayrollForm(prev => ({ ...prev, nextSalaryDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>Remarks / Payslip Notes</label>
                <textarea
                  className="glass-input"
                  style={{ height: '45px', resize: 'none' }}
                  placeholder="Additional notes to be shown on the printable payslip..."
                  value={payrollForm.remarks}
                  onChange={(e) => setPayrollForm(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </div>

              {/* Real-time Calculation & Net Salary Display */}
              <div style={{ 
                background: 'linear-gradient(90deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1))',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '8px', padding: '1rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Real-Time Calculation Summary</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Gross (LKR {( (parseFloat(payrollForm.basicSalary) || 0) + (parseFloat(payrollForm.bonus) || 0) + (parseFloat(payrollForm.overtime) || 0) + (parseFloat(payrollForm.allowance) || 0) ).toLocaleString()})
                    - Deductions (LKR {( (parseFloat(payrollForm.epf) || 0) + (parseFloat(payrollForm.tax) || 0) + (parseFloat(payrollForm.deduction) || 0) ).toLocaleString()})
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>NET PAYABLE AMOUNT</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    LKR {(
                      (parseFloat(payrollForm.basicSalary) || 0) +
                      (parseFloat(payrollForm.bonus) || 0) +
                      (parseFloat(payrollForm.overtime) || 0) +
                      (parseFloat(payrollForm.allowance) || 0) -
                      (parseFloat(payrollForm.epf) || 0) -
                      (parseFloat(payrollForm.tax) || 0) -
                      (parseFloat(payrollForm.deduction) || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Footer actions */}
              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
                  Release Salary & Update Date
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setIsProcessPayrollOpen(false)}>
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ─── PRINTABLE PAYSLIP RECEIPT MODAL ───────────────────────────── */}
      {isPayslipModalOpen && selectedPayslip && (
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
            
            {/* Header: Gym Info (Professional Payslip Look) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--color-primary)' }}>
                  {gymSettings?.gymName ? gymSettings.gymName.toUpperCase() : 'FITGENCORE'}
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                  {gymSettings?.address || 'HQ Operations - Colombo, Sri Lanka'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                  Email: {gymSettings?.email || 'finance@fitgencore.com'} | Tel: {gymSettings?.phone || '+94 11 234 5678'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em', color: '#fff' }}>PAYSLIP & RECEIPT</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Original Copy</span>
              </div>
            </div>

            {/* Employee details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <div style={{ marginBottom: '0.35rem' }}><span style={{ color: 'var(--text-muted)' }}>Employee ID:</span> <span style={{ fontWeight: 600 }}>{selectedPayslip.employee_id?.substring(0, 12) || 'N/A'}</span></div>
                <div style={{ marginBottom: '0.35rem' }}><span style={{ color: 'var(--text-muted)' }}>Employee Name:</span> <span style={{ fontWeight: 600 }}>{selectedPayslip.employee_name || 'Legacy Record'}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Designation (Role):</span> <span style={{ fontWeight: 600 }}>{selectedPayslip.employee_role || 'Staff Member'}</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: '0.35rem' }}><span style={{ color: 'var(--text-muted)' }}>Payroll Period:</span> <span style={{ fontWeight: 600 }}>{selectedPayslip.period || 'Monthly'}</span></div>
                <div style={{ marginBottom: '0.35rem' }}><span style={{ color: 'var(--text-muted)' }}>Payment Date:</span> <span style={{ fontWeight: 600 }}>{selectedPayslip.date}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Payment Mode:</span> <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedPayslip.payment_method?.replace('_', ' ') || 'Bank wire'}</span></div>
              </div>
            </div>

            {/* Earnings & Deductions Breakdown Table */}
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>
                    <th style={{ padding: '0.5rem' }}>Description</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Earnings (LKR)</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Deductions (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.5rem' }}>Basic Salary</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(selectedPayslip.basic_salary || selectedPayslip.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>-</td>
                  </tr>
                  {selectedPayslip.bonus_pay > 0 && (
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.5rem' }}>Performance Bonus / Incentives</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{parseFloat(selectedPayslip.bonus_pay).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>-</td>
                    </tr>
                  )}
                  {selectedPayslip.overtime_pay > 0 && (
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.5rem' }}>Overtime / Commission</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{parseFloat(selectedPayslip.overtime_pay).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>-</td>
                    </tr>
                  )}
                  {selectedPayslip.allowance_pay > 0 && (
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.5rem' }}>Transport & Allowances</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{parseFloat(selectedPayslip.allowance_pay).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>-</td>
                    </tr>
                  )}
                  {selectedPayslip.epf_deduction > 0 && (
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.5rem' }}>EPF Employee contribution (8%)</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>-</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{parseFloat(selectedPayslip.epf_deduction).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  {selectedPayslip.tax_deduction > 0 && (
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.5rem' }}>PAYE Income Tax</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>-</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{parseFloat(selectedPayslip.tax_deduction).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                  {selectedPayslip.other_deductions > 0 && (
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '0.5rem' }}>Unpaid Leave & Penalties</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>-</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{parseFloat(selectedPayslip.other_deductions).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Totals Block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontSize: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Total Earnings:</span>
                  <span style={{ fontWeight: 600 }}>
                    LKR {(
                      (parseFloat(selectedPayslip.basic_salary) || selectedPayslip.amount) +
                      (parseFloat(selectedPayslip.bonus_pay) || 0) +
                      (parseFloat(selectedPayslip.overtime_pay) || 0) +
                      (parseFloat(selectedPayslip.allowance_pay) || 0)
                    ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Deductions:</span>
                  <span style={{ fontWeight: 600 }}>
                    LKR {(
                      (parseFloat(selectedPayslip.epf_deduction) || 0) +
                      (parseFloat(selectedPayslip.tax_deduction) || 0) +
                      (parseFloat(selectedPayslip.other_deductions) || 0)
                    ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>NET PAYABLE RELEASED</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  LKR {selectedPayslip.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Net Salary in Words */}
            <div style={{ fontSize: '0.75rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.01)', padding: '0.5rem', borderRadius: '4px', border: '1px dashed rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Amount in Words:</span> <span style={{ fontWeight: 600 }}>{numberToWords(selectedPayslip.amount)}</span>
            </div>

            {/* Reference ID / Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem', fontSize: '0.75rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Payslip Remarks:</span>
                <p style={{ margin: '0.2rem 0 0 0', lineHeight: 1.3 }}>{selectedPayslip.notes || 'No remarks recorded.'}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-muted)' }}>Transaction Reference:</span>
                <span style={{ fontWeight: 600, display: 'block', wordBreak: 'break-all' }}>{selectedPayslip.reference || selectedPayslip.id}</span>
              </div>
            </div>

            {/* Bottom Signature area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '2.5rem', fontSize: '0.75rem' }}>
              <div style={{ borderTop: '1px solid var(--border-color)', textAlign: 'center', paddingTop: '0.5rem' }}>
                <span>Employer Signature (Authorized)</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', textAlign: 'center', paddingTop: '0.5rem' }}>
                <span>Employee Signature (Acknowledgment)</span>
              </div>
            </div>

            {/* Actions for Modal */}
            <div className="no-print" style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ flexGrow: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                onClick={() => window.print()}
              >
                <Printer size={14} /> Print Payslip Receipt
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setIsPayslipModalOpen(false)}>
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Finance;
