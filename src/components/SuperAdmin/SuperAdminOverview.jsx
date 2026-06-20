import { useDashboard } from '../../context/DashboardContext';
import { 
  Building2, 
  Users, 
  DollarSign, 
  Activity, 
  AlertTriangle,
  Clock,
  TrendingUp,
  UserPlus
} from 'lucide-react';

const SuperAdminOverview = ({ setActiveTab }) => {
  const { gyms, subscriptions, members, getGymHealthScore } = useDashboard();

  // 1. Calculations
  const totalGyms = gyms.length;
  const activeGymsCount = gyms.filter(g => g.status === 'active').length;
  const trialGymsCount = gyms.filter(g => g.status === 'trial').length;
  const suspendedGymsCount = gyms.filter(g => g.status === 'suspended').length;
  
  // Calculate MRR from active subscriptions
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const mrr = activeSubs.reduce((sum, sub) => sum + (sub.price || 0), 0);
  const currency = activeSubs[0]?.currency || 'LKR';

  // Total members across all tenants
  const totalMembers = members.length;

  // Find most active gym (by member count)
  const memberCountsByGym = {};
  members.forEach(m => {
    if (m.gymId) {
      memberCountsByGym[m.gymId] = (memberCountsByGym[m.gymId] || 0) + 1;
    }
  });

  let mostActiveGymId = '';
  let maxMembersCount = 0;
  Object.entries(memberCountsByGym).forEach(([gymId, count]) => {
    if (count > maxMembersCount) {
      maxMembersCount = count;
      mostActiveGymId = gymId;
    }
  });

  const mostActiveGymObj = gyms.find(g => g.gymId === mostActiveGymId);
  const mostActiveGymName = mostActiveGymObj ? mostActiveGymObj.gymName : 'None';

  // Plan Distribution
  const planDistribution = { Starter: 0, Professional: 0, Enterprise: 0, Trial: 0 };
  gyms.forEach(g => {
    const plan = g.subscriptionPlan || 'Starter';
    planDistribution[plan] = (planDistribution[plan] || 0) + 1;
  });

  return (
    <div className="overview-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(59, 130, 246, 0.05))',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            System Dashboard Overview
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            Real-time multi-tenant monitoring, SaaS revenue tracking, and health metrics.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setActiveTab('create_gym')}
          style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderColor: 'transparent', gap: '0.5rem' }}
        >
          <UserPlus size={16} /> Onboard New Gym
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Total Gyms */}
        <div className="stats-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyBetween: true, gap: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Gyms</span>
            <Building2 size={20} style={{ color: '#a855f7' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{totalGyms}</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-success)' }}>+10% Growth this month</span>
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="stats-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyBetween: true, gap: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Monthly Revenue (MRR)</span>
            <DollarSign size={20} style={{ color: 'var(--color-success)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{mrr.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 600 }}>{currency}</span></h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>From {activeSubs.length} active subscriptions</span>
          </div>
        </div>

        {/* Total Members */}
        <div className="stats-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyBetween: true, gap: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active SaaS Members</span>
            <Users size={20} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{totalMembers}</h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Across all tenant databases</span>
          </div>
        </div>

        {/* Most Active Gym */}
        <div className="stats-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyBetween: true, gap: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Most Populated Gym</span>
            <Activity size={20} style={{ color: 'var(--color-warning)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {mostActiveGymName}
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{maxMembersCount} registered members</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Plans and Health status */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* Subscription Plan Distribution */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} style={{ color: '#a855f7' }} /> Subscription Distribution
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(planDistribution).map(([plan, count]) => {
              const percentage = totalGyms ? Math.round((count / totalGyms) * 100) : 0;
              const barColors = {
                Starter: '#3b82f6',
                Professional: '#a855f7',
                Enterprise: '#f43f5e',
                Trial: '#10b981'
              };
              return (
                <div key={plan}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600 }}>{plan} Plan</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count} gyms ({percentage}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${percentage}%`, 
                      background: barColors[plan] || '#fff',
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Directory Quick Health Score */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} style={{ color: '#3b82f6' }} /> Directory Health Scores
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {gyms.map(gym => {
              const score = getGymHealthScore(gym.gymId);
              let scoreColor = 'var(--color-success)';
              if (score < 50) scoreColor = 'var(--color-danger)';
              else if (score < 75) scoreColor = 'var(--color-warning)';

              return (
                <div key={gym.gymId} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.6rem 0.8rem', 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{gym.gymName}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status: {gym.status.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Health Score:</span>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      fontWeight: 800, 
                      color: scoreColor, 
                      background: `${scoreColor}10`, 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px',
                      border: `1px solid ${scoreColor}25`
                    }}>
                      {score}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Summary Cards (Status indicators) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', padding: '0.5rem', borderRadius: '6px' }}>
            <Building2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>{activeGymsCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Workspace Subdomains</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.5rem', borderRadius: '6px' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6' }}>{trialGymsCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trial Accounts Onboarding</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', padding: '0.5rem', borderRadius: '6px' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-danger)' }}>{suspendedGymsCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suspended client workspaces</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminOverview;
