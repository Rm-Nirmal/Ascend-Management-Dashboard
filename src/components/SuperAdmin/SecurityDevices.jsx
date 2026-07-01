import { useState, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  Cpu, Plus, Settings, Trash2, ShieldCheck, ShieldAlert,
  Activity, RefreshCw, Server, Wifi, Play, CheckCircle2,
  AlertOctagon, X, Search, ToggleLeft, ToggleRight, Building
} from 'lucide-react';

const SecurityDevices = () => {
  const { 
    devices, 
    gyms, 
    addDevice, 
    updateDevice, 
    deleteDevice, 
    testDeviceConnection, 
    syncDeviceUsers, 
    showToast 
  } = useDashboard();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [gymFilter, setGymFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);

  // Form State
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    brand: 'ZKTeco',
    model: 'SpeedFace V5L',
    serialNumber: '',
    gymId: '',
    ipAddress: '192.168.1.100',
    port: '4370',
    protocol: 'TCP/IP',
    firmware: 'v2.5.1',
    isEnabled: true
  });

  // Action Pending/Diagnostic states
  const [pendingAction, setPendingAction] = useState({}); // { [deviceId]: 'testing' | 'syncing' }
  const [syncProgress, setSyncProgress] = useState({}); // { [deviceId]: progressInt }
  const [testResult, setTestResult] = useState({}); // { [deviceId]: { success, latency, message } }

  // Gym mapping for lookup
  const gymMap = useMemo(() => {
    const map = {};
    gyms.forEach(g => {
      map[g.gymId] = g.gymName;
    });
    return map;
  }, [gyms]);

  // Filters logic
  const filteredDevices = useMemo(() => {
    return devices.filter(dev => {
      const matchSearch = dev.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          dev.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          dev.ipAddress.includes(searchTerm);
      const matchGym = gymFilter === 'all' || dev.gymId === gymFilter;
      
      let matchStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'disabled') matchStatus = !dev.isEnabled;
        else matchStatus = dev.isEnabled && dev.status === statusFilter;
      }
      
      return matchSearch && matchGym && matchStatus;
    });
  }, [devices, searchTerm, gymFilter, statusFilter]);

  // Handle Add Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!deviceForm.name || !deviceForm.serialNumber || !deviceForm.gymId || !deviceForm.ipAddress) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    // Check duplicate SN in local devices list
    if (devices.some(d => d.serialNumber.trim().toLowerCase() === deviceForm.serialNumber.trim().toLowerCase())) {
      showToast('A device with this Serial Number is already registered.', 'error');
      return;
    }

    const res = await addDevice(deviceForm);
    if (res.success) {
      showToast(`Device registered successfully! Initial Status: Offline`, 'success');
      setShowAddModal(false);
      resetForm();
    } else {
      showToast(res.message || 'Failed to register device.', 'error');
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!deviceForm.name || !deviceForm.serialNumber || !deviceForm.ipAddress) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    const res = await updateDevice(editingDevice.id, deviceForm);
    if (res.success) {
      showToast('Device configuration updated successfully.', 'success');
      setEditingDevice(null);
      resetForm();
    } else {
      showToast(res.message || 'Failed to update device.', 'error');
    }
  };

  const resetForm = () => {
    setDeviceForm({
      name: '',
      brand: 'ZKTeco',
      model: 'SpeedFace V5L',
      serialNumber: '',
      gymId: gyms[0]?.gymId || '',
      ipAddress: '192.168.1.100',
      port: '4370',
      protocol: 'TCP/IP',
      firmware: 'v2.5.1',
      isEnabled: true
    });
  };

  // Run connection test
  const handleTestConnection = async (devId) => {
    setPendingAction(prev => ({ ...prev, [devId]: 'testing' }));
    setTestResult(prev => ({ ...prev, [devId]: null }));
    
    const res = await testDeviceConnection(devId);
    
    setPendingAction(prev => {
      const copy = { ...prev };
      delete copy[devId];
      return copy;
    });

    if (res.success) {
      setTestResult(prev => ({ 
        ...prev, 
        [devId]: { success: true, latency: res.latency, message: 'Ping diagnostics successful.' } 
      }));
      showToast('Connection Successful! Device status updated to Online.', 'success');
    } else {
      setTestResult(prev => ({ 
        ...prev, 
        [devId]: { success: false, latency: 0, message: res.message } 
      }));
      showToast(res.message || 'Connection test failed. Stays offline.', 'error');
    }
  };

  // Synchronize users database
  const handleSyncUsers = async (devId) => {
    setPendingAction(prev => ({ ...prev, [devId]: 'syncing' }));
    setSyncProgress(prev => ({ ...prev, [devId]: 0 }));

    // Mock progress bar increments
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setSyncProgress(prev => ({ ...prev, [devId]: progress }));
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 180);

    const res = await syncDeviceUsers(devId);
    
    clearInterval(interval);
    setSyncProgress(prev => ({ ...prev, [devId]: 100 }));
    
    setTimeout(() => {
      setPendingAction(prev => {
        const copy = { ...prev };
        delete copy[devId];
        return copy;
      });
      setSyncProgress(prev => {
        const copy = { ...prev };
        delete copy[devId];
        return copy;
      });

      if (res.success) {
        showToast('Database synchronization completed successfully.', 'success');
      } else {
        showToast('Synchronization failed.', 'error');
      }
    }, 500);
  };

  // Toggle device enable/disable
  const handleToggleDevice = async (dev) => {
    const updatedStatus = !dev.isEnabled;
    const res = await updateDevice(dev.id, { 
      isEnabled: updatedStatus,
      status: updatedStatus ? 'offline' : 'disabled' // disable moves to disabled, enable moves to offline (wait for test)
    });
    if (res.success) {
      showToast(`Device ${dev.name} ${updatedStatus ? 'Enabled (Status: Offline)' : 'Disabled'}`, 'info');
    }
  };

  // Decommission/Delete device
  const handleDeleteDevice = async (devId, devName) => {
    if (window.confirm(`Are you sure you want to decommission and remove security device "${devName}"? This action is permanent.`)) {
      const res = await deleteDevice(devId);
      if (res.success) {
        showToast(`Decommissioned device ${devName}.`, 'info');
      } else {
        showToast('Failed to delete device.', 'error');
      }
    }
  };

  // Status badges helper
  const getStatusBadge = (dev) => {
    if (!dev.isEnabled) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.05)', color: '#a3a3a3', border: '1px solid rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#737373' }} /> Disabled
        </span>
      );
    }
    
    switch (dev.status) {
      case 'online':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)', animation: 'pulse 1.5s infinite' }} /> Online
          </span>
        );
      case 'connecting':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
            <span style={{ width: '6px', height: '6px', border: '1px solid var(--color-warning)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Connecting
          </span>
        );
      case 'error':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-danger)' }} /> Connect Error
          </span>
        );
      case 'offline':
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255, 255, 255, 0.05)', color: '#d4d4d4', border: '1px solid rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#8c8c8c' }} /> Offline
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Cpu style={{ color: '#a855f7' }} /> Security Devices Inventory
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Register new biometric entry systems, map devices to gym franchises, and execute remote hardware diagnostic pings.
          </p>
        </div>
        
        <button 
          className="btn btn-primary"
          style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderColor: 'transparent', gap: '0.5rem' }}
          onClick={() => {
            resetForm();
            setDeviceForm(prev => ({ ...prev, gymId: gyms[0]?.gymId || '' }));
            setShowAddModal(true);
          }}
        >
          <Plus size={16} /> Register Security Device
        </button>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card metric-card" style={{ '--card-accent': '#a855f7' }}>
          <div className="metric-header">
            <span>TOTAL REGISTERED DEVICES</span>
            <Server size={18} style={{ color: '#a855f7' }} />
          </div>
          <div className="metric-value">{devices.length}</div>
          <div className="metric-subtext">Biometric systems registered globally</div>
        </div>

        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-success)' }}>
          <div className="metric-header">
            <span>ONLINE DEVICES</span>
            <Wifi size={18} style={{ color: 'var(--color-success)' }} />
          </div>
          <div className="metric-value">{devices.filter(d => d.status === 'online' && d.isEnabled).length}</div>
          <div className="metric-subtext">Active heartbeats logged today</div>
        </div>

        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-danger)' }}>
          <div className="metric-header">
            <span>OFFLINE & ERROR SYSTEMS</span>
            <ShieldAlert size={18} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div className="metric-value">{devices.filter(d => (d.status === 'offline' || d.status === 'error') && d.isEnabled).length}</div>
          <div className="metric-subtext">Requires immediate connectivity check</div>
        </div>

        <div className="glass-card metric-card" style={{ '--card-accent': '#737373' }}>
          <div className="metric-header">
            <span>DEACTIVATED / DISABLED</span>
            <AlertOctagon size={18} style={{ color: '#737373' }} />
          </div>
          <div className="metric-value">{devices.filter(d => !d.isEnabled).length}</div>
          <div className="metric-subtext">Temporarily blocked from communication</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '240px', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
          <input 
            type="text" 
            placeholder="Search by Device Name, Serial, IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input"
            style={{ paddingLeft: '2.5rem', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select 
            value={gymFilter}
            onChange={e => setGymFilter(e.target.value)}
            className="glass-select"
            style={{ fontSize: '0.825rem', minWidth: '150px' }}
          >
            <option value="all">All Gym franchises</option>
            {gyms.map(g => (
              <option key={g.id} value={g.gymId}>{g.gymName}</option>
            ))}
          </select>

          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="glass-select"
            style={{ fontSize: '0.825rem', minWidth: '150px' }}
          >
            <option value="all">All Statuses</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="error">Connection Error</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Device List Grid */}
      {filteredDevices.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Cpu size={48} style={{ strokeWidth: 1, color: 'var(--text-dark)', marginBottom: '1rem' }} />
          <h3>No Security Devices Found</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Try adjusting your filters or click "Register Security Device" above to onboard hardware.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filteredDevices.map(dev => {
            const isPending = pendingAction[dev.id];
            const testInfo = testResult[dev.id];
            const currentProgress = syncProgress[dev.id] || 0;

            return (
              <div 
                key={dev.id} 
                className="glass-card"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1.25rem', 
                  border: isPending ? '1px solid #a855f7' : '1px solid var(--border-color)',
                  boxShadow: isPending ? '0 0 15px rgba(168, 85, 247, 0.1)' : 'var(--shadow-glass)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Visual loading overlays for operations */}
                {isPending === 'testing' && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(4,7,16,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ width: '32px', height: '32px', border: '3px solid rgba(168, 85, 247, 0.1)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: 600, letterSpacing: '0.02em' }}>Pinging Device Relays...</span>
                  </div>
                )}

                {isPending === 'syncing' && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(4,7,16,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '0.75rem', animation: 'fadeIn 0.2s ease-out' }}>
                    <RefreshCw size={24} style={{ color: '#3b82f6', animation: 'spin 2s linear infinite' }} />
                    <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600 }}>Syncing Security Credentials...</span>
                    <div style={{ width: '100%', maxWidth: '200px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', marginTop: '0.25rem' }}>
                      <div style={{ width: `${currentProgress}%`, height: '100%', background: 'linear-gradient(to right, #3b82f6, #a855f7)', transition: 'width 0.2s ease-out' }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{currentProgress}% complete</span>
                  </div>
                )}

                {/* Device Title & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {dev.name}
                    </h3>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      <Building size={12} /> {gymMap[dev.gymId] || 'Unassigned Gym'}
                    </span>
                  </div>
                  {getStatusBadge(dev)}
                </div>

                {/* Technical Information Table */}
                <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Brand / Model:</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{dev.brand} {dev.model}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Serial Number:</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{dev.serialNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>IP Address:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{dev.ipAddress}:{dev.communicationSettings?.port || '4370'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>MAC Address:</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{dev.macAddress || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Firmware / Port:</span>
                    <span>{dev.firmware} ({dev.communicationSettings?.protocol || 'TCP'})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Registration Date:</span>
                    <span>{dev.registrationDate}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Last Sync:</span>
                    <span style={{ fontWeight: 600 }}>{dev.lastSync ? new Date(dev.lastSync).toLocaleString() : 'Never Synced'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Last Heartbeat:</span>
                    <span>{dev.lastHeartbeat ? new Date(dev.lastHeartbeat).toLocaleTimeString() : 'No communications logged'}</span>
                  </div>
                </div>

                {/* Diagnostics / Connection Test Results Banner */}
                {testInfo && (
                  <div style={{ 
                    padding: '0.65rem 0.75rem', 
                    borderRadius: '6px', 
                    fontSize: '0.75rem',
                    background: testInfo.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: testInfo.success ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    animation: 'slideUp 0.2s ease-out'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: testInfo.success ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {testInfo.success ? <CheckCircle2 size={12} /> : <AlertOctagon size={12} />}
                      <span>{testInfo.success ? 'Diagnostic Pass' : 'Diagnostic Fail'}</span>
                      {testInfo.success && <span style={{ marginLeft: 'auto', fontWeight: 500, color: 'var(--text-muted)' }}>Latency: {testInfo.latency}ms</span>}
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>{testInfo.message}</span>
                  </div>
                )}

                {/* Control Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <button 
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.725rem', padding: '0.45rem', gap: '0.35rem' }}
                    onClick={() => handleTestConnection(dev.id)}
                    disabled={!dev.isEnabled}
                    title="Run connection test to verify communication relays"
                  >
                    <Activity size={12} /> Test Connection
                  </button>

                  <button 
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.725rem', padding: '0.45rem', gap: '0.35rem' }}
                    onClick={() => handleSyncUsers(dev.id)}
                    disabled={!dev.isEnabled || dev.status !== 'online'}
                    title="Push credentials database to device local memory"
                  >
                    <RefreshCw size={12} /> Sync Users
                  </button>
                </div>

                {/* Management Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.8rem' }}>
                  {/* Enable/Disable Toggle */}
                  <div 
                    onClick={() => handleToggleDevice(dev)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', userSelect: 'none' }}
                  >
                    {dev.isEnabled ? (
                      <ToggleRight size={22} style={{ color: '#a855f7' }} />
                    ) : (
                      <ToggleLeft size={22} style={{ color: 'var(--text-dark)' }} />
                    )}
                    <span style={{ fontWeight: 600, fontSize: '0.75rem', color: dev.isEnabled ? '#fff' : 'var(--text-muted)' }}>
                      {dev.isEnabled ? 'Device Enabled' : 'Device Disabled'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button 
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem', borderColor: 'var(--border-color)' }}
                      onClick={() => {
                        setEditingDevice(dev);
                        setDeviceForm({
                          name: dev.name,
                          brand: dev.brand || 'ZKTeco',
                          model: dev.model || 'SpeedFace V5L',
                          serialNumber: dev.serialNumber,
                          gymId: dev.gymId,
                          ipAddress: dev.ipAddress,
                          port: dev.communicationSettings?.port || '4370',
                          protocol: dev.communicationSettings?.protocol || 'TCP/IP',
                          firmware: dev.firmware || 'v2.5.1',
                          isEnabled: dev.isEnabled
                        });
                        setShowAddModal(true);
                      }}
                      title="Edit Device Settings"
                    >
                      <Settings size={12} />
                    </button>
                    
                    <button 
                      className="btn btn-danger"
                      style={{ padding: '0.35rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                      onClick={() => handleDeleteDevice(dev.id, dev.name)}
                      title="Decommission & Remove"
                    >
                      <Trash2 size={12} style={{ color: 'var(--color-danger)' }} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: REGISTER / EDIT DEVICE */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                {editingDevice ? `Modify Configuration: ${editingDevice.name}` : 'Register Security Device'}
              </h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingDevice(null);
                }} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingDevice ? handleEditSubmit : handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Device Name (Location context) *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Main Entrance Gate, VIP Turnstile 01"
                  value={deviceForm.name} 
                  onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })} 
                  className="glass-input" 
                  style={{ marginTop: '0.25rem' }}
                  required 
                />
              </div>

              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Brand Name</label>
                  <input 
                    type="text" 
                    value={deviceForm.brand} 
                    onChange={(e) => setDeviceForm({ ...deviceForm, brand: e.target.value })} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Model Name</label>
                  <input 
                    type="text" 
                    value={deviceForm.model} 
                    onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                  />
                </div>
              </div>

              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Serial Number (Unique Primary Key) *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ZK-AC-89028"
                    value={deviceForm.serialNumber} 
                    onChange={(e) => setDeviceForm({ ...deviceForm, serialNumber: e.target.value })} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                    required 
                    disabled={!!editingDevice} // Serial Number cannot be modified once set to match hardware specs
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Connect to Gym Franchise *</label>
                  <select 
                    value={deviceForm.gymId} 
                    onChange={(e) => setDeviceForm({ ...deviceForm, gymId: e.target.value })} 
                    className="glass-select"
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.625rem' }}
                    required
                    disabled={!!editingDevice} // Gym linking is permanent in single device registers
                  >
                    <option value="" disabled>Select gym location</option>
                    {gyms.map(g => (
                      <option key={g.id} value={g.gymId}>{g.gymName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IP Address (LAN Static) *</label>
                  <input 
                    type="text" 
                    placeholder="192.168.1.100"
                    value={deviceForm.ipAddress} 
                    onChange={(e) => setDeviceForm({ ...deviceForm, ipAddress: e.target.value })} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem', fontFamily: 'monospace' }}
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Port Number</label>
                  <input 
                    type="text" 
                    value={deviceForm.port} 
                    onChange={(e) => setDeviceForm({ ...deviceForm, port: e.target.value })} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem', fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Protocol</label>
                  <select
                    value={deviceForm.protocol}
                    onChange={(e) => setDeviceForm({ ...deviceForm, protocol: e.target.value })}
                    className="glass-select"
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.625rem' }}
                  >
                    <option value="TCP/IP">TCP/IP</option>
                    <option value="UDP">UDP</option>
                    <option value="RS485">RS485</option>
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Firmware Version</label>
                  <input 
                    type="text" 
                    value={deviceForm.firmware} 
                    onChange={(e) => setDeviceForm({ ...deviceForm, firmware: e.target.value })} 
                    className="glass-input" 
                    style={{ marginTop: '0.25rem' }}
                  />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={deviceForm.isEnabled}
                      onChange={(e) => setDeviceForm({ ...deviceForm, isEnabled: e.target.checked })}
                      style={{ accentColor: '#a855f7', width: '16px', height: '16px' }}
                    />
                    <span>Enable device communication</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingDevice(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderColor: 'transparent' }}
                >
                  {editingDevice ? 'Save Settings' : 'Register System'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embed Keyframes for diagnostics animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

    </div>
  );
};

export default SecurityDevices;
