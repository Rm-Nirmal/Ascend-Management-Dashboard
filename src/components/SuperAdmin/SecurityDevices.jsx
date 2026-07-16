import { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  Cpu, Plus, Settings, Trash2, ShieldCheck, ShieldAlert,
  Activity, RefreshCw, Server, Wifi, CheckCircle2,
  AlertOctagon, X, Search, ToggleLeft, ToggleRight, Building,
  Sliders, MapPin, Layers, Info
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
  const [currentTime] = useState(() => Date.now());

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);

  // Wizard Step State
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardTesting, setWizardTesting] = useState(false);
  const [wizardTestResult, setWizardTestResult] = useState(null);
  const [skipVerification, setSkipVerification] = useState(false);

  // Form State
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    brand: 'ZKTeco',
    model: 'SpeedFace V5L',
    serialNumber: '',
    gymId: '',
    entranceType: 'Main Entrance',
    physicalLocation: '',
    devicePurpose: 'Door Access + Attendance',
    capabilities: {
      face: true,
      fingerprint: true,
      rfid: true,
      qr: false,
      pin: true,
      palm: false
    },
    ipAddress: '192.168.1.100',
    port: '4370',
    protocol: 'TCP/IP',
    firmware: '',
    macAddress: '',
    isEnabled: true
  });

  // Action Pending/Diagnostic states for grid view
  const [pendingAction, setPendingAction] = useState({}); // { [deviceId]: 'testing' | 'syncing' }
  const [syncProgress, setSyncProgress] = useState({}); // { [deviceId]: progressInt }
  const [testResult, setTestResult] = useState({}); // { [deviceId]: { success, latency, steps, message } }

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
        matchStatus = dev.status === statusFilter;
      }
      
      return matchSearch && matchGym && matchStatus;
    });
  }, [devices, searchTerm, gymFilter, statusFilter]);

  // Initialize gym select on open
  useEffect(() => {
    if (gyms.length > 0 && !deviceForm.gymId) {
      const timer = setTimeout(() => {
        setDeviceForm(prev => {
          if (prev.gymId) return prev;
          return { ...prev, gymId: gyms[0].gymId };
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [gyms, deviceForm.gymId]);

  const resetForm = () => {
    setDeviceForm({
      name: '',
      brand: 'ZKTeco',
      model: 'SpeedFace V5L',
      serialNumber: '',
      gymId: gyms[0]?.gymId || '',
      entranceType: 'Main Entrance',
      physicalLocation: '',
      devicePurpose: 'Door Access + Attendance',
      capabilities: {
        face: true,
        fingerprint: true,
        rfid: true,
        qr: false,
        pin: true,
        palm: false
      },
      ipAddress: '192.168.1.100',
      port: '4370',
      protocol: 'TCP/IP',
      firmware: '',
      macAddress: '',
      isEnabled: true
    });
    setWizardStep(1);
    setWizardTesting(false);
    setWizardTestResult(null);
    setSkipVerification(false);
  };

  // Step 1 validation & transition
  const handleStep1Next = () => {
    if (!deviceForm.name || !deviceForm.brand || !deviceForm.model || !deviceForm.serialNumber || !deviceForm.gymId) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    // Check duplicate SN in local devices list (only for new registrations)
    if (!editingDevice && devices.some(d => d.serialNumber.trim().toLowerCase() === deviceForm.serialNumber.trim().toLowerCase())) {
      showToast('This device is already registered.', 'error');
      return;
    }

    setWizardStep(2);
  };

  // Step 2 validation & transition
  const handleStep2Next = () => {
    if (!deviceForm.physicalLocation || !deviceForm.entranceType || !deviceForm.devicePurpose) {
      showToast('Please specify device location and capabilities.', 'warning');
      return;
    }
    setWizardStep(3);
  };

  // Step 3 validation & transition
  const handleStep3Next = () => {
    if (!deviceForm.ipAddress || !deviceForm.port || !deviceForm.protocol) {
      showToast('Please complete network configuration.', 'warning');
      return;
    }
    setWizardStep(4);
  };

  // Handle Wizard Submit
  const handleWizardSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!skipVerification && (!wizardTestResult || !wizardTestResult.success)) {
      showToast('Please pass connection diagnostics or skip verification.', 'warning');
      return;
    }

    if (editingDevice) {
      const res = await updateDevice(editingDevice.id, deviceForm);
      if (res.success) {
        showToast('Device configuration updated successfully.', 'success');
        setEditingDevice(null);
        setShowAddModal(false);
        resetForm();
      } else {
        showToast(res.message || 'Failed to update device.', 'error');
      }
    } else {
      const res = await addDevice(deviceForm);
      if (res.success) {
        showToast('Device registered successfully! Status: Offline', 'success');
        setShowAddModal(false);
        resetForm();
      } else {
        showToast(res.message || 'Failed to register device.', 'error');
      }
    }
  };

  // Run connection test (Wizard context)
  const handleWizardTestConnection = async () => {
    setWizardTesting(true);
    setWizardTestResult(null);
    
    const res = await testDeviceConnection(deviceForm);
    
    setWizardTesting(false);
    setWizardTestResult(res);

    if (res.success) {
      showToast('Connection Successful! Device diagnostics passed.', 'success');
    } else {
      showToast(res.message || 'Connection Failed.', 'error');
    }
  };

  // Run connection test (Grid view context)
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
        [devId]: { success: true, latency: res.latency, steps: res.steps, message: 'Ping diagnostics successful.' } 
      }));
      showToast('Connection Successful! Device status updated to Online.', 'success');
    } else {
      setTestResult(prev => ({ 
        ...prev, 
        [devId]: { success: false, latency: 0, steps: res.steps, message: res.message } 
      }));
      showToast(res.message || 'Connection test failed.', 'error');
    }
  };

  // Synchronize users database
  const handleSyncUsers = async (devId) => {
    setPendingAction(prev => ({ ...prev, [devId]: 'syncing' }));
    setSyncProgress(prev => ({ ...prev, [devId]: 0 }));

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

  // Toggle device enable/disable (Activation)
  const handleToggleDevice = async (dev) => {
    const updatedStatus = dev.status === 'disabled';
    const res = await updateDevice(dev.id, { 
      isEnabled: updatedStatus
    });
    if (res.success) {
      showToast(`Device ${dev.name} ${updatedStatus ? 'Activated (Status: Offline)' : 'Disabled'}`, 'info');
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

  // Calculate dynamic last seen
  const getLastSeenText = (lastHeartbeat) => {
    if (!lastHeartbeat) return 'No heartbeats logged';
    const diffMs = currentTime - new Date(lastHeartbeat).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 5) return '3 sec ago';
    if (diffSec < 60) return `${diffSec} sec ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr} hours ago`;
  };

  // Status badges helper
  const getStatusBadge = (dev) => {
    const statusVal = dev.status || 'offline';
    
    switch (statusVal) {
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
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-danger)' }} /> Connection Error
          </span>
        );
      case 'maintenance':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} /> Maintenance
          </span>
        );
      case 'disabled':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255,255,255,0.05)', color: '#a3a3a3', border: '1px solid rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#737373' }} /> Disabled
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

  const authMethodsList = [
    { key: 'face', label: 'Face Recognition' },
    { key: 'fingerprint', label: 'Fingerprint Recognition' },
    { key: 'palm', label: 'Palm Recognition' },
    { key: 'rfid', label: 'RFID Card' },
    { key: 'qr', label: 'QR Code' },
    { key: 'pin', label: 'Password / PIN' }
  ];

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Cpu style={{ color: '#a855f7' }} /> Security Devices Inventory
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Configure and register multi-door access points, monitor biometric relay status, and audit network diagnostics.
          </p>
        </div>
        
        <button 
          className="btn btn-primary"
          style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderColor: 'transparent', gap: '0.5rem' }}
          onClick={() => {
            resetForm();
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
          <div className="metric-value">{devices.filter(d => d.status === 'online').length}</div>
          <div className="metric-subtext">Active heartbeats logged today</div>
        </div>

        <div className="glass-card metric-card" style={{ '--card-accent': 'var(--color-danger)' }}>
          <div className="metric-header">
            <span>CONNECTION ERRORS</span>
            <ShieldAlert size={18} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div className="metric-value">{devices.filter(d => d.status === 'error').length}</div>
          <div className="metric-subtext">Requires immediate connectivity check</div>
        </div>

        <div className="glass-card metric-card" style={{ '--card-accent': '#737373' }}>
          <div className="metric-header">
            <span>DEACTIVATED / DISABLED</span>
            <AlertOctagon size={18} style={{ color: '#737373' }} />
          </div>
          <div className="metric-value">{devices.filter(d => d.status === 'disabled').length}</div>
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
            <option value="connecting">Connecting</option>
            <option value="error">Connection Error</option>
            <option value="maintenance">Maintenance</option>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
          {filteredDevices.map(dev => {
            const isPending = pendingAction[dev.id];
            const gridTestInfo = testResult[dev.id];
            const currentProgress = syncProgress[dev.id] || 0;

            const isActVal = dev.status !== 'disabled';

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
                      {dev.device?.name || dev.name}
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
                    <span style={{ fontWeight: 600, color: '#fff' }}>{dev.device?.brand || dev.brand} {dev.device?.model || dev.model}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Serial Number:</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{dev.device?.serial || dev.serialNumber}</span>
                  </div>
                  
                  {/* Location & Addressing Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={10} style={{ color: '#a855f7' }} /> 
                      {dev.configuration?.physicalLocation || 'Reception'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Entrance / Purpose:</span>
                    <span>{dev.configuration?.entranceType || 'Main Entrance'} ({dev.configuration?.purpose || 'Access'})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Hardware Addresses:</span>
                    <span style={{ fontWeight: 600, color: '#e4e4e7', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Layers size={10} />
                      Dev #{dev.configuration?.deviceNumber || 1} / Door #{dev.configuration?.doorNumber || 1} / Rdr #{dev.configuration?.readerNumber || 1}
                    </span>
                  </div>

                  {/* Network details */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>IP Address:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{dev.network?.ip || dev.ipAddress}:{dev.network?.port || dev.communicationSettings?.port || '4370'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>MAC Address:</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{dev.network?.mac || dev.macAddress || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Protocol / Firmware:</span>
                    <span>{dev.network?.protocol || dev.communicationSettings?.protocol || 'TCP/IP'} ({dev.network?.firmware || dev.firmware || 'v1.0'})</span>
                  </div>

                  {/* Last Heartbeat Seen */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Last Seen:</span>
                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Activity size={10} style={{ color: dev.status === 'online' ? 'var(--color-success)' : 'var(--text-muted)' }} />
                      {getLastSeenText(dev.health?.lastHeartbeat || dev.lastHeartbeat)}
                    </span>
                  </div>

                  {/* Auth Capabilities Badge Row */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.725rem' }}>Authentication Methods:</span>
                    {dev.capabilities ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {Object.entries(dev.capabilities).map(([cap, active]) => {
                          if (!active) return null;
                          const capNames = {
                            face: 'Face',
                            fingerprint: 'Fingerprint',
                            rfid: 'RFID',
                            qr: 'QR Code',
                            pin: 'Password/PIN',
                            palm: 'Palm'
                          };
                          return (
                            <span key={cap} style={{ fontSize: '0.65rem', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                              {capNames[cap] || cap}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-dark)', fontSize: '0.75rem' }}>No capabilities defined</span>
                    )}
                  </div>
                </div>

                {/* Diagnostics / Connection Test Results Banner */}
                {gridTestInfo && (
                  <div style={{ 
                    padding: '0.65rem 0.75rem', 
                    borderRadius: '6px', 
                    fontSize: '0.75rem',
                    background: gridTestInfo.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: gridTestInfo.success ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    animation: 'slideUp 0.2s ease-out'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: gridTestInfo.success ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {gridTestInfo.success ? <CheckCircle2 size={12} /> : <AlertOctagon size={12} />}
                      <span>{gridTestInfo.success ? 'Diagnostics Passed' : 'Diagnostics Failed'}</span>
                      {gridTestInfo.success && <span style={{ marginLeft: 'auto', fontWeight: 500, color: 'var(--text-muted)' }}>Latency: {gridTestInfo.latency}ms</span>}
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>{gridTestInfo.message || (gridTestInfo.success ? 'All socket relays responded correctly.' : 'Device diagnostic relay failed.')}</span>
                  </div>
                )}

                {/* Control Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <button 
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.725rem', padding: '0.45rem', gap: '0.35rem' }}
                    onClick={() => handleTestConnection(dev.id)}
                    disabled={dev.status === 'disabled'}
                    title="Run connection test to verify communication relays"
                  >
                    <Activity size={12} /> Test Connection
                  </button>

                  <button 
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.725rem', padding: '0.45rem', gap: '0.35rem' }}
                    onClick={() => handleSyncUsers(dev.id)}
                    disabled={dev.status === 'disabled' || dev.status !== 'online'}
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
                    {isActVal ? (
                      <ToggleRight size={22} style={{ color: '#a855f7' }} />
                    ) : (
                      <ToggleLeft size={22} style={{ color: 'var(--text-dark)' }} />
                    )}
                    <span style={{ fontWeight: 600, fontSize: '0.75rem', color: isActVal ? '#fff' : 'var(--text-muted)' }}>
                      {isActVal ? 'Device Active' : 'Device Disabled'}
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
                          name: dev.device?.name || dev.name,
                          brand: dev.device?.brand || dev.brand || 'ZKTeco',
                          model: dev.device?.model || dev.model || 'SpeedFace V5L',
                          serialNumber: dev.device?.serial || dev.serialNumber,
                          gymId: dev.gymId,
                          entranceType: dev.configuration?.entranceType || dev.entranceType || 'Main Entrance',
                          physicalLocation: dev.configuration?.physicalLocation || dev.physicalLocation || '',
                          devicePurpose: dev.configuration?.purpose || dev.devicePurpose || 'Door Access + Attendance',
                          capabilities: dev.capabilities || {
                            face: true,
                            fingerprint: true,
                            rfid: true,
                            qr: false,
                            pin: true,
                            palm: false
                          },
                          ipAddress: dev.network?.ip || dev.ipAddress,
                          port: dev.network?.port || dev.communicationSettings?.port || dev.port || '4370',
                          protocol: dev.network?.protocol || dev.communicationSettings?.protocol || dev.protocol || 'TCP/IP',
                          firmware: dev.network?.firmware || dev.firmware || '',
                          macAddress: dev.network?.mac || dev.macAddress || '',
                          isEnabled: dev.status !== 'disabled'
                        });
                        setWizardStep(1);
                        setWizardTesting(false);
                        setWizardTestResult(null);
                        setSkipVerification(false);
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

      {/* MODAL: REGISTER / EDIT DEVICE WIZARD */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                {editingDevice ? `Modify Configuration: ${editingDevice.device?.name || editingDevice.name}` : 'Register Security Device'}
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

            {/* Step Indicators */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              {[
                { step: 1, label: 'Details', icon: Cpu },
                { step: 2, label: 'Config', icon: Settings },
                { step: 3, label: 'Network', icon: Wifi },
                { step: 4, label: 'Verify', icon: ShieldCheck }
              ].map(s => {
                const StepIcon = s.icon;
                const isCompleted = wizardStep > s.step;
                const isActive = wizardStep === s.step;
                return (
                  <div key={s.step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isCompleted || isActive ? 'linear-gradient(135deg, #a855f7, #3b82f6)' : 'rgba(255, 255, 255, 0.05)',
                      border: isActive ? '2px solid #ffffff' : '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCompleted || isActive ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      transition: 'all 0.3s ease'
                    }}>
                      {isCompleted ? <CheckCircle2 size={16} /> : <StepIcon size={16} />}
                    </div>
                    <span style={{ fontSize: '0.7rem', marginTop: '0.5rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#ffffff' : 'var(--text-dark)' }}>
                      Step {s.step}: {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleWizardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* STEP 1: DEVICE DETAILS */}
              {wizardStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.25s ease-out' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Device Name (Location Context) *</label>
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

                  <div className="grid-2">
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Brand Name (Manufacturer) *</label>
                      <input 
                        type="text" 
                        value={deviceForm.brand} 
                        onChange={(e) => setDeviceForm({ ...deviceForm, brand: e.target.value })} 
                        className="glass-input" 
                        style={{ marginTop: '0.25rem' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Model Name *</label>
                      <input 
                        type="text" 
                        value={deviceForm.model} 
                        onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })} 
                        className="glass-input" 
                        style={{ marginTop: '0.25rem' }}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Serial Number (Hardware Key) *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. ZK-AC-89028"
                        value={deviceForm.serialNumber} 
                        onChange={(e) => setDeviceForm({ ...deviceForm, serialNumber: e.target.value })} 
                        className="glass-input" 
                        style={{ marginTop: '0.25rem' }}
                        required 
                        disabled={!!editingDevice}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Assign Gym Location *</label>
                      <select 
                        value={deviceForm.gymId} 
                        onChange={(e) => setDeviceForm({ ...deviceForm, gymId: e.target.value })} 
                        className="glass-select"
                        style={{ width: '100%', marginTop: '0.25rem', padding: '0.625rem' }}
                        required
                        disabled={!!editingDevice}
                      >
                        <option value="" disabled>Select gym franchise</option>
                        {gyms.map(g => (
                          <option key={g.id} value={g.gymId}>{g.gymName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CONFIGURATION */}
              {wizardStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.25s ease-out' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Physical Location Details *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Ground Floor Lobby, VIP Area Access"
                      value={deviceForm.physicalLocation} 
                      onChange={(e) => setDeviceForm({ ...deviceForm, physicalLocation: e.target.value })} 
                      className="glass-input" 
                      style={{ marginTop: '0.25rem' }}
                      required 
                    />
                  </div>

                  <div className="grid-2">
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Entrance Type *</label>
                      <select
                        value={deviceForm.entranceType}
                        onChange={(e) => setDeviceForm({ ...deviceForm, entranceType: e.target.value })}
                        className="glass-select"
                        style={{ width: '100%', marginTop: '0.25rem', padding: '0.625rem' }}
                      >
                        <option value="Main Entrance">Main Entrance</option>
                        <option value="Staff Entrance">Staff Entrance</option>
                        <option value="Exit Only">Exit Only</option>
                        <option value="Reception">Reception</option>
                        <option value="VIP Entrance">VIP Entrance</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Device Operational Purpose *</label>
                      <select
                        value={deviceForm.devicePurpose}
                        onChange={(e) => setDeviceForm({ ...deviceForm, devicePurpose: e.target.value })}
                        className="glass-select"
                        style={{ width: '100%', marginTop: '0.25rem', padding: '0.625rem' }}
                      >
                        <option value="Door Access Only">Door Access Only</option>
                        <option value="Attendance Only">Attendance Only</option>
                        <option value="Door Access + Attendance">Door Access + Attendance</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Supported Authentication Methods</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      {authMethodsList.map(method => (
                        <label key={method.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
                          <input 
                            type="checkbox"
                            checked={deviceForm.capabilities[method.key]}
                            onChange={(e) => {
                              setDeviceForm({
                                ...deviceForm,
                                capabilities: {
                                  ...deviceForm.capabilities,
                                  [method.key]: e.target.checked
                                }
                              });
                            }}
                            style={{ accentColor: '#a855f7', width: '16px', height: '16px' }}
                          />
                          <span>{method.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: NETWORK CONFIGURATION */}
              {wizardStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.25s ease-out' }}>
                  <div className="grid-3">
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Local IP Address (LAN Static) *</label>
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
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Port Number *</label>
                      <input 
                        type="text" 
                        value={deviceForm.port} 
                        onChange={(e) => setDeviceForm({ ...deviceForm, port: e.target.value })} 
                        className="glass-input" 
                        style={{ marginTop: '0.25rem', fontFamily: 'monospace' }}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Communication Protocol *</label>
                      <select
                        value={deviceForm.protocol}
                        onChange={(e) => setDeviceForm({ ...deviceForm, protocol: e.target.value })}
                        className="glass-select"
                        style={{ width: '100%', marginTop: '0.25rem', padding: '0.625rem' }}
                      >
                        <option value="TCP/IP">TCP/IP</option>
                        <option value="UDP">UDP</option>
                        <option value="Cloud API">Cloud API</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>MAC Address (Hardware ID)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 00:1A:2B:3C:4D:5E"
                        value={deviceForm.macAddress} 
                        onChange={(e) => setDeviceForm({ ...deviceForm, macAddress: e.target.value })} 
                        className="glass-input" 
                        style={{ marginTop: '0.25rem', fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Firmware Version</label>
                    <input 
                      type="text" 
                      placeholder="e.g. v2.5.1"
                      value={deviceForm.firmware} 
                      onChange={(e) => setDeviceForm({ ...deviceForm, firmware: e.target.value })} 
                      className="glass-input" 
                      style={{ marginTop: '0.25rem' }}
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: VERIFICATION */}
              {wizardStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.25s ease-out' }}>
                  
                  {/* Test Connection Details Block */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hardware Relay Verification</span>
                      <button
                        type="button"
                        onClick={handleWizardTestConnection}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', gap: '0.35rem' }}
                        disabled={wizardTesting}
                      >
                        {wizardTesting ? (
                          <>
                            <div style={{ width: '12px', height: '12px', border: '1.5px solid rgba(255,255,255,0.1)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            Pinging...
                          </>
                        ) : (
                          <>
                            <Activity size={12} />
                            Test Connection
                          </>
                        )}
                      </button>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.20)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <h4 style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Sliders size={12} /> Diagnostics Log
                      </h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.825rem' }}>
                        {[
                          { key: 'ping', label: 'ICMP Ping Diagnostics' },
                          { key: 'tcp', label: 'TCP Socket Protocol Handshake' },
                          { key: 'auth', label: 'Device Key Authentication & Handshake' },
                          { key: 'firmware', label: 'Firmware Compatibility Checks' }
                        ].map(step => {
                          let stepStatus = 'pending'; 
                          if (wizardTesting) {
                            stepStatus = 'loading'; 
                          } else if (wizardTestResult) {
                            stepStatus = wizardTestResult.steps?.[step.key] === 'OK' ? 'success' : 'fail';
                          }

                          return (
                            <div key={step.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{step.label}</span>
                              {stepStatus === 'pending' && <span style={{ color: 'var(--text-dark)', fontSize: '0.7rem', fontWeight: 700 }}>PENDING</span>}
                              {stepStatus === 'loading' && (
                                <div style={{ width: '12px', height: '12px', border: '1.5px solid rgba(255,255,255,0.1)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                              )}
                              {stepStatus === 'success' && <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, fontSize: '0.75rem' }}><CheckCircle2 size={12} /> OK</span>}
                              {stepStatus === 'fail' && <span style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, fontSize: '0.75rem' }}><X size={12} /> FAIL</span>}
                            </div>
                          );
                        })}
                      </div>

                      {wizardTestResult && (
                        <div style={{
                          marginTop: '0.5rem',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          background: wizardTestResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                          border: wizardTestResult.success ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                          color: wizardTestResult.success ? 'var(--color-success)' : 'var(--color-danger)',
                          fontWeight: 600,
                          textAlign: 'center'
                        }}>
                          {wizardTestResult.success ? (
                            <div>
                              Connection Successful
                              {wizardTestResult.latency && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.15rem' }}>Latency: {wizardTestResult.latency}ms</div>}
                            </div>
                          ) : (
                            <div>
                              Connection Failed
                              <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 500, marginTop: '0.15rem' }}>{wizardTestResult.message || 'Verification Error'}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activate Device and Skip Verification Options */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input 
                        type="checkbox" 
                        checked={deviceForm.isEnabled}
                        onChange={(e) => setDeviceForm({ ...deviceForm, isEnabled: e.target.checked })}
                        style={{ accentColor: '#a855f7', width: '16px', height: '16px' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>Activate Device</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Enable biometric event syncing and remote command relays</span>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <input 
                        type="checkbox" 
                        checked={skipVerification}
                        onChange={(e) => setSkipVerification(e.target.checked)}
                        style={{ accentColor: '#a855f7', width: '16px', height: '16px' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Skip Connection Verification</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Allow onboarding device without a successful heartbeat ping</span>
                      </div>
                    </label>
                  </div>

                  {/* Alert if not tested and skip is off */}
                  {!wizardTestResult?.success && !skipVerification && (
                    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.75rem', color: '#f59e0b' }}>
                      <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span>The device registration is locked until connection diagnostic test succeeds. You can bypass this by checking "Skip Connection Verification".</span>
                    </div>
                  )}
                </div>
              )}

              {/* FOOTER ACTIONS */}
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

                {wizardStep > 1 && (
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setWizardStep(prev => prev - 1)}
                  >
                    Back
                  </button>
                )}

                {wizardStep < 4 ? (
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderColor: 'transparent' }}
                    onClick={() => {
                      if (wizardStep === 1) handleStep1Next();
                      else if (wizardStep === 2) handleStep2Next();
                      else if (wizardStep === 3) handleStep3Next();
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    style={{ 
                      background: (!skipVerification && !wizardTestResult?.success) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #a855f7, #3b82f6)', 
                      borderColor: 'transparent',
                      color: (!skipVerification && !wizardTestResult?.success) ? 'var(--text-dark)' : '#ffffff',
                      cursor: (!skipVerification && !wizardTestResult?.success) ? 'not-allowed' : 'pointer'
                    }}
                    disabled={!skipVerification && !wizardTestResult?.success}
                  >
                    {editingDevice ? 'Save Settings' : 'Register Device'}
                  </button>
                )}
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
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </div>
  );
};

export default SecurityDevices;
