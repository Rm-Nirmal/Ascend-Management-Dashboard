import { useState, useEffect } from 'react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import Members from './components/Members';
import Trainers from './components/Trainers';
import Registrations from './components/Registrations';
import AccessConsole from './components/AccessConsole';
import SubscriptionConsole from './components/SubscriptionConsole';

import AIInsights from './components/AIInsights';
import AuditSettings from './components/AuditSettings';
import Login from './components/Login';
import AdminManagement from './components/AdminManagement';
import Employees from './components/Employees';
import Finance from './components/Finance';
import BreakTimer from './components/BreakTimer';
import { Bell, ShieldCheck, HelpCircle, Menu, Search, Sun, Moon } from 'lucide-react';
import PublicRegistrationForm from './components/PublicRegistrationForm';
import PublicReceipt from './components/PublicReceipt';
import PublicFinanceLog from './components/PublicFinanceLog';
import ToastContainer from './components/Toast';

// Inventory Management components
import InventoryDashboard from './components/Inventory/InventoryDashboard';
import InventoryProducts from './components/Inventory/InventoryProducts';
import InventoryCategories from './components/Inventory/InventoryCategories';
import InventoryStock from './components/Inventory/InventoryStock';
import InventorySuppliers from './components/Inventory/InventorySuppliers';
import InventoryReports from './components/Inventory/InventoryReports';
import InventorySell from './components/Inventory/InventorySell';

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

