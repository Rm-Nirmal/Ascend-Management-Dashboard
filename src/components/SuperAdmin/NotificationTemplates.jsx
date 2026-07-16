import { useState, useEffect } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { MessageSquare, Save, Info, AlertTriangle } from 'lucide-react';

const NotificationTemplates = () => {
  const { notificationTemplates, updateNotificationTemplate, showToast } = useDashboard();
  const [activeTemplateId, setActiveTemplateId] = useState('t_welcome');
  const [templateBody, setTemplateBody] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter out any templates that are not welcome or pay
  const templatesList = [
    { id: 't_welcome', name: 'New Registration Welcome', defaultBody: 'Welcome to {{gym_name}}, {{name}}! Your membership code is {{code}}. Scan your QR code at the entrance gate to check in.' },
    { id: 't_pay', name: 'Payment Reminder Alert', defaultBody: 'Hello {{name}}, this is a friendly reminder that invoice {{invoice}} for LKR {{amount}} was due on {{date}} at {{gym_name}}.' }
  ];

  // Retrieve current active template from database or fall back to default
  const activeTemplate = templatesList.find(t => t.id === activeTemplateId);
  const currentDbTemplate = notificationTemplates?.find(t => t.id === activeTemplateId);

  useEffect(() => {
    if (activeTemplate) {
      const name = activeTemplate.name;
      const body = currentDbTemplate?.body || activeTemplate.defaultBody;
      const timer = setTimeout(() => {
        setTemplateName(name);
        setTemplateBody(body);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeTemplateId, currentDbTemplate, activeTemplate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!templateBody.trim()) {
      showToast('Template body cannot be empty.', 'warning');
      return;
    }
    setIsSaving(true);
    
    await updateNotificationTemplate(activeTemplateId, {
      name: templateName,
      body: templateBody,
      channel: 'sms'
    });
    
    setIsSaving(false);
  };

  const getVariables = () => {
    if (activeTemplateId === 't_welcome') {
      return ['{{name}}', '{{code}}', '{{gym_name}}'];
    }
    return ['{{name}}', '{{invoice}}', '{{amount}}', '{{date}}', '{{gym_name}}'];
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', boxSizing: 'border-box' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(59, 130, 246, 0.05))',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <MessageSquare style={{ color: '#a855f7' }} /> Notification Templates
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            Configure global SMS messages sent to gym members upon registration and payment deadlines.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left column: Template Selector */}
        <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--text-dark)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '0 0.5rem 0.5rem 0.5rem',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '0.5rem'
          }}>
            SMS TEMPLATE DIRECTORY
          </span>
          
          {templatesList.map(t => {
            const isActive = activeTemplateId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTemplateId(t.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid transparent',
                  background: isActive ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
                  borderColor: isActive ? 'rgba(168, 85, 247, 0.25)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  gap: '0.25rem'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isActive ? '#c084fc' : 'var(--text-main)' }}>
                  {t.name}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  ID: {t.id}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right column: Editor Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2rem' }}>
            
            <h3 style={{
              margin: '0 0 1.5rem 0',
              fontFamily: 'var(--font-display)',
              fontSize: '1.2rem',
              fontWeight: 700,
              color: '#fff',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Edit Template: {templateName}</span>
              <span style={{
                fontSize: '0.65rem',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                SMS Channel Only
              </span>
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Dynamic Variables helper banner */}
              <div style={{
                background: 'rgba(168, 85, 247, 0.04)',
                border: '1px solid rgba(168, 85, 247, 0.15)',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Info size={14} /> Available Template Variables:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {getVariables().map(v => (
                    <code
                      key={v}
                      onClick={() => {
                        setTemplateBody(prev => prev + ' ' + v);
                        showToast(`Inserted variable ${v}`, 'info');
                      }}
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        color: '#fff',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      title="Click to insert variable at the end"
                    >
                      {v}
                    </code>
                  ))}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Tip: Variables are replaced dynamically when the SMS is queued. Click a variable to append it to the body.
                </span>
              </div>

              {/* Message Body Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  SMS Message Content
                </label>
                <textarea
                  className="glass-input"
                  style={{
                    height: '140px',
                    padding: '1rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    fontFamily: 'sans-serif',
                    resize: 'none'
                  }}
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  placeholder="Enter message body..."
                  required
                  disabled={isSaving}
                />
                
                {/* Character and GSM Counter */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>
                    GSM Character Count: <strong>{templateBody.length}</strong> chars
                  </span>
                  <span>
                    Estimated SMS segments: <strong>{Math.ceil(templateBody.length / 160) || 1}</strong> segment(s)
                  </span>
                </div>
              </div>

              {/* Warnings / Best Practices Banner */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.03)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '0.1rem' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: '#f59e0b' }}>SMS Regulatory Notice</span>
                  <span style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Ensure the message complies with regional spam regulations. Always include your business identifier (e.g. <code>{"{{gym_name}}"}</code>) and keep content concise to avoid multiple SMS delivery billing blocks.
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
                  borderColor: 'transparent',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginLeft: 'auto'
                }}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="loading-spinner" style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite',
                      display: 'inline-block'
                    }} />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Template Configurations
                  </>
                )}
              </button>

            </form>

          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
};

export default NotificationTemplates;
