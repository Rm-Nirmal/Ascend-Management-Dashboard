import { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Play, Square, Coffee, Clock, Calendar, CheckCircle } from 'lucide-react';

const BreakTimer = () => {
  const {
    currentUser,
    employees,
    breakLogs,
    startBreak,
    stopBreak,
    showToast
  } = useDashboard();

  // Find corresponding employee record
  const currentEmployee = useMemo(() => {
    if (!currentUser?.email) return null;
    return employees.find(e => e.email.toLowerCase() === currentUser.email.toLowerCase());
  }, [currentUser, employees]);

  const employeeId = currentEmployee?.id || currentUser?.id || 'unknown';
  const employeeName = currentEmployee?.full_name || currentUser?.name || 'Administrator';

  // Find active break for the logged-in user
  const activeBreak = useMemo(() => {
    return breakLogs.find(b => b.employeeId === employeeId && b.status === 'active');
  }, [breakLogs, employeeId]);

  // Elapsed time state (seconds)
  const [elapsed, setElapsed] = useState(0);

  // Sync elapsed time ticker
  useEffect(() => {
    let intervalId = null;
    if (activeBreak) {
      // Calculate initial elapsed time
      const calculateElapsed = () => {
        const start = new Date(activeBreak.startTime).getTime();
        const now = Date.now();
        setElapsed(Math.max(0, Math.floor((now - start) / 1000)));
      };
      
      calculateElapsed();
      intervalId = setInterval(calculateElapsed, 1000);
    } else {
      setElapsed(0);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeBreak]);

  // Handle start break
  const handleStartBreak = async () => {
    const res = await startBreak(employeeId, employeeName);
    if (res.success) {
      showToast('Break started! Timer is now active.', 'warning');
    } else {
      showToast(res.message || 'Failed to start break.', 'error');
    }
  };

  // Handle stop break
  const handleStopBreak = async () => {
    if (!activeBreak) return;
    const res = await stopBreak(activeBreak.id);
    if (res.success) {
      showToast('Break ended. Time logged successfully.', 'success');
    } else {
      showToast(res.message || 'Failed to stop break.', 'error');
    }
  };

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  // Filter completed breaks for current employee
  const myCompletedBreaks = useMemo(() => {
    return breakLogs
      .filter(b => b.employeeId === employeeId && b.status === 'completed')
      .slice(0, 10); // Show last 10 completed breaks
  }, [breakLogs, employeeId]);

  // Sum today's break duration
  const todaysTotalBreakTime = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysSeconds = breakLogs
      .filter(b => b.employeeId === employeeId && b.status === 'completed' && b.startTime.startsWith(todayStr))
      .reduce((sum, b) => sum + (b.duration || 0), 0);
    
    // Add active break if it exists
    const activeSeconds = activeBreak ? elapsed : 0;
    return todaysSeconds + activeSeconds;
  }, [breakLogs, employeeId, activeBreak, elapsed]);

  const formatFriendlyDuration = (totalSeconds) => {
    if (totalSeconds === 0) return '0 seconds';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    const parts = [];
    if (hrs > 0) parts.push(`${hrs} hr${hrs > 1 ? 's' : ''}`);
    if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} sec${secs > 1 ? 's' : ''}`);
    return parts.join(' ');
  };

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Employee Break Desk</h1>
          <p>Toggle your break status and log break intervals seamlessly.</p>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column: Timer Control */}
        <div className="glass-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {/* Ambient Glow Blob */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: activeBreak ? 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* Icon Badge */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: activeBreak ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: activeBreak ? '1.5px solid rgba(245, 158, 11, 0.3)' : '1.5px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            animation: activeBreak ? 'pulse 2s ease-in-out infinite' : 'none'
          }}>
            <Coffee size={36} style={{ color: activeBreak ? 'var(--color-warning, #f59e0b)' : 'var(--color-success, #10b981)' }} />
          </div>

          <span className="badge" style={{
            fontSize: '0.75rem',
            padding: '0.35rem 0.85rem',
            background: activeBreak ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: activeBreak ? '#f59e0b' : '#10b981',
            border: activeBreak ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '1rem'
          }}>
            {activeBreak ? 'On Break' : 'Active Duty'}
          </span>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            {employeeName}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '300px', marginBottom: '2rem' }}>
            {activeBreak 
              ? 'Your break timer is running. Please stop it when you return to duty.' 
              : 'Start your break timer before taking a rest to log your break duration.'
            }
          </p>

          {/* Digital Timer Display */}
          <div style={{
            fontFamily: 'monospace',
            fontSize: '4.5rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: activeBreak ? '#f59e0b' : 'var(--text-primary)',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            padding: '1rem 2rem',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '360px',
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '2.5rem',
            boxShadow: activeBreak ? '0 0 30px rgba(245, 158, 11, 0.05)' : 'none'
          }}>
            {formatTime(activeBreak ? elapsed : 0)}
          </div>

          {/* Actions */}
          <div style={{ width: '100%', maxWidth: '360px' }}>
            {activeBreak ? (
              <button 
                onClick={handleStopBreak} 
                className="btn btn-danger" 
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)'
                }}
              >
                <Square size={18} fill="currentColor" /> Stop Break
              </button>
            ) : (
              <button 
                onClick={handleStartBreak} 
                className="btn btn-primary" 
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-glow))',
                  boxShadow: 'var(--shadow-glow)'
                }}
              >
                <Play size={18} fill="currentColor" /> Start Break
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Statistics & Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Metrics */}
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyCenter: 'center', display: 'flex', justifyContent: 'center'
            }}>
              <Clock size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                TODAY'S TOTAL BREAK
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.15rem' }}>
                {formatFriendlyDuration(todaysTotalBreakTime)}
              </div>
            </div>
          </div>

          {/* Break Log History */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
                Recent Break History
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                Your last 10 completed break intervals.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {myCompletedBreaks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                  No break logs recorded recently.
                </div>
              ) : (
                myCompletedBreaks.map((log) => {
                  const date = new Date(log.startTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  });
                  const startTimeStr = new Date(log.startTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  });
                  const endTimeStr = log.endTime ? new Date(log.endTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  }) : '--';

                  return (
                    <div 
                      key={log.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          width: '24px', height: '24px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <CheckCircle size={12} />
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{date}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {startTimeStr} - {endTimeStr}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {formatFriendlyDuration(log.duration || 0)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(0.96); }
        }
      `}</style>
    </div>
  );
};

export default BreakTimer;
