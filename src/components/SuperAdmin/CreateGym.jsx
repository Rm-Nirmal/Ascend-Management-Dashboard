import { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  DollarSign, 
  Clock, 
  CreditCard,
  Copy,
  Check,
  ShieldAlert,
  CheckCircle,
  Loader2,
  HelpCircle,
  Sparkles,
  Info,
  Calendar
} from 'lucide-react';

const CreateGym = () => {
  const { onboardNewGym, saasPlans } = useDashboard();
  
  // States
  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState('Starter');
  const [installmentPlan, setInstallmentPlan] = useState('Monthly Subscription');
  const [country, setCountry] = useState('Sri Lanka');
  const [currency, setCurrency] = useState('LKR');
  const [timezone, setTimezone] = useState('Asia/Colombo');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState(null); // { gymId, ownerEmail, tempPassword, dashboardUrl }
  const [copiedField, setCopiedField] = useState(''); // track which field was copied

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Fallback to defaults if saasPlans is empty, otherwise map from database
  const plansToUse = saasPlans && saasPlans.length > 0 ? saasPlans : [
    { id: 'trial', name: 'Trial', price: 0, maxMembers: 20, maxStaff: 2 },
    { id: 'starter', name: 'Starter', price: 6000, maxMembers: 100, maxStaff: 3 },
    { id: 'professional', name: 'Professional', price: 12000, maxMembers: 500, maxStaff: 10 },
    { id: 'enterprise', name: 'Enterprise', price: 30000, maxMembers: 99999, maxStaff: 99999 }
  ];

  const getPriceBreakdown = () => {
    const selectedPlanObj = plansToUse.find(p => p.name.toLowerCase() === subscriptionPlan.toLowerCase()) || plansToUse[0];
    const base = selectedPlanObj.price || 0;
    if (installmentPlan === '1 Time Payment') {
      return {
        baseRate: base,
        multiplier: 10,
        label: 'Annual upfront (10 months rate)',
        total: base * 10
      };
    } else if (installmentPlan === '3 Month Installment Plan') {
      return {
        baseRate: base,
        multiplier: 3,
        label: '3 Months upfront contract',
        total: base * 3
      };
    } else {
      return {
        baseRate: base,
        multiplier: 1,
        label: 'Monthly subscription rate',
        total: base
      };
    }
  };

  const breakdown = getPriceBreakdown();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!gymName || !ownerName || !ownerEmail || !phone || !address) {
      setError('Please fill in all required fields.');
      return;
    }
    
    setIsSubmitting(true);
    setError('');

    try {
      const res = await onboardNewGym({
        gymName,
        ownerName,
        ownerEmail,
        phone,
        address,
        subscriptionPlan,
        installmentPlan,
        country,
        currency,
        timezone
      });

      if (res.success) {
        setCredentials({
          gymId: res.gymId,
          ownerEmail: res.ownerEmail,
          tempPassword: res.tempPassword,
          dashboardUrl: res.dashboardUrl
        });
        
        // Reset form
        setGymName('');
        setOwnerName('');
        setOwnerEmail('');
        setPhone('');
        setAddress('');
      } else {
        setError(res.message || 'Onboarding failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (credentials) {
    return (
      <div style={{ padding: '3rem 1.5rem', maxWidth: '650px', margin: '0 auto' }}>
        <div className="glass-card" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          padding: '2.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle top ambient light glow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '150px',
            height: '2px',
            background: 'linear-gradient(to right, transparent, #a855f7, transparent)',
            boxShadow: '0 0 20px 2px rgba(168, 85, 247, 0.4)'
          }} />

          <div style={{
            background: 'rgba(168, 85, 247, 0.05)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            borderRadius: '50%',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(168, 85, 247, 0.15)'
          }}>
            <CheckCircle size={36} style={{ color: '#a855f7' }} />
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              Gym Workspace Onboarded!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem', maxWidth: '400px' }}>
              The workspace has been successfully provisioned. Copy these temporary credentials for the owner.
            </p>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Gym ID */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.01)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '0.75rem 1rem', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              transition: 'var(--transition-fast)'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Gym Workspace ID</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'monospace' }}>{credentials.gymId}</span>
              </div>
              <button 
                onClick={() => handleCopy(credentials.gymId, 'gymId')}
                className="btn btn-secondary" 
                style={{ padding: '0.5rem', borderRadius: '6px' }}
                title="Copy Gym ID"
              >
                {copiedField === 'gymId' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
              </button>
            </div>

            {/* Email */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.01)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '0.75rem 1rem', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              transition: 'var(--transition-fast)'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Owner Email</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{credentials.ownerEmail}</span>
              </div>
              <button 
                onClick={() => handleCopy(credentials.ownerEmail, 'ownerEmail')}
                className="btn btn-secondary" 
                style={{ padding: '0.5rem', borderRadius: '6px' }}
                title="Copy Email"
              >
                {copiedField === 'ownerEmail' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
              </button>
            </div>

            {/* Password */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.01)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '0.75rem 1rem', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              transition: 'var(--transition-fast)'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Temporary Password</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>{credentials.tempPassword}</span>
              </div>
              <button 
                onClick={() => handleCopy(credentials.tempPassword, 'tempPassword')}
                className="btn btn-secondary" 
                style={{ padding: '0.5rem', borderRadius: '6px' }}
                title="Copy Password"
              >
                {copiedField === 'tempPassword' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
              </button>
            </div>

            {/* URL */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.01)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '0.75rem 1rem', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              transition: 'var(--transition-fast)'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div style={{ overflow: 'hidden', paddingRight: '1rem' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Direct Login URL</span>
                <span style={{ fontSize: '0.85rem', color: '#3b82f6', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block', fontWeight: 500 }}>
                  {credentials.dashboardUrl}
                </span>
              </div>
              <button 
                onClick={() => handleCopy(credentials.dashboardUrl, 'dashboardUrl')}
                className="btn btn-secondary" 
                style={{ padding: '0.5rem', borderRadius: '6px' }}
                title="Copy URL"
              >
                {copiedField === 'dashboardUrl' ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, justifyContent: 'center', height: '42px' }}
              onClick={() => setCredentials(null)}
            >
              Onboard Another
            </button>
            <a 
              href={credentials.dashboardUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-primary" 
              style={{ 
                flex: 1, 
                textDecoration: 'none', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                background: 'linear-gradient(135deg, #a855f7, #3b82f6)', 
                color: '#ffffff',
                border: 'none',
                height: '42px',
                boxShadow: '0 4px 12px rgba(168, 85, 247, 0.2)'
              }}
            >
              Test Login URL
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
          Onboard Client Gym Workspace
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Provision isolated SaaS subdomains, assign owner profiles, and configure billing plans.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          borderLeft: '4px solid #ef4444',
          color: '#f87171',
          borderRadius: '6px',
          padding: '0.85rem 1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.875rem'
        }}>
          <ShieldAlert size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Main layout split: Form (left) + Calculator (right) */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left Side: Onboarding Fields Form */}
        <form onSubmit={handleSubmit} style={{ flex: '1 1 650px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card 1: Workspace Identity */}
          <div className="glass-card" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            padding: '1.75rem'
          }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Workspace Profile
            </h5>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Gym Workspace Name *</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="glass-input" 
                  style={{ paddingLeft: '2.5rem' }} 
                  placeholder="e.g. Iron Titan Gym"
                  value={gymName} 
                  onChange={e => setGymName(e.target.value)} 
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Country Location</label>
                <div style={{ position: 'relative' }}>
                  <Globe size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="glass-input" 
                    style={{ paddingLeft: '2.5rem' }} 
                    value={country} 
                    onChange={e => setCountry(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Currency Code</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="glass-input" 
                    style={{ paddingLeft: '2.5rem' }} 
                    value={currency} 
                    onChange={e => setCurrency(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Timezone</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                  <select 
                    className="glass-select" 
                    style={{ width: '100%', paddingLeft: '2.5rem', height: '40px' }}
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                  >
                    <option value="Asia/Colombo">Asia/Colombo</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC (GMT)</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Workspace Owner Credentials */}
          <div className="glass-card" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            padding: '1.75rem'
          }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              2. Workspace Owner Credentials
            </h5>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Owner Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="glass-input" 
                    style={{ paddingLeft: '2.5rem' }} 
                    placeholder="e.g. John Doe"
                    value={ownerName} 
                    onChange={e => setOwnerName(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Owner Email Address *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="email" 
                    className="glass-input" 
                    style={{ paddingLeft: '2.5rem' }} 
                    placeholder="e.g. owner@irontitan.com"
                    value={ownerEmail} 
                    onChange={e => setOwnerEmail(e.target.value)} 
                    required
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Contact Phone *</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="glass-input" 
                  style={{ paddingLeft: '2.5rem' }} 
                  placeholder="e.g. +94 77 123 4567"
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Physical Address *</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: '0.85rem', top: '12px', color: 'var(--text-muted)' }} />
                <textarea 
                  className="glass-input" 
                  style={{ paddingLeft: '2.5rem', minHeight: '80px', resize: 'vertical' }} 
                  placeholder="e.g. 200 Temple Road, Colombo 07, Sri Lanka"
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  required
                />
              </div>
            </div>
          </div>

          {/* Card 3: Subscription & Billing */}
          <div className="glass-card" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            padding: '1.75rem'
          }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              3. Plan & Installment Selection
            </h5>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Monthly Subscription Plan</label>
                <div style={{ position: 'relative' }}>
                  <CreditCard size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                  <select 
                    className="glass-select" 
                    style={{ width: '100%', paddingLeft: '2.5rem', height: '40px' }}
                    value={subscriptionPlan}
                    onChange={e => setSubscriptionPlan(e.target.value)}
                  >
                    {plansToUse.map(p => (
                      <option key={p.id || p.name.toLowerCase()} value={p.name}>
                        {p.name} Plan
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Installment / Billing Term</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                  <select 
                    className="glass-select" 
                    style={{ width: '100%', paddingLeft: '2.5rem', height: '40px' }}
                    value={installmentPlan}
                    onChange={e => setInstallmentPlan(e.target.value)}
                  >
                    <option value="Monthly Subscription">Monthly Recurring</option>
                    <option value="3 Month Installment Plan">3 Month Installment Plan</option>
                    <option value="1 Time Payment">1 Time Payment (Annual)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isSubmitting}
            style={{ 
              marginTop: '0.75rem', 
              justifyContent: 'center', 
              background: 'linear-gradient(135deg, #a855f7, #3b82f6)', 
              color: '#ffffff',
              borderColor: 'transparent',
              padding: '0.9rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.25)',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(168, 85, 247, 0.35)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.25)'}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spin" style={{ marginRight: '0.5rem' }} /> Generating Workspace & Credentials...
              </>
            ) : (
              'Onboard Gym & Generate Credentials'
            )}
          </button>
        </form>

        {/* Right Side: Live Pricing & Quota Calculator */}
        <div className="glass-card" style={{
          flex: '1 1 350px',
          position: 'sticky',
          top: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(168, 85, 247, 0.05)',
          padding: '1.75rem',
          overflow: 'hidden'
        }}>
          {/* Accent line */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '3px',
            background: 'linear-gradient(to right, #a855f7, #3b82f6)'
          }} />

          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
              <Sparkles size={16} style={{ color: '#a855f7' }} /> Onboarding Summary
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time quote & workspace limits.</span>
          </div>

          {/* Plan Limits Info */}
          {(() => {
            const selectedPlanObj = plansToUse.find(p => p.name.toLowerCase() === subscriptionPlan.toLowerCase()) || plansToUse[0];
            return (
              <>
                {/* Workspace Tier Badge */}
                <div style={{
                  background: 'rgba(168, 85, 247, 0.05)',
                  border: '1px solid rgba(168, 85, 247, 0.1)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Plan Tier</span>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 700, 
                    color: '#a855f7', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em',
                    background: 'rgba(168, 85, 247, 0.1)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px'
                  }}>
                    {subscriptionPlan}
                  </span>
                </div>

                {/* Quota details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.25rem 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <User size={14} style={{ color: 'var(--text-dark)' }} /> Member Limit
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {selectedPlanObj.maxMembers === 99999 ? (
                        <span style={{ color: '#10b981', fontWeight: 700 }}>Unlimited</span>
                      ) : (
                        `${selectedPlanObj.maxMembers.toLocaleString()} Members`
                      )}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Building2 size={14} style={{ color: 'var(--text-dark)' }} /> Staff Quota
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {selectedPlanObj.maxStaff === 99999 ? (
                        <span style={{ color: '#10b981', fontWeight: 700 }}>Unlimited</span>
                      ) : (
                        `${selectedPlanObj.maxStaff} Staff`
                      )}
                    </span>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

                {/* Pricing Math Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Base Monthly Rate:</span>
                    <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                      {selectedPlanObj.price === 0 ? 'Free' : `${selectedPlanObj.price?.toLocaleString()} ${currency}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Billing Cycle:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {installmentPlan === '1 Time Payment' ? 'Annual (Prepaid)' : (installmentPlan === '3 Month Installment Plan' ? '3-Month Contract' : 'Monthly Recurring')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-dark)' }}>Contract Period:</span>
                    <span style={{ color: 'var(--text-dark)', fontWeight: 500 }}>
                      {installmentPlan === '1 Time Payment' ? '365 Days' : (installmentPlan === '3 Month Installment Plan' ? '90 Days' : '30 Days')}
                    </span>
                  </div>
                </div>
              </>
            );
          })()}

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

          {/* DUE NOW CARD (NO TAX DISPLAYED OR INCLUDED) */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Subtotal:</span>
              <span style={{ color: 'var(--text-main)' }}>{breakdown.total.toLocaleString()} {currency}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Registration Discounts:</span>
              <span style={{ color: '#10b981', fontWeight: 500 }}>- 0.00 {currency}</span>
            </div>
            
            <hr style={{ border: 'none', borderTop: '1px dashed var(--border-color)', margin: '0.25rem 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>Total Due Today:</span>
              <strong style={{ fontSize: '1.25rem', color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>
                {breakdown.total.toLocaleString()} {currency}
              </strong>
            </div>
          </div>

          {/* Trust badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
            <Info size={14} style={{ color: '#a855f7', flexShrink: 0, marginTop: '1px' }} />
            <span>Onboarding will instantly provision a dedicated database partition and generate the client's initial billing invoice.</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreateGym;