const RestrictedGymScreen = ({ status, message, hotline, setActiveTab }) => {
  const { logout } = useDashboard();
  const isFrozen = status === 'frozen';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '75vh',
      width: '100%',
      padding: '3rem 2rem',
      boxSizing: 'border-box',
      textAlign: 'center',
      gap: '1.5rem',
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: isFrozen ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: `1px solid ${isFrozen ? '#f59e0b' : '#ef4444'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isFrozen ? '#f59e0b' : '#ef4444',
        marginBottom: '1rem',
        boxShadow: `0 0 24px ${isFrozen ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
      }}>
        <HelpCircle size={40} />
      </div>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '2rem',
        fontWeight: 800,
        margin: 0,
        color: 'var(--text-main)',
      }}>
        {isFrozen ? 'Your Workspace is Frozen' : 'Your Workspace is Deactivated'}
      </h1>

      <p style={{
        maxWidth: '500px',
        color: 'var(--text-muted)',
        fontSize: '1.05rem',
        lineHeight: 1.6,
        margin: '0 auto',
      }}>
        {message || (isFrozen 
          ? 'This workspace has been temporarily frozen by Fitgencore administration due to billing reviews or account policies.' 
          : 'This workspace has been deactivated. Please contact Fitgencore client relationship desk to reactivate your console.')}
      </p>

      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.5rem 2rem',
        maxWidth: '480px',
        width: '100%',
        boxSizing: 'border-box',
        marginTop: '0.5rem',
      }}>
        <span style={{
          display: 'block',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          fontWeight: 700,
          letterSpacing: '0.05em',
          marginBottom: '0.5rem'
        }}>
          Fitgencore Client Support Hotline
        </span>
        <strong style={{
          fontSize: '1.15rem',
          color: 'var(--color-primary)',
          letterSpacing: '0.02em',
        }}>
          {hotline || '+94 11 234 5678 / desk@fitgencore.com'}
        </strong>
      </div>

      <div style={{
        display: 'flex',
        gap: '1rem',
        marginTop: '1.5rem',
        justifyContent: 'center',
        width: '100%',
      }}>
        <button
          onClick={() => setActiveTab('support_tickets')}
          className="btn btn-primary"
          style={{
            padding: '0.75rem 2rem',
            fontWeight: 700,
            borderRadius: '10px',
            fontSize: '0.9rem',
            background: 'linear-gradient(135deg, var(--color-primary), #3b82f6)',
            border: 'none',
            boxShadow: '0 4px 12px var(--color-primary-glow)',
            cursor: 'pointer'
          }}
        >
          Open Support Center
        </button>
        
        <button
          onClick={logout}
          className="btn btn-secondary"
          style={{
            padding: '0.75rem 2rem',
            fontWeight: 700,
            borderRadius: '10px',
            fontSize: '0.9rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

const DashboardContentShell = () => {
  const { 
    currentUser, 
    authReady, 
    dataLoaded, 
    toasts, 
    removeToast, 
    showToast, 
    gymSettings, 
    announcements,
    updateGymSettings,
    currentGym
  } = useDashboard();
  const isAllowedTab = (tab) => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;

    // Check if the feature has been disabled by the SaaS super administrator
    const disabledFeatures = gymSettings?.disabledFeatures || [];
    console.log("DEBUG - isAllowedTab:", tab, "gymSettings:", gymSettings, "disabledFeatures:", disabledFeatures, "currentUserRole:", currentUser?.role);
    let featureKey = tab;
    if (featureKey.startsWith('inventory')) featureKey = 'inventory';
    if (disabledFeatures.includes(featureKey)) return false;

    if (
      currentUser.role === 'gym_owner' || 
      currentUser.role === 'owner'
    ) {
      return [
        'overview', 'members', 'trainers', 'registrations', 'employees', 'access',
        'finance', 'ai', 'audit', 'admin_management', 'client_settings', 'support_tickets',
        'inventory_dashboard', 'inventory_products', 'inventory_sell', 'inventory_categories', 'inventory_stock', 'inventory_suppliers', 'inventory_reports'
      ].includes(tab);
    }
    if (currentUser.role === 'admin') {
      return [
        'overview', 'members', 'trainers', 'registrations', 'employees', 'access',
        'finance', 'ai', 'audit', 'admin_management', 'client_settings', 'support_tickets',
        'inventory_dashboard', 'inventory_products', 'inventory_sell', 'inventory_categories', 'inventory_stock', 'inventory_suppliers'
      ].includes(tab);
    }
    if (currentUser.role === 'standard_admin' || currentUser.role === 'gym_assistant') {
      return [
        'members', 'trainers', 'registrations', 'access',
        'inventory_products', 'inventory_sell', 'inventory_categories', 'inventory_stock',
        'break_timer', 'finance'
      ].includes(tab) || tab.startsWith('log_income') || tab.startsWith('log_expense');
    }
    return ['members', 'trainers', 'registrations', 'access', 'break_timer', 'finance'].includes(tab) || tab.startsWith('log_income') || tab.startsWith('log_expense');
  };

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam && isAllowedTab(viewParam)) return viewParam;
    return 'overview';
  });

  useEffect(() => {
    const isPublicView = 
      window.location.search.includes('view=register') || window.location.hash === '#register' ||
      window.location.search.includes('view=receipt') || window.location.hash.startsWith('#receipt') ||
      window.location.search.includes('view=income_log') || window.location.search.includes('view=expenses_log') ||
      window.location.hash.startsWith('#income_log') || window.location.hash.startsWith('#expenses_log');

    if (isPublicView) return;

    const url = new URL(window.location.href);
    const viewParam = url.searchParams.get('view');
    if (viewParam !== activeTab) {
      url.searchParams.set('view', activeTab);
      if (activeTab !== 'finance') {
        url.searchParams.delete('tab');
      }
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view') || 'overview';
      if (isAllowedTab(viewParam)) {
        setActiveTab(viewParam);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  // Sync tab from URL on initial load once currentUser is fetched asynchronously
  useEffect(() => {
    if (currentUser) {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam && isAllowedTab(viewParam) && viewParam !== activeTab) {
        setActiveTab(viewParam);
      }
    }
  }, [currentUser]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Inject custom theme color & mode dynamically
  useEffect(() => {
    if (currentUser?.role === 'super_admin') return;

    const isDark = gymSettings?.darkMode !== false;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    let accentColor = gymSettings?.themeColor || '#ffffff';
    if (accentColor === '#3b82f6') {
      accentColor = '#ffffff';
    }
    if (!isDark && (accentColor === '#ffffff' || accentColor.toLowerCase() === '#fff')) {
      accentColor = '#000000';
    }

    document.documentElement.style.setProperty('--color-primary', accentColor);
    if (accentColor.startsWith('#')) {
      const r = parseInt(accentColor.slice(1, 3), 16);
      const g = parseInt(accentColor.slice(3, 5), 16);
      const b = parseInt(accentColor.slice(5, 7), 16);
      document.documentElement.style.setProperty('--color-primary-glow', `rgba(${r}, ${g}, ${b}, 0.15)`);
    } else {
      document.documentElement.style.setProperty('--color-primary-glow', `${accentColor}26`);
    }
  }, [gymSettings, currentUser]);

  // Check if we are simulating the standalone public registration form
  const isPublicRegister = window.location.hash === '#register' || window.location.search.includes('view=register');
  const isPublicReceipt = window.location.search.includes('view=receipt') || window.location.hash.startsWith('#receipt');
  const isPublicFinanceLog = window.location.search.includes('view=income_log') || window.location.search.includes('view=expenses_log') || window.location.hash.startsWith('#income_log') || window.location.hash.startsWith('#expenses_log');

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

  if (isPublicFinanceLog) {
    return (
      <>
        <PublicFinanceLog />
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


  const resolvedTab = isAllowedTab(activeTab) 
    ? activeTab 
    : (
        currentUser.role === 'gym_owner' || 
        currentUser.role === 'owner' || 
        currentUser.role === 'admin'
          ? 'overview' 
          : 'members'
      );

  const isGymRestricted = currentGym && (currentGym.status === 'frozen' || currentGym.status === 'suspended');

  const renderView = (tab) => {
    if (isGymRestricted && tab !== 'support_tickets') {
      return (
        <RestrictedGymScreen 
          status={currentGym.status}
          message={currentGym.status === 'frozen' ? currentGym.freezeMessage : currentGym.deactivateMessage}
          hotline={currentGym.fitgencoreHotline}
          setActiveTab={setActiveTab}
        />
      );
    }

    if (tab.startsWith('log_income') || tab.startsWith('log_expense') || tab === 'finance') {
      return <Finance activeTabOverride={tab} setActiveTab={setActiveTab} />;
    }
    switch (tab) {
      case 'overview':
        return <Overview />;
      case 'members':
        return <Members />;
      case 'trainers':
        return <Trainers />;
      case 'registrations':
        return <Registrations />;
      case 'employees':
        return <Employees />;
      case 'break_timer':
        return <BreakTimer />;
      case 'access':
        return <AccessConsole />;
      case 'console':
        return <SubscriptionConsole />;
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
      case 'inventory_dashboard':
        return <InventoryDashboard />;
      case 'inventory_products':
        return <InventoryProducts />;
      case 'inventory_categories':
        return <InventoryCategories />;
      case 'inventory_stock':
        return <InventoryStock />;
      case 'inventory_suppliers':
        return <InventorySuppliers />;
      case 'inventory_reports':
        return <InventoryReports />;
      case 'inventory_sell':
        return <InventorySell />;
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
              <span className="topbar-title">{gymSettings?.gymName || 'Fitgencore Headquarters'}</span>
            </div>
          </div>

          {/* User actions */}
          <div className="topbar-actions">
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
