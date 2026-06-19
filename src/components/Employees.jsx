import { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  Search, Plus, Edit2, Trash2, Mail, Phone, Briefcase, 
  DollarSign, Calendar, Check, X, ShieldAlert, FileText, Send, CheckCircle2,
  UserPlus
} from 'lucide-react';

const Employees = () => {
  const {
    employees,
    employeeRegistrations,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addEmployeeRegistrationRequest,
    approveEmployeeRegistration,
    rejectEmployeeRegistration,
    showToast
  } = useDashboard();

  // Sub-tab state: 'directory', 'queue', 'form'
  const [currentSubTab, setCurrentSubTab] = useState('directory');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [reviewingReg, setReviewingReg] = useState(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveForm, setShowApproveForm] = useState(false);

  // Hiring parameters for approval
  const [hireSalary, setHireSalary] = useState('');
  const [hireNextPayDate, setHireNextPayDate] = useState('');

  // Form states (Add/Edit employee and registration form)
  const [empForm, setEmpForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'Front Desk',
    salary: '',
    next_salary_date: '',
    status: 'active'
  });

  const [regForm, setRegForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    role: 'Front Desk',
    expected_salary: '',
    cover_note: ''
  });

  // Filter lists
  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.status !== 'terminated');
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(emp => {
      const matchSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.phone.includes(searchTerm);
      const matchRole = roleFilter === 'all' || emp.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [activeEmployees, searchTerm, roleFilter]);

  const pendingRegistrations = useMemo(() => {
    return employeeRegistrations.filter(r => r.status === 'pending_approval');
  }, [employeeRegistrations]);

  const processedRegistrations = useMemo(() => {
    return employeeRegistrations.filter(r => r.status === 'approved' || r.status === 'rejected');
  }, [employeeRegistrations]);

  // Calculate quick metrics
  const totalPayrollCost = useMemo(() => {
    return activeEmployees
      .filter(e => e.status === 'active')
      .reduce((sum, emp) => sum + (parseFloat(emp.salary) || 0), 0);
  }, [activeEmployees]);

  const rolesList = useMemo(() => {
    const roles = new Set(activeEmployees.map(e => e.role));
    return Array.from(roles);
  }, [activeEmployees]);

  // Add employee directly
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!empForm.full_name || !empForm.email || !empForm.phone || !empForm.salary || !empForm.next_salary_date) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const res = await addEmployee(empForm);
    if (res.success) {
      showToast(`Hired ${empForm.full_name} successfully!`, 'success');
      setShowAddModal(false);
      setEmpForm({
        full_name: '',
        email: '',
        phone: '',
        role: 'Front Desk',
        salary: '',
        next_salary_date: '',
        status: 'active'
      });
    } else {
      showToast(res.message || 'Hiring failed.', 'error');
    }
  };

  // Edit employee details
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!empForm.full_name || !empForm.email || !empForm.phone || !empForm.salary || !empForm.next_salary_date) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const res = await updateEmployee(editingEmployee.id, empForm);
    if (res.success) {
      showToast(`Updated details for ${empForm.full_name} successfully!`, 'success');
      setEditingEmployee(null);
    } else {
      showToast(res.message || 'Update failed.', 'error');
    }
  };

  // Terminate employee
  const handleTerminate = async (empId) => {
    if (window.confirm('Are you sure you want to terminate this employee? This will update their status to Terminated and remove them from payroll lists.')) {
      const res = await deleteEmployee(empId);
      if (res.success) {
        showToast('Employee terminated and payroll suspended.', 'info');
      } else {
        showToast('Termination failed.', 'error');
      }
    }
  };

  // Submit registration request (Form)
  const handleRegSubmit = async (e) => {
    e.preventDefault();
    if (!regForm.full_name || !regForm.email || !regForm.phone || !regForm.expected_salary || !regForm.date_of_birth) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const res = await addEmployeeRegistrationRequest(regForm);
    if (res.success) {
      showToast(`Job application for ${regForm.full_name} submitted successfully!`, 'success');
      setRegForm({
        full_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        role: 'Front Desk',
        expected_salary: '',
        cover_note: ''
      });
      // Switch back to queue to review
      setCurrentSubTab('queue');
    } else {
      showToast('Failed to submit application.', 'error');
    }
  };

  // Reject registration
  const handleRejectReg = async (e) => {
    e.preventDefault();
    if (!rejectReason) {
      showToast('Please specify a rejection reason.', 'warning');
      return;
    }
    const res = await rejectEmployeeRegistration(reviewingReg.id, rejectReason);
    if (res.success) {
      showToast(`Application for ${reviewingReg.full_name} has been rejected.`, 'info');
      setReviewingReg(null);
      setShowRejectForm(false);
      setRejectReason('');
    } else {
      showToast('Operation failed.', 'error');
    }
  };

  // Approve registration (Hire)
  const handleApproveReg = async (e) => {
    e.preventDefault();
    if (!hireSalary || !hireNextPayDate) {
      showToast('Please specify the hiring salary and first payroll date.', 'warning');
      return;
    }
    const res = await approveEmployeeRegistration(reviewingReg.id, parseFloat(hireSalary), hireNextPayDate);
    if (res.success) {
      showToast(`Hired ${reviewingReg.full_name} successfully! Check Staff Directory.`, 'success');
      setReviewingReg(null);
      setShowApproveForm(false);
      setHireSalary('');
      setHireNextPayDate('');
    } else {
      showToast(res.message || 'Approval failed.', 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Employees Console</h1>
          <p>Manage corporate payroll, employee directories, and staff job applications.</p>
        </div>
        {currentSubTab === 'directory' && (
          <button className="btn btn-primary" onClick={() => {
            setEmpForm({
              full_name: '',
              email: '',
              phone: '',
              role: 'Front Desk',
              salary: '',
              next_salary_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'active'
            });
            setShowAddModal(true);
          }}>
            <Plus size={16} /> Add Employee
          </button>
        )}
      </div>

      {/* Sub tabs switcher */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
        <button 
          onClick={() => setCurrentSubTab('directory')}
          style={{ 
            background: 'none', border: 'none', color: currentSubTab === 'directory' ? 'var(--color-primary)' : 'var(--text-muted)', 
            fontWeight: 700, padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: currentSubTab === 'directory' ? '3px solid var(--color-primary)' : 'none' 
          }}
        >
          Staff Directory ({activeEmployees.length})
        </button>
        <button 
          onClick={() => setCurrentSubTab('queue')}
          style={{ 
            background: 'none', border: 'none', color: currentSubTab === 'queue' ? 'var(--color-primary)' : 'var(--text-muted)', 
            fontWeight: 700, padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: currentSubTab === 'queue' ? '3px solid var(--color-primary)' : 'none' 
          }}
        >
          Job Application Queue ({pendingRegistrations.length})
        </button>
        <button 
          onClick={() => setCurrentSubTab('form')}
          style={{ 
            background: 'none', border: 'none', color: currentSubTab === 'form' ? 'var(--color-primary)' : 'var(--text-muted)', 
            fontWeight: 700, padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: currentSubTab === 'form' ? '3px solid var(--color-primary)' : 'none' 
          }}
        >
          Staff Application Form
        </button>
      </div>

      {/* View 1: Directory */}
      {currentSubTab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Metrics summary cards */}
          <div className="metrics-grid">
            <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-primary)' }}>
              <div className="metric-header">
                <span>ACTIVE STAFF MEMBERS</span>
                <Briefcase size={18} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div className="metric-value">{activeEmployees.filter(e => e.status === 'active').length}</div>
              <div className="metric-subtext">On active duty franchises</div>
            </div>

            <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-success)' }}>
              <div className="metric-header">
                <span>TOTAL PAYROLL (MONTHLY)</span>
                <DollarSign size={18} style={{ color: 'var(--color-success)' }} />
              </div>
              <div className="metric-value">LKR {totalPayrollCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div className="metric-subtext">Cumulative staff salary commitment</div>
            </div>

            <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-warning)' }}>
              <div className="metric-header">
                <span>NEXT MILESTONE RELEASE</span>
                <Calendar size={18} style={{ color: 'var(--color-warning)' }} />
              </div>
              <div className="metric-value">25th Monthly</div>
              <div className="metric-subtext">Standardized payroll date</div>
            </div>
          </div>

          {/* Table Directory */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Search and Filters */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                Corporate Staff Ledger
              </h3>
              
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', maxWidth: '500px' }}>
                {/* Search */}
                <div style={{ position: 'relative', flexGrow: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                  <input 
                    type="text" 
                    placeholder="Search by name, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="glass-input"
                    style={{ paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.85rem' }}
                  />
                </div>
                {/* Filter */}
                <select 
                  value={roleFilter} 
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="glass-select"
                  style={{ fontSize: '0.825rem', paddingTop: '0.45rem', paddingBottom: '0.45rem' }}
                >
                  <option value="all">All Roles</option>
                  {rolesList.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Job Title (Role)</th>
                    <th>Contact Info</th>
                    <th>Monthly Salary</th>
                    <th>Next Salary Release</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Management Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No employees found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map(emp => (
                      <tr key={emp.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)',
                              border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, color: 'var(--color-primary)'
                            }}>
                              {emp.full_name.charAt(0)}
                            </div>
                            <div style={{ fontWeight: 600 }}>{emp.full_name}</div>
                          </div>
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                            <Briefcase size={12} style={{ color: 'var(--text-muted)' }} /> {emp.role}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontSize: '0.8rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Mail size={10} style={{ color: 'var(--text-muted)' }} /> {emp.email}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Phone size={10} style={{ color: 'var(--text-dark)' }} /> {emp.phone}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          LKR {parseFloat(emp.salary).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                            <Calendar size={12} /> {emp.next_salary_date}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${emp.status === 'active' ? 'active' : 'frozen'}`} style={{ fontSize: '0.65rem' }}>
                            {emp.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem' }}
                              onClick={() => {
                                setEmpForm({
                                  full_name: emp.full_name,
                                  email: emp.email,
                                  phone: emp.phone,
                                  role: emp.role,
                                  salary: emp.salary.toString(),
                                  next_salary_date: emp.next_salary_date,
                                  status: emp.status
                                });
                                setEditingEmployee(emp);
                              }}
                              title="Edit Details"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '0.4rem', border: '1px solid rgba(239,68,68,0.2)' }}
                              onClick={() => handleTerminate(emp.id)}
                              title="Terminate Employment"
                            >
                              <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                            </button>
                          </div>
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

      {/* View 2: Queue */}
      {currentSubTab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Pending Applications List */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                Hiring Desk Applications
              </h3>
            </div>
            
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Applicant Name</th>
                    <th>Target Role</th>
                    <th>Email / Phone</th>
                    <th>Requested Salary</th>
                    <th>Submitted Time</th>
                    <th style={{ textAlign: 'right' }}>Review Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        All caught up! No pending staff applications.
                      </td>
                    </tr>
                  ) : (
                    pendingRegistrations.map(req => (
                      <tr key={req.id}>
                        <td style={{ fontWeight: 600 }}>{req.full_name}</td>
                        <td>
                          <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>
                            {req.role}
                          </span>
                        </td>
                        <td>
                          <div>{req.email}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.phone}</div>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          LKR {parseFloat(req.expected_salary).toLocaleString('en-US')}
                        </td>
                        <td>{new Date(req.created_at).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                            onClick={() => { 
                              setReviewingReg(req); 
                              setHireSalary(req.expected_salary.toString());
                              // Default next salary date to next 25th
                              const today = new Date();
                              const nextPayDate = new Date(today.getFullYear(), today.getMonth() + 1, 25);
                              setHireNextPayDate(nextPayDate.toISOString().split('T')[0]);
                              setShowRejectForm(false); 
                              setShowApproveForm(false);
                            }}
                          >
                            Review Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical Log */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Processed Applications Log
              </h3>
            </div>
            
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Applicant Name</th>
                    <th>Target Role</th>
                    <th>Email Address</th>
                    <th>Final Status</th>
                    <th>Hiring Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {processedRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No history records found.
                      </td>
                    </tr>
                  ) : (
                    processedRegistrations.map(req => (
                      <tr key={req.id}>
                        <td>{req.full_name}</td>
                        <td>{req.role}</td>
                        <td>{req.email}</td>
                        <td>
                          <span className={`badge badge-${req.status === 'approved' ? 'active' : 'expired'}`} style={{ fontSize: '0.65rem' }}>
                            {req.status === 'approved' ? 'Hired' : 'Rejected'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {req.status === 'approved' ? 'Created employee payroll account' : req.rejection_reason}
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

      {/* View 3: Registration Form */}
      {currentSubTab === 'form' && (
        <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={20} style={{ color: 'var(--color-primary)' }} /> Staff Recruitment Portal
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              Enter staff application details to submit them to the queue for administrator review and payroll assignment.
            </p>

            <form onSubmit={handleRegSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Full Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Kasun Silva"
                    value={regForm.full_name}
                    onChange={(e) => setRegForm({...regForm, full_name: e.target.value})}
                    className="glass-input"
                    style={{ marginTop: '0.25rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Role Applied For *</label>
                  <select 
                    value={regForm.role}
                    onChange={(e) => setRegForm({...regForm, role: e.target.value})}
                    className="glass-select"
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.625rem' }}
                    required
                  >
                    <option value="Front Desk">Front Desk / Receptionist</option>
                    <option value="Yoga Coach">Yoga/Mobility Coach</option>
                    <option value="Gym Manager">Gym Manager</option>
                    <option value="Maintenance Staff">Maintenance / Cleaning Crew</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Email Address *</label>
                  <input 
                    type="email" 
                    placeholder="e.g. kasun@gmail.com"
                    value={regForm.email}
                    onChange={(e) => setRegForm({...regForm, email: e.target.value})}
                    className="glass-input"
                    style={{ marginTop: '0.25rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Phone Number *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. +94 77 123 4567"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({...regForm, phone: e.target.value})}
                    className="glass-input"
                    style={{ marginTop: '0.25rem' }}
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Expected Salary (Monthly LKR) *</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 60000"
                    value={regForm.expected_salary}
                    onChange={(e) => setRegForm({...regForm, expected_salary: e.target.value})}
                    className="glass-input"
                    style={{ marginTop: '0.25rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date of Birth *</label>
                  <input 
                    type="date" 
                    value={regForm.date_of_birth}
                    onChange={(e) => setRegForm({...regForm, date_of_birth: e.target.value})}
                    className="glass-input"
                    style={{ marginTop: '0.25rem' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Cover Note & Certifications</label>
                <textarea 
                  rows="4"
                  placeholder="Describe gym experience, certifications..."
                  value={regForm.cover_note}
                  onChange={(e) => setRegForm({...regForm, cover_note: e.target.value})}
                  className="glass-input"
                  style={{ marginTop: '0.25rem', resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', gap: '0.5rem' }}>
                <Send size={16} /> Submit Staff Application
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1: Add Employee Directly */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                Hiring Details: Add Direct Employee
              </h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full Name *</label>
                <input 
                  type="text" 
                  value={empForm.full_name} 
                  onChange={(e) => setEmpForm({...empForm, full_name: e.target.value})} 
                  className="glass-input" 
                  style={{ marginTop: '0.25rem' }}
                  required 
                />
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address *</label>
                  <input 
                    type="email" 
                    value={empForm.email} 
                    onChange={(e) => setEmpForm({...empForm, email: e.target.value})} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number *</label>
                  <input 
                    type="text" 
                    value={empForm.phone} 
                    onChange={(e) => setEmpForm({...empForm, phone: e.target.value})} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                    required 
                  />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Job Title (Role) *</label>
                  <select 
                    value={empForm.role} 
                    onChange={(e) => setEmpForm({...empForm, role: e.target.value})} 
                    className="glass-select" 
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.625rem' }}
                    required
                  >
                    <option value="Front Desk">Front Desk</option>
                    <option value="Personal Trainer">Personal Trainer</option>
                    <option value="Yoga Coach">Yoga Coach</option>
                    <option value="Gym Manager">Gym Manager</option>
                    <option value="Maintenance Staff">Maintenance Staff</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Salary (LKR) *</label>
                  <input 
                    type="number" 
                    value={empForm.salary} 
                    onChange={(e) => setEmpForm({...empForm, salary: e.target.value})} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                    required 
                  />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Next Salary Date *</label>
                  <input 
                    type="date" 
                    value={empForm.next_salary_date} 
                    onChange={(e) => setEmpForm({...empForm, next_salary_date: e.target.value})} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</label>
                  <select 
                    value={empForm.status} 
                    onChange={(e) => setEmpForm({...empForm, status: e.target.value})} 
                    className="glass-select" 
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.625rem' }}
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Direct Hire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Employee details */}
      {editingEmployee && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                Edit Employee Details: {editingEmployee.full_name}
              </h2>
              <button onClick={() => setEditingEmployee(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full Name *</label>
                <input 
                  type="text" 
                  value={empForm.full_name} 
                  onChange={(e) => setEmpForm({...empForm, full_name: e.target.value})} 
                  className="glass-input" 
                  style={{ marginTop: '0.25rem' }}
                  required 
                />
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address *</label>
                  <input 
                    type="email" 
                    value={empForm.email} 
                    onChange={(e) => setEmpForm({...empForm, email: e.target.value})} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number *</label>
                  <input 
                    type="text" 
                    value={empForm.phone} 
                    onChange={(e) => setEmpForm({...empForm, phone: e.target.value})} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                    required 
                  />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Job Title (Role) *</label>
                  <select 
                    value={empForm.role} 
                    onChange={(e) => setEmpForm({...empForm, role: e.target.value})} 
                    className="glass-select" 
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.625rem' }}
                    required
                  >
                    <option value="Front Desk">Front Desk</option>
                    <option value="Personal Trainer">Personal Trainer</option>
                    <option value="Yoga Coach">Yoga Coach</option>
                    <option value="Gym Manager">Gym Manager</option>
                    <option value="Maintenance Staff">Maintenance Staff</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Salary (LKR) *</label>
                  <input 
                    type="number" 
                    value={empForm.salary} 
                    onChange={(e) => setEmpForm({...empForm, salary: e.target.value})} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                    required 
                  />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Next Salary Date *</label>
                  <input 
                    type="date" 
                    value={empForm.next_salary_date} 
                    onChange={(e) => setEmpForm({...empForm, next_salary_date: e.target.value})} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</label>
                  <select 
                    value={empForm.status} 
                    onChange={(e) => setEmpForm({...empForm, status: e.target.value})} 
                    className="glass-select" 
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.625rem' }}
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingEmployee(null)}>
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

      {/* Modal 3: Review Registration Details */}
      {reviewingReg && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                Review Staff Application: {reviewingReg.full_name}
              </h2>
              <button onClick={() => setReviewingReg(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>Personal Credentials</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{reviewingReg.full_name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Email: {reviewingReg.email}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Phone: {reviewingReg.phone}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>DOB: {reviewingReg.date_of_birth}</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Target Role</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginTop: '0.25rem' }}>{reviewingReg.role}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Requested salary</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-success)', marginTop: '0.25rem' }}>LKR {parseFloat(reviewingReg.expected_salary).toLocaleString('en-US')}</div>
                </div>
              </div>

              {reviewingReg.cover_note && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Cover Note & Background</span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>{reviewingReg.cover_note}</p>
                </div>
              )}

              <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', fontStyle: 'italic' }}>
                Submitted on: {new Date(reviewingReg.created_at).toLocaleString()}
              </div>

            </div>

            {/* Application Flow Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1rem' }}>
              
              {!showRejectForm && !showApproveForm && (
                <div className="grid-2">
                  <button 
                    className="btn btn-secondary" 
                    style={{ color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    onClick={() => setShowRejectForm(true)}
                  >
                    <X size={14} /> Reject Application
                  </button>
                  <button 
                    className="btn btn-success" 
                    onClick={() => {
                      setShowApproveForm(true);
                    }}
                  >
                    <Check size={14} /> Approve & Hire
                  </button>
                </div>
              )}

              {showRejectForm && (
                <form onSubmit={handleRejectReg} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Specify Rejection Reason *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Incomplete credentials, failed practical interview..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="glass-input"
                      style={{ padding: '0.5rem', marginTop: '0.25rem' }}
                      required
                    />
                  </div>
                  <div className="grid-2">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowRejectForm(false)}>
                      Back
                    </button>
                    <button type="submit" className="btn btn-danger">
                      Confirm Rejection
                    </button>
                  </div>
                </form>
              )}

              {showApproveForm && (
                <form onSubmit={handleApproveReg} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="grid-2">
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approved Salary (Monthly LKR) *</label>
                      <input 
                        type="number" 
                        value={hireSalary}
                        onChange={(e) => setHireSalary(e.target.value)}
                        className="glass-input"
                        style={{ padding: '0.5rem', marginTop: '0.25rem' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>First Payroll Date *</label>
                      <input 
                        type="date" 
                        value={hireNextPayDate}
                        onChange={(e) => setHireNextPayDate(e.target.value)}
                        className="glass-input"
                        style={{ padding: '0.5rem', marginTop: '0.25rem' }}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowApproveForm(false)}>
                      Back
                    </button>
                    <button type="submit" className="btn btn-success">
                      Confirm Hire & Add to Payroll
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
