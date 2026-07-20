import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import logoWhite from '../assets/logo_white.webp';
import logoBlack from '../assets/logo_black.webp';
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
  LifeBuoy,
  Package,
  ChevronDown,
  ChevronRight,
  Grid,
  Layers,
  RefreshCw,
  Truck,
  TrendingUp,
  ShoppingBag,
  Clock,
  UserCheck
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { currentUser, logout, gymSettings, supportTickets } = useDashboard();
  
  const hasUnreadSupport = supportTickets && supportTickets.some(ticket => {
    return ticket.status !== 'resolved' && ticket.readByClient === false;
  });

  const [inventoryExpanded, setInventoryExpanded] = useState(() => {
    return activeTab.startsWith('inventory_');
  });

  const disabledFeatures = gymSettings?.disabledFeatures || [];

  const allInventorySubItems = [
    { id: 'inventory_dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory_products', name: 'Products', icon: Layers },
    { id: 'inventory_sell', name: 'Sell Product', icon: ShoppingBag },
    { id: 'inventory_categories', name: 'Categories', icon: Grid },
    { id: 'inventory_stock', name: 'Stock Management', icon: RefreshCw },
    { id: 'inventory_suppliers', name: 'Suppliers', icon: Truck },
    { id: 'inventory_reports', name: 'Reports', icon: TrendingUp },
  ];

  const inventorySubItems = allInventorySubItems.filter(item => {
    if (!currentUser) return false;
    if (item.id === 'inventory_reports') {
      return currentUser.role === 'gym_owner' || currentUser.role === 'owner';
    }
    if (
      currentUser.role === 'gym_owner' || 
      currentUser.role === 'owner' || 
      currentUser.role === 'admin'
    ) return true;
    return ['inventory_products', 'inventory_sell', 'inventory_categories', 'inventory_stock'].includes(item.id);
  });

  const showInventory = currentUser && currentUser.role !== 'super_admin' && !disabledFeatures.includes('inventory');

  // All potential nav items
  const allNavItems = [
    { id: 'overview', name: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'members', name: 'Members Directory', icon: Users },
    { id: 'trainers', name: 'Personal Trainers', icon: UserCheck },
    { id: 'registrations', name: 'Registration Queue', icon: UserPlus },
    { id: 'employees', name: 'Employees Desk', icon: Briefcase },
    { id: 'access', name: 'Access Control', icon: QrCode },
    { id: 'break_timer', name: 'Shift & Break', icon: Clock },
    { id: 'console', name: 'Console', icon: CreditCard },
    { id: 'finance', name: 'Finance', icon: DollarSign },
    { id: 'log_income', name: 'Log Income', icon: DollarSign },
    { id: 'log_expense', name: 'Record Expense', icon: Briefcase },
    { id: 'ai', name: 'AI Insights', icon: Sparkles },
    { id: 'audit', name: 'System Audit Logs', icon: ClipboardList },
    { id: 'admin_management', name: 'Admin Console', icon: Shield },
    { id: 'client_settings', name: 'Client Settings', icon: Settings },
    { id: 'support_tickets', name: 'Support Center', icon: LifeBuoy }
  ];

  // Filter based on currentUser role
  const navItems = allNavItems.filter(item => {
    if (!currentUser) return false;

    // Check if the feature is explicitly disabled for the tenant
    if (disabledFeatures.includes(item.id)) return false;

    // Gym owners and Gym Admins can access everything except Console
    if (
      currentUser.role === 'gym_owner' || 
      currentUser.role === 'owner' || 
      currentUser.role === 'admin'
    ) {
      return item.id !== 'console' && item.id !== 'break_timer' && item.id !== 'log_income' && item.id !== 'log_expense';
    }
    
    // Regular gym staff (including standard_admin) can only access:
    return ['members', 'trainers', 'registrations', 'access', 'break_timer', 'finance'].includes(item.id);
  });

  const isDark = gymSettings?.darkMode !== false;
  const logoSrc = isDark ? logoWhite : logoBlack;

  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Brand Logo */}
        <div className="sidebar-logo" style={{ marginBottom: '2.5rem', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
            <img 
              src={logoSrc} 
              alt="Fitgencore Logo" 
              style={{ height: '22px', objectFit: 'contain', maxWidth: '85%', margin: '0 auto' }} 
            />
          </div>
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.35rem', fontWeight: 600 }}>powered by wickgen</span>
        </div>

        {/* Navigation links */}
        <nav className="sidebar-nav" style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: '4px' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const showDot = item.id === 'support_tickets' && hasUnreadSupport;
            return (
              <a 
                key={item.id} 
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                style={{ position: 'relative' }}
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

          {showInventory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.5rem' }}>
              <a 
                className={`nav-link ${activeTab.startsWith('inventory_') ? 'active' : ''}`}
                onClick={() => setInventoryExpanded(!inventoryExpanded)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <Package size={18} />
                  <span>Inventory</span>
                </div>
                {inventoryExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </a>
              
              {inventoryExpanded && (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.15rem', 
                  paddingLeft: '1rem', 
                  borderLeft: '1px solid var(--border-color)', 
                  marginLeft: '1.25rem', 
                  marginTop: '0.15rem',
                  animation: 'fadeIn 0.2s ease-out' 
                }}>
                  {inventorySubItems.map(subItem => {
                    const SubIcon = subItem.icon;
                    const isSubActive = activeTab === subItem.id;
                    return (
                      <a 
                        key={subItem.id}
                        className={`nav-link ${isSubActive ? 'active' : ''}`}
                        onClick={() => setActiveTab(subItem.id)}
                        style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', gap: '0.6rem' }}
                      >
                        <SubIcon size={14} />
                        <span>{subItem.name}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* Footer Profile with Logout Capability */}
      <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', flexShrink: 0, marginTop: '1rem' }}>
        <img 
          src={currentUser?.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
          alt={`${currentUser?.name || 'Admin'} Avatar`} 
          className="user-avatar"
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexGrow: 1, overflow: 'hidden' }}>
          <div className="user-info" style={{ overflow: 'hidden', paddingRight: '0.25rem' }}>
            <span className="user-name" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px', display: 'block' }}>
              {currentUser?.name || 'Administrator'}
            </span>
            <span className="user-role" style={{ fontSize: '0.7rem' }}>
              {currentUser?.role === 'super_admin'
                ? 'Super Admin' 
                : (currentUser?.role === 'gym_owner' || currentUser?.role === 'owner') 
                  ? 'Gym Owner' 
                  : currentUser?.role === 'admin' 
                    ? 'Gym Admin' 
                    : currentUser?.role === 'standard_admin' 
                      ? 'Standard Admin' 
                      : 'Gym Staff'}
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
