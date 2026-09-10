import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, User as UserIcon, LogOut, Calendar, Home, Users, Building2, FlaskConical, HelpCircle, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const getDashboardPath = () => {
    if (!user) return '/auth/login';
    switch (user.role) {
      case 'CUSTOMER':
        return '/customer/dashboard';
      case 'PROVIDER':
        return '/provider/dashboard';
      case 'CLINIC':
        return '/clinic/dashboard';
      case 'LAB':
        return '/lab/dashboard';
      case 'ADMIN':
        return 'http://localhost:5174';
      default:
        return '/customer/dashboard';
    }
  };

  return (
    <header style={{ backgroundColor: 'var(--bg-glass)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '76px' }}>
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)', color: 'white', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(2,132,199,0.25)' }}>
            <Activity size={24} />
          </div>
          <div>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>CarePulse</span>
            <span style={{ fontSize: '0.725rem', display: 'block', color: 'var(--primary)', fontWeight: 700, marginTop: '-4px' }}>HEALTHCARE SERVICES</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
          <Link to="/" style={{ fontWeight: isActive('/') ? 700 : 600, color: isActive('/') ? 'var(--primary)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.925rem' }}>
            <Home size={17} /> Home
          </Link>
          <Link to="/services" style={{ fontWeight: isActive('/services') ? 700 : 600, color: isActive('/services') ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.925rem' }}>
            Services
          </Link>
          <Link to="/providers" style={{ fontWeight: isActive('/providers') ? 700 : 600, color: isActive('/providers') ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.925rem' }}>
            <Users size={17} /> Find Professionals
          </Link>
          <Link to="/clinics" style={{ fontWeight: isActive('/clinics') ? 700 : 600, color: isActive('/clinics') ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.925rem' }}>
            <Building2 size={17} /> Clinics
          </Link>
          <Link to="/labs" style={{ fontWeight: isActive('/labs') ? 700 : 600, color: isActive('/labs') ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.925rem' }}>
            <FlaskConical size={17} /> Labs
          </Link>
          <a href="/#how-it-works" style={{ fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.925rem' }}>
            <HelpCircle size={17} /> How It Works
          </a>
        </nav>

        {/* User Role Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to={getDashboardPath()} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={16} /> Dashboard ({user.role})
              </Link>
              {user.role === 'CUSTOMER' && (
                <Link to="/customer/profile" className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <UserIcon size={16} /> Profile
                </Link>
              )}
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="btn btn-outline btn-sm"
                title="Logout"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to="/auth/login" className="btn btn-outline btn-sm">
                Login
              </Link>
              <Link to="/auth/register" className="btn btn-primary btn-sm">
                Register / Join Us
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
