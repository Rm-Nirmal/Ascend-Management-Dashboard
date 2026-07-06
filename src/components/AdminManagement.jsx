import { useState, useRef } from 'react';
import { uploadToCloudinary } from '../lib/cloudinary';
import { useDashboard } from '../context/DashboardContext';
import { 
  UserPlus, Shield, ShieldCheck, Mail, Lock, User, Info, CheckCircle2, XCircle, 
  Eye, EyeOff, Edit2, Trash2, Key, Award, UserCheck, Plus, X 
} from 'lucide-react';

const AdminManagement = () => {
  const { 
    admins, 
    registerAdmin, 
    currentUser, 
    showToast,
    updateAdminPassword,
    deleteAdmin,
    plans,
    addPlan,
    updatePlan,
    deletePlan,
    trainers,
    addTrainer,
    updateTrainer,
    deleteTrainer
  } = useDashboard();

  // Navigation Subtab State
  const [activeSubTab, setActiveSubTab] = useState('admins');

  // ───────────────────────────────────────────────────────────────────
  // TAB 1: System Administrators States & Functions
  // ───────────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Reveal Visibility State
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTargetAdmin, setPasswordTargetAdmin] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const togglePasswordVisible = (adminId) => {
    setVisiblePasswords(prev => ({ ...prev, [adminId]: !prev[adminId] }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!name || !email || !password || !role) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerAdmin(name, email, password, role);
      if (res.success) {
        setSuccessMsg(res.message || `Admin Profile for "${name}" successfully registered!`);
        setName('');
        setEmail('');
        setPassword('');
        setRole('admin');
        if (showToast) showToast('Administrator registered successfully!', 'success');
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      console.error('Register admin error:', err);
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPasswordModal = (admin) => {
    setPasswordTargetAdmin(admin);
    setNewPasswordVal('');
    setShowPasswordModal(true);
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPasswordVal || newPasswordVal.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await updateAdminPassword(passwordTargetAdmin.id, newPasswordVal);
      if (res.success) {
        setShowPasswordModal(false);
        setPasswordTargetAdmin(null);
        setNewPasswordVal('');
        if (showToast) showToast('Password updated successfully!', 'success');
        else alert('Password updated successfully!');
      } else {
        alert(res.message || 'Failed to update password.');
      }
    } catch (err) {
      console.error('Change password error:', err);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAdminClick = async (admin) => {
    const isSelf = currentUser && currentUser.id === admin.id;
    const confirmMsg = isSelf 
      ? 'WARNING: You are about to delete your own account! You will be logged out immediately. Proceed?'
      : `Are you sure you want to permanently delete the administrator account for ${admin.name}?`;
    
    if (window.confirm(confirmMsg)) {
      try {
        const res = await deleteAdmin(admin.id);
        if (res.success) {
          if (showToast) showToast('Administrator deleted successfully.', 'info');
        } else {
          alert(res.message || 'Failed to delete administrator.');
        }
      } catch (err) {
        console.error('Delete admin error:', err);
        alert('An error occurred. Please try again.');
      }
    }
  };

  const getAdminPasswordDisplay = (admin) => {
    if (visiblePasswords[admin.id]) {
      return admin.password || (admin.email === 'superadmin@ascend.com' ? 'SuperAdmin@123' : 'Admin@123');
    }
    return '••••••••';
  };

  // ───────────────────────────────────────────────────────────────────
  // TAB 2: Membership Packages (Plans) States & Functions
  // ───────────────────────────────────────────────────────────────────
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    tax_rate: '5',
    duration_days: '30',
    featuresRaw: ''
  });

  const handleOpenAddPlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      price: '',
      tax_rate: '5',
      duration_days: '30',
      featuresRaw: ''
    });
    setShowPlanModal(true);
  };

  const handleOpenEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      price: plan.price.toString(),
      tax_rate: plan.tax_rate.toString(),
      duration_days: plan.duration_days.toString(),
      featuresRaw: plan.features ? plan.features.join(', ') : ''
    });
    setShowPlanModal(true);
  };

  const handlePlanFormSubmit = async (e) => {
    e.preventDefault();
    if (!planForm.name || !planForm.price) {
      alert('Please fill in package name and price.');
      return;
    }

    const featuresList = planForm.featuresRaw
      ? planForm.featuresRaw.split(',').map(f => f.trim()).filter(f => f !== '')
      : [];

    const planData = {
      name: planForm.name,
      price: planForm.price,
      tax_rate: planForm.tax_rate,
      duration_days: planForm.duration_days,
      features: featuresList
    };

    try {
      if (editingPlan) {
        const res = await updatePlan(editingPlan.id, planData);
        if (res.success) {
          setShowPlanModal(false);
          setEditingPlan(null);
          if (showToast) showToast('Membership package updated!', 'success');
        } else {
          alert(res.message || 'Failed to update package.');
        }
      } else {
        const res = await addPlan(planData);
        if (res.success) {
          setShowPlanModal(false);
          if (showToast) showToast('New membership package created!', 'success');
        } else {
          alert(res.message || 'Failed to create package.');
        }
      }
    } catch (err) {
      console.error('Plan save error:', err);
      alert('An error occurred. Please try again.');
    }
  };

  const handleDeletePlanClick = async (plan) => {
    if (window.confirm(`Are you sure you want to delete the "${plan.name}" membership package?`)) {
      try {
        const res = await deletePlan(plan.id);
        if (res.success) {
          if (showToast) showToast('Membership package deleted successfully.', 'info');
        } else {
          alert(res.message || 'Failed to delete package.');
        }
      } catch (err) {
        console.error('Plan delete error:', err);
        alert('An error occurred. Please try again.');
      }
    }
  };

  // ───────────────────────────────────────────────────────────────────
  // TAB 3: Personal Trainers States & Functions
  // ───────────────────────────────────────────────────────────────────
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [trainerForm, setTrainerForm] = useState({
    name: '',
    specialization: '',
    bio: '',
    hourly_rate: '',
    photo_url: ''
  });

  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const data = await uploadToCloudinary(file, {
        onProgress: (pct) => setUploadProgress(pct)
      });
      setTrainerForm(prev => ({ ...prev, photo_url: data.secure_url }));
      if (showToast) showToast('Trainer photo uploaded successfully.', 'success');
    } catch (err) {
      console.error('Trainer photo upload failed:', err);
      if (showToast) showToast(`Photo upload failed: ${err.message || err}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenAddTrainer = () => {
    setEditingTrainer(null);
    setTrainerForm({
      name: '',
      specialization: '',
      bio: '',
      hourly_rate: '',
      photo_url: ''
    });
    setShowTrainerModal(true);
  };

  const handleOpenEditTrainer = (trainer) => {
    setEditingTrainer(trainer);
    setTrainerForm({
      name: trainer.name || trainer.full_name || '',
      specialization: trainer.specialization || '',
      bio: trainer.bio || '',
      hourly_rate: (trainer.hourly_rate || 0).toString(),
      photo_url: trainer.photo_url || ''
    });
    setShowTrainerModal(true);
  };

  const handleTrainerFormSubmit = async (e) => {
    e.preventDefault();
    if (!trainerForm.name || !trainerForm.specialization || !trainerForm.hourly_rate) {
      alert('Please fill in trainer name, specialization and hourly rate.');
      return;
    }

    const trainerData = {
      name: trainerForm.name,
      specialization: trainerForm.specialization,
      bio: trainerForm.bio,
      hourly_rate: trainerForm.hourly_rate,
      photo_url: trainerForm.photo_url
    };

    try {
      if (editingTrainer) {
        const res = await updateTrainer(editingTrainer.id, trainerData);
        if (res.success) {
          setShowTrainerModal(false);
          setEditingTrainer(null);
          if (showToast) showToast('Personal trainer details updated!', 'success');
        } else {
          alert(res.message || 'Failed to update trainer details.');
        }
      } else {
        const res = await addTrainer(trainerData);
        if (res.success) {
          setShowTrainerModal(false);
          if (showToast) showToast('New personal trainer registered!', 'success');
        } else {
          alert(res.message || 'Failed to register trainer.');
        }
      }
    } catch (err) {
      console.error('Trainer save error:', err);
      alert('An error occurred. Please try again.');
    }
  };

  const handleDeleteTrainerClick = async (trainer) => {
    if (window.confirm(`Are you sure you want to remove trainer "${trainer.name}"?`)) {
      try {
        const res = await deleteTrainer(trainer.id);
        if (res.success) {
          if (showToast) showToast('Trainer removed successfully.', 'info');
        } else {
          alert(res.message || 'Failed to delete trainer.');
        }
      } catch (err) {
        console.error('Trainer delete error:', err);
        alert('An error occurred. Please try again.');
      }
    }
  };


  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Admin Console & Registry</h1>
          <p>Configure administrative users, membership packages, and personal trainers.</p>
        </div>
      </div>

      {/* Horizontal Sub-tabs menu */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${activeSubTab === 'admins' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('admins')}
          style={{ gap: '0.5rem', background: activeSubTab === 'admins' ? '#fff' : 'rgba(255,255,255,0.03)', color: activeSubTab === 'admins' ? '#000' : '#fff' }}
        >
          <Shield size={16} /> Administrators Registry
        </button>
        <button 
          className={`btn ${activeSubTab === 'packages' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('packages')}
          style={{ gap: '0.5rem', background: activeSubTab === 'packages' ? '#fff' : 'rgba(255,255,255,0.03)', color: activeSubTab === 'packages' ? '#000' : '#fff' }}
        >
          <Award size={16} /> Membership Packages
        </button>
        <button 
          className={`btn ${activeSubTab === 'trainers' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('trainers')}
          style={{ gap: '0.5rem', background: activeSubTab === 'trainers' ? '#fff' : 'rgba(255,255,255,0.03)', color: activeSubTab === 'trainers' ? '#000' : '#fff' }}
        >
          <UserCheck size={16} /> Personal Trainers
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          SUBTAB 1: Active System Administrators
          ───────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'admins' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* List of Admins */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={18} style={{ color: 'var(--color-primary)' }} />
                Active System Administrators
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                Currently authorized credentials and platform roles.
              </p>
            </div>

            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Administrator</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Password</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img 
                            src={admin.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'} 
                            alt={admin.name} 
                            className="user-avatar"
                            style={{ width: '32px', height: '32px' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{admin.name}</div>
                            {currentUser && currentUser.id === admin.id && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--color-success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Current Session
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        {admin.role === 'super_admin' ? (
                          <span className="badge badge-active" style={{ fontSize: '0.65rem', gap: '0.25rem' }}>
                            <ShieldCheck size={10} /> Super Admin
                          </span>
                        ) : (
                          <span className="badge badge-pending" style={{ fontSize: '0.65rem', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                            <Shield size={10} /> Admin
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {admin.email}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                        {getAdminPasswordDisplay(admin)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          {/* Toggle visibility */}
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem' }} 
                            title={visiblePasswords[admin.id] ? "Hide Password" : "See Password"}
                            onClick={() => togglePasswordVisible(admin.id)}
                          >
                            {visiblePasswords[admin.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>

                          {/* Change password */}
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem' }} 
                            title="Change Password"
                            onClick={() => handleOpenPasswordModal(admin)}
                          >
                            <Key size={12} />
                          </button>

                          {/* Delete Account */}
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem', color: 'var(--color-danger)' }} 
                            title="Delete Account"
                            onClick={() => handleDeleteAdminClick(admin)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Register New Admin Panel */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} style={{ color: 'var(--color-primary)' }} />
                Register Administrator
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                Provision new administrative credentials with tailored access levels.
              </p>
            </div>

            {successMsg && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--color-danger)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                <XCircle size={16} style={{ color: 'var(--color-danger)' }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', display: 'flex', alignItems: 'center' }}>
                    <User size={14} />
                  </span>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="Sarah Jenkins"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ paddingLeft: '2.5rem', fontSize: '0.825rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', display: 'flex', alignItems: 'center' }}>
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    className="glass-input"
                    placeholder="sarah@ascend.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '2.5rem', fontSize: '0.825rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Secure Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', display: 'flex', alignItems: 'center' }}>
                    <Lock size={14} />
                  </span>
                  <input
                    type="password"
                    className="glass-input"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '2.5rem', fontSize: '0.825rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Permissions Role</label>
                <select
                  className="glass-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: '100%', fontSize: '0.825rem', height: '37px', padding: '0 10px' }}
                >
                  <option value="admin">Admin (Restricted Directory Access)</option>
                  <option value="super_admin">Super Admin (All Capabilities + Admin registry)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', padding: '0.75rem', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.725rem', lineHeight: '1.3' }}>
                <Info size={14} style={{ flexShrink: 0, color: 'var(--color-primary)', marginTop: '0.1rem' }} />
                <span>Newly registered administrators will be able to log in immediately using their email and configured password.</span>
              </div>

              <button type="submit" className="btn btn-primary margin-t-1" style={{ fontSize: '0.825rem', padding: '0.625rem' }} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          SUBTAB 2: Membership Packages (Plans)
          ───────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'packages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>Gym Membership Packages</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Add, edit, or remove the packages that members subscribe to.</p>
            </div>
            {(currentUser?.role === 'super_admin' || currentUser?.role === 'gym_owner') && (
              <button className="btn btn-primary" onClick={handleOpenAddPlan} style={{ gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.825rem' }}>
                <Plus size={14} /> Add Package
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {plans.map((plan) => (
              <div key={plan.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '4px solid var(--color-primary)', position: 'relative' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                      {plan.name}
                    </h4>
                    {(currentUser?.role === 'super_admin' || currentUser?.role === 'gym_owner') && (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem', background: 'transparent', borderColor: 'transparent' }} 
                          onClick={() => handleOpenEditPlan(plan)}
                          title="Edit Package"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem', color: 'var(--color-danger)', background: 'transparent', borderColor: 'transparent' }} 
                          onClick={() => handleDeletePlanClick(plan)}
                          title="Delete Package"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '0.75rem', gap: '0.25rem' }}>
                    <span style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-main)' }}>
                      LKR {plan.price.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      / {plan.duration_days} days
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Tax Rate: {plan.tax_rate}%
                  </div>

                  {/* Features List */}
                  <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                      Features included:
                    </div>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                      {plan.features && plan.features.map((feature, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: '4px', height: '4px', background: '#fff', borderRadius: '50%' }} />
                          {feature}
                        </li>
                      ))}
                      {(!plan.features || plan.features.length === 0) && (
                        <li style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No features specified.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          SUBTAB 3: Personal Trainers
          ───────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'trainers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>Personal Trainers</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Manage the fitness instructors and trainers assigned to gym members.</p>
            </div>
            {(currentUser?.role === 'super_admin' || currentUser?.role === 'gym_owner') && (
              <button className="btn btn-primary" onClick={handleOpenAddTrainer} style={{ gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.825rem' }}>
                <Plus size={14} /> Add Trainer
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {trainers.map((trainer) => (
              <div key={trainer.id} className="glass-card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <img 
                  src={trainer.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'} 
                  alt={trainer.name || trainer.full_name || 'Trainer'} 
                  style={{ width: '70px', height: '70px', borderRadius: '12px', border: '1.5px solid var(--border-color)', objectFit: 'cover' }}
                />
                
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{trainer.name || trainer.full_name}</div>
                    {(currentUser?.role === 'super_admin' || currentUser?.role === 'gym_owner') && (
                      <div style={{ display: 'flex', gap: '0.15rem' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.25rem', background: 'transparent', borderColor: 'transparent' }} 
                          onClick={() => handleOpenEditTrainer(trainer)}
                          title="Edit Trainer"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.25rem', color: 'var(--color-danger)', background: 'transparent', borderColor: 'transparent' }} 
                          onClick={() => handleDeleteTrainerClick(trainer)}
                          title="Delete Trainer"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  <span className="badge badge-active" style={{ fontSize: '0.65rem', alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--border-color)', padding: '0.15rem 0.5rem' }}>
                    {trainer.specialization || 'Fitness Coach'}
                  </span>

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.35', margin: '0.35rem 0' }}>
                    {trainer.bio || 'Professional fitness coach focused on helping members reach their bodily goals.'}
                  </p>

                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-success)', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem', marginTop: '0.25rem' }}>
                    LKR {Number(trainer.hourly_rate || 0).toLocaleString()} / hour
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: Change Password
          ───────────────────────────────────────────────────────────────── */}
      {showPasswordModal && passwordTargetAdmin && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={18} style={{ color: 'var(--color-primary)' }} />
                Change Password
              </h2>
              <button 
                onClick={() => { setShowPasswordModal(false); setPasswordTargetAdmin(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Configure a new secure password credential for <strong style={{ color: '#fff' }}>{passwordTargetAdmin.name}</strong>.
            </div>

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>New Secure Password</label>
                <input 
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  className="glass-input"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                />
              </div>

              <div className="grid-2 margin-t-1">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowPasswordModal(false); setPasswordTargetAdmin(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUpdatingPassword}>
                  {isUpdatingPassword ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: Plan Add / Edit
          ───────────────────────────────────────────────────────────────── */}
      {showPlanModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} style={{ color: 'var(--color-primary)' }} />
                {editingPlan ? 'Edit Membership Package' : 'Create Membership Package'}
              </h2>
              <button 
                onClick={() => { setShowPlanModal(false); setEditingPlan(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePlanFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Package Name *</label>
                <input 
                  type="text" required placeholder="e.g. Platinum Plus" className="glass-input"
                  value={planForm.name} onChange={(e) => setPlanForm({...planForm, name: e.target.value})}
                />
              </div>

              <div className="grid-2">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Price (LKR) *</label>
                  <input 
                    type="number" required placeholder="7500" className="glass-input"
                    value={planForm.price} onChange={(e) => setPlanForm({...planForm, price: e.target.value})}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration (Days) *</label>
                  <input 
                    type="number" required placeholder="30" className="glass-input"
                    value={planForm.duration_days} onChange={(e) => setPlanForm({...planForm, duration_days: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tax Rate (%) *</label>
                <input 
                  type="number" required placeholder="5" className="glass-input"
                  value={planForm.tax_rate} onChange={(e) => setPlanForm({...planForm, tax_rate: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Features (comma-separated)</label>
                <textarea 
                  placeholder="Sauna Access, 2x Guest Passes, Towel Service..." 
                  className="glass-input"
                  style={{ resize: 'none', height: '80px', padding: '0.5rem' }}
                  value={planForm.featuresRaw} 
                  onChange={(e) => setPlanForm({...planForm, featuresRaw: e.target.value})}
                />
              </div>

              <div className="grid-2 margin-t-1">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowPlanModal(false); setEditingPlan(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: Trainer Add / Edit
          ───────────────────────────────────────────────────────────────── */}
      {showTrainerModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={18} style={{ color: 'var(--color-primary)' }} />
                {editingTrainer ? 'Edit Trainer Details' : 'Register Personal Trainer'}
              </h2>
              <button 
                onClick={() => { setShowTrainerModal(false); setEditingTrainer(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTrainerFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trainer Full Name *</label>
                <input 
                  type="text" required placeholder="e.g. Chris Bumstead" className="glass-input"
                  value={trainerForm.name} onChange={(e) => setTrainerForm({...trainerForm, name: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Specialization *</label>
                <input 
                  type="text" required placeholder="e.g. Bodybuilding & Hypertrophy" className="glass-input"
                  value={trainerForm.specialization} onChange={(e) => setTrainerForm({...trainerForm, specialization: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hourly Rate (LKR) *</label>
                <input 
                  type="number" required placeholder="3500" className="glass-input"
                  value={trainerForm.hourly_rate} onChange={(e) => setTrainerForm({...trainerForm, hourly_rate: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Profile Photo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                  {trainerForm.photo_url && (
                    <img 
                      src={trainerForm.photo_url} 
                      alt="Trainer Preview" 
                      style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                    />
                  )}
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  >
                    {isUploading ? `Uploading ${uploadProgress}%` : 'Upload from Device'}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />
                  {trainerForm.photo_url && (
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ color: 'var(--color-danger)', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => setTrainerForm(prev => ({ ...prev, photo_url: '' }))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Short Bio / Biography</label>
                <textarea 
                  placeholder="NSCA certified coach, 6+ years experience in helping clients transform..." 
                  className="glass-input"
                  style={{ resize: 'none', height: '80px', padding: '0.5rem' }}
                  value={trainerForm.bio} 
                  onChange={(e) => setTrainerForm({...trainerForm, bio: e.target.value})}
                />
              </div>

              <div className="grid-2 margin-t-1">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowTrainerModal(false); setEditingTrainer(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTrainer ? 'Save Details' : 'Register Trainer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
