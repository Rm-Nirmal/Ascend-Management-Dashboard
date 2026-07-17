import { useState, useMemo } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { db, COLLECTIONS } from '../../lib/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  Megaphone, 
  Trash2, 
  Plus, 
  Calendar, 
  User, 
  ShieldAlert,
  Edit2,
  Search,
  Filter,
  CheckCircle,
  X,
  AlertTriangle,
  Info,
  Layers
} from 'lucide-react';

const Announcements = () => {
  const { announcements, publishAnnouncement, showToast, gyms } = useDashboard();
  
  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('announcement');
  const [priority, setPriority] = useState('medium');
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Target audience states
  const [targetAudience, setTargetAudience] = useState('all'); // 'all' or 'specific'
  const [selectedGymIds, setSelectedGymIds] = useState([]);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  // Stats
  const stats = useMemo(() => {
    return {
      total: announcements.length,
      highPriority: announcements.filter(a => a.priority === 'high').length,
      maintenance: announcements.filter(a => a.category === 'maintenance').length,
      updates: announcements.filter(a => a.category === 'update').length
    };
  }, [announcements]);

  // Filtered Announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(ann => {
      const matchesSearch = 
        ann.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ann.content?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || ann.category === selectedCategory;
      const matchesPriority = selectedPriority === 'all' || ann.priority === selectedPriority;

      return matchesSearch && matchesCategory && matchesPriority;
    });
  }, [announcements, searchQuery, selectedCategory, selectedPriority]);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (targetAudience === 'specific' && selectedGymIds.length === 0) {
      setError('Please select at least one target gym workspace.');
      return;
    }

    setIsPublishing(true);
    setError('');

    const targetList = targetAudience === 'all' ? ['all'] : selectedGymIds;

    try {
      if (editingId) {
        // Edit flow
        const docRef = doc(db, COLLECTIONS.ANNOUNCEMENTS, editingId);
        await updateDoc(docRef, {
          title: title.trim(),
          content: content.trim(),
          category,
          priority,
          targetGymIds: targetList,
          updatedAt: new Date().toISOString()
        });
        showToast('Announcement updated successfully!', 'success');
        setEditingId(null);
        setTitle('');
        setContent('');
        setCategory('announcement');
        setPriority('medium');
        setTargetAudience('all');
        setSelectedGymIds([]);
      } else {
        // Publish flow
        const res = await publishAnnouncement({
          title: title.trim(),
          content: content.trim(),
          category,
          priority,
          targetGymIds: targetList
        });

        if (res.success) {
          setTitle('');
          setContent('');
          setCategory('announcement');
          setPriority('medium');
          setTargetAudience('all');
          setSelectedGymIds([]);
        } else {
          setError(res.message || 'Failed to publish announcement.');
        }
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsPublishing(false);
    }
  };

  const startEdit = (ann) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setContent(ann.content);
    setCategory(ann.category);
    setPriority(ann.priority);
    
    if (!ann.targetGymIds || ann.targetGymIds.includes('all')) {
      setTargetAudience('all');
      setSelectedGymIds([]);
    } else {
      setTargetAudience('specific');
      setSelectedGymIds(ann.targetGymIds);
    }
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setCategory('announcement');
    setPriority('medium');
    setTargetAudience('all');
    setSelectedGymIds([]);
    setError('');
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      const docRef = doc(db, COLLECTIONS.ANNOUNCEMENTS, id);
      await deleteDoc(docRef);
      showToast('Announcement removed from database.', 'info');
      if (editingId === id) {
        cancelEdit();
      }
    } catch (err) {
      console.error('Delete announcement error:', err);
      showToast(`Failed to delete: ${err.message}`, 'error');
    }
  };

  const getPriorityBadge = (prio) => {
    let bg = 'rgba(59, 130, 246, 0.05)';
    let border = '1px solid rgba(59, 130, 246, 0.15)';
    let text = '#60a5fa';
    
    if (prio === 'high') {
      bg = 'rgba(239, 68, 68, 0.05)';
      border = '1px solid rgba(239, 68, 68, 0.15)';
      text = '#f87171';
    } else if (prio === 'medium') {
      bg = 'rgba(245, 158, 11, 0.05)';
      border = '1px solid rgba(245, 158, 11, 0.15)';
      text = '#fbbf24';
    }
    
    return (
      <span style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: bg,
        border: border,
        color: text,
        padding: '0.15rem 0.5rem',
        borderRadius: '4px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: text }} />
        {prio}
      </span>
    );
  };

  const getCategoryBadge = (cat) => {
    let label = 'Announcement';
    let color = '#ffffff'; // white
    let bg = 'rgba(255, 255, 255, 0.05)';
    let border = '1px solid var(--border-color)';

    if (cat === 'maintenance') {
      label = 'Maintenance';
      color = '#fb7185'; // rose/pink
      bg = 'rgba(251, 113, 133, 0.05)';
      border = '1px solid rgba(251, 113, 133, 0.15)';
    } else if (cat === 'update') {
      label = 'Platform Update';
      color = '#38bdf8'; // sky/light blue
      bg = 'rgba(56, 189, 248, 0.05)';
      border = '1px solid rgba(56, 189, 248, 0.15)';
    }

    return (
      <span style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: bg,
        border: border,
        color: color,
        padding: '0.15rem 0.5rem',
        borderRadius: '4px'
      }}>
        {label}
      </span>
    );
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header banner */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            System Announcements Dashboard
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            Broadcast platform notifications, scheduled maintenance windows, or system updates directly to gym workspace subdomains.
          </p>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#ffffff', padding: '0.5rem', borderRadius: '6px' }}>
            <Megaphone size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{stats.total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Total Broadcasts</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.5rem', borderRadius: '6px' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{stats.highPriority}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>High-Priority Alerts</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
          <div style={{ background: 'rgba(251, 113, 133, 0.1)', color: '#fb7185', padding: '0.5rem', borderRadius: '6px' }}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fb7185' }}>{stats.maintenance}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Maintenance Windows</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.5rem', borderRadius: '6px' }}>
            <Info size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8' }}>{stats.updates}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Platform Updates</div>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT SPLIT */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* LEFT COLUMN: PUBLISH/EDIT FORM */}
        <form onSubmit={handlePublish} style={{
          flex: '1 1 380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Megaphone size={18} style={{ color: '#ffffff' }} /> 
              {editingId ? 'Edit Broadcast Details' : 'Broadcast New Notice'}
            </h4>
            {editingId && (
              <button 
                type="button" 
                onClick={cancelEdit}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <X size={12} /> Cancel Edit
              </button>
            )}
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              borderLeft: '4px solid #ef4444',
              color: '#f87171',
              borderRadius: '6px',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.85rem'
            }}>
              <ShieldAlert size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Announcement Title *</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Scheduled System Upgrade"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Message Content *</label>
            <textarea 
              className="form-control" 
              placeholder="Write the details of the broadcast..."
              style={{ minHeight: '120px', resize: 'vertical' }}
              value={content}
              onChange={e => setContent(e.target.value)}
              required
            />
          </div>

          {/* Target Audience Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Target Audience</label>
            <div style={{ display: 'flex', gap: '1.25rem', margin: '0.15rem 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="targetAudience" 
                  value="all" 
                  checked={targetAudience === 'all'} 
                  onChange={() => {
                    setTargetAudience('all');
                    setSelectedGymIds([]);
                  }} 
                />
                All Gym Workspaces
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="targetAudience" 
                  value="specific" 
                  checked={targetAudience === 'specific'} 
                  onChange={() => setTargetAudience('specific')} 
                />
                Specific Workspaces
              </label>
            </div>

            {targetAudience === 'specific' && (
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                marginTop: '0.25rem'
              }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', height: 'auto', borderRadius: '4px' }}
                    onClick={() => setSelectedGymIds(gyms.map(g => g.gymId))}
                  >
                    Select All
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', height: 'auto', borderRadius: '4px' }}
                    onClick={() => setSelectedGymIds([])}
                  >
                    Clear All
                  </button>
                </div>

                <div style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  paddingRight: '0.25rem'
                }}>
                  {gyms.length === 0 ? (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No workspaces found.</span>
                  ) : (
                    gyms.map(gym => {
                      const isChecked = selectedGymIds.includes(gym.gymId);
                      const handleCheckboxChange = () => {
                        if (isChecked) {
                          setSelectedGymIds(selectedGymIds.filter(id => id !== gym.gymId));
                        } else {
                          setSelectedGymIds([...selectedGymIds, gym.gymId]);
                        }
                      };
                      return (
                        <label key={gym.gymId} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={handleCheckboxChange} 
                          />
                          <span>{gym.gymName} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({gym.gymId})</span></span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Category</label>
              <select 
                className="form-control"
                style={{ width: '100%' }}
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="announcement">Announcement</option>
                <option value="maintenance">Maintenance</option>
                <option value="update">Platform Update</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Priority</label>
              <select 
                className="form-control"
                style={{ width: '100%' }}
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isPublishing}
            style={{ 
              marginTop: '0.5rem', 
              justifyContent: 'center', 
              background: '#ffffff',
              color: '#000000',
              borderColor: 'transparent',
              padding: '0.75rem',
              fontWeight: 700,
              borderRadius: '8px',
              gap: '0.5rem'
            }}
          >
            {editingId ? <CheckCircle size={16} /> : <Plus size={16} />} 
            {isPublishing ? 'Processing...' : (editingId ? 'Save Changes' : 'Publish Announcement')}
          </button>
        </form>

        {/* RIGHT COLUMN: HISTORY & FILTERS */}
        <div style={{
          flex: '1.5 1 450px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
          maxHeight: '750px',
          overflow: 'hidden'
        }}>
          {/* Filters Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Broadcast History
              </h4>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)' }} />
                <input 
                  type="text"
                  placeholder="Search announcements..."
                  className="form-control"
                  style={{ paddingLeft: '2.25rem', width: '100%', height: '36px', fontSize: '0.8rem' }}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Category selector */}
              <select
                className="form-control"
                style={{ width: '130px', height: '36px', fontSize: '0.8rem' }}
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="announcement">Announcement</option>
                <option value="maintenance">Maintenance</option>
                <option value="update">Platform Update</option>
              </select>

              {/* Priority selector */}
              <select
                className="form-control"
                style={{ width: '120px', height: '36px', fontSize: '0.8rem' }}
                value={selectedPriority}
                onChange={e => setSelectedPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          
          {/* History list viewport */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem', 
            overflowY: 'auto',
            paddingRight: '0.25rem'
          }}>
            {filteredAnnouncements.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No matching system announcements found.
              </div>
            ) : (
              filteredAnnouncements.map(ann => {
                const isEditingThis = editingId === ann.id;
                return (
                  <div 
                    key={ann.id} 
                    style={{
                      background: isEditingThis ? 'rgba(255, 255, 255, 0.05)' : 'var(--bg-secondary)',
                      border: isEditingThis ? '1px solid #ffffff' : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {/* Actions panel */}
                    <div style={{
                      position: 'absolute',
                      top: '1.25rem',
                      right: '1.25rem',
                      display: 'flex',
                      gap: '0.35rem',
                      alignItems: 'center'
                    }}>
                      {/* Edit button */}
                      <button 
                        onClick={() => startEdit(ann)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dark)',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = 'var(--text-dark)';
                          e.currentTarget.style.background = 'none';
                        }}
                        title="Edit Announcement"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Delete button */}
                      <button 
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dark)',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = 'var(--text-dark)';
                          e.currentTarget.style.background = 'none';
                        }}
                        title="Remove Announcement"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingRight: '3.5rem' }}>
                      {getPriorityBadge(ann.priority)}
                      {getCategoryBadge(ann.category)}

                      {/* Target audience badge */}
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-muted)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px'
                      }}>
                        {!ann.targetGymIds || ann.targetGymIds.includes('all') ? (
                          'Broadcast: All Gyms'
                        ) : (
                          `Broadcast: ${ann.targetGymIds.length} Gym${ann.targetGymIds.length > 1 ? 's' : ''}`
                        )}
                      </span>
                    </div>

                    <h5 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', paddingRight: '3.5rem' }}>
                      {ann.title}
                    </h5>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>
                      {ann.content}
                    </p>

                    {!ann.targetGymIds || ann.targetGymIds.includes('all') ? null : (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)', marginTop: '-0.25rem', lineHeight: '1.3' }}>
                        <strong>Targeted Workspaces:</strong> {ann.targetGymIds.map(id => gyms.find(g => g.gymId === id)?.gymName || id).join(', ')}
                      </div>
                    )}

                    <div style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      fontSize: '0.7rem', 
                      color: 'var(--text-dark)', 
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '0.75rem',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} /> {new Date(ann.createdAt).toLocaleString()}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={12} /> {ann.publishedBy}
                      </span>
                      {ann.updatedAt && (
                        <span style={{ color: 'var(--color-warning)', fontStyle: 'italic' }}>
                          (Edited)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Announcements;
