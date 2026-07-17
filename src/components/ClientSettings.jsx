import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  Settings, 
  Building2, 
  User,
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  DollarSign, 
  Clock,
  Lock,
  Save,
  Loader2,
  CreditCard
} from 'lucide-react';

const ClientSettings = () => {
  const { gymSettings, currentUser, updateGymSettings } = useDashboard();
  
  // States
  const [gymName, setGymName] = useState(gymSettings?.gymName || '');
  const [ownerName, setOwnerName] = useState(currentUser?.name || gymSettings?.ownerName || '');
  const [darkMode, setDarkMode] = useState(true);
  const [phone, setPhone] = useState(gymSettings?.phone || '');
  const [email, setEmail] = useState(gymSettings?.email || '');
  const [address, setAddress] = useState(gymSettings?.address || '');
  const [website, setWebsite] = useState(gymSettings?.website || '');
  const [currency, setCurrency] = useState(gymSettings?.currency || 'LKR');
  const [timezone, setTimezone] = useState(gymSettings?.timezone || 'Asia/Colombo');
  const [openingHours, setOpeningHours] = useState(gymSettings?.openingHours || '06:00 AM - 10:00 PM');
  const [language, setLanguage] = useState(gymSettings?.language || 'en');
  
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'localization', 'appearance', 'subscription'

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    await updateGymSettings({
      gymName,
      ownerName,
      themeColor: darkMode ? '#ffffff' : '#000000',
      darkMode,
      phone,
      email,
      address,
      website,
      currency,
      timezone,
      openingHours,
      language
    });
    
    setIsSaving(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div className="glass-card" style={{ padding: '2rem' }}>
        
        {/* Header Title */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '0.02em' }}>
            <Settings size={24} style={{ color: 'var(--color-primary)' }} /> 
            CLIENT DESK PREFERENCES
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '0.35rem' }}>
            Manage your gym profile parameters, console appearance theme, and localization configurations.
          </p>
        </div>

        {/* Segmented Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '2rem',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}>
          {[
            { id: 'details', name: 'Gym Details', icon: Building2 },
            { id: 'subscription', name: 'Subscription & Limits', icon: CreditCard }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  background: isActive ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  outline: 'none'
                }}
              >
                <Icon size={16} style={{ color: isActive ? 'var(--color-primary)' : 'inherit' }} />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* TAB 1: GYM DETAILS */}
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Gym Name *</label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                    <input 
                      type="text" 
                      className="glass-input" 
                      style={{ paddingLeft: '2.5rem' }} 
                      value={gymName} 
                      onChange={e => setGymName(e.target.value)} 
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Owner Name *</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                    <input 
                      type="text" 
                      className="glass-input" 
                      style={{ paddingLeft: '2.5rem' }} 
                      value={ownerName} 
                      onChange={e => setOwnerName(e.target.value)} 
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Phone Contact *</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                    <input 
                      type="text" 
                      className="glass-input" 
                      style={{ paddingLeft: '2.5rem' }} 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Gym Contact Email *</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                    <input 
                      type="email" 
                      className="glass-input" 
                      style={{ paddingLeft: '2.5rem' }} 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      required
                    />
                  </div>
                </div>
              </div>



              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Location Address *</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '0.75rem', top: '12px', color: 'var(--text-dark)' }} />
                  <textarea 
                    className="glass-input" 
                    style={{ paddingLeft: '2.5rem', minHeight: '80px', resize: 'vertical' }} 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    required
                  />
                </div>
              </div>
            </div>
          )}





          {/* TAB 4: SUBSCRIPTION & LIMITS */}
          {activeTab === 'subscription' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ 
                background: 'rgba(255,255,255,0.01)', 
                border: '1px solid rgba(255,255,255,0.03)', 
                borderRadius: '10px', 
                padding: '1.5rem' 
              }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                  <Lock size={15} /> SaaS Billing & Quota Limits (Locked)
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
                      <span style={{ display: 'block', color: 'var(--text-dark)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Subscription Plan Tier</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <strong style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>{currentUser?.subscriptionPlan || 'Starter'}</strong>
                        <span style={{
                          fontSize: '0.65rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--border-color)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          ACTIVE
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Action Button */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isSaving}
            style={{ 
              marginTop: '1rem', 
              justifyContent: 'center', 
              borderColor: 'transparent',
              padding: '0.8rem',
              gap: '0.5rem',
              width: '100%',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {isSaving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            {isSaving ? 'Applying changes...' : 'Save Settings & Preferences'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClientSettings;
