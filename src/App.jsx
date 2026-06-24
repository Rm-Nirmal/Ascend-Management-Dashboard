import { useState, useEffect } from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import Members from './components/Members';
import Registrations from './components/Registrations';
import AccessConsole from './components/AccessConsole';

import AIInsights from './components/AIInsights';
import AuditSettings from './components/AuditSettings';
import Login from './components/Login';
import AdminManagement from './components/AdminManagement';
import Employees from './components/Employees';
import Finance from './components/Finance';
import { Bell, ShieldCheck, HelpCircle } from 'lucide-react';
import PublicRegistrationForm from './components/PublicRegistrationForm';
import PublicReceipt from './components/PublicReceipt';
import ToastContainer from './components/Toast';

// FitGenCore SaaS Components
import SuperAdminDashboard from './components/SuperAdmin/SuperAdminDashboard';
import ClientSettings from './components/ClientSettings';
import ClientSupport from './components/ClientSupport';

/**
 * Full-screen loading spinner shown while Firebase Auth initializes.
 */
const AuthLoadingScreen = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    gap: '1.5rem',
    background: 'var(--bg-primary)',
  }}>
    {/* Pulsing logo */}
    <div style={{
      width: '64px',
      height: '64px',
      borderRadius: '16px',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'pulse 2s ease-in-out infinite',
    }}>
      <ShieldCheck size={32} style={{ color: 'var(--color-primary)' }} />
    </div>

    {/* Spinner + text */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <span style={{
        width: '18px',
        height: '18px',
        border: '2px solid rgba(255,255,255,0.15)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block',
      }} />
      <span style={{
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}>
        Connecting to Firebase...
      </span>
    </div>

    {/* Subtle branding */}
    <p style={{
      color: 'var(--text-dark)',
      fontSize: '0.7rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginTop: '1rem',
    }}>
      Ascend Management Console
    </p>

    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(0.95); }
      }
    `}</style>
  </div>
);

/**
 * Data loading overlay shown after auth is ready but Firestore data is still streaming.
 */
const DataLoadingOverlay = () => (
  <div style={{
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(10, 11, 15, 0.92)',
    backdropFilter: 'blur(8px)',
    gap: '1rem',
  }}>
    <span style={{
      width: '24px',
      height: '24px',
      border: '2.5px solid rgba(255,255,255,0.1)',
      borderTopColor: 'var(--color-primary)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      display: 'inline-block',
    }} />
    <span style={{
      color: 'var(--text-muted)',
      fontSize: '0.85rem',
      fontWeight: 600,
    }}>
      Loading dashboard data...
    </span>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const DashboardContentShell = () => {
  const { 
    currentUser, 
    authReady, 
    dataLoaded, 
    toasts, 
    removeToast, 
    showToast, 
    gymSettings, 
    announcements 
  } = useDashboard();
  const [activeTab, setActiveTab] = useState('overview');

  // Inject custom theme color dynamically
  useEffect(() => {
    if (gymSettings?.themeColor) {
      document.documentElement.style.setProperty('--color-primary', gymSettings.themeColor);
      let hex = gymSettings.themeColor;
      if (hex.startsWith('#')) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        document.documentElement.style.setProperty('--color-primary-glow', `rgba(${r}, ${g}, ${b}, 0.15)`);
      } else {
        document.documentElement.style.setProperty('--color-primary-glow', `${hex}26`);
      }
    } else {
      document.documentElement.style.setProperty('--color-primary', '#ffffff');
      document.documentElement.style.setProperty('--color-primary-glow', 'rgba(255, 255, 255, 0.15)');
    }
  }, [gymSettings]);

  // Check if we are simulating the standalone public registration form
  const isPublicRegister = window.location.hash === '#register' || window.location.search.includes('view=register');
  const isPublicReceipt = window.location.search.includes('view=receipt') || window.location.hash.startsWith('#receipt');

  if (isPublicRegister) {
    return (
      <>
        <PublicRegistrationForm isStandalone={true} />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  if (isPublicReceipt) {
    return (
      <>
        <PublicReceipt />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  // Phase 1: Wait for Firebase Auth to resolve
  if (!authReady) {
    return <AuthLoadingScreen />;
  }

  // Phase 2: If not authenticated, show Login
  if (!currentUser) {
    return <Login />;
  }

  // Super Admin Shell Bypass
  if (currentUser.role === 'super_admin') {
    return (
      <>
        <SuperAdminDashboard />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  // Security Gate: Redirect standard admin to members if they try to access disallowed tabs
  const isAllowedTab = (tab) => {
    if (currentUser.role === 'super_admin') {
      return true;
    }
    if (currentUser.role === 'gym_owner') {
      return [
        'overview', 'members', 'registrations', 'employees', 'access',
        'finance', 'ai', 'audit', 'admin_management', 'client_settings', 'support_tickets'
      ].includes(tab);
    }
    return ['members', 'registrations', 'access'].includes(tab);
  };

  const resolvedTab = isAllowedTab(activeTab) ? activeTab : 'members';

  const renderView = (tab) => {
    switch (tab) {
      case 'overview':
        return <Overview />;
      case 'members':
        return <Members />;
      case 'registrations':
        return <Registrations />;
      case 'employees':
        return <Employees />;
      case 'access':
        return <AccessConsole />;

      case 'finance':
        return <Finance />;
      case 'ai':
        return <AIInsights />;
      case 'audit':
        return <AuditSettings />;
      case 'admin_management':
        return <AdminManagement />;
      case 'client_settings':
        return <ClientSettings key={gymSettings?.id || 'settings'} />;
      case 'support_tickets':
        return <ClientSupport />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="app-container">
      {/* Dynamic Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Data loading overlay while Firestore streams initial data */}
      {!dataLoaded && <DataLoadingOverlay />}

      {/* Sidebar Navigation */}
      <Sidebar activeTab={resolvedTab} setActiveTab={setActiveTab} />

      {/* Main Workspace Frame */}
      <div className="main-content">
        {/* Topbar Header */}
        <header className="topbar">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
              <span className="topbar-title">{gymSettings?.gymName || 'Ascend Fitness Headquarters'}</span>
            </div>
          </div>

          {/* User actions */}
          <div className="topbar-actions">
            {/* Firebase status light */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(16, 185, 129, 0.05)', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.15)', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
              <ShieldCheck size={14} /> Firebase Live
            </div>

            {/* Notification bell */}
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.5rem', borderRadius: '50%', position: 'relative' }}
              onClick={() => showToast(`Logged in as ${currentUser.name} | Gym ID: ${currentUser.gymId || 'N/A'}`, 'info')}
            >
              <Bell size={16} />
              <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: 'var(--color-danger)', borderRadius: '50%' }} />
            </button>

            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.5rem', borderRadius: '50%' }}
              onClick={() => showToast(`Access: ${currentUser.role === 'gym_owner' ? 'Gym Owner' : 'Gym Staff'}`, 'info')}
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </header>

        {/* System Announcements Banner */}
        {announcements && announcements.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.02))',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '0.75rem 1.25rem',
            margin: '1rem 1.5rem 0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
              <span style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: 'rgb(248, 113, 113)',
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap'
              }}>
                System Announcement
              </span>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {announcements[0].title}:
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {announcements[0].content}
              </span>
            </div>
            <span style={{ color: 'var(--text-dark)', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
              Posted by {announcements[0].publishedBy || 'System'}
            </span>
          </div>
        )}

        {/* Dynamic page viewport */}
        {renderView(resolvedTab)}
      </div>
    </div>
  );
};

function App() {
  return (
    <DashboardProvider>
      <DashboardContentShell />
    </DashboardProvider>
  );
}

export default App;
