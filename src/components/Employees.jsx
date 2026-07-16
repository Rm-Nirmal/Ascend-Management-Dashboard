import { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  Search, Plus, Edit2, Trash2, Mail, Phone, Briefcase, 
  DollarSign, Calendar, X, Eye, Clock, Coffee, ClipboardList
} from 'lucide-react';

const Employees = () => {
  const {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    breakLogs,
    showToast,
    admins,
    auditLogs
  } = useDashboard();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedProfileEmployee, setSelectedProfileEmployee] = useState(null);
  const [breakFilter, setBreakFilter] = useState('daily'); // 'daily', 'weekly', 'monthly'

  // Form states (Add/Edit employee)
  const [empForm, setEmpForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'Front Desk',
    salary: '',
    next_salary_date: '',
    status: 'active',
    total_leaves: '0'
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

  // Format seconds to friendly duration
  const formatFriendlyDuration = (totalSeconds) => {
    if (totalSeconds === 0) return '0 seconds';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    const parts = [];
    if (hrs > 0) parts.push(`${hrs} hr${hrs > 1 ? 's' : ''}`);
    if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} sec${secs > 1 ? 's' : ''}`);
    return parts.join(' ');
  };

  // Compute profile break logs & statistics
  const profileBreakStats = useMemo(() => {
    if (!selectedProfileEmployee) return { totalSeconds: 0, logs: [] };
    const empId = selectedProfileEmployee.id;
    const now = new Date();
    
    const empBreaks = (breakLogs || []).filter(
      b => b.employeeId === empId && b.status === 'completed'
    );
    
    let filteredBreaks = [];
    const todayStr = now.toISOString().split('T')[0];
    
    if (breakFilter === 'daily') {
      filteredBreaks = empBreaks.filter(b => b.startTime.startsWith(todayStr));
    } else if (breakFilter === 'weekly') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filteredBreaks = empBreaks.filter(b => new Date(b.startTime) >= oneWeekAgo);
    } else if (breakFilter === 'monthly') {
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filteredBreaks = empBreaks.filter(b => new Date(b.startTime) >= oneMonthAgo);
    }
    
    const totalSeconds = filteredBreaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    return { totalSeconds, logs: filteredBreaks };
  }, [selectedProfileEmployee, breakLogs, breakFilter]);

  const linkedAdminForProfile = useMemo(() => {
    if (!selectedProfileEmployee || !admins) return null;
    return admins.find(
      a => a.employeeId === selectedProfileEmployee.id || 
      a.email?.toLowerCase() === selectedProfileEmployee.email?.toLowerCase()
    );
  }, [selectedProfileEmployee, admins]);

  const employeeActivities = useMemo(() => {
    if (!selectedProfileEmployee || !auditLogs) return [];
    
    return auditLogs.filter(log => {
      const matchesAdminId = linkedAdminForProfile && (log.user_id === linkedAdminForProfile.id || log.user_id === linkedAdminForProfile.uid);
      const matchesName = log.user_name?.toLowerCase() === selectedProfileEmployee.full_name.toLowerCase();
      return matchesAdminId || matchesName;
    });
  }, [selectedProfileEmployee, auditLogs, linkedAdminForProfile]);

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
        status: 'active',
        total_leaves: '0'
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

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Employees Console</h1>
          <p>Manage corporate payroll, employee directories, and staff job applications.</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEmpForm({
            full_name: '',
            email: '',
            phone: '',
            role: 'Front Desk',
            salary: '',
            next_salary_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active',
            total_leaves: '0'
          });
          setShowAddModal(true);
        }}>
          <Plus size={16} /> Add Employee
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }} />

      {/* View 1: Directory */}
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
                              style={{ padding: '0.4rem', borderColor: 'var(--color-primary-glow)' }}
                              onClick={() => {
                                setSelectedProfileEmployee(emp);
                              }}
                              title="View Employee Profile"
                            >
                              <Eye size={12} style={{ color: 'var(--color-primary)' }} />
                            </button>
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
                                  status: emp.status,
                                  total_leaves: (emp.total_leaves || 0).toString()
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
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Annual Leaves</label>
                  <input 
                    type="number" 
                    value={empForm.total_leaves} 
                    onChange={(e) => setEmpForm({...empForm, total_leaves: e.target.value})} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                  />
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
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Annual Leaves</label>
                  <input 
                    type="number" 
                    value={empForm.total_leaves} 
                    onChange={(e) => setEmpForm({...empForm, total_leaves: e.target.value})} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                  />
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

      {/* Modal 3: Employee Profile Details */}
      {selectedProfileEmployee && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={20} style={{ color: 'var(--color-primary)' }} />
                Staff Member Profile: {selectedProfileEmployee.full_name}
              </h2>
              <button onClick={() => { setSelectedProfileEmployee(null); setBreakFilter('daily'); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '2rem', alignItems: 'start' }}>
              {/* Left Column: Details & Leaves */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Profile Header Card */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1.25rem',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '1.5rem', color: 'var(--color-primary)'
                  }}>
                    {selectedProfileEmployee.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{selectedProfileEmployee.full_name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Briefcase size={12} /> {selectedProfileEmployee.role}
                    </p>
                  </div>
                </div>

                {/* Info List */}
                <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employment Details</h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Email Address:</span>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{selectedProfileEmployee.email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Phone Number:</span>
                      <span style={{ fontWeight: 600 }}>{selectedProfileEmployee.phone}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Monthly Salary:</span>
                      <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>LKR {parseFloat(selectedProfileEmployee.salary).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Next Salary Release:</span>
                      <span style={{ fontWeight: 600 }}>{selectedProfileEmployee.next_salary_date}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Joined Date:</span>
                      <span style={{ fontWeight: 600 }}>{selectedProfileEmployee.joined_at}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                      <span className={`badge badge-${selectedProfileEmployee.status === 'active' ? 'active' : 'frozen'}`} style={{ fontSize: '0.65rem' }}>
                        {selectedProfileEmployee.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Leaves Balance Card */}
                <div style={{
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ANNUAL LEAVES ALLOWED</h4>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', display: 'block' }}>
                      {selectedProfileEmployee.total_leaves || 0} Days
                    </span>
                  </div>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
                  </div>
                </div>
              </div>

              {/* Right Column: Breaks Tracker & Logs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {['daily', 'weekly', 'monthly'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setBreakFilter(filter)}
                      style={{
                        flex: 1,
                        padding: '0.45rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        background: breakFilter === filter ? '#fff' : 'transparent',
                        color: breakFilter === filter ? '#000' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      {filter === 'daily' ? 'Today' : filter === 'weekly' ? 'This Week' : 'This Month'}
                    </button>
                  ))}
                </div>

                {/* Total break time display */}
                <div style={{
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(255, 255, 255, 0.01))',
                  border: '1px solid rgba(245, 158, 11, 0.15)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Coffee size={24} style={{ color: '#f59e0b' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      TOTAL BREAK TIME ({breakFilter === 'daily' ? 'TODAY' : breakFilter === 'weekly' ? 'THIS WEEK' : 'THIS MONTH'})
                    </h4>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem', display: 'block' }}>
                      {formatFriendlyDuration(profileBreakStats.totalSeconds)}
                    </span>
                  </div>
                </div>

                {/* Break logs list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={14} /> Break Interval Logs
                  </h4>

                  <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
                    {profileBreakStats.logs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                        No break logs logged in this period.
                      </div>
                    ) : (
                      profileBreakStats.logs.map((log) => {
                        const dateStr = new Date(log.startTime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        });
                        const start = new Date(log.startTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        });
                        const end = log.endTime ? new Date(log.endTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        }) : '--';

                        return (
                          <div
                            key={log.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.6rem 0.85rem',
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              fontSize: '0.8rem'
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 600 }}>{dateStr}</span>
                              <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                ({start} - {end})
                              </span>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                              {formatFriendlyDuration(log.duration || 0)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Audit Logs / Activity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ClipboardList size={14} style={{ color: 'var(--color-primary)' }} /> Recent Panel Activities (Audit)
                  </h4>

                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
                    {employeeActivities.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                        No panel activities recorded for this staff member.
                      </div>
                    ) : (
                      employeeActivities.map((log) => {
                        const dateStr = new Date(log.occurred_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div
                            key={log.id}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.25rem',
                              padding: '0.6rem 0.85rem',
                              background: 'rgba(0, 0, 0, 0.15)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              fontSize: '0.8rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                                {log.action?.replace('.', ' • ')}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {dateStr}
                              </span>
                            </div>
                            <div style={{ color: '#fff', fontSize: '0.8rem' }}>
                              {log.details}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => { setSelectedProfileEmployee(null); setBreakFilter('daily'); }}>
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
