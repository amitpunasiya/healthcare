import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, User as UserIcon, LogOut, Calendar, Home, Users, Building2, FlaskConical, HelpCircle, CalendarCheck, X, ArrowRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [bookModalOpen, setBookModalOpen] = useState(false);

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

  const handleSelectBookingMode = (mode: 'HOME_VISIT' | 'CLINIC_VISIT' | 'LAB_VISIT') => {
    setBookModalOpen(false);
    navigate(`/book?mode=${mode}`);
  };

  return (
    <>
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
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Prominent TOP-LEVEL BOOK Button */}
            <button
              onClick={() => setBookModalOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1.25rem',
                fontSize: '0.95rem',
                fontWeight: 800,
                borderRadius: '999px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
              }}
            >
              <CalendarCheck size={18} /> BOOK NOW
            </button>

            <Link to="/" style={{ fontWeight: isActive('/') ? 700 : 600, color: isActive('/') ? 'var(--primary)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.925rem' }}>
              <Home size={17} /> Home
            </Link>
            <Link to="/services" style={{ fontWeight: isActive('/services') ? 700 : 600, color: isActive('/services') ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.925rem' }}>
              Services
            </Link>
            <Link to="/providers" style={{ fontWeight: isActive('/providers') ? 700 : 600, color: isActive('/providers') ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.925rem' }}>
              <Users size={17} /> Professionals
            </Link>
            <Link to="/clinics" style={{ fontWeight: isActive('/clinics') ? 700 : 600, color: isActive('/clinics') ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.925rem' }}>
              <Building2 size={17} /> Clinics
            </Link>
            <Link to="/labs" style={{ fontWeight: isActive('/labs') ? 700 : 600, color: isActive('/labs') ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.925rem' }}>
              <FlaskConical size={17} /> Labs
            </Link>
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
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Prominent TOP-LEVEL BOOK Selection Modal */}
      {bookModalOpen && (
        <div className="modal-overlay" onClick={() => setBookModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', padding: '2.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>Select Booking Visit Mode</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>How would you like to receive your healthcare service?</p>
              </div>
              <button onClick={() => setBookModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Option 1: Home Visit */}
              <div
                onClick={() => handleSelectBookingMode('HOME_VISIT')}
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '16px',
                  border: '2px solid var(--border)',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Home size={26} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Home Visit</h3>
                    <ArrowRight size={18} color="var(--primary)" />
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Certified therapist or phlebotomist visits your home (Physiotherapy, OT, Elder Care, Home Lab Sample Collection).
                  </p>
                </div>
              </div>

              {/* Option 2: Clinic Visit */}
              <div
                onClick={() => handleSelectBookingMode('CLINIC_VISIT')}
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '16px',
                  border: '2px solid var(--border)',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#ccfbf1', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={26} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Clinic Visit</h3>
                    <ArrowRight size={18} color="#0d9488" />
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Visit a verified nearby medical clinic or therapy health center for in-person consultation & treatment.
                  </p>
                </div>
              </div>

              {/* Option 3: Lab Visit */}
              <div
                onClick={() => handleSelectBookingMode('LAB_VISIT')}
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '16px',
                  border: '2px solid var(--border)',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FlaskConical size={26} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Lab Visit</h3>
                    <ArrowRight size={18} color="#0284c7" />
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Visit a verified pathology laboratory center for diagnostic blood panels & health checkups.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

