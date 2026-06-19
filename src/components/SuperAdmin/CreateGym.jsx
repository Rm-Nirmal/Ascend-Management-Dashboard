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
  Loader2
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Gym Onboarded Successfully!</h3>
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
                // Return to form or another tab
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
    <div style={{ padding: '2rem', maxWidth: '750px', margin: '0 auto' }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '12px',
        padding: '2rem'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.5rem 0', color: 'var(--text-primary)' }}>
          Onboard Client Gym Workspace
        </h3>

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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Gym & Owner Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gym Name *</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }} 
                  placeholder="e.g. Iron Forge Gym"
                  value={gymName} 
                  onChange={e => setGymName(e.target.value)} 
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Owner Full Name *</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }} 
                  placeholder="e.g. Robert Smith"
                  value={ownerName} 
                  onChange={e => setOwnerName(e.target.value)} 
                  required
                />
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Owner Email *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="email" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }} 
                  placeholder="e.g. robert@gymowner.com"
                  value={ownerEmail} 
                  onChange={e => setOwnerEmail(e.target.value)} 
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Contact Phone *</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }} 
                  placeholder="e.g. +94 77 123 4567"
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  required
                />
              </div>
            </div>
          </div>

          {/* Physical Address */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Physical Address *</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={16} style={{ position: 'absolute', left: '0.75rem', top: '12px', color: 'var(--text-dark)' }} />
              <textarea 
                className="form-control" 
                style={{ paddingLeft: '2.5rem', minHeight: '60px' }} 
                placeholder="Street address, city, region"
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                required
              />
            </div>
          </div>

          {/* Subscription details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>SaaS Subscription Plan</label>
              <div style={{ position: 'relative' }}>
                <CreditCard size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <select 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', appearance: 'none' }}
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
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Country Location</label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }} 
                  value={country} 
                  onChange={e => setCountry(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Currency code</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }} 
                  value={currency} 
                  onChange={e => setCurrency(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Workspace Timezone</label>
              <div style={{ position: 'relative' }}>
                <Clock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <select 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', appearance: 'none' }}
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                >
                  <option value="Asia/Colombo">Asia/Colombo (Sri Lanka)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC (GMT)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="Europe/London">Europe/London (BST)</option>
                </select>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isSubmitting}
            style={{ 
              marginTop: '1rem', 
              justifyContent: 'center', 
              background: 'linear-gradient(135deg, #a855f7, #3b82f6)', 
              borderColor: 'transparent',
              padding: '0.85rem'
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
      </div>
    </div>
  );
};

export default CreateGym;
