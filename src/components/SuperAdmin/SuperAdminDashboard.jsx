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

const SuperAdminDashboard = () => {
  const { currentUser, logout, showToast } = useDashboard();
  const [activeTab, setActiveTab] = useState('overview');
  const [darkMode] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // Nice purple color for SuperAdmin
    const purpleAccent = '#a855f7';
    document.documentElement.style.setProperty('--color-primary', purpleAccent);
    document.documentElement.style.setProperty('--color-primary-glow', `rgba(168, 85, 247, 0.15)`);
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
          <div className="sidebar-logo" style={{ marginBottom: '2.5rem' }}>
            <Dumbbell className="icon" style={{ color: '#a855f7' }} /> {/* Purple for SuperAdmin */}
            <span className="logo-text" style={{ background: 'linear-gradient(to right, #a855f7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>
              FITGENCORE
            </span>
          </div>

          {/* Navigation links */}
          <nav className="sidebar-nav">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <a 
                  key={item.id} 
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  style={isActive ? { borderLeftColor: '#a855f7', background: 'rgba(168, 85, 247, 0.05)', color: '#a855f7' } : {}}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
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
              <span className="user-role" style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 600 }}>
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
            {/* Live status light */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              background: 'rgba(168, 85, 247, 0.05)', 
              padding: '0.4rem 0.75rem', 
              borderRadius: '6px', 
              border: '1px solid rgba(168, 85, 247, 0.15)', 
              fontSize: '0.75rem', 
              color: '#a855f7', 
              fontWeight: 600 
            }}>
              <ShieldCheck size={14} /> System Online
            </div>



            <button 
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem' }}
              onClick={() => showToast(`Global Account ID: ${currentUser?.id || 'N/A'}`, 'info')}
            >
              ID Lookup
            </button>
          </div>
        </header>

        {/* Dynamic viewport */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {renderView()}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
