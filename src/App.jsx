import React, { useState } from 'react';
import { DashboardProvider } from './context/DashboardContext';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import Members from './components/Members';
import Registrations from './components/Registrations';
import AccessConsole from './components/AccessConsole';
import Payments from './components/Payments';
import AIInsights from './components/AIInsights';
import AuditSettings from './components/AuditSettings';
import { Bell, ShieldCheck, HelpCircle } from 'lucide-react';

const DashboardContentShell = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const renderView = () => {
    switch (activeTab) {
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
      default:
        return <Overview />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Workspace Frame */}
      <div className="main-content">
        {/* Topbar Header */}
        <header className="topbar">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              FitCore Tenant Console
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
              <span className="topbar-title">Ascend Fitness Headquarters</span>
            </div>
          </div>

          {/* User actions */}
          <div className="topbar-actions">
            {/* Status light */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(16, 185, 129, 0.05)', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.15)', fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
              <ShieldCheck size={14} /> SaaS Connected
            </div>

            {/* Simulated notification alert dot */}
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.5rem', borderRadius: '50%', position: 'relative' }}
              onClick={() => alert('All system services are operational. No new alerts.')}
            >
              <Bell size={16} />
              <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: 'var(--color-danger)', borderRadius: '50%' }} />
            </button>

            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.5rem', borderRadius: '50%' }}
              onClick={() => alert('Support documentation is loaded from FitCore AI PRD.')}
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </header>

        {/* Dynamic page viewport */}
        {renderView()}
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
