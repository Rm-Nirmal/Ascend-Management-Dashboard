import { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { 
  LifeBuoy, 
  MessageSquare, 
  Clock, 
  Building2, 
  Send, 
  CheckCircle,
  Shield
} from 'lucide-react';

const SupportCenter = () => {
  const { supportTickets, replySupportTicket, closeSupportTicket, showToast } = useDashboard();
  
  // Selection/Input states
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const activeTicket = supportTickets.find(t => t.id === selectedTicketId);
  const messagesEndRef = useRef(null);

  // Filters
  const filteredTickets = supportTickets.filter(ticket => {
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

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

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicketId) return;

    setIsSubmitting(true);
    const res = await replySupportTicket(selectedTicketId, replyText.trim(), 'super_admin');
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
      
      {/* LEFT COLUMN: TICKETS INBOX LIST */}
      <div className="support-inbox-pane">
        {/* Inbox header */}
        <div className="support-pane-header">
          <div className="support-pane-title-group">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LifeBuoy size={18} style={{ color: '#a855f7' }} /> Support Tickets Inbox
            </h4>
            <span>{filteredTickets.length} tickets found</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.005)', borderBottom: '1px solid var(--border-color)' }}>
          <select 
            className="form-control" 
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem', height: 'auto', background: 'rgba(255,255,255,0.02)' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <select 
            className="form-control" 
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem', height: 'auto', background: 'rgba(255,255,255,0.02)' }}
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Tickets Scroll List */}
        <div className="support-ticket-list">
          {filteredTickets.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No support tickets match filters.
            </div>
          ) : (
            filteredTickets.map(ticket => {
              const isSelected = ticket.id === selectedTicketId;

              return (
                <div 
                  key={ticket.id} 
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`support-ticket-item ${isSelected ? 'active-admin' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: 600, 
                      color: isSelected ? 'var(--text-main)' : 'var(--text-muted)', 
                      textOverflow: 'ellipsis', 
                      overflow: 'hidden', 
                      whiteSpace: 'nowrap', 
                      maxWidth: '180px' 
                    }}>
                      {ticket.subject}
                    </span>
                    <span className={`support-badge support-badge-priority-${ticket.priority}`}>
                      {ticket.priority}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-dark)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                    <Building2 size={12} />
                    <span>{ticket.gymName}</span>
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
      </div>

      {/* RIGHT COLUMN: ACTIVE TICKET THREAD */}
      <div className="support-chat-pane">
        {activeTicket ? (
          <>
            {/* Header info */}
            <div className="support-chat-header">
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{activeTicket.subject}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Building2 size={12} /> {activeTicket.gymName}</span>
                  <span>•</span>
                  <span>Ticket ID: {activeTicket.id}</span>
                </div>
              </div>
              
              {activeTicket.status !== 'resolved' && (
                <button 
                  onClick={handleResolveTicket}
                  className="btn btn-secondary"
                  style={{ gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.15)' }}
                >
                  <CheckCircle size={14} /> Resolve Ticket
                </button>
              )}
            </div>

            {/* Conversation Messages */}
            <div className="support-chat-messages">
              
              {/* Original Message (from gym owner) */}
              <div className="support-message-row align-self-start">
                <div className="support-avatar-circle support-avatar-client">
                  <Building2 size={14} />
                </div>
                <div className="support-message-content">
                  <div className="support-message-info">
                    <span className="support-message-sender">{activeTicket.gymName} Owner</span>
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
                    className={`support-message-row ${isSuperAdmin ? 'align-self-end' : 'align-self-start'}`}
                  >
                    <div className={`support-avatar-circle ${isSuperAdmin ? 'support-avatar-admin' : 'support-avatar-client'}`}>
                      {isSuperAdmin ? <Shield size={14} /> : <Building2 size={14} />}
                    </div>
                    <div className="support-message-content">
                      <div className="support-message-info">
                        <span className="support-message-sender">{reply.sender} {isSuperAdmin && '(Support)'}</span>
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
                  placeholder="Type your reply to this client..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting || !replyText.trim()}
                  style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderColor: 'transparent', color: '#ffffff', padding: '0 1.25rem', gap: '0.35rem' }}
                >
                  {isSubmitting ? 'Sending...' : <><Send size={14} /> Send</>}
                </button>
              </form>
            ) : (
              <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', background: 'rgba(16, 185, 129, 0.02)', color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 600 }}>
                This ticket has been resolved and closed.
              </div>
            )}
          </>
        ) : (
          <div className="support-empty-view">
            <MessageSquare size={48} style={{ color: 'var(--text-dark)' }} />
            <span>Select a ticket from the inbox list to read and reply.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportCenter;
