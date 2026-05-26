import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { UserPlus, Shield, ShieldCheck, Mail, Lock, User, Info, CheckCircle2, XCircle } from 'lucide-react';

const AdminManagement = () => {
  const { admins, registerAdmin, currentUser } = useDashboard();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
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
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Admin Console & RBAC</h1>
          <p>Manage administrative registry, security credentials, and role-based permissions.</p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: '2rem',
        alignItems: 'start'
      }}>
        {/* Active Administrators List */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} style={{ color: 'var(--color-primary)' }} />
              Active System Administrators
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Currently active credentials and platform configuration.
            </p>
          </div>

          <div className="table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Administrator</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Credentials</th>
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
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-dark)', fontFamily: 'monospace' }}>
                      {/* Show masked password */}
                      ••••••••
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Register New Admin Form */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={18} style={{ color: 'var(--color-primary)' }} />
              Register Administrator
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              Provision new administrative credentials with tailored system capabilities.
            </p>
          </div>

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: 'var(--color-success)',
              fontSize: '0.8rem',
              fontWeight: 600,
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: 'var(--color-danger)',
              fontSize: '0.8rem',
              fontWeight: 600,
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <XCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Full Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', display: 'flex', alignItems: 'center' }}>
                  <User size={14} />
                </span>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '2.5rem', fontSize: '0.825rem' }}
                />
              </div>
            </div>

            {/* Email Address */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Corporate Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', display: 'flex', alignItems: 'center' }}>
                  <Mail size={14} />
                </span>
                <input
                  type="email"
                  className="glass-input"
                  placeholder="e.g. sarah@ascend.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '2.5rem', fontSize: '0.825rem' }}
                />
              </div>
            </div>

            {/* Secure Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Temporary Password
              </label>
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

            {/* Permissions Role */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Access Permissions Role
              </label>
              <select
                className="glass-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', fontSize: '0.825rem', height: '37px', padding: '0 10px' }}
              >
                <option value="admin">Admin (Restricted to Members Directory, Reg Queue, Access Console)</option>
                <option value="super_admin">Super Admin (All Capabilities + Admin registry access)</option>
              </select>
            </div>

            {/* Hint alert */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.01)',
              border: '1px dashed var(--border-color)',
              padding: '0.75rem',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              fontSize: '0.725rem',
              lineHeight: '1.3'
            }}>
              <Info size={14} style={{ flexShrink: 0, color: 'var(--color-primary)', marginTop: '0.1rem' }} />
              <span>Newly registered administrators will be able to log in immediately using their email and temporary password configured here.</span>
            </div>

            <button type="submit" className="btn btn-primary margin-t-1" style={{ fontSize: '0.825rem', padding: '0.625rem' }} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;
