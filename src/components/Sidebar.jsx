import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  QrCode, 
  CreditCard, 
  Sparkles, 
  ClipboardList
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'overview', name: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'members', name: 'Members Directory', icon: Users },
    { id: 'registrations', name: 'Registration Queue', icon: UserPlus },
    { id: 'access', name: 'Access Console', icon: QrCode },
    { id: 'payments', name: 'Invoices & Payments', icon: CreditCard },
    { id: 'ai', name: 'AI Insights', icon: Sparkles },
    { id: 'audit', name: 'System Audit Logs', icon: ClipboardList }
  ];

  return (
    <aside className="sidebar">
      <div>
        {/* Brand Logo */}
        <div className="sidebar-logo" style={{ marginBottom: '2.5rem' }}>
          <Sparkles className="icon" style={{ color: 'var(--color-primary)' }} />
          <span className="logo-text">ASCEND FIT</span>
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
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </a>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile (Persona: Org Owner / Org Admin) */}
      <div className="sidebar-footer">
        <img 
          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
          alt="Sarah Jenkins Avatar" 
          className="user-avatar"
        />
        <div className="user-info">
          <span className="user-name">Sarah Jenkins</span>
          <span className="user-role">Org Administrator</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
