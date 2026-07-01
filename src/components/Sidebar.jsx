import { useDashboard } from '../context/DashboardContext';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  QrCode, 
  CreditCard,
  Sparkles, 
  ClipboardList,
  Shield,
  LogOut,
  Briefcase,
  Dumbbell,
  DollarSign,
  Settings,
  LifeBuoy
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { currentUser, logout } = useDashboard();

  // All potential nav items
  const allNavItems = [
    { id: 'overview', name: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'members', name: 'Members Directory', icon: Users },
    { id: 'registrations', name: 'Registration Queue', icon: UserPlus },
    { id: 'employees', name: 'Employees Desk', icon: Briefcase },
    { id: 'access', name: 'Access Control', icon: QrCode },
    { id: 'console', name: 'Console', icon: CreditCard },
    { id: 'finance', name: 'Finance', icon: DollarSign },
    { id: 'ai', name: 'AI Insights', icon: Sparkles },
    { id: 'audit', name: 'System Audit Logs', icon: ClipboardList },
    { id: 'admin_management', name: 'Admin Console', icon: Shield },
    { id: 'client_settings', name: 'Client Settings', icon: Settings },
    { id: 'support_tickets', name: 'Support Center', icon: LifeBuoy }
  ];

  // Filter based on currentUser role
  const navItems = allNavItems.filter(item => {
    if (!currentUser) return false;

    // Regular gym staff can only access members, registrations, access
    if (currentUser.role !== 'gym_owner' && currentUser.role !== 'super_admin') {
      return ['members', 'registrations', 'access'].includes(item.id);
    }
    
    // Gym owners can access everything except Console
    if (currentUser.role === 'gym_owner') {
      return item.id !== 'console';
    }
    
    return true;
  });

  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Brand Logo */}
        <div className="sidebar-logo" style={{ marginBottom: '2.5rem', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Dumbbell className="icon" style={{ color: 'var(--color-primary)' }} />
            <span className="logo-text" style={{ textTransform: 'uppercase' }}>fitgencore</span>
          </div>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', paddingLeft: '2.25rem', marginTop: '-0.3rem' }}>powered by wickgen</span>
        </div>

        {/* Navigation links */}
        <nav className="sidebar-nav" style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: '4px' }}>
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

      {/* Footer Profile with Logout Capability */}
      <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', flexShrink: 0, marginTop: '1rem' }}>
        <img 
          src={currentUser?.photo_url || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"} 
          alt={`${currentUser?.name || 'Admin'} Avatar`} 
          className="user-avatar"
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexGrow: 1, overflow: 'hidden' }}>
          <div className="user-info" style={{ overflow: 'hidden', paddingRight: '0.25rem' }}>
            <span className="user-name" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px', display: 'block' }}>
              {currentUser?.name || 'Administrator'}
            </span>
            <span className="user-role" style={{ fontSize: '0.7rem' }}>
              {currentUser?.role === 'super_admin' ? 'Super Admin' : currentUser?.role === 'gym_owner' ? 'Gym Owner' : 'Gym Staff'}
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
  );
};

export default Sidebar;
