import React, { useMemo, useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { 
  Sparkles, ShieldAlert, TrendingUp, UserMinus, Percent, Info, CalendarClock 
} from 'lucide-react';

const AIInsights = () => {
  const { members } = useDashboard();
  const [selectedRiskMember, setSelectedRiskMember] = useState(null);

  // Scoped members
  const activeMembers = useMemo(() => {
    return members.filter(m => m.status === 'active');
  }, [members]);

  // Generate Churn risk score details for active members
  const churnRiskList = useMemo(() => {
    // Generate simulated churn scores
    const seedScores = {
      'm1': { score: 14, factors: ['Regular check-ins (3x/week)', 'Active trainer plan', 'Auto-renew enabled'] },
      'm2': { score: 8, factors: ['Highly active check-ins', 'Enrolled in VIP program', 'Participates in events'] },
      'm5': { score: 68, factors: ['Zero check-ins in last 12 days', 'Back stiffness notes (physical hurdle)', 'Declined custom trainer session'] },
      'm6': { score: 28, factors: ['Low trainer interaction', 'Check-ins drop-off (1x/week)', 'Auto-renew active'] },
      'm7': { score: 45, factors: ['Payment delay 3 days', 'Check-ins down by 25% vs last month', 'Main branch user'] }
    };

    return activeMembers.map(m => {
      const riskData = seedScores[m.id] || { 
        score: Math.round(15 + Math.random() * 45), 
        factors: ['Average check-in frequency', 'General health subscriber', 'No immediate warnings'] 
      };
      
      return {
        ...m,
        riskScore: riskData.score,
        factors: riskData.factors
      };
    }).sort((a, b) => b.riskScore - a.riskScore); // Highest risk first
  }, [activeMembers]);

  // Forecast Revenue (next 90 days) - (FR-AI-03)
  const revenueForecastData = useMemo(() => {
    const days = ['Day +15', 'Day +30', 'Day +45', 'Day +60', 'Day +75', 'Day +90'];
    const scale = 1.0;
    return days.map((day, idx) => ({
      name: day,
      baseline: Math.round((1500 + idx * 80) * scale),
      predicted: Math.round((1500 + idx * 140 + Math.sin(idx) * 50) * scale)
    }));
  }, []);

  // Occupancy forecast comparison: Typical vs Predicted (FR-AI-02)
  const occupancyForecastData = useMemo(() => {
    const hours = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    return hours.map((hour, idx) => {
      const typical = [15, 65, 30, 25, 20, 45, 80, 50, 15][idx];
      const predicted = Math.round(typical + (Math.sin(idx) * 8 + (idx === 1 || idx === 6 ? 12 : -5))); // peak predicted variations
      return {
        hour,
        'Historical Load %': typical,
        'AI Forecast Load %': Math.max(5, predicted)
      };
    });
  }, []);

  const getRiskColor = (score) => {
    if (score >= 70) return 'var(--color-danger)';
    if (score >= 35) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={24} style={{ color: 'var(--color-ai)' }} />
            <h1 style={{ margin: 0 }}>FitCore AI Predictive Engine</h1>
          </div>
          <p>Machine learning predictions for member churn, peak occupancy, and revenue forecast.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Churn Risk & Forecast Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Member Churn Risk List (FR-AI-01) */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                Churn Susceptibility Index (0 - 100)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Updated 3 hours ago
              </span>
            </div>

            <div className="table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>Risk Rating</th>
                    <th>Risk Bar</th>
                    <th style={{ textAlign: 'right' }}>Explainability Factors</th>
                  </tr>
                </thead>
                <tbody>
                  {churnRiskList.map(member => (
                    <tr key={member.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRiskMember(member)}>
                      <td style={{ fontWeight: 600 }}>{member.full_name}</td>
                      <td>
                        <span 
                          style={{ 
                            color: getRiskColor(member.riskScore), 
                            fontWeight: 700, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.35rem' 
                          }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getRiskColor(member.riskScore) }} />
                          {member.riskScore}% {member.riskScore >= 70 ? 'High' : member.riskScore >= 35 ? 'Medium' : 'Low'}
                        </span>
                      </td>
                      <td>
                        <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${member.riskScore}%`, 
                              height: '100%', 
                              background: getRiskColor(member.riskScore),
                              borderRadius: '3px'
                            }} 
                          />
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>
                          Analyze Factors
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue Forecasting (FR-AI-03) */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                  90-Day Revenue Forecasting Model
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Compares baseline linear projection against AI renewal likelihood predictions
                </p>
              </div>
              <TrendingUp size={20} style={{ color: 'var(--color-success)' }} />
            </div>

            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={revenueForecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--text-dark)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--text-dark)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  />
                  <Legend fontSize={10} wrapperStyle={{ paddingTop: 10 }} />
                  <Area type="monotone" dataKey="baseline" stroke="var(--text-dark)" strokeWidth={1.5} fillOpacity={1} fill="url(#colorBaseline)" name="Baseline Linear" />
                  <Area type="monotone" dataKey="predicted" stroke="var(--color-success)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAI)" name="AI Predicted Growth" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column: Risk detail card & occupancy forecast */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Analyze Risk Details Card */}
          <div className="glass-card" style={{ border: selectedRiskMember ? `1px solid ${getRiskColor(selectedRiskMember.riskScore)}` : '1px solid var(--border-color)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} style={{ color: selectedRiskMember ? getRiskColor(selectedRiskMember.riskScore) : 'var(--color-ai)' }} />
              Risk Analysis Inspector
            </h3>

            {selectedRiskMember ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifySelf: 'flex-start', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '1.15rem' }}>{selectedRiskMember.full_name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {selectedRiskMember.member_code}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: getRiskColor(selectedRiskMember.riskScore) }}>
                      {selectedRiskMember.riskScore}%
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Risk Score</div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                    AI Churn Trigger Indicators
                  </span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedRiskMember.factors.map((fact, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          fontSize: '0.8rem', 
                          display: 'flex', 
                          gap: '0.5rem', 
                          alignItems: 'flex-start',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid var(--border-color)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px'
                        }}
                      >
                        <Info size={14} style={{ marginTop: '0.1rem', flexShrink: 0, color: getRiskColor(selectedRiskMember.riskScore) }} />
                        <span>{fact}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'rgba(6,182,212,0.03)', border: '1px dotted rgba(6,182,212,0.2)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  <strong>Recommendation:</strong> Propose a personalized feedback meeting or offer a freeze discount to avoid account cancellation.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Select a member from the susceptibility index table to run the Risk Factor Inspector.
              </div>
            )}
          </div>

          {/* Tomorrow's Occupancy Forecast (FR-AI-02) */}
          <div className="glass-card" style={{ flexGrow: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                  Tomorrow's Occupancy Forecast
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Hourly load forecast mapping traditional baseline vs predicted load
                </p>
              </div>
              <CalendarClock size={20} style={{ color: 'var(--color-ai)' }} />
            </div>

            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={occupancyForecastData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  />
                  <Legend fontSize={9} wrapperStyle={{ paddingTop: 5 }} />
                  <Bar dataKey="Historical Load %" fill="var(--text-dark)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="AI Forecast Load %" fill="var(--color-ai)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AIInsights;
