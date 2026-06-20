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

  const getPriorityColor = (prio) => {
    if (prio === 'high') return 'var(--color-danger)';
    if (prio === 'medium') return 'var(--color-warning)';
    return '#3b82f6';
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '2rem', flexDirection: 'row', flexWrap: 'wrap' }}>
      
      {/* LEFT COLUMN: PUBLISH NEW ANNOUNCEMENT */}
      <div style={{
        flex: '1 1 350px',
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '12px',
        padding: '1.5rem',
        height: 'fit-content'
      }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Megaphone size={18} style={{ color: '#a855f7' }} /> Broadcast New Notice
        </h4>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            color: 'var(--color-danger)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <ShieldAlert size={14} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Announcement Title *</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Scheduled System Upgrade"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Message Content *</label>
            <textarea 
              className="form-control" 
              placeholder="Write the details of the broadcast..."
              style={{ minHeight: '120px' }}
              value={content}
              onChange={e => setContent(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select 
                className="form-control"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="announcement">Announcement</option>
                <option value="maintenance">Maintenance</option>
                <option value="update">Platform Update</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select 
                className="form-control"
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
              background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
              borderColor: 'transparent',
              padding: '0.75rem',
              gap: '0.35rem'
            }}
          >
            <Plus size={16} /> {isPublishing ? 'Broadcasting...' : 'Publish Announcement'}
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN: HISTORY LIST */}
      <div style={{
        flex: '1.5 1 450px',
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1.25rem 0' }}>Broadcast History</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '450px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {announcements.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No past system announcements found.
            </div>
          ) : (
            announcements.map(ann => {
              const pColor = getPriorityColor(ann.priority);

              return (
                <div key={ann.id} style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  padding: '1rem',
                  position: 'relative'
                }}>
                  {/* Delete button */}
                  <button 
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dark)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dark)'}
                    title="Remove Announcement"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Priority dot */}
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: pColor
                    }} />
                    <h5 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, paddingRight: '1.5rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {ann.title}
                    </h5>
                  </div>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.5rem 0', lineHeight: '1.4' }}>
                    {ann.content}
                  </p>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.65rem', color: 'var(--text-dark)', marginTop: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Calendar size={10} /> {new Date(ann.createdAt).toLocaleString()}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><User size={10} /> {ann.publishedBy}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', textTransform: 'capitalize' }}><Layers size={10} /> {ann.category}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
