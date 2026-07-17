import { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Play, Square, Coffee, Clock, Calendar, CheckCircle, Briefcase, FileText, CheckSquare, PlusSquare } from 'lucide-react';

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
    const todayStr = new Date().toISOString().split('T')[0];
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
    const res = await clockInOutShift(employeeId, employeeName);
    if (res.success) {
      if (res.action === 'clock_in') {
        showToast('Shift started! Have a productive day.', 'success');
      } else {
        showToast('Shift ended! Shift logs updated.', 'info');
      }
    } else {
      showToast(res.message || 'Failed to update shift.', 'error');
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

  // Sum today's break duration
  const todaysTotalBreakTime = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysSeconds = (breakLogs || [])
      .filter(b => b && b.employeeId === employeeId && b.status === 'completed' && b.startTime && b.startTime.startsWith(todayStr))
      .reduce((sum, b) => sum + (b.duration || 0), 0);
    
    // Add active break if it exists
    const activeSeconds = activeBreak ? elapsed : 0;
    return todaysSeconds + activeSeconds;
  }, [breakLogs, employeeId, activeBreak, elapsed]);

  // Sum today's total shift duration
  const todaysTotalShiftTime = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
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
          <h1>Employee Desk</h1>
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

            {/* Shift Indicators */}
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
                {activeShift ? 'Shift Clocked In' : 'Shift Clocked Out'}
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
                  {activeBreak ? 'On Rest Break' : 'On Active Duty'}
                </span>
              )}
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              {employeeName}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', maxWidth: '320px', marginBottom: '1.5rem' }}>
              {!activeShift 
                ? 'You are currently off-duty. Please clock in to start your work shift.' 
                : (activeBreak 
                  ? 'Your rest break is active. Remember to end it when returning to duty.' 
                  : 'You are clocked in. You can log rest breaks or clock out when your shift ends.'
                )
              }
            </p>

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
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {/* Shift Work Hours Counter */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Today's Net Working Time (Live)
                </span>
                <div style={{ fontFamily: 'monospace', fontSize: '3rem', fontWeight: 700, color: activeShift && !activeBreak ? 'var(--color-primary)' : 'var(--text-primary)', margin: '0.25rem 0' }}>
                  {formatTime(todaysNetWorkTime)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Total Shift time minus break logs. Expected: <strong>{currentEmployee?.working_hours || 8} Hours</strong>.
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
                    <Square size={16} fill="currentColor" /> Clock Out Shift
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" /> Clock In Shift
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
                {todaysNetWorkTime >= (currentEmployee?.working_hours || 8) * 3600 ? (
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.25rem', color: '#10b981' }}>
                    Daily Quota Met! (OT logged)
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                    Quota Incomplete
                  </div>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
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
