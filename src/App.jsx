import { useState } from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import Members from './components/Members';
import Registrations from './components/Registrations';
import AccessConsole from './components/AccessConsole';
import Payments from './components/Payments';
import AIInsights from './components/AIInsights';
import AuditSettings from './components/AuditSettings';
import Login from './components/Login';
import AdminManagement from './components/AdminManagement';
import { Bell, ShieldCheck, HelpCircle, Loader2 } from 'lucide-react';
import PublicRegistrationForm from './components/PublicRegistrationForm';
import ToastContainer from './components/Toast';

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
  const { currentUser, authReady, dataLoaded, error, setError, toasts, removeToast, showToast } = useDashboard();
  const [activeTab, setActiveTab] = useState('overview');

  // Check if we are simulating the standalone public registration form
  const isPublicRegister = window.location.hash === '#register' || window.location.search.includes('view=register');

  if (isPublicRegister) {
    return (
      <>
        <PublicRegistrationForm isStandalone={true} />
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

  // Security Gate: Redirect standard admin to members if they try to access super admin tabs
  const isAllowedTab = (tab) => {
    if (currentUser.role === 'super_admin') return true;
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
      case 'access':
        return <AccessConsole />;
      case 'payments':
        return <Payments />;
      case 'ai':
        return <AIInsights />;
      case 'audit':
        return <AuditSettings />;
      case 'admin_management':
        return <AdminManagement />;
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
              <span className="topbar-title">Ascend Fitness Headquarters</span>
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
              onClick={() => showToast(`Logged in as ${currentUser.name} | Org: ${currentUser.organization_id || 'N/A'}`, 'info')}
            >
              <Bell size={16} />
              <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: 'var(--color-danger)', borderRadius: '50%' }} />
            </button>

            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.5rem', borderRadius: '50%' }}
              onClick={() => showToast(`Access: ${currentUser.role === 'super_admin' ? 'Super Administrator (All Access)' : 'Standard Administrator'}`, 'info')}
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </header>

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
