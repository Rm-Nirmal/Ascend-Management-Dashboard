import { useState, useEffect, useRef } from 'react';
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
  const { supportTickets, createSupportTicket, replySupportTicket, closeSupportTicket, showToast, currentGym } = useDashboard();
  
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
  const messagesEndRef = useRef(null);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll to bottom when selecting a ticket
  useEffect(() => {
    if (activeTicket) {
      scrollToBottom('auto');
    }
  }, [selectedTicketId]);

  // Scroll to bottom when new replies are added
  useEffect(() => {
    if (activeTicket?.replies) {
      scrollToBottom('smooth');
    }
  }, [activeTicket?.replies?.length]);

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
      if (res.id) {
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
    const res = await replySupportTicket(selectedTicketId, replyText.trim(), 'gym_owner');
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

  return (
    <div className="support-container">
      
      {/* LEFT COLUMN: TICKET HISTORY LIST */}
      <div className="support-inbox-pane">
        {/* Header */}
        <div className="support-pane-header">
          <div className="support-pane-title-group">
            <h4>Support Tickets</h4>
            <span>{supportTickets.length} tickets filed</span>
          </div>
          <button 
            onClick={() => {
              setIsCreatingNew(true);
              setSelectedTicketId('');
            }}
            className="btn btn-secondary"
            style={{ padding: '0', borderRadius: '50%', width: '32px', height: '32px' }}
            title="Create New Support Ticket"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Tickets Scroll List */}
        <div className="support-ticket-list">
          {supportTickets.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No support tickets filed yet. Click the + icon above to submit your first ticket.
            </div>
          ) : (
            supportTickets.map(ticket => {
              const isSelected = ticket.id === selectedTicketId && !isCreatingNew;

              return (
                <div 
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicketId(ticket.id);
                    setIsCreatingNew(false);
                  }}
                  className={`support-ticket-item ${isSelected ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: 600, 
                      color: isSelected ? 'var(--text-main)' : 'var(--text-muted)', 
                      textOverflow: 'ellipsis', 
                      overflow: 'hidden', 
                      whiteSpace: 'nowrap', 
                      maxWidth: '170px' 
                    }}>
                      {ticket.subject}
                    </span>
                    <span className={`support-badge support-badge-priority-${ticket.priority}`}>
                      {ticket.priority}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                    <span className={`support-badge support-badge-status-${ticket.status}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={10} /> {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Fitgencore Hotline details banner */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-color)',
          background: 'rgba(255, 255, 255, 0.01)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          fontSize: '0.725rem'
        }}>
          <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Fitgencore Support Hotline</span>
          <strong style={{ color: 'var(--color-primary)', fontSize: '0.8rem' }}>
            {currentGym?.fitgencoreHotline || '+94 11 234 5678 / desk@fitgencore.com'}
          </strong>
        </div>
      </div>

      {/* RIGHT COLUMN: DETAIL WORKSPACE OR NEW TICKET FORM */}
      <div className="support-chat-pane">
        {isCreatingNew ? (
          /* CREATE NEW TICKET FORM */
          <div className="support-create-form-container">
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
            <div className="support-chat-header">
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
            <div className="support-chat-messages">
              
              {/* Original Message */}
              <div className="support-message-row align-self-end">
                <div className="support-avatar-circle support-avatar-client">
                  <LifeBuoy size={14} />
                </div>
                <div className="support-message-content">
                  <div className="support-message-info">
                    <span className="support-message-sender">You</span>
                    <span className="support-message-time">{new Date(activeTicket.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="support-bubble support-bubble-user">
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
                    className={`support-message-row ${isSuperAdmin ? 'align-self-start' : 'align-self-end'}`}
                  >
                    <div className={`support-avatar-circle ${isSuperAdmin ? 'support-avatar-admin' : 'support-avatar-client'}`}>
                      {isSuperAdmin ? <Shield size={14} /> : <LifeBuoy size={14} />}
                    </div>
                    <div className="support-message-content">
                      <div className="support-message-info">
                        <span className="support-message-sender">{isSuperAdmin ? 'FitGenCore Support' : 'You'}</span>
                        <span className="support-message-time">{new Date(reply.createdAt).toLocaleString()}</span>
                      </div>
                      <div className={`support-bubble ${isSuperAdmin ? 'support-bubble-admin' : 'support-bubble-user'}`}>
                        {reply.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input Area */}
            {activeTicket.status !== 'resolved' ? (
              <form onSubmit={handleSendReply} className="support-input-form">
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
              <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', background: 'rgba(16, 185, 129, 0.02)', color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 600 }}>
                This support request has been closed.
              </div>
            )}
          </>
        ) : (
          <div className="support-empty-view">
            <FolderOpen size={48} style={{ color: 'var(--text-dark)' }} />
            <span>Select a ticket from history or click + above to create a support inquiry.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientSupport;
