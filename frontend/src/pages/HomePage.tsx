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
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/services/categories');
        if (res.data.success) {
          const seen = new Set<string>();
          const deduplicated = res.data.categories.filter((cat: any) => {
            const key = (cat.slug || cat.name).toLowerCase().replace(/s$/, '').replace(/[^a-z0-9]/g, '');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setCategories(deduplicated);
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
        return <Activity size={26} color="#0284c7" />;
      case 'HeartHandshake':
        return <HeartHandshake size={26} color="#0d9488" />;
      case 'UserCheck':
        return <UserCheck size={26} color="#4f46e5" />;
      case 'FlaskConical':
        return <FlaskConical size={26} color="#0284c7" />;
      default:
        return <Activity size={26} color="#0284c7" />;
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '3.5rem 0 4.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(2,132,199,0.3) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }}></div>
        
        <div className="container" style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600, marginBottom: '1.25rem' }}>
              <Sparkles size={15} /> Available across India 🇮🇳 • Certified Healthcare
            </div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', fontWeight: 800, lineHeight: 1.18, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
              Healthcare Professionals Come To Your <span style={{ background: 'linear-gradient(90deg, #38bdf8, #2dd4bf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Home</span>
            </h1>
            <p style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)', color: '#94a3b8', lineHeight: 1.55, marginBottom: '1.75rem' }}>
              Doorstep healthcare services across India. Certified specialists for Home Physiotherapy, Occupational Therapy, Elder Care, and Home Lab Sample Collection.
            </p>

            {/* Mobile-First Prominent BOOK HOME VISIT CTA */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', padding: '1.25rem', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.15)', marginBottom: '1.5rem' }}>
              <div style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
                🏠 100% Home Visit Healthcare Services
              </div>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem', lineHeight: '1.4' }}>
                No clinic or lab travel required. Select your service category, enter your home address, and get matched with verified nearby providers.
              </p>
              <button
                onClick={() => navigate('/book?mode=HOME_VISIT')}
                style={{
                  width: '100%',
                  padding: '0.9rem 1rem',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  color: '#0f172a',
                  backgroundColor: '#38bdf8',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(56, 189, 248, 0.4)',
                }}
              >
                <Home size={22} /> BOOK HOME VISIT NOW <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '1.5rem', backdropFilter: 'blur(12px)' }}>
            <h3 style={{ color: 'white', fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck color="#2dd4bf" size={22} /> Verified Platform Features
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UserCheck color="#38bdf8" size={18} />
                </div>
                <div>
                  <h4 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>Strict Admin Verification</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Providers, clinics & labs undergo thorough verification before public booking.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(45,212,191,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock color="#2dd4bf" size={18} />
                </div>
                <div>
                  <h4 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>One-Time & Regular Hiring</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Book single therapy appointments or hire personal caregivers on a recurring schedule.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(244,63,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar color="#f43f5e" size={18} />
                </div>
                <div>
                  <h4 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>Unified Online & Manual Booking</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Support for online customer requests as well as direct clinic phone/walk-in manual bookings.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section className="container" style={{ padding: '3.5rem 1.25rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 2.5rem' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Healthcare Service Verticals
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Select a service category to view certified therapists, care providers, clinics, and diagnostic test options.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading services marketplace...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {categories.map((cat) => (
              <div key={cat._id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ width: '50px', height: '50px', borderRadius: '14px', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    {getIcon(cat.iconName)}
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>{cat.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>{cat.description}</p>
                </div>

                <div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.725rem', background: '#f1f5f9', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 600, color: '#475569' }}>
                      Home Visit Available
                    </span>
                    <span style={{ fontSize: '0.725rem', background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 700 }}>
                      🏠 100% Home Visit
                    </span>
                  </div>

                  <Link to={`/services/${cat.slug}`} className="btn btn-outline btn-mobile-full" style={{ width: '100%', justifyContent: 'center' }}>
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
