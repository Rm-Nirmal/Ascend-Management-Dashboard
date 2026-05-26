import { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  Check, X, ShieldCheck, QrCode, Link, Copy, ExternalLink
} from 'lucide-react';
import PublicRegistrationForm from './PublicRegistrationForm';

const Registrations = () => {
  const {
    registrations,
    plans,
    approveRegistration,
    rejectRegistration,
    showToast
  } = useDashboard();

  // Navigation: Toggle between "Admin Queue" and "Simulate Public Registration Form"
  const [currentSubTab, setCurrentSubTab] = useState('queue'); // 'queue' or 'form'
  
  // States for Admin Queue
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Filter queue
  const pendingRequests = useMemo(() => {
    return registrations.filter(r => r.status === 'pending_approval');
  }, [registrations]);

  const historyRequests = useMemo(() => {
    return registrations.filter(r => r.status === 'approved' || r.status === 'rejected');
  }, [registrations]);

  const handleAdminApprove = (requestId) => {
    approveRegistration(requestId);
    setSelectedReq(null);
  };

  const handleAdminReject = (e) => {
    e.preventDefault();
    if (!rejectReason) {
      showToast('Please specify a rejection reason.', 'warning');
      return;
    }
    rejectRegistration(selectedReq.id, rejectReason);
    setRejectReason('');
    setShowRejectForm(false);
    setSelectedReq(null);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Registration Desk</h1>
          <p>Process public registrations, verify phone/email OTP flow, and approve signups.</p>
        </div>
      </div>

      {/* Sub tabs switcher */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
        <button 
          onClick={() => setCurrentSubTab('queue')}
          style={{ 
            background: 'none', border: 'none', color: currentSubTab === 'queue' ? 'var(--color-primary)' : 'var(--text-muted)', 
            fontWeight: 700, padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: currentSubTab === 'queue' ? '3px solid var(--color-primary)' : 'none' 
          }}
        >
          Approval Queue ({pendingRequests.length})
        </button>
        <button 
          onClick={() => setCurrentSubTab('form')}
          style={{ 
            background: 'none', border: 'none', color: currentSubTab === 'form' ? 'var(--color-primary)' : 'var(--text-muted)', 
            fontWeight: 700, padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: currentSubTab === 'form' ? '3px solid var(--color-primary)' : 'none' 
          }}
        >
          Simulate Public Registration Form
        </button>
      </div>

      {/* View 1: Admin Queue */}
      {currentSubTab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Pending Approval Requests */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                Pending Approval Queue (Draft &rarr; OTP Verified)
              </h3>
            </div>
            
            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Registration Name</th>
                    <th>Email / Phone</th>
                    <th>Selected Plan</th>
                    <th>Verification</th>
                    <th>Submitted Time</th>
                    <th style={{ textAlign: 'right' }}>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        All caught up! No pending registrations.
                      </td>
                    </tr>
                  ) : (
                    pendingRequests.map(req => {
                      const plan = plans.find(p => p.id === req.plan_id);
                      return (
                        <tr key={req.id}>
                          <td style={{ fontWeight: 600 }}>{req.full_name}</td>
                          <td>
                            <div>{req.email}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.phone}</div>
                          </td>
                          <td>{plan ? plan.name : 'N/A'}</td>
                          <td>
                            <span className="badge badge-active" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
                              <ShieldCheck size={10} style={{ marginRight: '0.2rem' }} /> OTP Verified
                            </span>
                          </td>
                          <td>{new Date(req.created_at).toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                              onClick={() => { setSelectedReq(req); setShowRejectForm(false); }}
                            >
                              Review details
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

          {/* Historical Log (Approved / Rejected) */}
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
                    <th>Registration Name</th>
                    <th>Email Address</th>
                    <th>Selected Plan</th>
                    <th>Final Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRequests.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No history records found.
                      </td>
                    </tr>
                  ) : (
                    historyRequests.map(req => {
                      const plan = plans.find(p => p.id === req.plan_id);
                      return (
                        <tr key={req.id}>
                          <td>{req.full_name}</td>
                          <td>{req.email}</td>
                          <td>{plan ? plan.name : 'N/A'}</td>
                          <td>
                            <span className={`badge badge-${req.status === 'approved' ? 'active' : 'expired'}`} style={{ fontSize: '0.65rem' }}>
                              {req.status === 'approved' ? 'Approved' : 'Rejected'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {req.status === 'approved' ? 'Activated member profile' : req.rejection_reason}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Simulated Public Form */}
      {currentSubTab === 'form' && (() => {
        const registrationUrl = `${window.location.origin}/?view=register`;
        const handleCopyLink = () => {
          navigator.clipboard.writeText(registrationUrl);
          showToast('Public registration URL copied to clipboard!', 'success');
        };

        return (
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            gap: '2rem',
            alignItems: 'start'
          }}>
            {/* Left Column: QR and Link Simulation Details */}
            <div className="glass-card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.5rem', 
              padding: '2rem',
              flex: '1 1 280px',
              minWidth: '280px'
            }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
                  Public Portal Credentials
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  Provide members with direct access to signup on their personal mobile devices, tablets, or at the gym reception desk.
                </p>
              </div>

              {/* Scannable Dynamic QR Code */}
              <div style={{ 
                background: '#0c0c0c', 
                border: '1px solid var(--border-color)', 
                borderRadius: '12px', 
                padding: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '1rem'
              }}>
                <div style={{ 
                  background: '#000000', 
                  padding: '1rem', 
                  borderRadius: '8px', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  boxShadow: 'inset 0 0 15px rgba(255,255,255,0.05)'
                }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=ffffff&bgcolor=000000&qzone=1&data=${encodeURIComponent(registrationUrl)}`} 
                    alt="Public Registration QR Code"
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <QrCode size={14} /> Scan with Mobile Camera
                </div>
              </div>

              {/* Simulation Link */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Public Registration Link
                </span>
                <div style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  padding: '0.75rem 1rem', 
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>
                    {registrationUrl}
                  </span>
                  <button 
                    onClick={handleCopyLink} 
                    title="Copy Link"
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button onClick={handleCopyLink} className="btn btn-secondary" style={{ flexGrow: 1, gap: '0.4rem', fontSize: '0.8rem' }}>
                  <Copy size={14} /> Copy Link
                </button>
                <a 
                  href={registrationUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-primary" 
                  style={{ flexGrow: 1, gap: '0.4rem', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', background: '#ffffff', color: '#000000' }}
                >
                  <ExternalLink size={14} /> Simulate
                </a>
              </div>
            </div>

            {/* Right Column: Embedded Simulator Form */}
            <div style={{ flex: '1.2 1 320px', minWidth: '320px' }}>
              <PublicRegistrationForm isStandalone={false} />
            </div>
          </div>
        );
      })()}

      {/* Review details details popup */}
      {selectedReq && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                Review Registration Details
              </h2>
              <button 
                onClick={() => setSelectedReq(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '60vh' }}>
              
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <div style={{
                  width: '65px',
                  height: '65px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  flexShrink: 0
                }}>
                  <img 
                    src={selectedReq.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'} 
                    alt="Applicant Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>
                <div style={{ flexGrow: 1 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Applicant Details</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>{selectedReq.full_name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email: {selectedReq.email}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Phone: {selectedReq.phone}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gender: {selectedReq.gender} | DOB: {selectedReq.date_of_birth}{selectedReq.weight_kg ? ` | Weight: ${selectedReq.weight_kg}kg` : ''}{selectedReq.height_cm ? ` | Height: ${selectedReq.height_cm}cm` : ''}{selectedReq.body_fat_pct ? ` | Body Fat: ${selectedReq.body_fat_pct}%` : ''}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Program details</span>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Gym Branch: <strong>Ascend Headquarters (HQ)</strong>
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  Target Plan: <strong>{plans.find(p => p.id === selectedReq.plan_id)?.name}</strong>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Medical Info & Goals</span>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#fff' }}>
                  Medical Conditions: <span style={{ color: 'var(--text-muted)' }}>{selectedReq.medical_conditions || 'None reported.'}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#fff' }}>
                  Fitness Goals: <span style={{ color: 'var(--text-muted)' }}>{selectedReq.fitness_goals || 'General fitness.'}</span>
                </div>
              </div>

              <div className="grid-2" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div>IP Address: {selectedReq.ip_address}</div>
                <div>Submitted: {new Date(selectedReq.created_at).toLocaleString()}</div>
              </div>
            </div>

            {/* Actions panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1rem' }}>
              {!showRejectForm ? (
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
                    onClick={() => handleAdminApprove(selectedReq.id)}
                  >
                    <Check size={14} /> Approve Registration
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAdminReject} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Specify Rejection Reason</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Duplicate account, incomplete credentials..."
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registrations;
