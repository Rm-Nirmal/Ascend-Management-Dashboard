import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  LifeBuoy, 
  Clock, 
  Send, 
  Plus, 
  Shield, 
  CheckCircle,
  HelpCircle,
  FolderOpen
} from 'lucide-react';

const ClientSupport = () => {
  const { supportTickets, createSupportTicket, replySupportTicket, closeSupportTicket, showToast } = useDashboard();
  
  // Selection/Form states
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New ticket fields
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');

  const activeTicket = supportTickets.find(t => t.id === selectedTicketId);

  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    const res = await createSupportTicket({
      subject: subject.trim(),
      message: message.trim(),
      priority
    });
    setIsSubmitting(false);

    if (res.success) {
      setSubject('');
      setMessage('');
      setPriority('medium');
      setIsCreatingNew(false);
      
      // Auto select the newly created ticket if it's in the list
      if (res.gymId) {
        setSelectedTicketId(res.id);
      }
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicketId) return;

    setIsSubmitting(true);
    const res = await replySupportTicket(selectedTicketId, replyText.trim());
    setIsSubmitting(false);

    if (res.success) {
      setReplyText('');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicketId) return;
    const res = await closeSupportTicket(selectedTicketId);
    if (!res.success) {
      showToast(res.message, 'error');
    }
  };

  const getPriorityBadgeStyle = (priority) => {
    const colors = {
      high: { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: 'rgba(239, 68, 68, 0.2)' },
      medium: { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', border: 'rgba(245, 158, 11, 0.2)' },
      low: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' }
    };
    return colors[priority] || colors.low;
  };

  const getStatusBadgeStyle = (status) => {
    const colors = {
      open: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' },
      in_progress: { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.2)' },
      resolved: { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', border: 'rgba(16, 185, 129, 0.2)' }
    };
    return colors[status] || colors.open;
  };

  return (
    <div style={{ padding: '2rem', height: 'calc(100vh - 80px)', display: 'flex', gap: '1.5rem', boxSizing: 'border-box' }}>
      
      {/* LEFT COLUMN: TICKET HISTORY LIST */}
      <div style={{
        flex: '0 0 320px',
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Support Tickets</h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{supportTickets.length} tickets filed</span>
          </div>
          <button 
            onClick={() => {
              setIsCreatingNew(true);
              setSelectedTicketId('');
            }}
            className="btn btn-secondary"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
            title="Create New Support Ticket"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Tickets Scroll List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {supportTickets.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No support tickets filed yet. Click the + icon above to submit your first ticket.
            </div>
          ) : (
            supportTickets.map(ticket => {
              const isSelected = ticket.id === selectedTicketId && !isCreatingNew;
              const pBadge = getPriorityBadgeStyle(ticket.priority);
              const sBadge = getStatusBadgeStyle(ticket.status);

              return (
                <div 
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicketId(ticket.id);
                    setIsCreatingNew(false);
                  }}
                  style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                      {ticket.subject}
                    </span>
                    <span style={{ 
                      fontSize: '0.6rem', 
                      fontWeight: 700, 
                      textTransform: 'uppercase',
                      padding: '0.1rem 0.35rem', 
                      borderRadius: '3px',
                      background: pBadge.bg,
                      color: pBadge.color,
                      border: `1px solid ${pBadge.border}`
                    }}>
                      {ticket.priority}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 700, 
                      textTransform: 'uppercase',
                      padding: '0.1rem 0.35rem', 
                      borderRadius: '3px',
                      background: sBadge.bg,
                      color: sBadge.color,
                      border: `1px solid ${sBadge.border}`
                    }}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Clock size={10} /> {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: DETAIL WORKSPACE OR NEW TICKET FORM */}
      <div style={{ 
        flex: 1, 
        background: 'rgba(255, 255, 255, 0.01)', 
        border: '1px solid rgba(255, 255, 255, 0.04)', 
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {isCreatingNew ? (
          /* CREATE NEW TICKET FORM */
          <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={18} style={{ color: 'var(--color-primary)' }} /> Submit Support Request
            </h4>

            <form onSubmit={handleCreateTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px' }}>
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Upgrade Limit Inquiry"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Priority Tier</label>
                <select 
                  className="form-control"
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                >
                  <option value="low">Low Priority (General question)</option>
                  <option value="medium">Medium Priority (Feature bug)</option>
                  <option value="high">High Priority (Operational block)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Initial Message *</label>
                <textarea 
                  className="form-control" 
                  placeholder="Explain your inquiry or issue in detail..."
                  style={{ minHeight: '150px' }}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsCreatingNew(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting}
                  style={{ gap: '0.35rem' }}
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        ) : activeTicket ? (
          /* ACTIVE TICKET CHAT THREAD */
          <>
            {/* Header info */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{activeTicket.subject}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  <span>Ticket Status: {activeTicket.status.toUpperCase()}</span>
                  <span>•</span>
                  <span>Created: {new Date(activeTicket.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              {activeTicket.status !== 'resolved' && (
                <button 
                  onClick={handleResolveTicket}
                  className="btn btn-secondary"
                  style={{ gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.15)' }}
                >
                  <CheckCircle size={14} /> Close Ticket
                </button>
              )}
            </div>

            {/* Conversation Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Original Message */}
              <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '80%', alignSelf: 'flex-end', flexDirection: 'row-reverse' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--color-primary-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)',
                  flexShrink: 0
                }}>
                  <LifeBuoy size={14} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexDirection: 'row-reverse' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>You</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)' }}>{new Date(activeTicket.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '0.85rem 1rem', 
                    borderRadius: '10px 0px 10px 10px',
                    fontSize: '0.85rem',
                    lineHeight: '1.4'
                  }}>
                    {activeTicket.message}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {activeTicket.replies && activeTicket.replies.map((reply, idx) => {
                const isSuperAdmin = reply.senderRole === 'super_admin';
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      display: 'flex', 
                      gap: '0.75rem', 
                      maxWidth: '80%',
                      alignSelf: isSuperAdmin ? 'flex-start' : 'flex-end',
                      flexDirection: isSuperAdmin ? 'row' : 'row-reverse'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isSuperAdmin ? 'rgba(168, 85, 247, 0.15)' : 'var(--color-primary-glow)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSuperAdmin ? '#a855f7' : 'var(--color-primary)',
                      flexShrink: 0
                    }}>
                      {isSuperAdmin ? <Shield size={14} /> : <LifeBuoy size={14} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: isSuperAdmin ? 'flex-start' : 'flex-end' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexDirection: isSuperAdmin ? 'row' : 'row-reverse' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{isSuperAdmin ? 'FitGenCore Support' : 'You'}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)' }}>{new Date(reply.createdAt).toLocaleString()}</span>
                      </div>
                      <div style={{ 
                        background: isSuperAdmin ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.03)', 
                        border: isSuperAdmin ? '1px solid rgba(168, 85, 247, 0.15)' : '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '0.85rem 1rem', 
                        borderRadius: isSuperAdmin ? '0px 10px 10px 10px' : '10px 0px 10px 10px',
                        fontSize: '0.85rem',
                        lineHeight: '1.4'
                      }}>
                        {reply.message}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Area */}
            {activeTicket.status !== 'resolved' ? (
              <form onSubmit={handleSendReply} style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.005)' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Type your message to support..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting || !replyText.trim()}
                  style={{ padding: '0 1.25rem', gap: '0.35rem' }}
                >
                  {isSubmitting ? 'Sending...' : <><Send size={14} /> Reply</>}
                </button>
              </form>
            ) : (
              <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.03)', textAlign: 'center', background: 'rgba(16, 185, 129, 0.02)', color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 600 }}>
                This support request has been closed.
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '1rem' }}>
            <FolderOpen size={36} style={{ color: 'var(--text-dark)' }} />
            <span>Select a ticket from history or click + above to create a support inquiry.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientSupport;
