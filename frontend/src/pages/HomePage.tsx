import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ServiceCategory } from '../types';
import {
  Activity,
  Home,
  Building2,
  FlaskConical,
  Clock,
  ShieldCheck,
  Calendar,
  UserCheck,
  ArrowRight,
  Sparkles,
  HeartHandshake,
  Baby,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<'HOME_VISIT' | 'CLINIC_VISIT' | 'LAB_VISIT'>('HOME_VISIT');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/services/categories');
        if (res.data.success) {
          setCategories(res.data.categories);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const getIcon = (name: string) => {
    switch (name) {
      case 'Activity':
        return <Activity size={28} color="#0284c7" />;
      case 'HeartHandshake':
        return <HeartHandshake size={28} color="#0d9488" />;
      case 'Baby':
        return <Baby size={28} color="#e11d48" />;
      case 'UserCheck':
        return <UserCheck size={28} color="#4f46e5" />;
      case 'FlaskConical':
        return <FlaskConical size={28} color="#0284c7" />;
      default:
        return <Activity size={28} color="#0284c7" />;
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '5rem 0 6rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(2,132,199,0.3) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }}></div>
        
        <div className="container" style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.875rem', color: '#38bdf8', fontWeight: 600, marginBottom: '1.5rem' }}>
              <Sparkles size={16} /> Certified & Verified Healthcare Marketplace
            </div>
            <h1 style={{ fontSize: '2.75rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
              Book Quality Healthcare Services at <span style={{ background: 'linear-gradient(90deg, #38bdf8, #2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Home or Clinic</span>
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2rem' }}>
              Physiotherapy, Occupational Therapy, Elder Care, Child Care, and Lab Diagnostics. Book one-time visits or hire personal regular caregivers with verified healthcare professionals.
            </p>

            {/* Mode Switcher Tabs */}
            <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', padding: '0.5rem', borderRadius: '14px', display: 'inline-flex', gap: '0.5rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={() => setActiveMode('HOME_VISIT')}
                style={{
                  padding: '0.65rem 1.2rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: activeMode === 'HOME_VISIT' ? '#0f172a' : '#94a3b8',
                  backgroundColor: activeMode === 'HOME_VISIT' ? '#38bdf8' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <Home size={18} /> Home Service
              </button>
              <button
                onClick={() => setActiveMode('CLINIC_VISIT')}
                style={{
                  padding: '0.65rem 1.2rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: activeMode === 'CLINIC_VISIT' ? '#0f172a' : '#94a3b8',
                  backgroundColor: activeMode === 'CLINIC_VISIT' ? '#38bdf8' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <Building2 size={18} /> Clinic Visit
              </button>
              <button
                onClick={() => setActiveMode('LAB_VISIT')}
                style={{
                  padding: '0.65rem 1.2rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: activeMode === 'LAB_VISIT' ? '#0f172a' : '#94a3b8',
                  backgroundColor: activeMode === 'LAB_VISIT' ? '#38bdf8' : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <FlaskConical size={18} /> Lab Tests
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/services/physiotherapy')} className="btn btn-primary btn-lg">
                Explore Services & Book <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '2rem', backdropFilter: 'blur(12px)' }}>
            <h3 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck color="#2dd4bf" size={24} /> Verified Platform Features
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UserCheck color="#38bdf8" size={20} />
                </div>
                <div>
                  <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>Strict Admin Verification</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Providers, clinics & labs undergo thorough verification before public booking.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(45,212,191,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock color="#2dd4bf" size={20} />
                </div>
                <div>
                  <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>One-Time & Regular Hiring</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Book single therapy appointments or hire personal caregivers on a recurring schedule.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar color="#f43f5e" size={20} />
                </div>
                <div>
                  <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>Unified Online & Manual Booking</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Support for online customer requests as well as direct clinic phone/walk-in manual bookings.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section className="container" style={{ padding: '5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
            Healthcare Service Verticals
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
            Select a service category to view certified therapists, care providers, clinics, and diagnostic test options.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading services marketplace...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {categories.map((cat) => (
              <div key={cat._id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    {getIcon(cat.iconName)}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{cat.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>{cat.description}</p>
                </div>

                <div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600, color: '#475569' }}>
                      Home Visit Available
                    </span>
                    <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600, color: '#475569' }}>
                      Clinic / Lab Visit
                    </span>
                  </div>

                  <Link to={`/services/${cat.slug}`} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                    Explore & Book <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
