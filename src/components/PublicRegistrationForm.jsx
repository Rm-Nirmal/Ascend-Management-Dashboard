import { useState, useRef } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { uploadToCloudinary } from '../lib/cloudinary';
import { Smartphone, Send, Camera, Loader2, Check } from 'lucide-react';

const PublicRegistrationForm = ({ isStandalone = true }) => {
  const { plans, addRegistrationRequest, showToast } = useDashboard();

  // States
  const [formStep, setFormStep] = useState(1); // 1 = input, 2 = simulated OTP verification
  const [otpCode, setOtpCode] = useState('');
  const [sentOtp, setSentOtp] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const [publicForm, setPublicForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    gender: 'female',
    date_of_birth: '',
    branch_id: 'org_ascend_hq',
    plan_id: '',
    medical_conditions: '',
    fitness_goals: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    photo_url: '',
    weight_kg: '',
    height_cm: '',
    body_fat_pct: '',
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const data = await uploadToCloudinary(file, {
        onProgress: (pct) => setUploadProgress(pct)
      });
      setPublicForm(prev => ({ ...prev, photo_url: data.secure_url }));
      showToast('Photo uploaded successfully to Cloudinary.', 'success');
    } catch (err) {
      console.error('Photo upload failed:', err);
      showToast(`Photo upload failed: ${err.message || err}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

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
      showToast('Please fill out all required fields.', 'warning');
      return;
    }
    setFormErrors({});

    // Generate random 6-digit OTP code (mock)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtp(code);
    setFormStep(2);
    // Trigger simulated SMS via Toast Notification!
    showToast(`[SIMULATED SMS GATEWAY] Code sent to ${publicForm.phone}: ${code}`, 'success');
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpCode !== sentOtp) {
      showToast('Invalid verification code. Please check the code shown in the simulation toast.', 'error');
      return;
    }

    const res = await addRegistrationRequest(publicForm);
    if (res) {
      showToast('OTP Verified! Registration request successfully submitted.', 'success');
      
      // Reset Form
      setPublicForm({
        full_name: '',
        email: '',
        phone: '',
        gender: 'female',
        date_of_birth: '',
        branch_id: 'org_ascend_hq',
        plan_id: '',
        medical_conditions: '',
        fitness_goals: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        photo_url: '',
        weight_kg: '',
        height_cm: '',
        body_fat_pct: '',
      });
      setFormStep(1);
      setOtpCode('');
      setSentOtp('');
    } else {
      showToast('System error submitting registration. Please try again.', 'error');
    }
  };

  const formContent = (
    <div className="glass-card" style={{
      width: '100%',
      maxWidth: '580px',
      padding: '2.5rem 2rem',
      background: 'rgba(10, 10, 10, 0.85)',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <Smartphone size={36} style={{ color: '#ffffff', marginBottom: '0.75rem' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 800, letterSpacing: '0.02em', color: '#ffffff' }}>
          ASCEND FITNESS PORTAL
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Public Registration & Verification Portal
        </p>
      </div>

      {formStep === 1 ? (
        <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Profile Photo Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.02)',
                border: '2px dashed rgba(255,255,255,0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => { if(!isUploading) e.currentTarget.style.borderColor = '#ffffff'; }}
              onMouseLeave={(e) => { if(!isUploading) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            >
              {publicForm.photo_url ? (
                <img 
                  src={publicForm.photo_url} 
                  alt="Profile Preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : isUploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                  <Loader2 size={20} style={{ color: '#ffffff', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{uploadProgress}%</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                  <Camera size={20} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Upload Photo</span>
                </div>
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
            
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {isUploading ? 'Uploading to Cloudinary...' : 'Upload profile photo (PNG, JPG)'}
            </span>
          </div>

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
              {formErrors.full_name && <span style={{ fontSize: '0.7rem', color: '#ffffff' }}>{formErrors.full_name}</span>}
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
              {formErrors.email && <span style={{ fontSize: '0.7rem', color: '#ffffff' }}>{formErrors.email}</span>}
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
              {formErrors.phone && <span style={{ fontSize: '0.7rem', color: '#ffffff' }}>{formErrors.phone}</span>}
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
                {formErrors.date_of_birth && <span style={{ fontSize: '0.7rem', color: '#ffffff' }}>{formErrors.date_of_birth}</span>}
              </div>
            </div>
            
            {/* Weight, Height, and Body Fat */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', gridColumn: 'span 2' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Weight (kg)</label>
                <input 
                  type="number" 
                  placeholder="70"
                  value={publicForm.weight_kg}
                  onChange={(e) => setPublicForm({...publicForm, weight_kg: e.target.value})}
                  className="glass-input"
                  style={{ marginTop: '0.25rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Height (cm)</label>
                <input 
                  type="number" 
                  placeholder="175"
                  value={publicForm.height_cm}
                  onChange={(e) => setPublicForm({...publicForm, height_cm: e.target.value})}
                  className="glass-input"
                  style={{ marginTop: '0.25rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Body Fat (%)</label>
                <input 
                  type="number" 
                  placeholder="15"
                  value={publicForm.body_fat_pct}
                  onChange={(e) => setPublicForm({...publicForm, body_fat_pct: e.target.value})}
                  className="glass-input"
                  style={{ marginTop: '0.25rem' }}
                />
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
            {formErrors.plan_id && <span style={{ fontSize: '0.7rem', color: '#ffffff' }}>{formErrors.plan_id}</span>}
          </div>

          <div>
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
              placeholder="Cardio fitness, strength training..."
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', gap: '0.5rem', background: '#ffffff', color: '#000000' }}>
            <Send size={16} /> Request Verification Code
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', padding: '1rem 0' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem', color: '#ffffff' }}>Enter Verification Code</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              We sent a 6-digit OTP passcode to your mobile device: <strong>{publicForm.phone}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <input 
              type="text" 
              required
              placeholder="OTP code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="glass-input"
              maxLength={6}
              style={{ width: '220px', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.25em', padding: '0.75rem' }}
            />
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Didn't receive SMS?{' '}
            <span 
              style={{ color: '#ffffff', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }} 
              onClick={() => showToast(`[RESENDING SMS] Code: ${sentOtp}`, 'success')}
            >
              Resend Code
            </span>
          </div>

          <div className="grid-2" style={{ maxWidth: '320px', margin: '0 auto', width: '100%' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setFormStep(1)}>
              Back
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: '#ffffff', color: '#000000' }}>
              Verify & Submit
            </button>
          </div>
        </form>
      )}
    </div>
  );

  if (isStandalone) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05) 0%, transparent 60%)',
        overflowY: 'auto'
      }}>
        {formContent}
      </div>
    );
  }

  return formContent;
};

export default PublicRegistrationForm;
