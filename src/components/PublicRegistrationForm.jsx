import { useState, useRef } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { uploadToCloudinary } from '../lib/cloudinary';
import { Smartphone, Send, Camera, Loader2, Check } from 'lucide-react';

const PublicRegistrationForm = ({ isStandalone = true }) => {
  const { plans, addRegistrationRequest, showToast } = useDashboard();

  // States
  const [formErrors, setFormErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  const [publicForm, setPublicForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    gender: 'female',
    date_of_birth: '',
    branch_id: 'org_ascend_hq',
    plan_id: '',
    installment_plan: '1 time',
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

  const handleSubmitRegistration = async (e) => {
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

    const res = await addRegistrationRequest(publicForm);
    if (res) {
      showToast('Registration request successfully submitted for approval!', 'success');
      setIsSubmitted(true);
      
      // Reset Form
      setPublicForm({
        full_name: '',
        email: '',
        phone: '',
        gender: 'female',
        date_of_birth: '',
        branch_id: 'org_ascend_hq',
        plan_id: '',
        installment_plan: '1 time',
        medical_conditions: '',
        fitness_goals: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        photo_url: '',
        weight_kg: '',
        height_cm: '',
        body_fat_pct: '',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      showToast('System error submitting registration. Please try again.', 'error');
    }
  };

  if (isSubmitted) {
    const successContent = (
      <div className="pub-form-card glass-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '2px solid #ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem',
          boxShadow: '0 0 20px rgba(255, 255, 255, 0.2)'
        }}>
          <Check size={36} style={{ color: '#ffffff' }} />
        </div>
        
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 800, letterSpacing: '0.02em', color: '#ffffff', marginBottom: '0.75rem' }}>
          REGISTRATION COMPLETE!
        </h2>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '2rem' }}>
          Your application has been successfully submitted to the Ascend Gym administration team. We will review your credentials and get back to you shortly.
        </p>

        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          textAlign: 'left',
          marginBottom: '2.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Next Steps
          </span>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#ffffff', fontWeight: 700 }}>1.</span>
            <span style={{ color: 'var(--text-muted)' }}>Administrative approval of your registration details.</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#ffffff', fontWeight: 700 }}>2.</span>
            <span style={{ color: 'var(--text-muted)' }}>You will receive an email/SMS confirmation once approved.</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
            <span style={{ color: '#ffffff', fontWeight: 700 }}>3.</span>
            <span style={{ color: 'var(--text-muted)' }}>Check in at the reception desk to pick up your keytag and start training!</span>
          </div>
        </div>

        <button 
          onClick={() => setIsSubmitted(false)} 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '0.75rem', background: '#ffffff', color: '#000000', fontWeight: 700 }}
        >
          Submit Another Registration
        </button>
      </div>
    );

    if (isStandalone) {
      return (
        <div className="pub-form-container">
          {successContent}
        </div>
      );
    }
    return successContent;
  }

  const formContent = (
    <div className="pub-form-card glass-card">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <Smartphone size={36} style={{ color: '#ffffff', marginBottom: '0.75rem' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 800, letterSpacing: '0.02em', color: '#ffffff' }}>
          ASCEND FITNESS PORTAL
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Public Registration Portal
        </p>
      </div>

      <form onSubmit={handleSubmitRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

        {/* Section 1: Personal Details */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ color: '#ffffff', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>
            1. Personal & Contact Details
          </h4>
          <div className="pub-form-grid">
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
              {formErrors.full_name && <span style={{ fontSize: '0.7rem', color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>{formErrors.full_name}</span>}
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
              {formErrors.email && <span style={{ fontSize: '0.7rem', color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>{formErrors.email}</span>}
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
              {formErrors.phone && <span style={{ fontSize: '0.7rem', color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>{formErrors.phone}</span>}
            </div>
            <div className="pub-form-nested-grid">
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
                {formErrors.date_of_birth && <span style={{ fontSize: '0.7rem', color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>{formErrors.date_of_birth}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Health Profile */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ color: '#ffffff', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>
            2. Health Profile & Metrics
          </h4>
          
          <div className="pub-form-triple-grid">
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

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fitness Goals</label>
            <input 
              type="text" 
              placeholder="Cardio fitness, strength training, weight loss..."
              value={publicForm.fitness_goals}
              onChange={(e) => setPublicForm({...publicForm, fitness_goals: e.target.value})}
              className="glass-input"
              style={{ marginTop: '0.25rem' }}
            />
          </div>
        </div>

        {/* Section 3: Membership & Installment Options */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ color: '#ffffff', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>
            3. Membership & Installment Options
          </h4>

          <div className="pub-form-grid">
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Subscription Plan *</label>
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
              {formErrors.plan_id && <span style={{ fontSize: '0.7rem', color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>{formErrors.plan_id}</span>}
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payment Installment Plan *</label>
              <select 
                required
                value={publicForm.installment_plan}
                onChange={(e) => setPublicForm({...publicForm, installment_plan: e.target.value})}
                className="glass-select"
                style={{ marginTop: '0.25rem', width: '100%', padding: '0.625rem' }}
              >
                <option value="1 time">1 Time (Pay in full)</option>
                <option value="3 month installment plan">3 Month Installment Plan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Medical & Emergency Contact */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ color: '#ffffff', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', margin: 0 }}>
            4. Medical & Emergency Info
          </h4>

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

          <div className="pub-form-grid">
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
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', gap: '0.5rem', background: '#ffffff', color: '#000000', fontWeight: 750 }}>
          <Send size={16} /> Submit Registration
        </button>
      </form>
    </div>
  );

  if (isStandalone) {
    return (
      <div className="pub-form-container">
        {formContent}
      </div>
    );
  }

  return formContent;
};

export default PublicRegistrationForm;
