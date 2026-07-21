import { useState, useEffect, useRef } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Send, Users, Shield, MessageSquare, Clock } from 'lucide-react';

const Chat = () => {
  const { 
    groupChatMessages = [], 
    sendGroupChatMessage, 
    currentUser, 
    setHasUnreadChat,
    admins = []
  } = useDashboard();

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Mark all messages as read when opening/receiving new messages
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('lastReadChatTime_' + currentUser.uid, new Date().toISOString());
      setHasUnreadChat(false);
    }
  }, [groupChatMessages, currentUser, setHasUnreadChat]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupChatMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || isSending) return;

    setIsSending(true);
    const res = await sendGroupChatMessage(messageText);
    setIsSending(false);

    if (res.success) {
      setMessageText('');
    }
  };

  // Helper to format role names beautifully
  const formatRole = (role) => {
    if (!role) return 'Staff';
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'gym_owner' || role === 'owner') return 'Gym Owner';
    if (role === 'admin') return 'Gym Admin';
    if (role === 'standard_admin') return 'Standard Admin';
    return role.replace('_', ' ');
  };

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Filter admins list to show other team members
  const teamMembers = admins.filter(admin => 
    ['super_admin', 'gym_owner', 'owner', 'admin', 'standard_admin'].includes(admin.role)
  );

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', paddingBottom: '1rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1rem', flexShrink: 0 }}>
        <div className="page-info">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare style={{ color: 'var(--color-primary)' }} />
            Team Workspace Chat
          </h1>
          <p>Real-time collaboration channel for gym owners, admins, and supervisors.</p>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: '1.5rem',
        flex: 1,
        minHeight: 0,
        height: '100%'
      }}>
        
        {/* Chat Area */}
        <div className="glass-card" style={{
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          height: '100%',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.01)'
        }}>
          
          {/* Channel Header */}
          <div style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-success, #10b981)',
                boxShadow: '0 0 8px var(--color-success, #10b981)'
              }} />
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Team Chat</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>General communication channel for administrative staff</span>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'rgba(0, 0, 0, 0.05)'
          }}>
            {groupChatMessages.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '100%', gap: '0.75rem', color: 'var(--text-muted)', textAlign: 'center'
              }}>
                <MessageSquare size={48} style={{ opacity: 0.15, strokeWidth: 1.5 }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>No messages yet</p>
                  <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>Be the first to send a message to the group!</p>
                </div>
              </div>
            ) : (
              groupChatMessages.map((msg, idx) => {
                const isMe = msg.senderId === (currentUser?.id || currentUser?.uid);
                
                // Set color theme depending on sender role to differentiate them like WhatsApp
                let roleColor = 'var(--text-muted)';
                let bubbleBg = 'rgba(255,255,255,0.03)';
                let borderTheme = '1px solid var(--border-color)';
                
                if (isMe) {
                  bubbleBg = 'var(--color-primary-glow, rgba(255,255,255,0.08))';
                  borderTheme = '1px solid var(--color-primary)';
                } else if (msg.senderRole === 'gym_owner' || msg.senderRole === 'owner') {
                  roleColor = '#3b82f6';
                } else if (msg.senderRole === 'admin') {
                  roleColor = '#10b981';
                } else if (msg.senderRole === 'standard_admin') {
                  roleColor = '#f59e0b';
                }

                // Render timestamp
                const msgTime = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                return (
                  <div key={msg.id || idx} style={{
                    display: 'flex',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                    gap: '0.75rem',
                    flexDirection: isMe ? 'row-reverse' : 'row'
                  }}>
                    {/* Avatar */}
                    {!isMe && (
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0
                      }}>
                        {msg.senderPhotoUrl ? (
                          <img src={msg.senderPhotoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          getInitials(msg.senderName)
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div style={{
                      background: bubbleBg,
                      border: borderTheme,
                      padding: '0.75rem 1rem',
                      borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}>
                      {!isMe && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{msg.senderName}</span>
                          <span style={{
                            fontSize: '0.6rem', fontWeight: 600, padding: '0.05rem 0.3rem', borderRadius: '4px',
                            background: 'rgba(255,255,255,0.05)', color: roleColor, border: '1px solid rgba(255,255,255,0.05)'
                          }}>
                            {formatRole(msg.senderRole)}
                          </span>
                        </div>
                      )}
                      
                      <div style={{ fontSize: '0.85rem', lineHeight: 1.4, color: 'var(--text-main)', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {msg.text}
                      </div>

                      <div style={{
                        fontSize: '0.65rem', color: 'var(--text-dark)', alignSelf: 'flex-end', display: 'flex',
                        alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem'
                      }}>
                        <Clock size={10} /> {msgTime}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Footer */}
          <form onSubmit={handleSend} style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(255,255,255,0.01)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message here..."
              disabled={isSending}
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
            <button
              type="submit"
              disabled={!messageText.trim() || isSending}
              className="btn btn-primary"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '40px', height: '40px', padding: 0, borderRadius: '10px',
                background: 'var(--color-primary)', border: 'none', cursor: 'pointer',
                opacity: messageText.trim() ? 1 : 0.6
              }}
            >
              <Send size={16} style={{ color: '#000' }} />
            </button>
          </form>
        </div>

        {/* Side Panel: Active Admins/Owners */}
        <div className="glass-card" style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.01)',
          height: '100%',
          overflowY: 'auto'
        }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
              <Users size={16} style={{ color: 'var(--color-primary)' }} />
              Team Directory ({teamMembers.length})
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Authorized workspace members.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {teamMembers.map((member) => (
              <div key={member.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.01)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.03)'
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)'
                }}>
                  {member.photo_url ? (
                    <img src={member.photo_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(member.name || member.full_name)
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {member.name || member.full_name}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Shield size={10} /> {formatRole(member.role)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Chat;
