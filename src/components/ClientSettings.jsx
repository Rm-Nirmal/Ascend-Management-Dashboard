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
  Sun,
  Moon,
  Save,
  Loader2,
  Sliders,
  CreditCard
} from 'lucide-react';

const ClientSettings = () => {
  const { gymSettings, currentUser, updateGymSettings } = useDashboard();
  
  // States
  const [gymName, setGymName] = useState(gymSettings?.gymName || '');
  const [ownerName, setOwnerName] = useState(currentUser?.name || gymSettings?.ownerName || '');
  const [darkMode, setDarkMode] = useState(gymSettings?.darkMode !== false);
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
            { id: 'localization', name: 'Localization & Hours', icon: Clock },
            { id: 'appearance', name: 'Theme & Appearance', icon: Sliders },
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
                  borderBottom: isActive ? '2px solid #ffffff' : '2px solid transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Website Domain URL</label>
                <div style={{ position: 'relative' }}>
                  <Globe size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                  <input 
                    type="text" 
                    className="glass-input" 
                    style={{ paddingLeft: '2.5rem' }} 
                    placeholder="https://yourgym.com"
                    value={website} 
                    onChange={e => setWebsite(e.target.value)} 
                  />
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

          {/* TAB 2: LOCALIZATION & HOURS */}
          {activeTab === 'localization' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Operating Hours</label>
                  <div style={{ position: 'relative' }}>
                    <Clock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                    <input 
                      type="text" 
                      className="glass-input" 
                      style={{ paddingLeft: '2.5rem' }} 
                      value={openingHours} 
                      onChange={e => setOpeningHours(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Display Currency</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                    <input 
                      type="text" 
                      className="glass-input" 
                      style={{ paddingLeft: '2.5rem' }} 
                      value={currency} 
                      onChange={e => setCurrency(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Display Timezone</label>
                  <div style={{ position: 'relative' }}>
                    <Clock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                    <select 
                      className="glass-select" 
                      style={{ paddingLeft: '2.5rem' }}
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                    >
                      <option value="Asia/Colombo">Asia/Colombo</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Console Language</label>
                  <div style={{ position: 'relative' }}>
                    <Globe size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                    <select 
                      className="glass-select" 
                      style={{ paddingLeft: '2.5rem' }}
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                    >
                      <option value="en">English (US)</option>
                      <option value="es">Español (ES)</option>
                      <option value="fr">Français (FR)</option>
                      <option value="de">Deutsch (DE)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: THEME & APPEARANCE */}
          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ 
                background: 'rgba(255,255,255,0.01)', 
                border: '1px solid rgba(255,255,255,0.03)', 
                borderRadius: '10px', 
                padding: '1.5rem' 
              }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sun size={16} /> Console Appearance Theme
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  {/* Light Mode Option */}
                  <button
                    type="button"
                    onClick={() => setDarkMode(false)}
                    style={{
                      background: !darkMode ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: !darkMode ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.75rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      outline: 'none'
                    }}
                  >
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: !darkMode ? '#000000' : 'rgba(255,255,255,0.05)',
                      color: !darkMode ? '#ffffff' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: !darkMode ? '0 0 15px rgba(255,255,255,0.1)' : 'none'
                    }}>
                      <Sun size={22} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#ffffff' }}>Light Mode</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: '1.3' }}>Clean white layout with dark text</div>
                    </div>
                    {!darkMode && (
                      <span style={{
                        fontSize: '0.6rem',
                        background: '#ffffff',
                        color: '#000000',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Active
                      </span>
                    )}
                  </button>

                  {/* Dark Mode Option */}
                  <button
                    type="button"
                    onClick={() => setDarkMode(true)}
                    style={{
                      background: darkMode ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: darkMode ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.75rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      outline: 'none'
                    }}
                  >
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: darkMode ? '#ffffff' : 'rgba(0,0,0,0.05)',
                      color: darkMode ? '#000000' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: darkMode ? '0 0 15px rgba(255,255,255,0.1)' : 'none'
                    }}>
                      <Moon size={22} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#ffffff' }}>Dark Mode</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: '1.3' }}>Premium dark slate layout with white text</div>
                    </div>
                    {darkMode && (
                      <span style={{
                        fontSize: '0.6rem',
                        background: '#ffffff',
                        color: '#000000',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Active
                      </span>
                    )}
                  </button>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ display: 'block', color: 'var(--text-dark)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Tenant Workspace ID</span>
                      <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem', display: 'block', marginTop: '0.25rem' }}>{currentUser?.gymId}</strong>
                    </div>
                    
                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
                      <span style={{ display: 'block', color: 'var(--text-dark)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Subscription Plan Tier</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{currentUser?.subscriptionPlan || 'Starter'}</strong>
                        <span style={{
                          fontSize: '0.6rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--border-color)',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          fontWeight: 700
                        }}>
                          ACTIVE
                        </span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ display: 'block', color: 'var(--text-dark)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Owner Account Uid</span>
                      <strong style={{ 
                        color: 'var(--text-main)', 
                        fontSize: '0.9rem', 
                        display: 'block', 
                        marginTop: '0.25rem',
                        textOverflow: 'ellipsis', 
                        overflow: 'hidden', 
                        whiteSpace: 'nowrap'
                      }} title={currentUser?.uid}>
                        {currentUser?.uid}
                      </strong>
                    </div>
                  </div>
                  
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    borderLeft: '3px solid var(--text-dark)',
                    marginTop: '0.5rem'
                  }}>
                    These parameters are bound to your SaaS license agreement and cannot be altered from the local preference desk. Contact support to request a tenant upgrade or billing update.
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
              background: `#ffffff`,
              color: '#000000',
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
