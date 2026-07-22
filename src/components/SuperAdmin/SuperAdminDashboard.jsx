import { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  LayoutDashboard, 
  Building2, 
  UserPlus, 
  CreditCard, 
  LifeBuoy, 
  Megaphone, 
  LogOut, 
  ShieldCheck, 
  Dumbbell,
  Sliders,
  ClipboardList,
  DollarSign,
  Cpu,
  Sun,
  Moon,
  Mail
} from 'lucide-react';

import SuperAdminOverview from './SuperAdminOverview';
import ClientsList from './ClientsList';
import CreateGym from './CreateGym';
import Subscriptions from './Subscriptions';
import SupportCenter from './SupportCenter';
import Announcements from './Announcements';
import SaaSSubscriptionConsole from './SaaSSubscriptionConsole';
import ClientAuditLogs from './ClientAuditLogs';
import SaaSFinance from './SaaSFinance';
import SecurityDevices from './SecurityDevices';
import NotificationTemplates from './NotificationTemplates';
import logoWhite from '../../assets/logo_white.webp';

const SuperAdminDashboard = () => {
  const { currentUser, logout, showToast, supportTickets } = useDashboard();
  const [activeTab, setActiveTab] = useState('overview');
  
  const hasUnreadSupport = supportTickets && supportTickets.some(ticket => {
    return ticket.status !== 'resolved' && ticket.readByAdmin === false;
  });
  const [darkMode] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // Monochromatic theme (black, grey, white)
    document.documentElement.style.setProperty('--color-primary', '#ffffff');
    document.documentElement.style.setProperty('--color-primary-glow', 'rgba(255, 255, 255, 0.08)');
  }, []);

  const navItems = [
    { id: 'overview', name: 'SaaS Overview', icon: LayoutDashboard },
    { id: 'clients', name: 'Clients Directory', icon: Building2 },
    { id: 'finance', name: 'SaaS Revenue', icon: DollarSign },
    { id: 'audit_logs', name: 'Client Audit Logs', icon: ClipboardList },
    { id: 'create_gym', name: 'Onboard Gym', icon: UserPlus },
    { id: 'devices', name: 'Security Devices', icon: Cpu },
    { id: 'subscriptions', name: 'Subscriptions', icon: CreditCard },
    { id: 'console', name: 'Plan Console', icon: Sliders },
    { id: 'support', name: 'Support Center', icon: LifeBuoy },
    { id: 'announcements', name: 'Announcements', icon: Megaphone },
    { id: 'notifications', name: 'Notification Templates', icon: Mail }
  ];

  const renderView = () => {
    switch (activeTab) {
      case 'overview':
        return <SuperAdminOverview setActiveTab={setActiveTab} />;
      case 'clients':
        return <ClientsList setActiveTab={setActiveTab} />;
      case 'finance':
        return <SaaSFinance />;
      case 'audit_logs':
        return <ClientAuditLogs />;
      case 'create_gym':
        return <CreateGym />;
      case 'devices':
        return <SecurityDevices />;
      case 'subscriptions':
        return <Subscriptions />;
      case 'console':
        return <SaaSSubscriptionConsole />;
      case 'support':
        return <SupportCenter />;
      case 'announcements':
        return <Announcements />;
      case 'notifications':
        return <NotificationTemplates />;
      default:
        return <SuperAdminOverview setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          {/* Brand Logo */}
          <div className="sidebar-logo" style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0 0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
              <img 
                src={logoWhite} 
                alt="Fitgencore Logo" 
                style={{ height: '22px', objectFit: 'contain', maxWidth: '85%', margin: '0 auto' }} 
              />
            </div>
            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.35rem', fontWeight: 600 }}>powered by wickgen</span>
          </div>

          {/* Navigation links */}
          <nav className="sidebar-nav">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const showDot = item.id === 'support' && hasUnreadSupport;
              return (
                <a 
                  key={item.id} 
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    position: 'relative',
                    ...(isActive ? { borderLeftColor: '#ffffff', background: 'rgba(255, 255, 255, 0.05)', color: '#ffffff' } : {})
                  }}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                  {showDot && (
                    <span style={{
                      position: 'absolute',
                      right: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      boxShadow: '0 0 8px #ef4444'
                    }} />
                  )}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Footer Profile with Logout Capability */}
        <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <img 
            src={currentUser?.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
            alt="Super Admin Avatar" 
            className="user-avatar"
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexGrow: 1, overflow: 'hidden' }}>
            <div className="user-info" style={{ overflow: 'hidden', paddingRight: '0.25rem' }}>
              <span className="user-name" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px', display: 'block' }}>
                {currentUser?.name || 'Super Admin'}
              </span>
              <span className="user-role" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Super Admin
              </span>
            </div>
            
            <button 
              onClick={logout} 
              title="Log Out Session"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.35rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                transition: 'var(--transition-fast)',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-danger)';
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'none';
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Topbar Header */}
        <header className="topbar">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
              <span className="topbar-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                SaaS Administrator Control Panel
              </span>
            </div>
          </div>

          {/* User actions */}
          <div className="topbar-actions">
          </div>
        </header>

        {/* Dynamic viewport */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {renderView()}
        </div>
      </div>
      <style>{`
        /* Monochromatic Dark Theme overrides for Super Admin Panel */
        
        /* 1. Override text & icon colors containing purple/blue hex/rgb */
        .app-container [style*="a855f7"],
        .app-container [style*="168, 85, 247"],
        .app-container [style*="168,85,247"],
        .app-container [style*="3b82f6"],
        .app-container [style*="59, 130, 246"],
        .app-container [style*="59,130,246"] {
          color: #ffffff !important;
        }

        /* Webkit text fill and clip gradient overrides (like audit logs title) */
        .app-container [style*="-webkit-text-fill-color"] {
          -webkit-text-fill-color: #ffffff !important;
          background: none !important;
        }

        /* Sidebar active border */
        .app-container [style*="borderLeftColor"],
        .app-container [style*="border-left-color"] {
          border-left-color: #ffffff !important;
        }

        /* Active tabs bottom line */
        .app-container [style*="borderBottom"],
        .app-container [style*="border-bottom"] {
          border-bottom-color: #ffffff !important;
        }

        /* Purple & Blue background opacities */
        .app-container [style*="background"][style*="rgba(168, 85, 247"],
        .app-container [style*="background"][style*="rgba(168,85,247"],
        .app-container [style*="background"][style*="rgba(59, 130, 246"],
        .app-container [style*="background"][style*="rgba(59,130,246"],
        .app-container [style*="background-color"][style*="rgba(168, 85, 247"],
        .app-container [style*="background-color"][style*="rgba(168,85,247"],
        .app-container [style*="background-color"][style*="rgba(59, 130, 246"],
        .app-container [style*="background-color"][style*="rgba(59,130,246"] {
          background-color: rgba(255, 255, 255, 0.05) !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }

        /* Purple/Blue border lines */
        .app-container [style*="border"][style*="rgba(168, 85, 247"],
        .app-container [style*="border"][style*="rgba(168,85,247"],
        .app-container [style*="border"][style*="rgba(59, 130, 246"],
        .app-container [style*="border"][style*="rgba(59,130,246"],
        .app-container [style*="border-color"][style*="rgba(168, 85, 247"],
        .app-container [style*="border-color"][style*="rgba(168,85,247"],
        .app-container [style*="border-color"][style*="rgba(59, 130, 246"],
        .app-container [style*="border-color"][style*="rgba(59,130,246"] {
          border-color: var(--border-color) !important;
        }

        /* 2. Overwrite buttons and headers using gradients */
        .app-container [style*="linear-gradient("] {
          background: #ffffff !important;
          color: #000000 !important;
          border-color: transparent !important;
          box-shadow: 0 4px 12px rgba(255, 255, 255, 0.05) !important;
        }
        
        .app-container [style*="linear-gradient("] * {
          color: #000000 !important;
        }

        .app-container [style*="linear-gradient("]:hover {
          background: #e5e7eb !important;
          box-shadow: 0 4px 16px rgba(255, 255, 255, 0.15) !important;
        }

        /* Progress bars quota */
        .app-container [style*="background"][style*="percentQuotaUsed"],
        .app-container [style*="background"][style*="#a855f7"],
        .app-container [style*="background"][style*="#3b82f6"],
        .app-container [style*="background"][style*="rgb(168, 85, 247)"],
        .app-container [style*="background"][style*="rgb(59, 130, 246)"] {
          background: #ffffff !important;
        }

        /* CheckCircle and success badges */
        .app-container svg[style*="color"][style*="168"],
        .app-container svg[style*="color"][style*="59"],
        .app-container svg[style*="color"][style*="#a855f7"],
        .app-container svg[style*="color"][style*="#3b82f6"] {
          color: #ffffff !important;
        }
      `}</style>
    </div>
  );
};

export default SuperAdminDashboard;
