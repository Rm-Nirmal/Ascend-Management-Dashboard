import { useDashboard } from '../../context/DashboardContext';
import { 
  Building2, 
  Users, 
  DollarSign, 
  Activity, 
  AlertTriangle,
  Clock,
  TrendingUp,
  Printer
} from 'lucide-react';

const SuperAdminOverview = () => {
  const { gyms, subscriptions, members, getGymHealthScore } = useDashboard();

  // 1. Calculations
  const totalGyms = gyms.length;
  const activeGymsCount = gyms.filter(g => g.status === 'active').length;
  const trialGymsCount = gyms.filter(g => g.status === 'trial').length;
  const frozenGymsCount = gyms.filter(g => g.status === 'frozen').length;
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

  // Export PDF (Professional Gym Owner Dashboard theme style)
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocker is enabled. Please allow pop-ups to generate the overview report.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>System Overview - FitGenCore</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Oswald:wght@500;700&display=swap');
          body {
            font-family: 'Montserrat', Arial, sans-serif;
            color: #0b0f19;
            background: #ffffff;
            padding: 40px;
            font-size: 12px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0b0f19;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .gym-name {
            font-family: 'Oswald', sans-serif;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin: 0;
            color: #0b0f19;
          }
          .gym-info {
            font-size: 11px;
            color: #6b7280;
            margin-top: 3px;
          }
          .report-info {
            text-align: right;
          }
          .report-title {
            font-family: 'Oswald', sans-serif;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 1px;
            margin: 0;
            text-transform: uppercase;
            color: #0b0f19;
          }
          .report-subtitle {
            font-size: 11px;
            color: #6b7280;
            margin-top: 2px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .summary-card {
            border: 1px solid #e5e7eb;
            background: #fafafa;
            padding: 15px;
            text-align: center;
            border-radius: 8px;
          }
          .summary-card.accent {
            background: #0b0f19;
            color: #ffffff;
            border: 1px solid #0b0f19;
          }
          .summary-label {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .summary-card.accent .summary-label {
            color: #94a3b8;
          }
          .summary-val {
            font-size: 16px;
            font-weight: 700;
            font-family: 'Oswald', sans-serif;
          }
          .section-title {
            font-family: 'Oswald', sans-serif;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            border-bottom: 1px solid #0b0f19;
            padding-bottom: 5px;
            margin-bottom: 12px;
            margin-top: 25px;
            letter-spacing: 0.5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 11px;
          }
          th {
            background: #f3f4f6;
            color: #0b0f19;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.5px;
            padding: 8px 10px;
            text-align: left;
            border-bottom: 2px solid #e5e7eb;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .badge-success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }
          .badge-warning {
            background: #fef3c7;
            color: #d97706;
            border: 1px solid #fcd34d;
          }
          .badge-danger {
            background: #fee2e2;
            color: #ef4444;
            border: 1px solid #fca5a5;
          }
          .badge-info {
            background: #dbeafe;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
          }
          .footer {
            margin-top: 60px;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #6b7280;
            letter-spacing: 0.5px;
          }
          .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
          }
          .sig-box {
            width: 200px;
            border-top: 1px solid #0b0f19;
            text-align: center;
            padding-top: 6px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          @media print {
            @page {
              margin: 0;
            }
            body {
              padding: 1.5cm;
            }
            .no-print-btn {
              display: none !important;
            }
          }
          .no-print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #0b0f19;
            color: #ffffff;
            border: none;
            padding: 10px 20px;
            font-family: 'Oswald', sans-serif;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            cursor: pointer;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: 0.2s;
          }
          .no-print-btn:hover {
            background: #1f2937;
          }
        </style>
      </head>
      <body>
        <button class="no-print-btn" onclick="window.print()">Export to PDF</button>

        <div class="header">
          <div>
            <h1 class="gym-name">FITGENCORE SAAS PORTAL</h1>
            <div class="gym-info">SaaS Multi-Tenant Operations & Management System</div>
            <div class="gym-info">HQ Operations - Colombo, Sri Lanka | billing@fitgencore.com</div>
          </div>
          <div class="report-info">
            <h2 class="report-title">SYSTEM OVERVIEW DOCUMENTATION</h2>
            <div class="report-subtitle">Official Executive Summary</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Total Gyms</div>
            <div class="summary-val">${totalGyms}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Monthly Revenue (MRR)</div>
            <div class="summary-val">${mrr.toLocaleString()} ${currency}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Active SaaS Members</div>
            <div class="summary-val">${totalMembers}</div>
          </div>
          <div class="summary-card accent">
            <div class="summary-label">Most Populated Gym</div>
            <div class="summary-val">${mostActiveGymName}</div>
          </div>
        </div>

        <div class="section-title">Tenant Workspace Summary</div>
        <table>
          <thead>
            <tr>
              <th>Status Category</th>
              <th>Total Client Workspace Subdomains</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Active</strong></td>
              <td>${activeGymsCount} gyms</td>
            </tr>
            <tr>
              <td><strong>Trial</strong></td>
              <td>${trialGymsCount} gyms</td>
            </tr>
            <tr>
              <td><strong>Frozen</strong></td>
              <td>${frozenGymsCount} gyms</td>
            </tr>
            <tr>
              <td><strong>Suspended</strong></td>
              <td>${suspendedGymsCount} gyms</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">Subscription Tier Distribution</div>
        <table>
          <thead>
            <tr>
              <th>Subscription Plan</th>
              <th>Gyms Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(planDistribution).map(([plan, count]) => {
              const percentage = totalGyms ? Math.round((count / totalGyms) * 100) : 0;
              return `
                <tr>
                  <td><strong>${plan} Plan</strong></td>
                  <td>${count} gyms</td>
                  <td>${percentage}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="section-title">Tenant Directory Details & Health Scores</div>
        <table>
          <thead>
            <tr>
              <th>Gym Name</th>
              <th>Gym ID</th>
              <th>Status</th>
              <th>Database Members</th>
              <th>Health Score</th>
            </tr>
          </thead>
          <tbody>
            ${gyms.map(gym => {
              const score = getGymHealthScore(gym.gymId);
              const gymMembersCount = members.filter(m => m.gymId === gym.gymId).length;
              let statusBadgeClass = 'badge-info';
              if (gym.status === 'active') statusBadgeClass = 'badge-success';
              else if (gym.status === 'trial') statusBadgeClass = 'badge-info';
              else if (gym.status === 'frozen') statusBadgeClass = 'badge-warning';
              else if (gym.status === 'suspended') statusBadgeClass = 'badge-danger';

              return `
                <tr>
                  <td><strong>${gym.gymName}</strong></td>
                  <td><code style="font-family: monospace; font-size: 11px;">${gym.gymId}</code></td>
                  <td><span class="badge ${statusBadgeClass}">${gym.status.toUpperCase()}</span></td>
                  <td>${gymMembersCount} members</td>
                  <td><strong>${score}%</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="signature-section">
          <div>
            <div style="height: 40px;"></div>
            <div class="sig-box">Prepared By (SaaS Administrator)</div>
          </div>
          <div>
            <div style="height: 40px;"></div>
            <div class="sig-box">Approved By VP Operations</div>
          </div>
        </div>

        <div class="footer">
          <div>FitGenCore System Documentation Center</div>
          <div>Generated Date: ${new Date().toLocaleString()}</div>
          <div>Confidential Document</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="overview-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div className="page-header printable-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div className="page-info">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>System Overview</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>Real-time multi-tenant monitoring, SaaS revenue tracking, and health metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleExportPDF} style={{ gap: '0.35rem' }}>
            <Printer size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Total Gyms */}
        <div className="stats-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyBetween: true, gap: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
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
        <div className="stats-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyBetween: true, gap: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
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
        <div className="stats-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyBetween: true, gap: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
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
        <div className="stats-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyBetween: true, gap: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
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
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
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
                  <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
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
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
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
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)',
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.5rem', borderRadius: '6px' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{frozenGymsCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Frozen Client Workspaces</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', padding: '0.5rem', borderRadius: '6px' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-danger)' }}>{suspendedGymsCount}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deactivated client workspaces</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminOverview;
