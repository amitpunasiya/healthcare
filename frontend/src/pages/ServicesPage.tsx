import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ServiceCategory, Service } from '../types';
import { Activity, HeartHandshake, UserCheck, FlaskConical, Clock, ShieldCheck, ArrowRight, Home, Building2 } from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('ALL');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cRes = await api.get('/services/categories');
        const sRes = await api.get('/services');

        if (cRes.data.success) {
          const seen = new Set<string>();
          const deduplicated = cRes.data.categories.filter((cat: any) => {
            const key = (cat.slug || cat.name).toLowerCase().replace(/s$/, '').replace(/[^a-z0-9]/g, '');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setCategories(deduplicated);
        }
        if (sRes.data.success) setServices(sRes.data.services);
      } catch (err) {
        console.error('Failed to load services data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredServices = services.filter((s) => {
    if (selectedCategorySlug !== 'ALL') {
      const catObj = typeof s.categoryId === 'object' ? s.categoryId : null;
      if (catObj && catObj.slug !== selectedCategorySlug) return false;
    }
    if (selectedMode !== 'ALL') {
      if (!s.serviceModesSupported.includes(selectedMode as any)) return false;
    }
    return true;
  });

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 3rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Healthcare Marketplace Services Catalog
        </span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.3rem', marginBottom: '0.75rem' }}>
          Explore Healthcare Verticals & Services
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Book verified physiotherapists, occupational therapists, senior elder caregivers, and lab test sample collections.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div style={{ backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: '2.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          <button
            onClick={() => setSelectedCategorySlug('ALL')}
            className={`btn btn-sm ${selectedCategorySlug === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategorySlug(cat.slug)}
              className={`btn btn-sm ${selectedCategorySlug === cat.slug ? 'btn-primary' : 'btn-outline'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '0.3rem 0.75rem', borderRadius: '8px' }}>
            🏠 100% Home Visit Services
          </span>
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading services marketplace...</div>
      ) : filteredServices.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No healthcare services found matching your filter options.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          {filteredServices.map((srv) => {
            const catName = typeof srv.categoryId === 'object' ? srv.categoryId.name : 'Healthcare Service';
            return (
              <div key={srv._id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '999px' }}>
                      {catName}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>₹{srv.basePrice}</span>
                      {srv.originalPrice && srv.originalPrice > srv.basePrice && (
                        <>
                          <span style={{ fontSize: '0.85rem', textDecoration: 'line-through', color: '#94a3b8', fontWeight: 500 }}>₹{srv.originalPrice}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            {srv.discountPercent ? `${srv.discountPercent}% OFF` : `${Math.round(((srv.originalPrice - srv.basePrice) / srv.originalPrice) * 100)}% OFF`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>{srv.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>{srv.description}</p>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                    {srv.serviceModesSupported.map((mode) => (
                      <span key={mode} style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 600, color: '#475569' }}>
                        {mode.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <button onClick={() => navigate(`/book/${srv._id}`)} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  Book Service Now <ArrowRight size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
