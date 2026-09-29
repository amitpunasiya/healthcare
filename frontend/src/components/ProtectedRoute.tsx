import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '65vh',
          gap: '1.25rem',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            border: '3px solid var(--border, #e2e8f0)',
            borderTopColor: 'var(--primary, #0284c7)',
            borderRadius: '50%',
            animation: 'carepulse-spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.95rem', fontWeight: 600 }}>
          Verifying session...
        </p>
        <style>{`
          @keyframes carepulse-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If user is not authenticated, redirect to login with original target path
  if (!token || !user) {
    const targetUrl = location.pathname + location.search;
    return <Navigate to={`/auth/login?redirect=${encodeURIComponent(targetUrl)}`} replace />;
  }

  // If specific roles are required, ensure user's role matches
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect unauthorized role to their respective home/dashboard
    switch (user.role) {
      case 'PROVIDER':
        return <Navigate to="/provider/dashboard" replace />;
      case 'CLINIC':
        return <Navigate to="/clinic/dashboard" replace />;
      case 'LAB':
        return <Navigate to="/lab/dashboard" replace />;
      case 'CUSTOMER':
        return <Navigate to="/customer/dashboard" replace />;
      case 'ADMIN':
        window.location.href = 'http://localhost:5174';
        return null;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
