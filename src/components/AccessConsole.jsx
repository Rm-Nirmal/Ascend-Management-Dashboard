import React, { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  Scan, CheckCircle2, AlertOctagon, UserMinus, Clock, UserCheck, ShieldAlert 
} from 'lucide-react';

const AccessConsole = () => {
  const {
    members,
    accessEvents,
    checkInMember,
    checkOutMember
  } = useDashboard();

  // Console states
  const [scanMethod, setScanMethod] = useState('qr');
  const [inputCode, setInputCode] = useState('');
  
  // Simulated scanner display feedback state
  const [scannerState, setScannerState] = useState({
    status: 'idle', // 'idle', 'processing', 'granted', 'denied'
    message: 'Awaiting scan...',
    memberName: '',
    memberCode: ''
  });

  // Filter access events for active branch (if scoped)
  const filteredEvents = useMemo(() => {
    // Return all events, sorted by time descending (newest first)
    return accessEvents.slice().sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
  }, [accessEvents]);

  // Handle Simulated Punch
  const handleTriggerScan = (codeToScan) => {
    if (!codeToScan) return;
    
    setScannerState({
      status: 'processing',
      message: 'Reading credentials...',
      memberName: '',
      memberCode: ''
    });

    setTimeout(() => {
      const response = checkInMember(codeToScan, scanMethod);
      if (response.success) {
        setScannerState({
          status: 'granted',
          message: 'ACCESS GRANTED',
          memberName: response.member.full_name,
          memberCode: response.member.member_code
        });
      } else {
        setScannerState({
          status: 'denied',
          message: `ACCESS DENIED: ${response.reason}`,
          memberName: 'Rejected Attempt',
          memberCode: codeToScan
        });
      }

      // Reset scanner to idle after 4 seconds
      setTimeout(() => {
        setScannerState(prev => {
          if (prev.status === 'processing') return prev; // if another scan started
          return {
            status: 'idle',
            message: 'Awaiting scan...',
            memberName: '',
            memberCode: ''
          };
        });
      }, 4000);

    }, 800);
    
    setInputCode('');
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleTriggerScan(inputCode);
  };

  // Peak hour heatmap mock configuration (FR-ATT-04)
  const peakAttendanceHeatmap = [
    { day: 'Monday', hours: [10, 15, 25, 45, 65, 30, 20, 15, 40, 70, 85, 55, 30, 15, 10, 5] },
    { day: 'Tuesday', hours: [8, 12, 20, 42, 60, 28, 18, 12, 38, 65, 80, 50, 25, 12, 8, 4] },
    { day: 'Wednesday', hours: [12, 18, 28, 48, 70, 32, 22, 18, 45, 75, 90, 60, 35, 18, 12, 6] },
    { day: 'Thursday', hours: [9, 14, 22, 44, 62, 30, 20, 14, 40, 68, 82, 52, 28, 14, 9, 5] },
    { day: 'Friday', hours: [11, 16, 26, 40, 58, 35, 25, 20, 42, 70, 75, 45, 22, 10, 5, 2] },
    { day: 'Saturday', hours: [5, 15, 35, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 2, 0, 0] },
    { day: 'Sunday', hours: [2, 8, 20, 35, 30, 25, 22, 20, 15, 12, 10, 5, 2, 0, 0, 0] }
  ];

  // Helper for heatmap cell color depending on density
  const getCellColor = (density) => {
    if (density === 0) return 'rgba(255, 255, 255, 0.02)';
    if (density < 15) return 'rgba(16, 185, 129, 0.15)';
    if (density < 35) return 'rgba(16, 185, 129, 0.35)';
    if (density < 60) return 'rgba(16, 185, 129, 0.6)';
    return 'rgba(16, 185, 129, 0.9)'; // Peak
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Access Control Console</h1>
          <p>Simulate scan attempts, view real-time gate entry logs, and track peak occupancy.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        
        {/* Left Column: Simulated scanner terminal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Scanner screen card */}
          <div className="glass-card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '2.5rem 2rem', 
            border: scannerState.status === 'granted' ? '2px solid var(--color-success)' : scannerState.status === 'denied' ? '2px solid var(--color-danger)' : '1px solid var(--border-color)',
            boxShadow: scannerState.status === 'granted' ? '0 0 20px rgba(16, 185, 129, 0.2)' : scannerState.status === 'denied' ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'var(--shadow-glass)',
            transition: 'all 0.3s ease-out',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
              FitCore Gate Entry Terminal Simulation
            </span>

            {/* Simulated hardware display screen */}
            <div style={{ 
              background: '#040710', 
              border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: '12px', 
              width: '100%', 
              maxWidth: '380px', 
              padding: '2rem 1.5rem', 
              marginBottom: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '180px'
            }}>
              {scannerState.status === 'idle' && (
                <div style={{ color: 'var(--text-muted)' }}>
                  <Scan size={38} className="icon" style={{ strokeWidth: 1.5, animation: 'pulse 2s infinite', color: 'var(--color-primary)', marginBottom: '0.75rem' }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{scannerState.message}</div>
                </div>
              )}

              {scannerState.status === 'processing' && (
                <div>
                  <div style={{ width: '32px', height: '32px', border: '3px solid rgba(6,182,212,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem auto' }} />
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 600 }}>{scannerState.message}</div>
                </div>
              )}

              {scannerState.status === 'granted' && (
                <div style={{ color: 'var(--color-success)', animation: 'slideUp 0.2s ease-out' }}>
                  <CheckCircle2 size={42} style={{ margin: '0 auto 0.75rem auto' }} />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.05em' }}>{scannerState.message}</h3>
                  <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, marginTop: '0.25rem' }}>{scannerState.memberName}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>ID: {scannerState.memberCode}</div>
                </div>
              )}

              {scannerState.status === 'denied' && (
                <div style={{ color: 'var(--color-danger)', animation: 'slideUp 0.2s ease-out' }}>
                  <AlertOctagon size={42} style={{ margin: '0 auto 0.75rem auto' }} />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.02em' }}>{scannerState.message}</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Code checked: {scannerState.memberCode}</div>
                </div>
              )}
            </div>

            {/* Simulated Keyboard Entry Form */}
            <form onSubmit={handleFormSubmit} style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select 
                  value={scanMethod} 
                  onChange={(e) => setScanMethod(e.target.value)}
                  className="glass-select"
                  style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                >
                  <option value="qr">QR Code</option>
                  <option value="rfid">RFID Card</option>
                  <option value="fingerprint">Fingerprint</option>
                  <option value="manual">Manual Entry</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Enter code (e.g. ASC-10492)"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="glass-input"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Trigger Gate Check
              </button>
            </form>
          </div>

          {/* Real-time occupancy peak heatmap visualizer (FR-ATT-04) */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                Peak Attendance Density (Weekly Heatmap)
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>Less</span>
                <div style={{ width: '10px', height: '10px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '2px' }} />
                <div style={{ width: '10px', height: '10px', background: 'rgba(16, 185, 129, 0.35)', borderRadius: '2px' }} />
                <div style={{ width: '10px', height: '10px', background: 'rgba(16, 185, 129, 0.60)', borderRadius: '2px' }} />
                <div style={{ width: '10px', height: '10px', background: 'rgba(16, 185, 129, 0.90)', borderRadius: '2px' }} />
                <span>Peak</span>
              </div>
            </div>

            <div className="heatmap-container">
              {/* Hours Header */}
              <div className="heatmap-row" style={{ marginBottom: '0.25rem' }}>
                <div className="heatmap-label"></div>
                <div className="heatmap-cells" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', justifyContent: 'space-between', padding: '0 0.5rem' }}>
                  <span>06a</span>
                  <span>09a</span>
                  <span>12p</span>
                  <span>03p</span>
                  <span>06p</span>
                  <span>09p</span>
                </div>
              </div>

              {/* Day Rows */}
              {peakAttendanceHeatmap.map((row, idx) => (
                <div key={idx} className="heatmap-row">
                  <div className="heatmap-label" style={{ fontWeight: 600 }}>{row.day.substring(0, 3)}</div>
                  <div className="heatmap-cells">
                    {row.hours.map((val, cellIdx) => {
                      const hourLabel = cellIdx + 6;
                      const ampm = hourLabel >= 12 ? 'PM' : 'AM';
                      const displayHour = hourLabel > 12 ? hourLabel - 12 : hourLabel;
                      return (
                        <div 
                          key={cellIdx}
                          className="heatmap-cell"
                          style={{ '--cell-bg': getCellColor(val) }}
                          data-tooltip={`${row.day} @ ${displayHour}:00 ${ampm} - Average load: ${val}%`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Active check-in quick list & Gate logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Quick-Scan Helper Panel */}
          <div className="glass-card" style={{ maxHeight: '320px', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Quick Scan Simulation Desk
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Click a member below to simulate a physical gate swipe.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.full_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {m.member_code} ({m.status})</div>
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', borderColor: 'var(--border-color)' }}
                    onClick={() => handleTriggerScan(m.member_code)}
                  >
                    Swipe QR
                  </button>
                </div>
              ))}
              
              {/* Bad card code simulation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-danger)' }}>Corrupted QR Code</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Simulates bad credentials</div>
                </div>
                <button 
                  className="btn btn-danger" 
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                  onClick={() => handleTriggerScan('BAD-TOKEN-999')}
                >
                  Swipe Bad
                </button>
              </div>
            </div>
          </div>

          {/* Live entry audit log feed */}
          <div className="glass-card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', maxHeight: '420px', overflowY: 'hidden' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Live Gate Entry Logs (FR-ACC-04)
            </h3>
            
            <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
              {filteredEvents.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No logged entries.</div>
              ) : (
                filteredEvents.map(evt => (
                  <div key={evt.id} style={{ 
                    background: 'rgba(0,0,0,0.15)', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    borderLeft: evt.result === 'granted' ? '3px solid var(--color-success)' : '3px solid var(--color-danger)',
                    borderBottom: '1px solid var(--border-color)',
                    borderRight: '1px solid var(--border-color)',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{evt.member_name}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                          {evt.source.toUpperCase()}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Code: {evt.member_code} | Location: Gym HQ
                      </div>

                      {evt.result === 'denied' && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600, marginTop: '0.15rem' }}>
                          Reason: {evt.deny_reason.toUpperCase()}
                        </div>
                      )}

                      {evt.result === 'granted' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          <Clock size={10} /> Checked-in: {new Date(evt.occurred_at).toLocaleTimeString()}
                          {evt.check_out_at && (
                            <span style={{ color: 'var(--color-primary)' }}>
                              | Out: {new Date(evt.check_out_at).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Checkout simulation action (FR-ATT-02) */}
                    {evt.result === 'granted' && !evt.check_out_at && (
                      <button 
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem', color: 'var(--color-primary)' }}
                        onClick={() => checkOutMember(evt.id)}
                      >
                        Check-out
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AccessConsole;
