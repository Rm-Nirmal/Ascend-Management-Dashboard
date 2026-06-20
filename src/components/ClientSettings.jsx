import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  Settings, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  DollarSign, 
  Clock,
  Lock,
  Palette,
  Eye,
  Check,
  Save,
  Loader2
} from 'lucide-react';

const ClientSettings = () => {
  const { gymSettings, currentUser, updateGymSettings } = useDashboard();
  
  // States
  const [gymName, setGymName] = useState(gymSettings?.gymName || '');
  const [themeColor, setThemeColor] = useState(gymSettings?.themeColor || '#3b82f6');
  const [phone, setPhone] = useState(gymSettings?.phone || '');
  const [email, setEmail] = useState(gymSettings?.email || '');
  const [address, setAddress] = useState(gymSettings?.address || '');
  const [website, setWebsite] = useState(gymSettings?.website || '');
  const [currency, setCurrency] = useState(gymSettings?.currency || 'LKR');
  const [timezone, setTimezone] = useState(gymSettings?.timezone || 'Asia/Colombo');
  const [openingHours, setOpeningHours] = useState(gymSettings?.openingHours || '06:00 AM - 10:00 PM');
  const [language, setLanguage] = useState(gymSettings?.language || 'en');
  
  const [isSaving, setIsSaving] = useState(false);

  const presetColors = [
    { name: 'Royal Blue', hex: '#3b82f6' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Sunset', hex: '#f97316' },
    { name: 'Crimson', hex: '#f43f5e' },
    { name: 'Amethyst', hex: '#8b5cf6' },
    { name: 'Steel', hex: '#64748b' }
  ];

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    await updateGymSettings({
      gymName,
      themeColor,
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
    <div style={{ padding: '2rem', maxWidth: '850px', margin: '0 auto' }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '12px',
        padding: '2rem'
      }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={20} /> Gym Console Preferences & Layout
        </h3>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* THEME SELECTION & PREVIEW */}
          <div style={{ 
            background: 'rgba(255,255,255,0.01)', 
            border: '1px solid rgba(255,255,255,0.03)', 
            borderRadius: '10px', 
            padding: '1.25rem' 
          }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Palette size={16} /> Console Appearance Theme
            </h4>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {presetColors.map(color => {
                const isSelected = themeColor === color.hex;
                return (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setThemeColor(color.hex)}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: isSelected ? `2px solid ${color.hex}` : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: color.hex, display: 'inline-block' }} />
                    {color.name}
                    {isSelected && <Check size={12} style={{ color: color.hex }} />}
                  </button>
                );
              })}

              {/* Custom Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Custom:</span>
                <input 
                  type="color" 
                  value={themeColor} 
                  onChange={e => setThemeColor(e.target.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    padding: 0
                  }}
                />
              </div>
            </div>

            {/* Live Preview Bar */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              padding: '0.75rem 1rem', 
              background: 'rgba(255,255,255,0.02)', 
              borderRadius: '8px',
              borderLeft: `4px solid ${themeColor}`
            }}>
              <Eye size={16} style={{ color: themeColor }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Visual Preview: Active elements and buttons will adapt to <strong style={{ color: themeColor }}>{themeColor}</strong> accent color.
              </span>
            </div>
          </div>

          {/* BASIC INFORMATION */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Gym Name *</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }} 
                  value={gymName} 
                  onChange={e => setGymName(e.target.value)} 
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Contact *</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }} 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  required
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Gym Contact Email *</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="email" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }} 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Website Domain URL</label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }} 
                  placeholder="https://yourgym.com"
                  value={website} 
                  onChange={e => setWebsite(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location Address *</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={16} style={{ position: 'absolute', left: '0.75rem', top: '12px', color: 'var(--text-dark)' }} />
              <textarea 
                className="form-control" 
                style={{ paddingLeft: '2.5rem', minHeight: '60px' }} 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                required
              />
            </div>
          </div>

          {/* LOCALIZATION & TIMES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Operating Hours</label>
              <div style={{ position: 'relative' }}>
                <Clock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }} 
                  value={openingHours} 
                  onChange={e => setOpeningHours(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Display Currency</label>
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

            <div className="form-group">
              <label className="form-label">Display Timezone</label>
              <div style={{ position: 'relative' }}>
                <Clock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <select 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', appearance: 'none' }}
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
              <label className="form-label">Console Language</label>
              <div style={{ position: 'relative' }}>
                <Globe size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <select 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem', appearance: 'none' }}
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

          {/* SYSTEM INFO (READ-ONLY) */}
          <div style={{ 
            background: 'rgba(255,255,255,0.005)', 
            border: '1px solid rgba(255,255,255,0.02)', 
            borderRadius: '10px', 
            padding: '1.25rem' 
          }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
              <Lock size={15} /> SaaS Billing & Quota Limits (Locked)
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', fontSize: '0.8rem' }}>
              <div>
                <span style={{ display: 'block', color: 'var(--text-dark)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Tenant Workspace ID</span>
                <strong style={{ color: 'var(--text-muted)' }}>{currentUser?.gymId}</strong>
              </div>
              <div>
                <span style={{ display: 'block', color: 'var(--text-dark)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Subscription Plan Tier</span>
                <strong style={{ color: 'var(--text-muted)' }}>{currentUser?.subscriptionPlan || 'Starter'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', color: 'var(--text-dark)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Owner Account Uid</span>
                <strong style={{ color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', display: 'block', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                  {currentUser?.uid}
                </strong>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isSaving}
            style={{ 
              marginTop: '1rem', 
              justifyContent: 'center', 
              background: `linear-gradient(135deg, ${themeColor}, rgba(255,255,255,0.15))`,
              borderColor: 'transparent',
              padding: '0.8rem',
              gap: '0.5rem'
            }}
          >
            {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            {isSaving ? 'Saving preferences...' : 'Apply Theme & Settings'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClientSettings;
