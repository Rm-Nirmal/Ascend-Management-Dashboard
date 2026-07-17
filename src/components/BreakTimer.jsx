import { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Play, Square, Coffee, Clock, Calendar, CheckCircle, 
  Briefcase, FileText, CheckSquare, PlusSquare, Info, AlertTriangle 
} from 'lucide-react';

// Timezone-safe local date string helper
const getLocalDateStr = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const BreakTimer = () => {
  const {
    currentUser,
    employees = [],
    breakLogs = [],
    startBreak,
    stopBreak,
    showToast,
    shiftLogs = [],
    clockInOutShift,
    leaveRequests = [],
    requestLeave
  } = useDashboard();

  // Navigation tab
  const [activeTab, setActiveTab] = useState('desk'); // 'desk' | 'leaves'
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // Form states for Shift Report & Handover
  const [roleTitle, setRoleTitle] = useState('');
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');

  // Find corresponding employee record
  const currentEmployee = useMemo(() => {
    if (!currentUser?.email || !employees) return null;
    return (employees || []).find(e => e && e.email && e.email.toLowerCase() === currentUser.email.toLowerCase());
  }, [currentUser, employees]);

  const employeeId = currentEmployee?.id || currentUser?.id || 'unknown';
  const employeeName = currentEmployee?.full_name || currentUser?.name || 'Administrator';

  // Find active break and shift for the logged-in user
  const activeBreak = useMemo(() => {
    return (breakLogs || []).find(b => b && b.employeeId === employeeId && b.status === 'active');
  }, [breakLogs, employeeId]);

  const activeShift = useMemo(() => {
    return (shiftLogs || []).find(s => s && s.employeeId === employeeId && s.status === 'active');
  }, [shiftLogs, employeeId]);

  const isOnLeaveToday = useMemo(() => {
    if (!leaveRequests) return false;
    const todayStr = getLocalDateStr();
    return (leaveRequests || []).some(r => 
      r && 
      r.employeeId === employeeId && 
      r.status === 'approved' && 
      todayStr >= r.startDate && 
      todayStr <= r.endDate
    );
  }, [leaveRequests, employeeId]);

  // Elapsed time states (seconds)
  const [elapsed, setElapsed] = useState(0);
  const [shiftElapsed, setShiftElapsed] = useState(0);

  // Sync elapsed tickers
  useEffect(() => {
    let intervalId = null;
    const calculateElapsed = () => {
      const now = Date.now();
      if (activeBreak) {
        const start = new Date(activeBreak.startTime).getTime();
        setElapsed(Math.max(0, Math.floor((now - start) / 1000)));
      } else {
        setElapsed(0);
      }

      if (activeShift) {
        const start = new Date(activeShift.startTime).getTime();
        setShiftElapsed(Math.max(0, Math.floor((now - start) / 1000)));
      } else {
        setShiftElapsed(0);
      }
    };

    calculateElapsed();
    intervalId = setInterval(calculateElapsed, 1000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeBreak, activeShift]);

  // Handle start break
  const handleStartBreak = async () => {
    if (!activeShift) {
      showToast('You must clock in for your shift before starting a break!', 'warning');
      return;
    }
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

  // Handle Shift Clock-In / Clock-Out
  const handleToggleShift = async () => {
    if (activeBreak) {
      showToast('Please stop your active break before clocking out of your shift!', 'warning');
      return;
    }

    if (activeShift) {
      // Clocking out: end shift and save handover notes
      const confirmClockOut = window.confirm('Are you sure you want to end your shift for today?');
      if (!confirmClockOut) return;

      const res = await clockInOutShift(employeeId, employeeName);
      if (res.success) {
        try {
          // Update the shift log document in Firestore with custom daily report fields
          const shiftRef = doc(db, 'shiftLogs', activeShift.id);
          await updateDoc(shiftRef, {
            notes: shiftNotes.trim(),
            tasksCompleted: tasksCompleted.trim(),
            roleTitle: roleTitle.trim()
          });
          showToast('Shift ended! Handover report submitted successfully.', 'success');
        } catch (err) {
          console.error('Error saving shift report:', err);
          showToast('Shift ended, but failed to save report details.', 'warning');
        }
        // Reset local states
        setRoleTitle('');
        setTasksCompleted('');
        setShiftNotes('');
      } else {
        showToast(res.message || 'Failed to clock out.', 'error');
      }
    } else {
      // Clocking in
      const res = await clockInOutShift(employeeId, employeeName);
      if (res.success) {
        showToast('Shift started! Have a productive day.', 'success');
      } else {
        showToast(res.message || 'Failed to clock in.', 'error');
      }
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
    return (breakLogs || [])
      .filter(b => b && b.employeeId === employeeId && b.status === 'completed')
      .slice(0, 10); // Show last 10 completed breaks
  }, [breakLogs, employeeId]);

  // Filter completed shifts for current employee
  const myCompletedShifts = useMemo(() => {
    return (shiftLogs || [])
      .filter(s => s && s.employeeId === employeeId && s.status === 'completed')
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .slice(0, 5); // Show last 5 completed shifts
  }, [shiftLogs, employeeId]);

  // Sum today's break duration
  const todaysTotalBreakTime = useMemo(() => {
    const todayStr = getLocalDateStr();
    const todaysSeconds = (breakLogs || [])
      .filter(b => b && b.employeeId === employeeId && b.status === 'completed' && b.startTime && b.startTime.startsWith(todayStr))
      .reduce((sum, b) => sum + (b.duration || 0), 0);
    
    // Add active break if it exists
    const activeSeconds = activeBreak ? elapsed : 0;
    return todaysSeconds + activeSeconds;
  }, [breakLogs, employeeId, activeBreak, elapsed]);

  // Sum today's total shift duration
  const todaysTotalShiftTime = useMemo(() => {
    const todayStr = getLocalDateStr();
    const completedSeconds = (shiftLogs || [])
      .filter(s => s && s.employeeId === employeeId && s.status === 'completed' && s.startTime && s.startTime.startsWith(todayStr))
      .reduce((sum, s) => sum + (s.duration || 0), 0);
    
    const activeSeconds = activeShift ? shiftElapsed : 0;
    return completedSeconds + activeSeconds;
  }, [shiftLogs, employeeId, activeShift, shiftElapsed]);

  // Net work time today (Shift time minus breaks)
  const todaysNetWorkTime = useMemo(() => {
    return Math.max(0, todaysTotalShiftTime - todaysTotalBreakTime);
  }, [todaysTotalShiftTime, todaysTotalBreakTime]);

  const expectedDailyHours = currentEmployee?.working_hours || 8;
  
  // Calculate active shift progress percentage
  const progressPct = useMemo(() => {
    if (!activeShift) return 0;
    const activeHours = shiftElapsed / 3600;
    return Math.min(100, Math.round((activeHours / expectedDailyHours) * 100));
  }, [activeShift, shiftElapsed, expectedDailyHours]);

  // Calculate dynamic target clock-out time (start + target hours + break hours)
  const targetClockOutTime = useMemo(() => {
    if (!activeShift) return '--';
    const startTimeMs = new Date(activeShift.startTime).getTime();
    const targetMs = expectedDailyHours * 3600 * 1000;
    const breakMs = todaysTotalBreakTime * 1000;
    const targetTime = new Date(startTimeMs + targetMs + breakMs);
    return targetTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, [activeShift, expectedDailyHours, todaysTotalBreakTime]);

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

  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    type: 'paid'
  });
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      showToast('Please fill in all leave request fields.', 'warning');
      return;
    }
    if (new Date(leaveForm.endDate) < new Date(leaveForm.startDate)) {
      showToast('End Date cannot be before Start Date.', 'warning');
      return;
    }
    setIsSubmittingLeave(true);
    try {
      const res = await requestLeave({
        employeeId,
        employeeName,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason,
        type: leaveForm.type || 'paid'
      });
      if (res.success) {
        showToast('Leave request submitted to owner for review!', 'success');
        setLeaveForm({ startDate: '', endDate: '', reason: '', type: 'paid' });
      } else {
        showToast(res.message || 'Request failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('An unexpected error occurred.', 'error');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // My Leave Requests
  const myLeaveRequests = useMemo(() => {
    return (leaveRequests || []).filter(r => r && r.employeeId === employeeId);
  }, [leaveRequests, employeeId]);

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-info">
          <h1>Shift & Break</h1>
          <p>Track your shifts, break times, and manage leave planners in one place.</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', marginTop: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('desk')}
          style={{
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'desk' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'desk' ? 'var(--color-primary)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Shift & Break Desk
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          style={{
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'leaves' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'leaves' ? 'var(--color-primary)' : 'var(--text-muted)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Leave Planner
        </button>
      </div>

      {activeTab === 'desk' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Left Column: Shift & Break Controls */}
          <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Ambient Blob */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '200px',
              height: '200px',
              background: activeShift 
                ? (activeBreak ? 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)')
                : 'radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            {/* Shift Status Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span className="badge" style={{
                fontSize: '0.7rem',
                padding: '0.3rem 0.75rem',
                background: activeShift ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: activeShift ? '#10b981' : '#ef4444',
                border: activeShift ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                {activeShift ? 'Shift Active' : 'Off Duty'}
              </span>
              {activeShift && (
                <span className="badge" style={{
                  fontSize: '0.7rem',
                  padding: '0.3rem 0.75rem',
                  background: activeBreak ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                  color: activeBreak ? '#f59e0b' : '#3b82f6',
                  border: activeBreak ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(59, 130, 246, 0.2)',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}>
                  {activeBreak ? 'Rest Break' : 'Active Duty'}
                </span>
              )}
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              {employeeName}
            </h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '1.5rem' }}>
              <Briefcase size={12} />
              <span>Role: {currentEmployee?.role || 'Gym Staff'}</span>
            </div>

            {isOnLeaveToday && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                color: '#f59e0b',
                fontSize: '0.825rem',
                fontWeight: 600,
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                justifyContent: 'center',
                width: '100%'
              }}>
                <span>🏝️</span>
                <span>You are currently on approved leave today. Enjoy your rest!</span>
              </div>
            )}

            {/* Timer Displays */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Shift Work Hours Counter */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Today's Net Working Time (Live)
                </span>
                <div style={{ fontFamily: 'monospace', fontSize: '3rem', fontWeight: 700, color: activeShift && !activeBreak ? 'var(--color-primary)' : 'var(--text-primary)', margin: '0.25rem 0' }}>
                  {formatTime(activeShift ? todaysNetWorkTime : 0)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Total shift duration minus breaks. Daily target: <strong>{expectedDailyHours} Hours</strong>.
                </div>
              </div>

              {/* Rest Break Counter */}
              {activeBreak && (
                <div style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', padding: '0.85rem' }}>
                  <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Active Rest Break Duration
                  </span>
                  <div style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, color: '#f59e0b', margin: '0.15rem 0' }}>
                    {formatTime(elapsed)}
                  </div>
                </div>
              )}
            </div>

            {/* Active Shift Progress Metrics */}
            {activeShift && (
              <div style={{ width: '100%', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  <span>Daily Shift Progress</span>
                  <span style={{ color: progressPct >= 100 ? 'var(--color-success)' : 'var(--color-primary)', fontWeight: 700 }}>{progressPct}%</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    background: progressPct >= 100 ? 'var(--color-success)' : 'var(--color-primary)',
                    borderRadius: '4px',
                    boxShadow: progressPct >= 100 ? '0 0 10px var(--color-success)' : '0 0 10px var(--color-primary)',
                    transition: 'width 0.5s ease-out'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span>Clocked In: {new Date(activeShift.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  <span>Target Clock-out: {targetClockOutTime}</span>
                </div>
              </div>
            )}

            {/* Daily Handover Report (Only displayed when active shift is running) */}
            {activeShift && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <FileText size={14} />
                  Daily Handover & Shift Report
                </span>
                
                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Shift Role / Desk Section</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="e.g. Front Desk Reception, Floor Trainer"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Tasks Accomplished</label>
                  <textarea 
                    className="glass-input" 
                    value={tasksCompleted}
                    onChange={(e) => setTasksCompleted(e.target.value)}
                    placeholder="List registrations, cleaning duties, till matches, etc."
                    rows={2}
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', width: '100%', resize: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Handover Notes / Incident Logs</label>
                  <textarea 
                    className="glass-input" 
                    value={shiftNotes}
                    onChange={(e) => setShiftNotes(e.target.value)}
                    placeholder="Note client concerns, equipment issues, or drawer summaries..."
                    rows={2}
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem', width: '100%', resize: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '360px' }}>
              {/* Shift clock in / clock out */}
              <button
                onClick={handleToggleShift}
                className={`btn ${activeShift ? 'btn-danger' : 'btn-primary'}`}
                style={{
                  padding: '0.85rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  gap: '0.5rem',
                  background: activeShift ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-glow))'
                }}
              >
                {activeShift ? (
                  <>
                    <Square size={16} fill="currentColor" /> End Shift for Today
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" /> Start Work Shift
                  </>
                )}
              </button>

              {/* Break start / stop */}
              {activeShift && (
                <button
                  onClick={activeBreak ? handleStopBreak : handleStartBreak}
                  className={`btn ${activeBreak ? 'btn-danger' : 'btn-secondary'}`}
                  style={{
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    gap: '0.5rem',
                    borderColor: activeBreak ? 'transparent' : 'rgba(245, 158, 11, 0.3)',
                    color: activeBreak ? '#fff' : '#f59e0b',
                    background: activeBreak ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245, 158, 11, 0.05)'
                  }}
                >
                  {activeBreak ? (
                    <>
                      <Square size={16} fill="currentColor" /> End Rest Break
                    </>
                  ) : (
                    <>
                      <Coffee size={16} /> Start Rest Break
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Today's Metrics & Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Shift Metrics */}
            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="glass-card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Break Duration Today</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.25rem', color: '#f59e0b' }}>
                  {formatFriendlyDuration(todaysTotalBreakTime)}
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.15rem' }}>
                  Allowance: {currentEmployee?.daily_break_time || 60} mins
                </span>
              </div>
              <div className="glass-card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Work Status</span>
                {todaysNetWorkTime >= expectedDailyHours * 3600 ? (
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.25rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle size={14} /> Daily Quota Achieved
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Info size={14} /> Quota Incomplete
                  </div>
                )}
              </div>
            </div>

            {/* Daily Hours Quota Summary Panel */}
            <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-primary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Daily Quota Progress
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
                  {formatTime(todaysNetWorkTime)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>worked today</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Target: {expectedDailyHours} hrs
                </div>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', marginTop: '0.25rem' }}>
                <div style={{
                  width: `${Math.min(100, Math.round((todaysNetWorkTime / (expectedDailyHours * 3600)) * 100))}%`,
                  height: '100%',
                  background: 'var(--color-primary)',
                  borderRadius: '3px'
                }} />
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Accumulated: <strong>{((todaysNetWorkTime / (expectedDailyHours * 3600)) * 100).toFixed(1)}%</strong> of expected shift hours.
              </div>
            </div>

            {/* Shift History Ledger */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Briefcase size={16} style={{ color: 'var(--color-primary)' }} />
                  Recent Shift History
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                  Your logged work shifts and daily handovers.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '220px', overflowY: 'auto' }}>
                {myCompletedShifts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                    No shifts logged recently.
                  </div>
                ) : (
                  myCompletedShifts.map((log) => {
                    const date = new Date(log.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    const startStr = new Date(log.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    const endStr = log.endTime ? new Date(log.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '--';

                    return (
                      <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fff' }}>{date}</span>
                          <span className="badge" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontWeight: 600 }}>
                            Clocked Out
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>Time: <strong>{startStr} - {endStr}</strong></span>
                          <span>Net: <strong>{formatFriendlyDuration(log.duration || 0)}</strong></span>
                        </div>
                        {log.roleTitle && (
                          <div style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Role: </span>
                            <strong style={{ color: 'var(--color-primary)' }}>{log.roleTitle}</strong>
                          </div>
                        )}
                        {log.tasksCompleted && (
                          <div style={{ fontSize: '0.725rem', background: 'rgba(0,0,0,0.15)', padding: '0.35rem 0.5rem', borderRadius: '4px', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            <strong style={{ color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Handover Summary:</strong>
                            {log.tasksCompleted}
                          </div>
                        )}
                        {log.notes && (
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontStyle: 'italic', borderLeft: '2px solid var(--border-color)', paddingLeft: '0.5rem', marginTop: '0.15rem' }}>
                            &ldquo;{log.notes}&rdquo;
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Break logs list */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
                  Recent Rest Breaks
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                  Your logged break intervals for today & prior duties.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
                {myCompletedBreaks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                    No break intervals logged recently.
                  </div>
                ) : (
                  myCompletedBreaks.map((log) => {
                    const date = new Date(log.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const startStr = new Date(log.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    const endStr = log.endTime ? new Date(log.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '--';

                    return (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle size={10} />
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{date}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{startStr} - {endStr}</div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
      )}

      {activeTab === 'leaves' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Calendar Display */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                My Leave Calendar - {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                >
                  &larr; Prev
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                  onClick={() => setCalendarDate(new Date())}
                >
                  Today
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                >
                  Next &rarr;
                </button>
              </div>
            </div>

            {/* Calendar Grid Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Grid Body */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {(() => {
                const year = calendarDate.getFullYear();
                const month = calendarDate.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const firstDayIndex = new Date(year, month, 1).getDay();
                
                const cells = [];
                for (let i = 0; i < firstDayIndex; i++) {
                  cells.push(<div key={`empty-${i}`} style={{ minHeight: '80px', background: 'transparent' }} />);
                }

                for (let day = 1; day <= daysInMonth; day++) {
                  const dayStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                  const dayRequests = myLeaveRequests.filter(r => r && dayStr >= r.startDate && dayStr <= r.endDate);

                  cells.push(
                    <div
                      key={`day-${day}`}
                      style={{
                        minHeight: '80px',
                        padding: '0.35rem',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        overflow: 'hidden'
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{day}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', overflowY: 'auto', flexGrow: 1 }}>
                        {dayRequests.map(r => {
                          const isApproved = r.status === 'approved';
                          const isPending = r.status === 'pending';
                          const badgeColor = isApproved ? 'rgba(16,185,129,0.15)' : isPending ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)';
                          const textColor = isApproved ? '#10b981' : isPending ? '#f59e0b' : '#ef4444';
                          return (
                            <div
                              key={r.id}
                              style={{
                                fontSize: '0.625rem',
                                padding: '0.1rem 0.25rem',
                                borderRadius: '4px',
                                background: badgeColor,
                                color: textColor,
                                border: `1px solid ${textColor}33`,
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden'
                              }}
                              title={`${r.reason} (${r.status})`}
                            >
                              Leave ({r.status})
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return cells;
              })()}
            </div>
          </div>

          {/* Leave request form & history */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Leave allowance summary */}
            <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Leaves Remaining</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.15rem', color: 'var(--color-primary)' }}>
                  {currentEmployee?.monthly_leaves !== undefined ? currentEmployee.monthly_leaves : 2} Days
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
              </div>
            </div>

            {/* Request Leave Form */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusSquare size={18} style={{ color: 'var(--color-primary)' }} />
                Request Leave
              </h3>

              <form onSubmit={handleLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-2" style={{ gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Start Date</label>
                    <input
                      type="date"
                      className="glass-input"
                      value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                      required
                      style={{ marginTop: '0.25rem', padding: '0.5rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>End Date</label>
                    <input
                      type="date"
                      className="glass-input"
                      value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                      required
                      style={{ marginTop: '0.25rem', padding: '0.5rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Leave Type</label>
                  <select
                    className="glass-select"
                    value={leaveForm.type || 'paid'}
                    onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.5rem', height: '38px' }}
                    required
                  >
                    <option value="paid">Paid Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reason / Description</label>
                  <textarea
                    className="glass-input"
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    required
                    rows="3"
                    style={{ marginTop: '0.25rem', padding: '0.5rem', resize: 'none' }}
                    placeholder="Enter reason for your leave request..."
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingLeave}
                  style={{ width: '100%', padding: '0.65rem', fontWeight: 700, fontSize: '0.85rem', marginTop: '0.5rem' }}
                >
                  {isSubmittingLeave ? 'Submitting request...' : 'Submit Leave Request'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

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
