import React, { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  Check, X, FileText, ClipboardCheck, Smartphone, Send, ShieldCheck, UserCheck 
} from 'lucide-react';

const Registrations = () => {
  const {
    registrations,
    plans,
    approveRegistration,
    rejectRegistration,
    addRegistrationRequest
  } = useDashboard();

  // Navigation: Toggle between "Admin Queue" and "Simulate Public Registration Form"
  const [currentSubTab, setCurrentSubTab] = useState('queue'); // 'queue' or 'form'
  
  // States for Admin Queue
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // States for simulated public form
  const [formStep, setFormStep] = useState(1); // 1 = input, 2 = simulated OTP verification
  const [otpCode, setOtpCode] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [publicForm, setPublicForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    gender: 'female',
    date_of_birth: '',
    branch_id: '',
    plan_id: '',
    medical_conditions: '',
    fitness_goals: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });

  // Filter queue
  const pendingRequests = useMemo(() => {
    return registrations.filter(r => r.status === 'pending_approval');
  }, [registrations]);

  const historyRequests = useMemo(() => {
    return registrations.filter(r => r.status === 'approved' || r.status === 'rejected');
  }, [registrations]);

  // Handle simulated public form validation & OTP request
  const handleRequestOtp = (e) => {
    e.preventDefault();
    const errors = {};
    if (!publicForm.full_name) errors.full_name = 'Name is required';
    if (!publicForm.email) errors.email = 'Email is required';
    if (!publicForm.phone) errors.phone = 'Phone number is required';
    if (!publicForm.date_of_birth) errors.date_of_birth = 'Date of birth is required';
    if (!publicForm.plan_id) errors.plan_id = 'Membership plan is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    // Generate random 6-digit OTP code (mock)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtp(code);
    setFormStep(2);
    alert(`[Simulated Gateway] SMS OTP Code sent to ${publicForm.phone}: ${code}`);
  };

  // Submit OTP & complete pending request submission
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otpCode !== sentOtp) {
      alert('Invalid verification code. Please enter the correct code shown in the simulation alert.');
      return;
    }

    // Add to requests queue
    addRegistrationRequest(publicForm);

    // Reset Form
    setPublicForm({
      full_name: '',
      email: '',
      phone: '',
      gender: 'female',
      date_of_birth: '',
      branch_id: '',
      plan_id: '',
      medical_conditions: '',
      fitness_goals: '',
      emergency_contact_name: '',
      emergency_contact_phone: ''
    });
    setFormStep(1);
    setOtpCode('');
    setSentOtp('');
    setCurrentSubTab('queue');
    alert('OTP Verified! Registration request successfully submitted to the Admin Approval Queue.');
  };

  const handleAdminApprove = (requestId) => {
    approveRegistration(requestId);
    setSelectedReq(null);
  };

  const handleAdminReject = (e) => {
    e.preventDefault();
    if (!rejectReason) {
      alert('Please specify a rejection reason.');
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
      {currentSubTab === 'form' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '580px', padding: '2rem', border: '1px solid rgba(6,182,212,0.2)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Smartphone size={32} style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }} />
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>
                Ascend Fitness HQ
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Public Registration Portal Mockup (otp_verified flow simulation)
              </p>
            </div>

            {formStep === 1 ? (
              <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="grid-2">
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Amara Walker"
                      value={publicForm.full_name}
                      onChange={(e) => setPublicForm({...publicForm, full_name: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                    {formErrors.full_name && <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}>{formErrors.full_name}</span>}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address *</label>
                    <input 
                      type="email" 
                      required
                      placeholder="amara@gmail.com"
                      value={publicForm.email}
                      onChange={(e) => setPublicForm({...publicForm, email: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                    {formErrors.email && <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}>{formErrors.email}</span>}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mobile Number *</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="+1 (555) 998-1234"
                      value={publicForm.phone}
                      onChange={(e) => setPublicForm({...publicForm, phone: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                    {formErrors.phone && <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}>{formErrors.phone}</span>}
                  </div>
                  <div className="grid-2">
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gender</label>
                      <select 
                        value={publicForm.gender}
                        onChange={(e) => setPublicForm({...publicForm, gender: e.target.value})}
                        className="glass-select"
                        style={{ marginTop: '0.25rem', width: '100%', padding: '0.625rem' }}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date of Birth *</label>
                      <input 
                        type="date" 
                        required
                        value={publicForm.date_of_birth}
                        onChange={(e) => setPublicForm({...publicForm, date_of_birth: e.target.value})}
                        className="glass-input"
                        style={{ marginTop: '0.25rem', padding: '0.5rem' }}
                      />
                      {formErrors.date_of_birth && <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}>{formErrors.date_of_birth}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select Membership Plan *</label>
                  <select 
                    required
                    value={publicForm.plan_id}
                    onChange={(e) => setPublicForm({...publicForm, plan_id: e.target.value})}
                    className="glass-select"
                    style={{ marginTop: '0.25rem', width: '100%', padding: '0.625rem' }}
                  >
                    <option value="">Select Plan...</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (LKR {p.price.toLocaleString()}/mo)</option>
                    ))}
                  </select>
                  {formErrors.plan_id && <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}>{formErrors.plan_id}</span>}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Any Medical Conditions / Injuries</label>
                  <textarea 
                    placeholder="Brief details if applicable..."
                    value={publicForm.medical_conditions}
                    onChange={(e) => setPublicForm({...publicForm, medical_conditions: e.target.value})}
                    className="glass-input"
                    style={{ marginTop: '0.25rem', resize: 'none', height: '60px', padding: '0.5rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Primary Fitness Goals</label>
                  <input 
                    type="text" 
                    placeholder="Cardio fitness, strength training, flexibility..."
                    value={publicForm.fitness_goals}
                    onChange={(e) => setPublicForm({...publicForm, fitness_goals: e.target.value})}
                    className="glass-input"
                    style={{ marginTop: '0.25rem' }}
                  />
                </div>

                <div className="grid-2">
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emergency Contact Name</label>
                    <input 
                      type="text" 
                      placeholder="Parent / Spouse Name"
                      value={publicForm.emergency_contact_name}
                      onChange={(e) => setPublicForm({...publicForm, emergency_contact_name: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emergency Contact Mobile</label>
                    <input 
                      type="text" 
                      placeholder="+1 (555) 000-0000"
                      value={publicForm.emergency_contact_phone}
                      onChange={(e) => setPublicForm({...publicForm, emergency_contact_phone: e.target.value})}
                      className="glass-input"
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', gap: '0.5rem' }}>
                  <Send size={16} /> Request SMS Verification Code
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', padding: '1rem 0' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Enter Verification Code</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    We sent a 6-digit OTP passcode to your mobile device: <strong>{publicForm.phone}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter 6-digit OTP code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="glass-input"
                    maxLength={6}
                    style={{ width: '220px', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.25em', padding: '0.75rem' }}
                  />
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Didn't receive SMS? <span style={{ color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => alert(`Resending OTP code: ${sentOtp}`)}>Resend Code</span>
                </div>

                <div className="grid-2" style={{ maxWidth: '320px', margin: '0 auto', width: '100%' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setFormStep(1)}>
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Verify & Submit
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
              
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Applicant Details</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>{selectedReq.full_name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email: {selectedReq.email}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Phone: {selectedReq.phone}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gender: {selectedReq.gender} | DOB: {selectedReq.date_of_birth}</div>
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
