import { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  History, Key, User, Search,
  DollarSign, ShieldAlert, ClipboardCheck, Calendar
} from 'lucide-react';

const AuditSettings = () => {
  const { auditLogs } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  
  // Scoped logs filter
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        log.action.toLowerCase().includes(search) || 
        log.details.toLowerCase().includes(search) || 
        log.user_name.toLowerCase().includes(search)
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
  }, [auditLogs, searchTerm, selectedDate]);

  // Action class color badge mapper (NFR-05)
  const getActionBadgeStyle = (action) => {
    const successEvents = ['system.login', 'payment.receive', 'member.checkin', 'member.unfreeze', 'registration.approve'];
    const dangerEvents = ['access.denied', 'member.delete', 'registration.reject'];
    
    if (successEvents.some(evt => action.startsWith(evt) || action === evt)) {
      return {
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        color: '#ffffff'
      };
    } else if (dangerEvents.some(evt => action.startsWith(evt) || action === evt)) {
      return {
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'var(--text-muted)'
      };
    } else {
      return {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: 'var(--text-muted)'
      };
    }
  };

  // Map actions to circular Lucide badges
  const getActionIcon = (action) => {
    if (action.startsWith('system.login')) return <Key size={14} />;
    if (action.startsWith('member.checkin')) return <User size={14} />;
    if (action.startsWith('member.unfreeze') || action.startsWith('member.delete') || action.startsWith('member.update') || action.startsWith('member.create')) return <User size={14} />;
    if (action.startsWith('payment.') || action.startsWith('invoice.')) return <DollarSign size={14} />;
    if (action.startsWith('access.denied') || action.startsWith('registration.reject')) return <ShieldAlert size={14} />;
    if (action.startsWith('registration.')) return <ClipboardCheck size={14} />;
    return <History size={14} />;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>System Audit & Settings</h1>
          <p>Review organization security logs and manage credentials.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Security Audit Logs (NFR-05) */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '720px' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={18} style={{ color: 'var(--color-primary)' }} />
              Security Audit Trail (NFR-05)
            </h3>
            
            {/* Filters toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Date Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(0,0,0,0.2)', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Date:</span>
                <input
                  type="date"
                  style={{ padding: '0.1rem 0.3rem', fontSize: '0.75rem', border: 'none', background: 'transparent', color: '#fff', width: '120px', outline: 'none', cursor: 'pointer' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate('')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.2rem', display: 'flex', alignItems: 'center' }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', width: '200px' }}>
                <Search size={14} style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search audit logs..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '0.75rem' }}
                />
              </div>
            </div>
          </div>

          <div style={{ overflowY: 'auto', flexGrow: 1, padding: '1.5rem' }}>
            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                No audit logs recorded matching search.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                {/* Timeline connector line */}
                <div style={{
                  position: 'absolute',
                  left: '21px',
                  top: '10px',
                  bottom: '10px',
                  width: '2px',
                  background: 'rgba(255,255,255,0.05)',
                  zIndex: 0
                }} />

                {filteredLogs.map(log => {
                  const badgeStyle = getActionBadgeStyle(log.action);
                  return (
                    <div 
                      key={log.id} 
                      style={{ 
                        display: 'flex', 
                        gap: '1rem', 
                        alignItems: 'flex-start',
                        position: 'relative',
                        zIndex: 1,
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-color)',
                        borderLeft: `4px solid ${badgeStyle.color}`,
                        borderRadius: '8px',
                        padding: '1rem',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-glass)'
                      }}
                    >
                      {/* Circular icon badge */}
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        background: badgeStyle.background,
                        border: badgeStyle.border,
                        color: badgeStyle.color,
                        flexShrink: 0
                      }}>
                        {getActionIcon(log.action)}
                      </div>

                      {/* Log details */}
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(log.occurred_at).toLocaleString()}
                          </span>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontFamily: 'monospace', 
                            padding: '0.1rem 0.4rem', 
                            borderRadius: '4px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: 'rgba(255,255,255,0.03)',
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.color}30`
                          }}>
                            {log.action}
                          </span>
                        </div>
                        
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Actor:</span>
                          <span style={{ color: '#fff' }}>{log.user_name}</span>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', wordBreak: 'break-word', lineHeight: '1.4' }}>
                          {log.details}
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

export default AuditSettings;
