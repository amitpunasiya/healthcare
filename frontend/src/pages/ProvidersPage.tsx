import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ProviderProfile, ServiceCategory } from '../types';
import { Search, MapPin, CheckCircle2, ShieldCheck, Home, Building2, Calendar, ArrowRight } from 'lucide-react';

export const ProvidersPage: React.FC = () => {
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  // Search Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [city, setCity] = useState('');
  const [homeVisit, setHomeVisit] = useState(false);
  const [clinicVisit, setClinicVisit] = useState(false);

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProviders = async () => {
    setLoading(true);
    try {
      let query = '/providers?';
      if (selectedCatId) query += `categoryId=${selectedCatId}&`;
      if (city) query += `city=${encodeURIComponent(city)}&`;
      if (homeVisit) query += `homeVisit=true&`;
      if (clinicVisit) query += `clinicVisit=true&`;

      const res = await api.get(query);
      if (res.data.success) {
        setProviders(res.data.providers);
      }
    } catch (err) {
      console.error('Failed to fetch providers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCats = async () => {
      const res = await api.get('/services/categories');
      if (res.data.success) setCategories(res.data.categories);
    };
    fetchCats();
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [selectedCatId, homeVisit, clinicVisit]);

  const filteredProviders = providers.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.fullName.toLowerCase().includes(q);
      const matchQual = p.qualification.toLowerCase().includes(q);
      if (!matchName && !matchQual) return false;
    }
    return true;
  });

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 3rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Certified Healthcare Specialists
        </span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.3rem', marginBottom: '0.75rem' }}>
          Find Verified Healthcare Professionals
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Discover admin-verified physiotherapists, occupational therapists, pediatric nurses, and senior care specialists available for home or clinic visits.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: '2.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Search Specialist / Keyword</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Dr. Name or qualification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Specialty Category</label>
            <select value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)} className="form-select">
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Location / City</label>
            <input
              type="text"
              placeholder="e.g. Metropolis"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onBlur={fetchProviders}
              className="form-input"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
            <input type="checkbox" checked={homeVisit} onChange={(e) => setHomeVisit(e.target.checked)} />
            <Home size={16} color="var(--primary)" /> Home Visit Available
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
            <input type="checkbox" checked={clinicVisit} onChange={(e) => setClinicVisit(e.target.checked)} />
            <Building2 size={16} color="var(--primary)" /> Clinic Appointment Available
          </label>
        </div>
      </div>

      {/* Providers Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Searching verified directory...</div>
      ) : filteredProviders.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No verified professionals match your current search criteria.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          {filteredProviders.map((p) => (
            <div key={p._id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, flexShrink: 0 }}>
                    {p.fullName.charAt(0)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>{p.fullName}</h3>
                      <CheckCircle2 size={18} color="#10b981" />
                    </div>
                    <p style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                      {p.category?.name || 'Healthcare Specialist'}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                      {p.qualification} • {p.experienceYears} Years Exp
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {p.homeVisitAvailable && (
                    <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                      Home Visit
                    </span>
                  )}
                  {p.clinicVisitAvailable && (
                    <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                      Clinic Visit
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                  <strong>Fee:</strong> <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>₹{p.chargesPerSession}</span> / session
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link to={`/providers/${p._id}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  View Profile
                </Link>
                <button
                  onClick={() => {
                    const firstSrvId = p.servicesOffered?.[0]?._id;
                    if (firstSrvId) navigate(`/book/${firstSrvId}`);
                    else navigate(`/services/${p.category?.slug || 'physiotherapy'}`);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Book Appointment
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
