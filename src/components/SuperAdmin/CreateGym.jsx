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
  const { onboardNewGym } = useDashboard();
  
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

  // Live calculation values
  const subPrices = { Trial: 0, Starter: 6000, Professional: 12000, Enterprise: 30000 };
  const subMembers = { Trial: 20, Starter: 100, Professional: 500, Enterprise: 99999 };
  const subStaff = { Trial: 2, Starter: 3, Professional: 10, Enterprise: 99999 };

  const getPriceBreakdown = () => {
    const base = subPrices[subscriptionPlan] || 0;
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
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.05)',
          borderRadius: '12px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          <CheckCircle size={48} style={{ color: 'var(--color-success)' }} />
          
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Gym Workspace Onboarded!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Copy the credentials below and provide them to the client.
            </p>
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {/* Gym ID */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Gym ID</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{credentials.gymId}</span>
              </div>
              <button 
                onClick={() => handleCopy(credentials.gymId, 'gymId')}
                className="btn btn-secondary" 
                style={{ padding: '0.4rem' }}
              >
                {copiedField === 'gymId' ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
              </button>
            </div>

            {/* Email */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Owner Username/Email</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{credentials.ownerEmail}</span>
              </div>
              <button 
                onClick={() => handleCopy(credentials.ownerEmail, 'ownerEmail')}
                className="btn btn-secondary" 
                style={{ padding: '0.4rem' }}
              >
                {copiedField === 'ownerEmail' ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
              </button>
            </div>

            {/* Password */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Temporary Password</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f59e0b', fontFamily: 'monospace' }}>{credentials.tempPassword}</span>
              </div>
              <button 
                onClick={() => handleCopy(credentials.tempPassword, 'tempPassword')}
                className="btn btn-secondary" 
                style={{ padding: '0.4rem' }}
              >
                {copiedField === 'tempPassword' ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
              </button>
            </div>

            {/* URL */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ overflow: 'hidden', paddingRight: '1rem' }}>
                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Direct Dashboard URL</span>
                <span style={{ fontSize: '0.8rem', color: '#3b82f6', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>
                  {credentials.dashboardUrl}
                </span>
              </div>
              <button 
                onClick={() => handleCopy(credentials.dashboardUrl, 'dashboardUrl')}
                className="btn btn-secondary" 
                style={{ padding: '0.4rem' }}
              >
                {copiedField === 'dashboardUrl' ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => {
                setCredentials(null);
              }}
            >
              Onboard Another
            </button>
            <a 
              href={credentials.dashboardUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-primary" 
              style={{ flex: 1, textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #a855f7, #3b82f6)', border: 'none' }}
            >
              Test Login URL
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          Onboard Client Gym Workspace
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
          Provision isolated SaaS subdomains, assign owner profiles, and configure billing plans.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          color: 'var(--color-danger)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem'
        }}>
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main layout split: Form (left) + Calculator (right) */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left Side: Onboarding Fields Form */}
        <form onSubmit={handleSubmit} style={{ flex: '1 1 650px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card 1: Workspace Identity */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Workspace Identity
            </h5>
            
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>Gym Workspace Name *</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.3rem' }} 
                  placeholder="e.g. Iron Titan Gym"
                  value={gymName} 
                  onChange={e => setGymName(e.target.value)} 
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>Country Location</label>
                <div style={{ position: 'relative' }}>
                  <Globe size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ paddingLeft: '2.3rem' }} 
                    value={country} 
                    onChange={e => setCountry(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>Currency Code</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ paddingLeft: '2.3rem' }} 
                    value={currency} 
                    onChange={e => setCurrency(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>Timezone</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                  <select 
                    className="form-control" 
                    style={{ paddingLeft: '2.3rem', appearance: 'none' }}
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

          {/* Card 2: Owner Credentials */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              2. Workspace Owner Credentials
            </h5>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>Owner Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ paddingLeft: '2.3rem' }} 
                    placeholder="e.g. John Doe"
                    value={ownerName} 
                    onChange={e => setOwnerName(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>Owner Email Address *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                  <input 
                    type="email" 
                    className="form-control" 
                    style={{ paddingLeft: '2.3rem' }} 
                    placeholder="e.g. owner@irontitan.com"
                    value={ownerEmail} 
                    onChange={e => setOwnerEmail(e.target.value)} 
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>Contact Phone *</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.3rem' }} 
                  placeholder="e.g. +94 77 123 4567"
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>Physical Address *</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={15} style={{ position: 'absolute', left: '0.75rem', top: '12px', color: 'var(--text-dark)' }} />
                <textarea 
                  className="form-control" 
                  style={{ paddingLeft: '2.3rem', minHeight: '60px' }} 
                  placeholder="e.g. 200 Temple Road, Colombo 07, Sri Lanka"
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  required
                />
              </div>
            </div>
          </div>

          {/* Card 3: Subscription & Billing */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              3. Plan & Installment Selection
            </h5>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>Monthly Subscription Plan</label>
                <div style={{ position: 'relative' }}>
                  <CreditCard size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                  <select 
                    className="form-control" 
                    style={{ paddingLeft: '2.3rem', appearance: 'none' }}
                    value={subscriptionPlan}
                    onChange={e => setSubscriptionPlan(e.target.value)}
                  >
                    <option value="Trial">Free Trial Plan</option>
                    <option value="Starter">Starter Plan</option>
                    <option value="Professional">Professional Plan</option>
                    <option value="Enterprise">Enterprise Plan</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.75rem' }}>Installment / Billing Term</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                  <select 
                    className="form-control" 
                    style={{ paddingLeft: '2.3rem', appearance: 'none' }}
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
              marginTop: '0.5rem', 
              justifyContent: 'center', 
              background: 'linear-gradient(135deg, #a855f7, #3b82f6)', 
              borderColor: 'transparent',
              padding: '0.85rem',
              fontWeight: 700
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spin" /> Generating Workspace & Credentials...
              </>
            ) : (
              'Onboard Gym & Generate Credentials'
            )}
          </button>
        </form>

        {/* Right Side: Live Pricing & Quota Calculator */}
        <div style={{
          flex: '1 1 300px',
          background: 'rgba(168, 85, 247, 0.02)',
          border: '1px solid rgba(168, 85, 247, 0.15)',
          borderRadius: '12px',
          padding: '1.5rem',
          position: 'sticky',
          top: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={16} style={{ color: '#a855f7' }} /> Onboarding Billing Summary
            </h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Real-time quote calculation.</span>
          </div>

          {/* Plan Limits Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)', pb: '1rem', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyBetween: true, justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Selected Plan:</span>
              <strong style={{ textTransform: 'capitalize', color: '#a855f7' }}>{subscriptionPlan}</strong>
            </div>
            <div style={{ display: 'flex', justifyBetween: true, justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Workspace Limit:</span>
              <strong>{subMembers[subscriptionPlan] === 99999 ? 'Unlimited' : `${subMembers[subscriptionPlan]} Members`}</strong>
            </div>
            <div style={{ display: 'flex', justifyBetween: true, justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Staff Quota:</span>
              <strong>{subStaff[subscriptionPlan] === 99999 ? 'Unlimited' : `${subStaff[subscriptionPlan]} Staff`}</strong>
            </div>
          </div>

          {/* Pricing Math Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyBetween: true, justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Base Monthly Rate:</span>
              <span>{subPrices[subscriptionPlan]?.toLocaleString()} {currency}</span>
            </div>
            <div style={{ display: 'flex', justifyBetween: true, justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Billing Period:</span>
              <span style={{ fontWeight: 600 }}>{installmentPlan}</span>
            </div>
            <div style={{ display: 'flex', justifyBetween: true, justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dark)' }}>
              <span>Term Duration:</span>
              <span>{installmentPlan === '1 Time Payment' ? '365 Days' : (installmentPlan === '3 Month Installment Plan' ? '90 Days' : '30 Days')}</span>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: 0 }} />

          {/* DUE NOW CARD (NO TAX DISPLAYED OR INCLUDED) */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', justifyBetween: true, justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Subtotal Due:</span>
              <span>{breakdown.total.toLocaleString()} {currency}</span>
            </div>
            <div style={{ display: 'flex', justifyBetween: true, justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Discounts:</span>
              <span style={{ color: '#10b981' }}>- 0.00 {currency}</span>
            </div>
            
            <hr style={{ border: 'none', borderTop: '1px dashed rgba(255,255,255,0.08)', margin: '0.25rem 0' }} />
            
            <div style={{ display: 'flex', justifyBetween: true, justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Total Due Today:</span>
              <strong style={{ fontSize: '1.2rem', color: '#10b981' }}>
                {breakdown.total.toLocaleString()} {currency}
              </strong>
            </div>
          </div>

          {/* Trust badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', color: 'var(--text-dark)', marginTop: '0.25rem' }}>
            <Info size={12} />
            <span>Onboarding creates database instance & initial payment invoice.</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreateGym;
