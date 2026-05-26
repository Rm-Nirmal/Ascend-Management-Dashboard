import { useEffect } from 'react';
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';

const ToastCard = ({ toast, onClose }) => {
  const { id, message, type } = toast;

  // Auto-close toast triggers after 4s (handled in context, but let's sync local close)
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  // Icons matching monochrome aesthetic
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} style={{ color: '#ffffff', flexShrink: 0 }} />;
      case 'error':
        return <AlertOctagon size={18} style={{ color: '#ffffff', flexShrink: 0 }} />;
      case 'warning':
        return <AlertTriangle size={18} style={{ color: '#a3a3a3', flexShrink: 0 }} />;
      case 'info':
      default:
        return <Info size={18} style={{ color: '#a3a3a3', flexShrink: 0 }} />;
    }
  };

  return (
    <div className={`toast-card toast-${type}`} style={{
      position: 'relative',
      background: 'rgba(12, 12, 12, 0.9)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(16px)',
      padding: '0.85rem 1.25rem 1rem 1.25rem',
      borderRadius: '8px',
      color: '#ffffff',
      fontSize: '0.85rem',
      fontWeight: 500,
      width: '360px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.8)',
      overflow: 'hidden',
      pointerEvents: 'auto',
      animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      {getIcon()}
      <div style={{ flexGrow: 1, paddingRight: '0.5rem', lineHeight: '1.4' }}>{message}</div>
      <button 
        onClick={() => onClose(id)} 
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.4)',
          cursor: 'pointer',
          padding: '0.25rem',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'; e.currentTarget.style.background = 'none'; }}
      >
        <X size={14} />
      </button>

      {/* Modern thin monochrome progress bar */}
      <div className="toast-progress-bar" style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: '2px',
        background: type === 'success' ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
        width: '100%',
        transformOrigin: 'left',
        animation: 'toastProgress 4s linear forwards'
      }} />
    </div>
  );
};

export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container" style={{
      position: 'fixed',
      top: '1.5rem',
      right: '1.5rem',
      zIndex: 11000,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => (
        <ToastCard key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
};

export default ToastContainer;
