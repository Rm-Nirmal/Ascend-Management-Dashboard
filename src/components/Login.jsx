import { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import logoWhite from '../assets/logo_white.webp';

const Login = () => {
  const { login, seedDatabaseClientSide } = useDashboard();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.message);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setIsLoading(true);

    try {
      let res = await login(demoEmail, demoPassword);
      if (!res.success) {
        setError('Auto-seeding demo database... Please wait.');
        const seedRes = await seedDatabaseClientSide(demoEmail, demoPassword);
        if (seedRes.success) {
          res = await login(demoEmail, demoPassword);
        }
      }
      if (!res.success) {
        setError(res.message);
      }
    } catch (err) {
      console.error('Demo login error:', err);
      setError('Demo login failed. Ensure demo accounts exist in Firebase Auth.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glowing ambient blobs */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '20%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 75%)',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.4
      }} />

      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '2.5rem',
        zIndex: 1,
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <img 
              src={logoWhite} 
              alt="Fitgencore Logo" 
              style={{ height: '32px', objectFit: 'contain', maxWidth: '240px', margin: '0 auto' }} 
            />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.75rem' }}>
            Fitgencore Management Console
          </p>
          {/* Firebase connected indicator */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            marginTop: '0.5rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '20px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            fontSize: '0.65rem',
            color: 'rgba(16, 185, 129, 0.9)',
            fontWeight: 600,
            letterSpacing: '0.03em'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Firebase Connected
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            color: 'var(--color-danger)',
            fontSize: '0.825rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Main Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Email input field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Corporate Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} />
              </span>
              <input
                type="email"
                className="glass-input"
                placeholder="name@ascend.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
          </div>

          {/* Password input field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Secure Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark)', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="glass-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dark)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary margin-t-1"
            disabled={isLoading}
            style={{
              padding: '0.85rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.02em',
              boxShadow: isLoading ? 'none' : 'var(--shadow-glow)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {isLoading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="loading-spinner" style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite'
                }} />
                Authenticating via Firebase...
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} />
                Access Core Console
              </span>
            )}
          </button>
        </form>

        {/* Demo Credentials Quick filler panel */}
        <div style={{
          marginTop: '2.25rem',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1.5rem',
          textAlign: 'center'
        }}>
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--text-dark)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'block',
            marginBottom: '0.85rem'
          }}>
            Quick Demo Sandbox Logins
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <button
              onClick={() => handleDemoLogin('superadmin@ascend.com', 'SuperAdmin@123')}
              disabled={isLoading}
              className="btn btn-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '0.5rem 1rem',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <span style={{ fontWeight: 600 }}>Sarah (SaaS Super Admin)</span>
              <span style={{ color: 'var(--text-dark)', fontSize: '0.7rem' }}>1-Click Login</span>
            </button>

            <button
              onClick={() => handleDemoLogin('admin@ascend.com', 'Admin@123')}
              disabled={isLoading}
              className="btn btn-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '0.5rem 1rem',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <span style={{ fontWeight: 600 }}>James (Fitgencore Gym Owner)</span>
              <span style={{ color: 'var(--text-dark)', fontSize: '0.7rem' }}>1-Click Login</span>
            </button>

            <button
              onClick={() => handleDemoLogin('owner@powergym.com', 'Owner@123')}
              disabled={isLoading}
              className="btn btn-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '0.5rem 1rem',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <span style={{ fontWeight: 600 }}>John (Power Gym Owner)</span>
              <span style={{ color: 'var(--text-dark)', fontSize: '0.7rem' }}>1-Click Login</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded CSS animation for loading spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
