import { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { db, COLLECTIONS } from '../../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { 
  Megaphone, 
  Trash2, 
  Plus, 
  Calendar, 
  User, 
  ShieldAlert,
  Layers
} from 'lucide-react';

const Announcements = () => {
  const { announcements, publishAnnouncement, showToast } = useDashboard();
  
  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('announcement');
  const [priority, setPriority] = useState('medium');
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setIsPublishing(true);
    setError('');

    try {
      const res = await publishAnnouncement({
        title: title.trim(),
        content: content.trim(),
        category,
        priority
      });

      if (res.success) {
        setTitle('');
        setContent('');
        setCategory('announcement');
        setPriority('medium');
      } else {
        setError(res.message || 'Failed to publish announcement.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      const docRef = doc(db, COLLECTIONS.ANNOUNCEMENTS, id);
      await deleteDoc(docRef);
      showToast('Announcement removed from database.', 'info');
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
        padding: '0.15rem 0.4rem',
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
    let color = '#a855f7'; // purple
    let bg = 'rgba(168, 85, 247, 0.05)';
    let border = '1px solid rgba(168, 85, 247, 0.15)';

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
        padding: '0.15rem 0.4rem',
        borderRadius: '4px'
      }}>
        {label}
      </span>
    );
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
          System Announcements
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Broadcast platform notifications, scheduled maintenance windows, or system updates to client workspaces.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* LEFT COLUMN: PUBLISH NEW ANNOUNCEMENT */}
        <form onSubmit={handlePublish} className="glass-card" style={{
          flex: '1 1 380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          padding: '1.75rem'
        }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
            <Megaphone size={18} style={{ color: '#a855f7' }} /> Broadcast New Notice
          </h4>

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
            <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Announcement Title *</label>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="e.g. Scheduled System Upgrade"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Message Content *</label>
            <textarea 
              className="glass-input" 
              placeholder="Write the details of the broadcast..."
              style={{ minHeight: '120px', resize: 'vertical' }}
              value={content}
              onChange={e => setContent(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Category</label>
              <select 
                className="glass-select"
                style={{ width: '100%', height: '40px' }}
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="announcement">Announcement</option>
                <option value="maintenance">Maintenance</option>
                <option value="update">Platform Update</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Priority</label>
              <select 
                className="glass-select"
                style={{ width: '100%', height: '40px' }}
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
              marginTop: '0.75rem', 
              justifyContent: 'center', 
              background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
              color: '#ffffff',
              borderColor: 'transparent',
              padding: '0.9rem',
              fontWeight: 700,
              borderRadius: '8px',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.25)',
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 16px rgba(168, 85, 247, 0.35)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.25)'}
          >
            <Plus size={16} /> {isPublishing ? 'Broadcasting...' : 'Publish Announcement'}
          </button>
        </form>

        {/* RIGHT COLUMN: HISTORY LIST */}
        <div className="glass-card" style={{
          flex: '1.5 1 450px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          padding: '1.75rem',
          maxHeight: '700px'
        }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
            Broadcast History
          </h4>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem', 
            overflowY: 'auto', 
            paddingRight: '0.5rem',
            marginRight: '-0.5rem'
          }}>
            {announcements.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No past system announcements found.
              </div>
            ) : (
              announcements.map(ann => {
                return (
                  <div 
                    key={ann.id} 
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                      e.currentTarget.style.background = 'var(--bg-card-hover)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                    }}
                  >
                    {/* Delete button */}
                    <button 
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      style={{
                        position: 'absolute',
                        top: '1.25rem',
                        right: '1.25rem',
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
                      <Trash2 size={14} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingRight: '2rem' }}>
                      {getPriorityBadge(ann.priority)}
                      {getCategoryBadge(ann.category)}
                    </div>

                    <h5 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', paddingRight: '2rem' }}>
                      {ann.title}
                    </h5>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>
                      {ann.content}
                    </p>

                    <div style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      fontSize: '0.7rem', 
                      color: 'var(--text-dark)', 
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '0.75rem',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> {new Date(ann.createdAt).toLocaleString()}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={12} /> {ann.publishedBy}</span>
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
