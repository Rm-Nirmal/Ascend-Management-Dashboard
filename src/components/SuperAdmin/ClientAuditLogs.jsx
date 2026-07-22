import { useState, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  History, 
  Search, 
  Building2, 
  User, 
  Calendar, 
  Sliders, 
  Clock, 
  Info
} from 'lucide-react';

const ClientAuditLogs = () => {
  const { auditLogs, gyms } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Filter logs for client settings changes
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // We only care about client settings updates
      if (log.action !== 'gym.settings_update') return false;

      const search = searchTerm.toLowerCase();
      const gym = gyms.find(g => g.gymId === log.gymId);
      const gymName = gym ? gym.gymName : 'Unknown Gym';

      const matchesSearch = (
        log.action.toLowerCase().includes(search) || 
        log.details.toLowerCase().includes(search) || 
        log.user_name.toLowerCase().includes(search) ||
        gymName.toLowerCase().includes(search) ||
        log.gymId.toLowerCase().includes(search)
      );

      let matchesDate = true;
      if (selectedDate && log.occurred_at) {
        try {
          const logDateStr = new Date(log.occurred_at).toISOString().split('T')[0];
          matchesDate = (logDateStr === selectedDate);
        } catch {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [auditLogs, gyms, searchTerm, selectedDate]);

  return (
    <div className="page-container" style={{ padding: '2rem' }}>
      {/* Header section */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="page-info">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Client Settings Audit logs
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Security and preference change logs from gym owners modifying their console details.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* Main Log Card */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
          
          {/* Filtering bar */}
          <div style={{ 
            padding: '1.25rem', 
            borderBottom: '1px solid var(--border-color)', 
            background: 'rgba(255,255,255,0.01)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            gap: '1rem', 
            flexWrap: 'wrap' 
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <History size={18} style={{ color: '#a855f7' }} />
              Client Preference Settings Changes
            </h3>
            
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Date selection */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Date:</span>
                <input
                  type="date"
                  style={{ 
                    padding: '0.1rem 0.3rem', 
                    fontSize: '0.75rem', 
                    border: 'none', 
                    background: 'transparent', 
                    color: '#fff', 
                    width: '125px', 
                    outline: 'none', 
                    cursor: 'pointer' 
                  }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate('')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.2rem' }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Text Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', width: '240px' }}>
                <Search size={14} style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search by gym name, owner, details..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '0.75rem' }}
                />
              </div>
            </div>
          </div>

          {/* Audit Log Timeline */}
          <div style={{ overflowY: 'auto', flexGrow: 1, padding: '1.5rem 2rem' }}>
            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={32} style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }} />
                <span style={{ fontWeight: 600 }}>No client settings logs found</span>
                <span style={{ fontSize: '0.8rem' }}>Logs appear here when client gym owners modify settings in their consoles.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
                {/* Timeline vertical bar */}
                <div style={{
                  position: 'absolute',
                  left: '21px',
                  top: '12px',
                  bottom: '12px',
                  width: '2px',
                  background: 'linear-gradient(to bottom, rgba(168, 85, 247, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
                  zIndex: 0
                }} />

                {filteredLogs.map(log => {
                  const gym = gyms.find(g => g.gymId === log.gymId);
                  const gymName = gym ? gym.gymName : 'Unknown Gym';

                  return (
                    <div 
                      key={log.id} 
                      style={{ 
                        display: 'flex', 
                        gap: '1.25rem', 
                        alignItems: 'flex-start',
                        position: 'relative',
                        zIndex: 1,
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.03)',
                        borderRadius: '10px',
                        padding: '1.25rem',
                        transition: 'all 0.25s ease',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                        e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.03)';
                      }}
                    >
                      {/* Timeline Dot Indicator */}
                      <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                        border: '3px solid rgba(10, 11, 15, 0.95)',
                        boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)',
                        marginTop: '1.1rem',
                        marginLeft: '13px',
                        flexShrink: 0
                      }} />

                      {/* Content Card Body */}
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        
                        {/* Upper row: date & action badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.6rem', marginBottom: '0.6rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            <Clock size={13} />
                            {new Date(log.occurred_at).toLocaleString()}
                          </div>
                          
                          <span style={{ 
                            fontSize: '0.6rem', 
                            fontFamily: 'monospace', 
                            padding: '0.15rem 0.5rem', 
                            borderRadius: '4px',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            background: 'rgba(168, 85, 247, 0.1)',
                            color: '#c084fc',
                            border: '1px solid rgba(168, 85, 247, 0.2)'
                          }}>
                            {log.action}
                          </span>
                        </div>

                        {/* Mid Row: Gym name and Actor */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', margin: '0.4rem 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                            <Building2 size={14} style={{ color: '#3b82f6' }} />
                            {gymName}
                            <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-dark)', fontFamily: 'monospace' }}>({log.gymId})</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            <User size={13} style={{ color: 'var(--text-dark)' }} />
                            <span>Actor:</span>
                            <span style={{ color: 'var(--text-primary)' }}>{log.user_name}</span>
                          </div>
                        </div>

                        {/* Description field modifications detail */}
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: '#e2e8f0', 
                          marginTop: '0.75rem', 
                          lineHeight: '1.5',
                          background: 'rgba(0,0,0,0.15)',
                          border: '1px solid rgba(255,255,255,0.02)',
                          borderRadius: '6px',
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.5rem'
                        }}>
                          <Info size={14} style={{ color: '#a855f7', marginTop: '0.1rem', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>{log.details}</div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientAuditLogs;
