import React, { useState } from 'react';
import adminApi from '../api/adminClient';
import { Activity, Lock, Mail, AlertCircle } from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@healthcare.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await adminApi.post('/auth/login', {
        email: email.trim(),
        password,
      });

      if (res.data.success && res.data.token) {
        if (res.data.user?.role !== 'ADMIN') {
          setErrorMsg('Access denied. Only system Administrators can access this portal.');
          return;
        }

        localStorage.setItem('admin_token', res.data.token);
        onLoginSuccess(res.data.token, res.data.user);
      } else {
        setErrorMsg('Authentication failed');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '420px',
        border: '1px solid #334155',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            backgroundColor: '#0284c7',
            marginBottom: '1rem'
          }}>
            <Activity size={32} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
            CarePulse Admin
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            System Command Center Authentication
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            color: '#f87171',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Admin Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@healthcare.com"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.85rem',
              backgroundColor: '#0284c7',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Admin Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};
