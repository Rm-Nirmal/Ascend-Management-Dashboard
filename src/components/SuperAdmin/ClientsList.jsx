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
  Search
} from 'lucide-react';

const ClientsList = () => {
  const { gyms, suspendGym, deleteGym, resetGymOwnerPassword, getGymHealthScore, showToast } = useDashboard();
  
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  
  // Password reset inline state
  const [resettingOwnerEmail, setResettingOwnerEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Filter gyms
  const filteredGyms = gyms.filter(gym => 
    gym.gymName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSuspendToggle = async (gymId, currentStatus) => {
    const isSuspended = currentStatus === 'active' || currentStatus === 'trial';
    const res = await suspendGym(gymId, isSuspended);
    if (!res.success) {
      showToast(res.message, 'error');
    }
  };

  const handleDelete = async (gymId) => {
    const res = await deleteGym(gymId);
    if (res.success) {
      setConfirmDeleteId('');
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

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '12px',
        padding: '2rem'
      }}>
        {/* Header and Search bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Registered Client Gyms</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Manage directories, access statuses, owner credentials, and data isolation.
            </p>
          </div>
          
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
            <input 
              type="text" 
              className="form-control" 
              style={{ paddingLeft: '2.5rem' }} 
              placeholder="Search by gym name, email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table View */}
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                <th style={{ padding: '1rem 0.5rem' }}>Gym Details</th>
                <th style={{ padding: '1rem 0.5rem' }}>Owner Info</th>
                <th style={{ padding: '1rem 0.5rem' }}>SaaS Plan</th>
                <th style={{ padding: '1rem 0.5rem' }}>Workspace Status</th>
                <th style={{ padding: '1rem 0.5rem' }}>Health Score</th>
                <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGyms.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No client gyms found.
                  </td>
                </tr>
              ) : (
                filteredGyms.map(gym => {
                  const healthScore = getGymHealthScore(gym.gymId);
                  let healthColor = 'var(--color-success)';
                  if (healthScore < 50) healthColor = 'var(--color-danger)';
                  else if (healthScore < 75) healthColor = 'var(--color-warning)';

                  const isSuspended = gym.status === 'suspended';
                  const isTrial = gym.status === 'trial';

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
                            <span style={{ display: 'block', fontWeight: 600 }}>{gym.gymName}</span>
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
                        </div>
                      </td>

                      {/* Plan */}
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>
                        {gym.subscriptionPlan}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: isSuspended ? 'rgba(239, 68, 68, 0.1)' : isTrial ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: isSuspended ? 'var(--color-danger)' : isTrial ? '#3b82f6' : 'var(--color-success)',
                          border: `1px solid ${isSuspended ? 'rgba(239, 68, 68, 0.2)' : isTrial ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                        }}>
                          {gym.status}
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
                          
                          {/* Suspend/Activate toggle */}
                          <button
                            onClick={() => handleSuspendToggle(gym.gymId, gym.status)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: '6px' }}
                            title={isSuspended ? 'Reactivate Gym Workspace' : 'Suspend Gym Workspace'}
                          >
                            {isSuspended ? <Play size={14} style={{ color: 'var(--color-success)' }} /> : <Pause size={14} style={{ color: 'var(--color-warning)' }} />}
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => setResettingOwnerEmail(gym.ownerEmail)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem', borderRadius: '6px' }}
                            title="Reset Owner Password"
                          >
                            <Key size={14} />
                          </button>

                          {/* Delete Gym */}
                          {confirmDeleteId === gym.gymId ? (
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                              <button
                                onClick={() => handleDelete(gym.gymId)}
                                className="btn btn-danger"
                                style={{ padding: '0.4rem', fontSize: '0.7rem' }}
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId('')}
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem' }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(gym.gymId)}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem', borderRadius: '6px' }}
                              title="Delete Gym Workspace"
                            >
                              <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
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
      </div>

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
    </div>
  );
};

export default ClientsList;
