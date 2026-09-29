import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, User as UserIcon, LogOut, Calendar, Home, Users, Building2, FlaskConical, CalendarCheck, X, Menu, ArrowRight, ChevronRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bookModalOpen, setBookModalOpen] = useState(false);
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

  const handleBookNow = () => {
    setMobileMenuOpen(false);
    navigate('/book?mode=HOME_VISIT');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header style={{ backgroundColor: 'var(--bg-glass)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
          {/* Brand Logo */}
          <Link to="/" onClick={closeMobileMenu} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)', color: 'white', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(2,132,199,0.25)' }}>
              <Activity size={22} />
            </div>
            <div>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.1 }}>CarePulse</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.04em' }}>HOME VISIT HEALTHCARE • INDIA 🇮🇳</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link to="/" style={{ fontWeight: isActive('/') ? 700 : 600, color: isActive('/') ? 'var(--primary)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem' }}>
              <Home size={16} /> Home
            </Link>
            <Link to="/services" style={{ fontWeight: isActive('/services') ? 700 : 600, color: isActive('/services') ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.9rem' }}>
              Services
            </Link>
            <Link to="/providers" style={{ fontWeight: isActive('/providers') ? 700 : 600, color: isActive('/providers') ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem' }}>
              <Users size={16} /> Professionals
            </Link>
          </nav>

          {/* Right Header Actions & BOOK NOW CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* BOOK NOW CTA (Direct Home Visit Flow) */}
            <button
              onClick={handleBookNow}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.95rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                borderRadius: '999px',
                minHeight: '40px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              }}
            >
              <CalendarCheck size={16} /> BOOK NOW
            </button>

            {/* Desktop User Dashboard / Logout */}
            <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {user ? (
                <>
                  <Link to={getDashboardPath()} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={15} /> Dashboard ({user.role})
                  </Link>
                  {user.role === 'CUSTOMER' && (
                    <Link to="/customer/profile" className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <UserIcon size={15} /> Profile
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
                    <LogOut size={15} />
                  </button>
                </>
              ) : (
                <>
                  <Link to="/auth/login" className="btn btn-outline btn-sm">
                    Login
                  </Link>
                  <Link to="/auth/register" className="btn btn-primary btn-sm">
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Drawer Menu Toggle Button */}
            <button
              className="hide-on-desktop"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-main)',
              }}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE SLIDE-DOWN / SIDE DRAWER MENU */}
      {mobileMenuOpen && (
        <div
          className="hide-on-desktop"
          style={{
            position: 'fixed',
            top: '72px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 99,
          }}
          onClick={closeMobileMenu}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '1.25rem',
              borderBottomLeftRadius: '20px',
              borderBottomRightRadius: '20px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            {/* BOOK NOW Prominent Button inside Menu */}
            <button
              onClick={handleBookNow}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', fontWeight: 800, marginBottom: '0.5rem' }}
            >
              <CalendarCheck size={20} /> 🏠 BOOK HOME VISIT
            </button>

            <Link
              to="/"
              onClick={closeMobileMenu}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                backgroundColor: isActive('/') ? 'var(--primary-light)' : '#f8fafc',
                color: isActive('/') ? 'var(--primary-dark)' : 'var(--text-main)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Home size={18} color="var(--primary)" /> Home</span>
              <ChevronRight size={18} color="var(--text-muted)" />
            </Link>

            <Link
              to="/services"
              onClick={closeMobileMenu}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                backgroundColor: isActive('/services') ? 'var(--primary-light)' : '#f8fafc',
                color: isActive('/services') ? 'var(--primary-dark)' : 'var(--text-main)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Activity size={18} color="var(--primary)" /> Services</span>
              <ChevronRight size={18} color="var(--text-muted)" />
            </Link>

            <Link
              to="/providers"
              onClick={closeMobileMenu}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                backgroundColor: isActive('/providers') ? 'var(--primary-light)' : '#f8fafc',
                color: isActive('/providers') ? 'var(--primary-dark)' : 'var(--text-main)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Users size={18} color="var(--primary)" /> Professionals</span>
              <ChevronRight size={18} color="var(--text-muted)" />
            </Link>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
              {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <Link
                    to={getDashboardPath()}
                    onClick={closeMobileMenu}
                    className="btn btn-secondary btn-lg"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Calendar size={18} /> Dashboard ({user.role})
                  </Link>

                  {user.role === 'CUSTOMER' && (
                    <Link
                      to="/customer/profile"
                      onClick={closeMobileMenu}
                      className="btn btn-outline btn-lg"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <UserIcon size={18} /> Edit Profile
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      logout();
                      closeMobileMenu();
                      navigate('/');
                    }}
                    className="btn btn-outline btn-lg"
                    style={{ width: '100%', justifyContent: 'center', color: '#dc2626', borderColor: '#fee2e2' }}
                  >
                    <LogOut size={18} /> Logout
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <Link
                    to="/auth/login"
                    onClick={closeMobileMenu}
                    className="btn btn-outline btn-lg"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Login
                  </Link>
                  <Link
                    to="/auth/register"
                    onClick={closeMobileMenu}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
