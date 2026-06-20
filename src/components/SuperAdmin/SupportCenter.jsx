import { useState } from 'react';
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

  // Filters
  const filteredTickets = supportTickets.filter(ticket => {
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

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
      
      {/* LEFT COLUMN: TICKETS INBOX LIST */}
      <div style={{ 
        flex: '0 0 350px', 
        background: 'rgba(255, 255, 255, 0.01)', 
        border: '1px solid rgba(255, 255, 255, 0.04)', 
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Inbox header */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LifeBuoy size={18} style={{ color: '#a855f7' }} /> Support Tickets Inbox
          </h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{filteredTickets.length} tickets found</span>
        </div>

        {/* Filter Toolbar */}
        <div style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.005)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
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
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {filteredTickets.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No support tickets match filters.
            </div>
          ) : (
            filteredTickets.map(ticket => {
              const isSelected = ticket.id === selectedTicketId;
              const pBadge = getPriorityBadgeStyle(ticket.priority);
              const sBadge = getStatusBadgeStyle(ticket.status);

              return (
                <div 
                  key={ticket.id} 
                  onClick={() => setSelectedTicketId(ticket.id)}
                  style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(168, 85, 247, 0.03)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #a855f7' : '3px solid transparent',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-dark)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                    <Building2 size={12} />
                    <span>{ticket.gymName}</span>
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

      {/* RIGHT COLUMN: ACTIVE TICKET THREAD */}
      <div style={{ 
        flex: 1, 
        background: 'rgba(255, 255, 255, 0.01)', 
        border: '1px solid rgba(255, 255, 255, 0.04)', 
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {activeTicket ? (
          <>
            {/* Header info */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Original Message (from gym owner) */}
              <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '80%' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  flexShrink: 0
                }}>
                  <Building2 size={14} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{activeTicket.gymName} Owner</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)' }}>{new Date(activeTicket.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    padding: '0.85rem 1rem', 
                    borderRadius: '0px 10px 10px 10px',
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
                      alignSelf: isSuperAdmin ? 'flex-end' : 'flex-start',
                      flexDirection: isSuperAdmin ? 'row-reverse' : 'row'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isSuperAdmin ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSuperAdmin ? '#a855f7' : 'var(--text-muted)',
                      flexShrink: 0
                    }}>
                      {isSuperAdmin ? <Shield size={14} /> : <Building2 size={14} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: isSuperAdmin ? 'flex-end' : 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexDirection: isSuperAdmin ? 'row-reverse' : 'row' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{reply.sender} {isSuperAdmin && '(Support)'}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)' }}>{new Date(reply.createdAt).toLocaleString()}</span>
                      </div>
                      <div style={{ 
                        background: isSuperAdmin ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.02)', 
                        border: isSuperAdmin ? '1px solid rgba(168, 85, 247, 0.15)' : '1px solid rgba(255, 255, 255, 0.04)',
                        padding: '0.85rem 1rem', 
                        borderRadius: isSuperAdmin ? '10px 0px 10px 10px' : '0px 10px 10px 10px',
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
                  style={{ background: 'linear-gradient(135deg, #a855f7, #3b82f6)', borderColor: 'transparent', padding: '0 1.25rem', gap: '0.35rem' }}
                >
                  {isSubmitting ? 'Sending...' : <><Send size={14} /> Send</>}
                </button>
              </form>
            ) : (
              <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.03)', textAlign: 'center', background: 'rgba(16, 185, 129, 0.02)', color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 600 }}>
                This ticket has been resolved and closed.
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '1rem' }}>
            <MessageSquare size={36} style={{ color: 'var(--text-dark)' }} />
            <span>Select a ticket from the inbox list to read and reply.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportCenter;
