import { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  Scan, CheckCircle2, AlertOctagon, Clock, Shield, Lock, Unlock, 
  Users, Key, Wifi, RefreshCw, Cpu, Database, Settings, ArrowRightLeft,
  Activity, Radio, AlertCircle, Search, Calendar, ChevronRight, X, Play
} from 'lucide-react';

const AccessConsole = () => {
  const {
    members,
    employees,
    accessEvents,
    devices,
    checkInMember,
    triggerDoorCommand,
    testDeviceConnection,
    syncDeviceUsers,
    currentUser,
    gymSettings,
    showToast
  } = useDashboard();

  // Navigation Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard', 'monitor', 'door', 'members', 'employees', 'devices', 'logs'
  
  // Simulator drawer state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(true);

  // Simulator Form States
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [userType, setUserType] = useState('member'); // 'member' | 'employee'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [scanMethod, setScanMethod] = useState('Face Recognition');
  
  // Custom manual swipe code state
  const [manualCode, setManualCode] = useState('');

  // Simulator screen feedback state
  const [simScreenState, setSimScreenState] = useState({
    status: 'idle', // 'idle', 'processing', 'granted', 'denied'
    message: 'Awaiting punch...',
    name: '',
    code: '',
    photo: '',
    direction: '', // 'entry' | 'exit'
    reason: '',
    timestamp: ''
  });

  // Table Search and Filters
  const [searchMember, setSearchMember] = useState('');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [searchLog, setSearchLog] = useState('');
  const [filterLogResult, setFilterLogResult] = useState('all');
  const [filterLogType, setFilterLogType] = useState('all');
  const [filterLogMethod, setFilterLogMethod] = useState('all');

  // Sync first online device to simulator default
  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      const activeDev = devices.find(d => d.status === 'online') || devices[0];
      setSelectedDeviceId(activeDev.id);
    }
  }, [devices, selectedDeviceId]);

  // Sync first user to simulator default
  useEffect(() => {
    if (userType === 'member' && members.length > 0) {
      setSelectedUserId(members[0].id);
    } else if (userType === 'employee' && employees.length > 0) {
      setSelectedUserId(employees[0].id);
    }
  }, [userType, members, employees]);

  // Calculate real-time stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const todayEvents = accessEvents.filter(e => new Date(e.occurred_at) >= today);
    const grantedToday = todayEvents.filter(e => e.result === 'granted');
    const deniedToday = todayEvents.filter(e => e.result === 'denied');
    
    // Occupancy count: current check-ins inside (granted today, and check_out_at is null)
    const insideToday = grantedToday.filter(e => !e.check_out_at).length;

    return {
      totalEntriesToday: grantedToday.length,
      insideCount: insideToday,
      failedAttempts: deniedToday.length,
      devicesOnline: devices.filter(d => d.status === 'online' && d.isEnabled).length,
      totalDevices: devices.length
    };
  }, [accessEvents, devices]);

  // Notifications feed for dashboard
  const failedAlertsToday = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return accessEvents
      .filter(e => new Date(e.occurred_at) >= today && e.result === 'denied')
      .slice(0, 10);
  }, [accessEvents]);

  // Sort events chronologically (newest first)
  const sortedEvents = useMemo(() => {
    return accessEvents.slice().sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
  }, [accessEvents]);

  // Filter logs for Member Access tab
  const memberAccessLogs = useMemo(() => {
    return sortedEvents.filter(e => 
      e.userType === 'member' && 
      (e.member_name.toLowerCase().includes(searchMember.toLowerCase()) || e.member_code.toLowerCase().includes(searchMember.toLowerCase()))
    );
  }, [sortedEvents, searchMember]);

  // Filter logs for Employee Access tab
  const employeeAccessLogs = useMemo(() => {
    return sortedEvents.filter(e => 
      e.userType === 'employee' && 
      (e.member_name.toLowerCase().includes(searchEmployee.toLowerCase()) || e.member_code.toLowerCase().includes(searchEmployee.toLowerCase()))
    );
  }, [sortedEvents, searchEmployee]);

  // Filter logs for master Access Logs tab
  const masterAccessLogs = useMemo(() => {
    return sortedEvents.filter(e => {
      const matchSearch = e.member_name.toLowerCase().includes(searchLog.toLowerCase()) || 
                          e.member_code.toLowerCase().includes(searchLog.toLowerCase()) ||
                          (e.device_name && e.device_name.toLowerCase().includes(searchLog.toLowerCase()));
      const matchResult = filterLogResult === 'all' || e.result === filterLogResult;
      const matchType = filterLogType === 'all' || e.userType === filterLogType;
      const matchMethod = filterLogMethod === 'all' || e.source === filterLogMethod;
      return matchSearch && matchResult && matchType && matchMethod;
    });
  }, [sortedEvents, searchLog, filterLogResult, filterLogType, filterLogMethod]);

  // Trigger scan simulator
  const handleSimulateScan = async (codeToUse = null) => {
    let credential = codeToUse || manualCode.trim();
    
    // Find linked code from selection if not custom string
    if (!codeToUse && !manualCode.trim()) {
      if (userType === 'member') {
        const userObj = members.find(m => m.id === selectedUserId);
        credential = userObj ? userObj.member_code : '';
      } else {
        const userObj = employees.find(e => e.id === selectedUserId);
        credential = userObj ? userObj.employee_code : '';
      }
    }

    if (!credential) {
      showToast('Select a user or input a code to check credentials.', 'warning');
      return;
    }

    setSimScreenState({
      status: 'processing',
      message: 'Reading credentials...',
      name: '',
      code: '',
      photo: '',
      direction: '',
      reason: '',
      timestamp: ''
    });

    // Simulate ZK scanner delay
    setTimeout(async () => {
      try {
        const targetDev = devices.find(d => d.id === selectedDeviceId);
        if (targetDev && !targetDev.isEnabled) {
          setSimScreenState({
            status: 'denied',
            message: 'DEVICE DISABLED',
            name: 'Access Denied',
            code: credential,
            photo: '',
            direction: '',
            reason: 'Device communication is disabled',
            timestamp: new Date().toLocaleTimeString()
          });
          return;
        }

        const res = await checkInMember(credential, scanMethod, selectedDeviceId);
        
        if (res && res.success) {
          const matchedEntity = res.member || res.employee;
          setSimScreenState({
            status: 'granted',
            message: 'ACCESS GRANTED',
            name: matchedEntity.full_name,
            code: res.member ? matchedEntity.member_code : matchedEntity.employee_code,
            photo: matchedEntity.photo_url || '',
            direction: res.direction === 'entry' ? 'Entry Accepted' : 'Exit Registered',
            reason: '',
            timestamp: new Date().toLocaleTimeString()
          });
        } else {
          setSimScreenState({
            status: 'denied',
            message: 'ACCESS DENIED',
            name: res.reason === 'Invalid credential code.' ? 'Unknown Credential' : 'Rejected Punch',
            code: credential,
            photo: '',
            direction: '',
            reason: res.reason || 'Authentication Check Fail',
            timestamp: new Date().toLocaleTimeString()
          });
        }
      } catch (err) {
        console.error('Simulation error:', err);
        setSimScreenState({
          status: 'denied',
          message: 'SYSTEM ERROR',
          name: 'Device Fault',
          code: credential,
          photo: '',
          direction: '',
          reason: 'Internal communication timeout',
          timestamp: new Date().toLocaleTimeString()
        });
      }

      // Automatically reset simulator to idle after 6 seconds
      setTimeout(() => {
        setSimScreenState(prev => {
          if (prev.status === 'processing') return prev;
          return {
            status: 'idle',
            message: 'Awaiting punch...',
            name: '',
            code: '',
            photo: '',
            direction: '',
            reason: '',
            timestamp: ''
          };
        });
      }, 6000);

    }, 1200);

    setManualCode('');
  };

  // Peak hour heatmap mock configuration (unchanged weekly structure)
  const peakAttendanceHeatmap = [
    { day: 'Monday', hours: [10, 15, 25, 45, 65, 30, 20, 15, 40, 70, 85, 55, 30, 15, 10, 5] },
    { day: 'Tuesday', hours: [8, 12, 20, 42, 60, 28, 18, 12, 38, 65, 80, 50, 25, 12, 8, 4] },
    { day: 'Wednesday', hours: [12, 18, 28, 48, 70, 32, 22, 18, 45, 75, 90, 60, 35, 18, 12, 6] },
    { day: 'Thursday', hours: [9, 14, 22, 44, 62, 30, 20, 14, 40, 68, 82, 52, 28, 14, 9, 5] },
    { day: 'Friday', hours: [11, 16, 26, 40, 58, 35, 25, 20, 42, 70, 75, 45, 22, 10, 5, 2] },
    { day: 'Saturday', hours: [5, 15, 35, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 2, 0, 0] },
    { day: 'Sunday', hours: [2, 8, 20, 35, 30, 25, 22, 20, 15, 12, 10, 5, 2, 0, 0, 0] }
  ];

  const getCellColor = (density) => {
    if (density === 0) return 'rgba(255, 255, 255, 0.02)';
    if (density < 15) return 'rgba(255, 255, 255, 0.15)';
    if (density < 35) return 'rgba(255, 255, 255, 0.35)';
    if (density < 60) return 'rgba(255, 255, 255, 0.6)';
    return 'rgba(255, 255, 255, 0.9)'; // Peak
  };

  // Diagnostic connecting / sync helpers for devices page (Gym Owner context, read-only stats but allows diagnostic test)
  const [devicePending, setDevicePending] = useState({});

  const handleOwnerTest = async (devId) => {
    setDevicePending(prev => ({ ...prev, [devId]: 'testing' }));
    await testDeviceConnection(devId);
    setDevicePending(prev => {
      const copy = { ...prev };
      delete copy[devId];
      return copy;
    });
  };

  const handleOwnerSync = async (devId) => {
    setDevicePending(prev => ({ ...prev, [devId]: 'syncing' }));
    await syncDeviceUsers(devId);
    setDevicePending(prev => {
      const copy = { ...prev };
      delete copy[devId];
      return copy;
    });
  };

  const handleOwnerDoorCommand = async (devId, cmd) => {
    const res = await triggerDoorCommand(devId, cmd);
    if (res.success) {
      showToast(`Command ${cmd.toUpperCase()} broadcasted. Door relay updated.`, 'success');
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: '3rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-info">
          <h1>Access Control Panel</h1>
          <p>Monitor real-time gym entrance logs, manage door relay status, and execute remote overrides.</p>
        </div>

        <button 
          className="btn btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-color)' }}
          onClick={() => setIsSimulatorOpen(prev => !prev)}
        >
          <Scan size={15} style={{ color: 'var(--color-primary)' }} />
          <span>{isSimulatorOpen ? 'Hide Hardware Simulator' : 'Open Hardware Simulator'}</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginTop: '1rem', flexDirection: 'row' }}>
        
        {/* Main Console Workspace */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          
          {/* Sub Navigation Tabs */}
          <div className="glass-card" style={{ padding: '0.5rem', display: 'flex', gap: '0.25rem', overflowX: 'auto', flexWrap: 'nowrap' }}>
            {[
              { id: 'dashboard', name: 'Dashboard', icon: Activity },
              { id: 'monitor', name: 'Live Monitor', icon: Radio },
              { id: 'door', name: 'Door Control', icon: Lock },
              { id: 'members', name: 'Member Access', icon: Users },
              { id: 'employees', name: 'Employee Access', icon: Key },
              { id: 'devices', name: 'Security Devices', icon: Cpu },
              { id: 'logs', name: 'Access Logs', icon: Database }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.1rem',
                    background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: isActive ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.825rem',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease-in-out',
                    borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent'
                  }}
                >
                  <Icon size={14} style={{ color: isActive ? 'var(--color-primary)' : 'var(--text-dark)' }} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* VIEWPORT CONTROLS */}
          
          {/* 1. DASHBOARD VIEW */}
          {activeSubTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Quick Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                
                <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-primary)' }}>
                  <div className="metric-header">
                    <span>SECURITY DEVICES ONLINE</span>
                    <Cpu size={18} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div className="metric-value">{stats.devicesOnline} / {stats.totalDevices}</div>
                  <div className="metric-subtext">Connected door controllers</div>
                </div>

                <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-success)' }}>
                  <div className="metric-header">
                    <span>TODAY'S ENTRANCES</span>
                    <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                  </div>
                  <div className="metric-value">{stats.totalEntriesToday}</div>
                  <div className="metric-subtext">Successful credentials swiped today</div>
                </div>

                <div className="glass-card metric-card" style={{ '--card-accent': '#3b82f6' }}>
                  <div className="metric-header">
                    <span>CURRENT INDIVIDUALS INSIDE</span>
                    <Users size={18} style={{ color: '#3b82f6' }} />
                  </div>
                  <div className="metric-value">{stats.insideCount}</div>
                  <div className="metric-subtext">Occupancy based on active checks</div>
                </div>

                <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-danger)' }}>
                  <div className="metric-header">
                    <span>FAILED ATTEMPTS (TODAY)</span>
                    <AlertOctagon size={18} style={{ color: 'var(--color-danger)' }} />
                  </div>
                  <div className="metric-value">{stats.failedAttempts}</div>
                  <div className="metric-subtext">Access denied logs generated today</div>
                </div>

              </div>

              {/* Split Dashboard Content */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', flexWrap: 'wrap' }}>
                
                {/* Left: Active warnings & alerts */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} style={{ color: 'var(--color-danger)' }} /> Access Denied Incidents Today
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {failedAlertsToday.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        No denied entries logged today. Zero security threats.
                      </div>
                    ) : (
                      failedAlertsToday.map(evt => (
                        <div key={evt.id} style={{ display: 'flex', gap: '0.75rem', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', padding: '0.75rem' }}>
                          <AlertOctagon size={18} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: '0.1rem' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>{evt.member_name}</span>
                              <span style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.2)', color: 'rgb(248, 113, 113)', padding: '0.05rem 0.25rem', borderRadius: '3px' }}>
                                {evt.userType.toUpperCase()}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Failed check at {evt.device_name || 'Terminal'} via {evt.source}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                              Reason: {evt.deny_reason?.toUpperCase() || 'UNAUTHORIZED'}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)' }}>
                              {new Date(evt.occurred_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right: Peak density weekly heatmap (FR-ATT-04) */}
                <div className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>
                      Peak Attendance Density (Weekly Heatmap)
                    </h3>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span>Less</span>
                      <div style={{ width: '8px', height: '8px', background: 'rgba(255, 255, 255, 0.15)', borderRadius: '2px' }} />
                      <div style={{ width: '8px', height: '8px', background: 'rgba(255, 255, 255, 0.35)', borderRadius: '2px' }} />
                      <div style={{ width: '8px', height: '8px', background: 'rgba(255, 255, 255, 0.60)', borderRadius: '2px' }} />
                      <div style={{ width: '8px', height: '8px', background: 'rgba(255, 255, 255, 0.90)', borderRadius: '2px' }} />
                      <span>Peak</span>
                    </div>
                  </div>

                  <div className="heatmap-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {/* Hours Header */}
                    <div className="heatmap-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.15rem' }}>
                      <div className="heatmap-label" style={{ width: '35px' }}></div>
                      <div className="heatmap-cells" style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', padding: '0 0.5rem' }}>
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
                      <div key={idx} className="heatmap-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="heatmap-label" style={{ width: '35px', fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)' }}>{row.day.substring(0, 3)}</div>
                        <div className="heatmap-cells" style={{ flex: 1, display: 'flex', gap: '3px' }}>
                          {row.hours.map((val, cellIdx) => {
                            const hourLabel = cellIdx + 6;
                            const ampm = hourLabel >= 12 ? 'PM' : 'AM';
                            const displayHour = hourLabel > 12 ? hourLabel - 12 : hourLabel;
                            return (
                              <div 
                                key={cellIdx}
                                className="heatmap-cell"
                                style={{ 
                                  flex: 1, 
                                  height: '14px', 
                                  borderRadius: '2px',
                                  background: getCellColor(val),
                                  cursor: 'pointer' 
                                }}
                                title={`${row.day} @ ${displayHour}:00 ${ampm} - Density: ${val}%`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 2. LIVE MONITOR VIEW */}
          {activeSubTab === 'monitor' && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                Real-Time Credentials Activity Monitor
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                {sortedEvents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Awaiting scan events. Swipe credentials in the Hardware Simulator...
                  </div>
                ) : (
                  sortedEvents.map(evt => (
                    <div 
                      key={evt.id} 
                      style={{ 
                        background: 'rgba(0,0,0,0.15)',
                        border: '1px solid var(--border-color)',
                        borderLeft: evt.result === 'granted' ? '4px solid var(--color-success)' : '4px solid var(--color-danger)',
                        borderRadius: '8px', 
                        padding: '0.85rem 1.25rem', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        animation: 'fadeIn 0.3s ease-out'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                          fontSize: '0.95rem'
                        }}>
                          {evt.member_name?.charAt(0)}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{evt.member_name}</span>
                            <span style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 700,
                              background: evt.userType === 'employee' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)', 
                              color: evt.userType === 'employee' ? '#a855f7' : '#3b82f6', 
                              padding: '0.1rem 0.4rem', 
                              borderRadius: '3px',
                              textTransform: 'uppercase'
                            }}>
                              {evt.userType}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            ID: {evt.member_code} | Device: <span style={{ color: '#fff' }}>{evt.device_name || 'Terminal'}</span>
                          </div>
                          
                          {evt.result === 'granted' && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                              <Clock size={11} /> Entered: {new Date(evt.occurred_at).toLocaleTimeString()}
                              {evt.check_out_at && (
                                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                  | Exited: {new Date(evt.check_out_at).toLocaleTimeString()}
                                </span>
                              )}
                            </div>
                          )}

                          {evt.result === 'denied' && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600, marginTop: '0.15rem' }}>
                              Blocked: {evt.deny_reason?.toUpperCase() || 'UNAUTHORIZED'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Direction / Result Badge */}
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '4px',
                          background: evt.result === 'granted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: evt.result === 'granted' ? 'var(--color-success)' : 'var(--color-danger)',
                          border: evt.result === 'granted' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                          {evt.result === 'granted' ? (evt.check_out_at ? 'Exit' : 'Inside / Active') : 'Denied'}
                        </span>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-dark)', marginTop: '0.35rem' }}>
                          via {evt.source}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3. DOOR CONTROL VIEW */}
          {activeSubTab === 'door' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-card" style={{ paddingBottom: '0.5rem' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                  Remote Door Overrides & Relay Relays (FR-ACC-03)
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-0.75rem', marginBottom: '1.25rem' }}>
                  Every unlock, momentary bypass, or emergency lockdown command is transmitted securely through Firebase middleware and recorded permanently in system audit logs.
                </p>

                {devices.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No security devices registered to this gym. Link devices in the SaaS Super Admin directory.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {devices.map(dev => {
                      const isOffline = dev.status === 'offline' || dev.status === 'error' || !dev.isEnabled;
                      const isEmergency = dev.doorStatus === 'emergency_unlocked';
                      const isUnlocked = dev.doorStatus === 'unlocked';

                      return (
                        <div 
                          key={dev.id} 
                          className="glass-card"
                          style={{ 
                            background: 'rgba(0,0,0,0.2)',
                            border: isEmergency ? '1.5px solid var(--color-danger)' : (isUnlocked ? '1.5px solid var(--color-success)' : '1px solid var(--border-color)'),
                            boxShadow: isEmergency ? '0 0 15px rgba(239, 68, 68, 0.15)' : 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{dev.name}</h4>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>SN: {dev.serialNumber}</span>
                            </div>
                            
                            {/* Visual status indicators */}
                            {isOffline ? (
                              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', color: '#8c8c8c', padding: '0.15rem 0.35rem', borderRadius: '3px', fontWeight: 600 }}>OFFLINE</span>
                            ) : (
                              <span style={{ 
                                fontSize: '0.65rem', 
                                background: isEmergency ? 'rgba(239, 68, 68, 0.15)' : (isUnlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)'), 
                                color: isEmergency ? 'var(--color-danger)' : (isUnlocked ? 'var(--color-success)' : '#d4d4d4'), 
                                padding: '0.15rem 0.35rem', 
                                borderRadius: '3px',
                                fontWeight: 700 
                              }}>
                                {dev.doorStatus?.toUpperCase() || 'LOCKED'}
                              </span>
                            )}
                          </div>

                          {/* Interactive lock illustration */}
                          <div style={{ 
                            background: '#040710',
                            border: '1px solid rgba(255,255,255,0.03)',
                            borderRadius: '8px',
                            height: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: '0.35rem',
                            color: isEmergency ? 'var(--color-danger)' : (isUnlocked ? 'var(--color-success)' : 'var(--text-muted)')
                          }}>
                            {dev.doorStatus === 'emergency_unlocked' ? (
                              <>
                                <Unlock size={32} style={{ color: 'var(--color-danger)', animation: 'pulse 1s infinite' }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 700, letterSpacing: '0.05em' }}>EMERGENCY OVERRIDE OPEN</span>
                              </>
                            ) : (dev.doorStatus === 'unlocked' ? (
                              <>
                                <Unlock size={32} style={{ color: 'var(--color-success)' }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>RELAY UNLOCKED</span>
                              </>
                            ) : (
                              <>
                                <Lock size={32} style={{ color: 'var(--text-dark)' }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RELAY ARMED / SECURED</span>
                              </>
                            ))}
                          </div>

                          {/* Control Commands Panel */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: '0.725rem', padding: '0.45rem', gap: '0.25rem', color: 'var(--color-success)' }}
                              onClick={() => handleOwnerDoorCommand(dev.id, 'open')}
                              disabled={isOffline || dev.doorStatus === 'emergency_unlocked'}
                              title="Bypass relay momentarily for 5 seconds"
                            >
                              <Unlock size={12} /> Open Door (5s)
                            </button>
                            
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: '0.725rem', padding: '0.45rem', gap: '0.25rem' }}
                              onClick={() => handleOwnerDoorCommand(dev.id, 'lock')}
                              disabled={isOffline || dev.doorStatus === 'locked'}
                              title="Relock the door and arm ZK sensor"
                            >
                              <Lock size={12} /> Lock Door
                            </button>

                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: '0.725rem', padding: '0.45rem', gap: '0.25rem' }}
                              onClick={() => handleOwnerDoorCommand(dev.id, 'unlock')}
                              disabled={isOffline || dev.doorStatus === 'unlocked'}
                              title="Set door to remain open permanently until relocked"
                            >
                              <Unlock size={12} /> Unlock Door
                            </button>

                            <button
                              className="btn btn-danger"
                              style={{ fontSize: '0.725rem', padding: '0.45rem', gap: '0.25rem', color: 'var(--color-danger)' }}
                              onClick={() => handleOwnerDoorCommand(dev.id, 'emergency_unlock')}
                              disabled={isOffline || dev.doorStatus === 'emergency_unlocked'}
                              title="Trigger immediate bypass emergency relay"
                            >
                              <AlertOctagon size={12} style={{ color: 'var(--color-danger)' }} /> Emergency Unlock
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. MEMBER ACCESS HISTORICAL VIEW */}
          {activeSubTab === 'members' && (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>
                  Member Check-in & Exit Ledger
                </h3>
                
                <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                  <input 
                    type="text" 
                    placeholder="Search by name, ID..."
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    className="glass-input"
                    style={{ paddingLeft: '2.25rem', paddingTop: '0.35rem', paddingBottom: '0.35rem', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="dashboard-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Member Name</th>
                      <th>Member Code</th>
                      <th>Entry Time</th>
                      <th>Exit Time (Check-out)</th>
                      <th>Method</th>
                      <th>Device Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberAccessLogs.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          No member access records found.
                        </td>
                      </tr>
                    ) : (
                      memberAccessLogs.map(evt => (
                        <tr key={evt.id}>
                          <td style={{ fontWeight: 600 }}>{evt.member_name}</td>
                          <td>{evt.member_code}</td>
                          <td>{new Date(evt.occurred_at).toLocaleString()}</td>
                          <td>
                            {evt.check_out_at ? (
                              new Date(evt.check_out_at).toLocaleString()
                            ) : (
                              evt.result === 'granted' ? (
                                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Still Inside</span>
                              ) : (
                                <span style={{ color: 'var(--text-dark)' }}>N/A</span>
                              )
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{evt.source}</span>
                          </td>
                          <td>{evt.device_name || 'Web Console'}</td>
                          <td>
                            <span className={`badge badge-${evt.result === 'granted' ? 'active' : 'frozen'}`} style={{ fontSize: '0.65rem' }}>
                              {evt.result === 'granted' ? 'Granted' : 'Denied'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. EMPLOYEE ACCESS HISTORICAL VIEW */}
          {activeSubTab === 'employees' && (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>
                  Employee Clock-in & Clock-out Ledger
                </h3>
                
                <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                  <input 
                    type="text" 
                    placeholder="Search by name, ID..."
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                    className="glass-input"
                    style={{ paddingLeft: '2.25rem', paddingTop: '0.35rem', paddingBottom: '0.35rem', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="dashboard-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Employee Code</th>
                      <th>Clock In (Entry)</th>
                      <th>Clock Out (Exit)</th>
                      <th>Recognition Method</th>
                      <th>Device Terminal</th>
                      <th>Access Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeAccessLogs.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          No employee clock logs recorded.
                        </td>
                      </tr>
                    ) : (
                      employeeAccessLogs.map(evt => (
                        <tr key={evt.id}>
                          <td style={{ fontWeight: 600 }}>{evt.member_name}</td>
                          <td>{evt.member_code}</td>
                          <td>{new Date(evt.occurred_at).toLocaleString()}</td>
                          <td>
                            {evt.check_out_at ? (
                              new Date(evt.check_out_at).toLocaleString()
                            ) : (
                              evt.result === 'granted' ? (
                                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>On Duty</span>
                              ) : (
                                <span style={{ color: 'var(--text-dark)' }}>N/A</span>
                              )
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{evt.source}</span>
                          </td>
                          <td>{evt.device_name || 'Web Console'}</td>
                          <td>
                            <span className={`badge badge-${evt.result === 'granted' ? 'active' : 'frozen'}`} style={{ fontSize: '0.65rem' }}>
                              {evt.result === 'granted' ? 'Granted' : 'Denied'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. DEVICES READ-ONLY LIST VIEW */}
          {activeSubTab === 'devices' && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                Connected Gym Security Infrastructure
              </h3>
              
              {devices.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No security hardware connected to this location. Central register is managed by SaaS Administrator.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {devices.map(dev => {
                    const isPending = devicePending[dev.id];
                    return (
                      <div key={dev.id} style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                        
                        {isPending === 'testing' && (
                          <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(4,7,16,0.85)', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '24px', height: '24px', border: '2.5px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pinging device relays...</span>
                          </div>
                        )}

                        {isPending === 'syncing' && (
                          <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(4,7,16,0.85)', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <RefreshCw size={20} style={{ color: 'var(--color-primary)', animation: 'spin 2s linear infinite' }} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Uploading credentials library...</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{dev.name}</h4>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{dev.brand} {dev.model}</span>
                          </div>
                          
                          <span style={{ 
                            fontSize: '0.65rem',
                            background: dev.status === 'online' && dev.isEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                            color: dev.status === 'online' && dev.isEnabled ? 'var(--color-success)' : 'var(--text-muted)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '3px',
                            fontWeight: 700
                          }}>
                            {!dev.isEnabled ? 'DISABLED' : dev.status?.toUpperCase() || 'OFFLINE'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.775rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Serial Number:</span>
                            <span style={{ color: '#fff', fontWeight: 600 }}>{dev.serialNumber}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>IP Address:</span>
                            <span style={{ fontFamily: 'monospace' }}>{dev.ipAddress}:{dev.communicationSettings?.port || '4370'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>MAC Address:</span>
                            <span style={{ fontFamily: 'monospace' }}>{dev.macAddress || 'N/A'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Firmware version:</span>
                            <span>{dev.firmware}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Last Synchronization:</span>
                            <span style={{ color: '#fff' }}>{dev.lastSync ? new Date(dev.lastSync).toLocaleDateString() : 'Never'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Registration Date:</span>
                            <span>{dev.registrationDate}</span>
                          </div>
                        </div>

                        {/* Diagnostic ping trigger */}
                        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ flex: 1, fontSize: '0.7rem', padding: '0.35rem', gap: '0.25rem' }}
                            onClick={() => handleOwnerTest(dev.id)}
                            disabled={!dev.isEnabled}
                            title="Verify router routing and hardware ping"
                          >
                            <Activity size={10} /> Check Connection
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ flex: 1, fontSize: '0.7rem', padding: '0.35rem', gap: '0.25rem' }}
                            onClick={() => handleOwnerSync(dev.id)}
                            disabled={!dev.isEnabled || dev.status !== 'online'}
                            title="Push updated rosters database"
                          >
                            <RefreshCw size={10} /> Sync Database
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* 7. ALL ACCESS LOGS HISTORICAL DATABASE VIEW */}
          {activeSubTab === 'logs' && (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              
              {/* Search & Filtration Bar */}
              <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                  <input 
                    type="text" 
                    placeholder="Search logs by user, device..."
                    value={searchLog}
                    onChange={(e) => setSearchLog(e.target.value)}
                    className="glass-input"
                    style={{ paddingLeft: '2.25rem', paddingTop: '0.35rem', paddingBottom: '0.35rem', fontSize: '0.8rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <select 
                    value={filterLogType}
                    onChange={e => setFilterLogType(e.target.value)}
                    className="glass-select"
                    style={{ fontSize: '0.775rem', padding: '0.35rem 1.75rem 0.35rem 0.75rem' }}
                  >
                    <option value="all">All User Types</option>
                    <option value="member">Members</option>
                    <option value="employee">Employees</option>
                    <option value="unknown">Unknown</option>
                  </select>

                  <select 
                    value={filterLogResult}
                    onChange={e => setFilterLogResult(e.target.value)}
                    className="glass-select"
                    style={{ fontSize: '0.775rem', padding: '0.35rem 1.75rem 0.35rem 0.75rem' }}
                  >
                    <option value="all">All Results</option>
                    <option value="granted">Access Granted</option>
                    <option value="denied">Access Denied</option>
                  </select>

                  <select 
                    value={filterLogMethod}
                    onChange={e => setFilterLogMethod(e.target.value)}
                    className="glass-select"
                    style={{ fontSize: '0.775rem', padding: '0.35rem 1.75rem 0.35rem 0.75rem' }}
                  >
                    <option value="all">All Recognition Methods</option>
                    <option value="Face Recognition">Face Recognition</option>
                    <option value="Fingerprint">Fingerprint</option>
                    <option value="Palm Recognition">Palm Recognition</option>
                    <option value="QR Code">QR Code</option>
                    <option value="RFID Card">RFID Card</option>
                    <option value="PIN">PIN</option>
                  </select>
                </div>
              </div>

              {/* Table list */}
              <div className="table-container">
                <table className="dashboard-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Time stamp</th>
                      <th>Subject (User)</th>
                      <th>User Type</th>
                      <th>Authentication Method</th>
                      <th>Device Terminal</th>
                      <th>Verification Status</th>
                      <th>Audit Note / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masterAccessLogs.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          No master access logs match filters.
                        </td>
                      </tr>
                    ) : (
                      masterAccessLogs.map(evt => (
                        <tr key={evt.id} style={{ borderLeft: evt.result === 'granted' ? '3px solid transparent' : '3px solid var(--color-danger)' }}>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {new Date(evt.occurred_at).toLocaleString()}
                          </td>
                          <td style={{ fontWeight: 600 }}>{evt.member_name}</td>
                          <td>
                            <span style={{ 
                              fontSize: '0.65rem', 
                              background: evt.userType === 'employee' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                              color: evt.userType === 'employee' ? '#a855f7' : '#3b82f6', 
                              padding: '0.05rem 0.3rem', 
                              borderRadius: '3px',
                              textTransform: 'uppercase'
                            }}>
                              {evt.userType}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{evt.source}</td>
                          <td>{evt.device_name || 'Web Console'}</td>
                          <td>
                            <span style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 700,
                              color: evt.result === 'granted' ? 'var(--color-success)' : 'var(--color-danger)'
                            }}>
                              {evt.result === 'granted' ? 'GRANTED' : 'DENIED'}
                            </span>
                          </td>
                          <td>
                            {evt.result === 'granted' ? (
                              evt.check_out_at ? 'Exit record logged' : 'Entry accepted (active occupancy)'
                            ) : (
                              <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                                {evt.deny_reason?.toUpperCase() || 'UNAUTHORIZED CREDENTIAL'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

        {/* ----------------- HARDWARE CREDENTIAL SIMULATOR DRAWER ----------------- */}
        {isSimulatorOpen && (
          <div style={{
            width: '380px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            
            {/* Simulator screen card */}
            <div className="glass-card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              padding: '1.5rem', 
              border: simScreenState.status === 'granted' ? '2px solid var(--color-success)' : simScreenState.status === 'denied' ? '2px dashed var(--color-danger)' : '1px solid var(--border-color)',
              boxShadow: simScreenState.status === 'granted' ? '0 0 25px var(--color-success-glow)' : simScreenState.status === 'denied' ? '0 0 20px rgba(239, 68, 68, 0.1)' : 'var(--shadow-glass)',
              transition: 'all 0.3s ease-out',
              position: 'relative'
            }}>
              
              {/* Simulator Header */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Scan size={14} style={{ animation: 'pulse 1.5s infinite' }} /> Biometric Terminal Simulation
                </span>
                <button 
                  onClick={() => setIsSimulatorOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dark)', cursor: 'pointer', padding: 0 }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Hardware LCD display Screen (Simulating SpeedFace LCD screen) */}
              <div style={{ 
                background: '#040710', 
                border: '2px solid #1a1a1a', 
                borderRadius: '12px', 
                width: '100%', 
                padding: '1.25rem', 
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '220px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.9)'
              }}>
                
                {/* LCD Grid effect lines */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none', background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 6px 100%' }} />

                {/* Simulated Camera Scan Box for biometrics */}
                {simScreenState.status === 'processing' && (
                  <div style={{ position: 'absolute', border: '1.5px solid var(--color-primary)', width: '130px', height: '130px', borderRadius: '8px', opacity: 0.4, animation: 'pulse 0.8s infinite' }} />
                )}

                {/* State: Awaiting Scan */}
                {simScreenState.status === 'idle' && (
                  <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Scan size={38} style={{ strokeWidth: 1.5, animation: 'pulse 2s infinite', color: 'var(--color-primary)', marginBottom: '0.75rem' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{simScreenState.message}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dark)', marginTop: '0.25rem' }}>Present QR / Face / Card / PIN</div>
                  </div>
                )}

                {/* State: Processing Credential */}
                {simScreenState.status === 'processing' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginBottom: '0.75rem' }} />
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700 }}>{simScreenState.message}</div>
                  </div>
                )}

                {/* State: Access Granted */}
                {simScreenState.status === 'granted' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff', width: '100%', zIndex: 1, animation: 'fadeIn 0.2s ease-out' }}>
                    {/* Tick indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid var(--color-success)', borderRadius: '50%', color: 'var(--color-success)', marginBottom: '0.5rem' }}>
                      <CheckCircle2 size={24} />
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-success)', letterSpacing: '0.02em', margin: 0 }}>
                      {simScreenState.message}
                    </h3>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>{simScreenState.name}</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Code: {simScreenState.code}</div>
                    
                    <div style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', padding: '0.2rem 0.5rem', borderRadius: '4px', marginTop: '0.5rem', fontWeight: 600 }}>
                      {simScreenState.direction}
                    </div>
                    
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-dark)', marginTop: '0.4rem' }}>{simScreenState.timestamp}</span>
                  </div>
                )}

                {/* State: Access Denied */}
                {simScreenState.status === 'denied' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', zIndex: 1, animation: 'fadeIn 0.2s ease-out' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--color-danger)', borderRadius: '50%', color: 'var(--color-danger)', marginBottom: '0.5rem' }}>
                      <AlertOctagon size={24} />
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-danger)', letterSpacing: '0.02em', margin: 0 }}>
                      {simScreenState.message}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', textAlign: 'center' }}>
                      Code Present: {simScreenState.code}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#ff7a7a', fontWeight: 600, marginTop: '0.25rem', textAlign: 'center', padding: '0 0.5rem' }}>
                      {simScreenState.reason}
                    </div>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-dark)', marginTop: '0.5rem' }}>{simScreenState.timestamp}</span>
                  </div>
                )}
                
              </div>

              {/* Hardware simulator forms panel */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                
                {/* Select biometric device */}
                <div>
                  <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>1. Select Target Security Device</label>
                  <select 
                    value={selectedDeviceId}
                    onChange={e => setSelectedDeviceId(e.target.value)}
                    className="glass-select"
                    style={{ width: '100%', marginTop: '0.2rem', padding: '0.5rem', fontSize: '0.8rem' }}
                  >
                    <option value="" disabled>Select hardware device</option>
                    {devices.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.status === 'online' ? '🟢 Online' : '🔴 Offline'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Credential User Type */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    className={`btn ${userType === 'member' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '0.45rem', borderColor: 'var(--border-color)' }}
                    onClick={() => setUserType('member')}
                  >
                    Member
                  </button>
                  <button
                    className={`btn ${userType === 'employee' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '0.45rem', borderColor: 'var(--border-color)' }}
                    onClick={() => setUserType('employee')}
                  >
                    Employee / Staff
                  </button>
                </div>

                {/* Select specific individual */}
                <div>
                  <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>2. Select Individual Credentials</label>
                  <select 
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className="glass-select"
                    style={{ width: '100%', marginTop: '0.2rem', padding: '0.5rem', fontSize: '0.8rem' }}
                  >
                    <option value="" disabled>Select from directory...</option>
                    {userType === 'member' ? (
                      members.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.full_name} ({m.member_code} - {m.status})
                        </option>
                      ))
                    ) : (
                      employees.filter(e => e.status !== 'terminated').map(e => (
                        <option key={e.id} value={e.id}>
                          {e.full_name} ({e.employee_code || 'No Code'} - {e.role})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Select scan method */}
                <div>
                  <label style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600 }}>3. Authentication Method</label>
                  <select 
                    value={scanMethod}
                    onChange={e => setScanMethod(e.target.value)}
                    className="glass-select"
                    style={{ width: '100%', marginTop: '0.2rem', padding: '0.5rem', fontSize: '0.8rem' }}
                  >
                    <option value="Face Recognition">Face Recognition</option>
                    <option value="Fingerprint">Fingerprint Recognition</option>
                    <option value="Palm Recognition">Palm Recognition</option>
                    <option value="QR Code">QR Code Scan</option>
                    <option value="RFID Card">RFID Card Tap</option>
                    <option value="PIN">Password / PIN Entry</option>
                  </select>
                </div>

                {/* Simulate button */}
                <button
                  onClick={() => handleSimulateScan()}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.65rem', background: 'linear-gradient(135deg, var(--color-primary), #3b82f6)', borderColor: 'transparent', gap: '0.5rem', fontSize: '0.825rem', marginTop: '0.25rem' }}
                >
                  <Play size={14} fill="currentColor" /> Simulate Authentication Scan
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0', color: 'var(--text-dark)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                  <span style={{ padding: '0 0.5rem' }}>OR MANUAL CODE INPUT</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                </div>

                {/* Custom code entry */}
                <form 
                  onSubmit={e => {
                    e.preventDefault();
                    handleSimulateScan();
                  }}
                  style={{ display: 'flex', gap: '0.5rem' }}
                >
                  <input 
                    type="text" 
                    placeholder="e.g. BAD-CODE-192, ASC-10492"
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    className="glass-input"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0 0.75rem', borderColor: 'var(--border-color)' }}
                  >
                    Submit
                  </button>
                </form>

              </div>
            </div>

          </div>
        )}

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

    </div>
  );
};

export default AccessConsole;
