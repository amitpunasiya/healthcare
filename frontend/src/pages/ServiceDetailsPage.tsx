import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ServiceCategory, Service, ProviderProfile, ClinicProfile, LabProfile } from '../types';
import { Home, Building2, FlaskConical, Clock, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export const ServiceDetailsPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [clinics, setClinics] = useState<ClinicProfile[]>([]);
  const [labs, setLabs] = useState<LabProfile[]>([]);
  const [selectedMode, setSelectedMode] = useState<'HOME_VISIT' | 'CLINIC_VISIT' | 'LAB_VISIT'>('HOME_VISIT');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategoryDetails = async () => {
      setLoading(true);
      try {
        const catRes = await api.get(`/services/categories/${categorySlug}`);
        if (catRes.data.success) {
          setCategory(catRes.data.category);
          setServices(catRes.data.services);

          const catId = catRes.data.category._id;

          // Fetch verified providers for this category
          const provRes = await api.get(`/providers?categoryId=${catId}`);
          if (provRes.data.success) setProviders(provRes.data.providers);

          // Fetch verified clinics
          const clinRes = await api.get('/clinics');
          if (clinRes.data.success) setClinics(clinRes.data.clinics);

          // Fetch labs if category is lab tests
          if (categorySlug === 'lab-tests') {
            const labRes = await api.get('/labs');
            if (labRes.data.success) setLabs(labRes.data.labs);
            setSelectedMode('HOME_VISIT');
          }
        }
      } catch (err) {
        console.error('Failed to load category data', err);
      } finally {
        setLoading(false);
      }
    };

    if (categorySlug) fetchCategoryDetails();
  }, [categorySlug]);

  if (loading) {
    return <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Loading service catalog...</div>;
  }

  if (!category) {
    return <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Category not found.</div>;
  }

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      {/* Category Header */}
      <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', padding: '2.5rem', border: '1px solid var(--border)', marginBottom: '2.5rem', boxShadow: 'var(--shadow-sm)' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
          {category.name} Services
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '800px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {category.description}
        </p>

        {/* Mode Selector */}
        <div style={{ display: 'inline-flex', gap: '0.75rem', backgroundColor: '#f1f5f9', padding: '0.4rem', borderRadius: 'var(--radius-md)' }}>
          <button
            onClick={() => setSelectedMode('HOME_VISIT')}
            className={`btn btn-sm ${selectedMode === 'HOME_VISIT' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Home size={16} /> Home Visit / Collection
          </button>
          {category.slug !== 'lab-tests' ? (
            <button
              onClick={() => setSelectedMode('CLINIC_VISIT')}
              className={`btn btn-sm ${selectedMode === 'CLINIC_VISIT' ? 'btn-primary' : 'btn-outline'}`}
            >
              <Building2 size={16} /> Clinic / Center Visit
            </button>
          ) : (
            <button
              onClick={() => setSelectedMode('LAB_VISIT')}
              className={`btn btn-sm ${selectedMode === 'LAB_VISIT' ? 'btn-primary' : 'btn-outline'}`}
            >
              <FlaskConical size={16} /> Lab Center Visit
            </button>
          )}
        </div>
      </div>

      {/* Available Sub-Services List */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
        Available Sub-Services & Pricing
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3.5rem' }}>
        {services.map((srv) => (
          <div key={srv._id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>{srv.name}</h3>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>₹{srv.basePrice}</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>{srv.description}</p>
              
              {srv.prepInstructions && (
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.825rem', color: '#92400e', marginBottom: '1rem' }}>
                  <strong>Preparation:</strong> {srv.prepInstructions}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={15} /> {srv.durationMinutes} mins</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><ShieldCheck size={15} color="#10b981" /> Verified</span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/book/${srv._id}?mode=${selectedMode}`)}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Book Service Now <ArrowRight size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Verified Providers & Clinics Directory Section */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
        Verified Professionals & Centers
      </h2>

      {selectedMode === 'HOME_VISIT' && providers.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {providers.map((p) => (
            <div key={p._id} className="card" style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.25rem', color: '#475569', flexShrink: 0 }}>
                {p.fullName.charAt(0)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '1.05rem' }}>{p.fullName}</h4>
                  <CheckCircle2 size={16} color="#10b981" />
                </div>
                <p style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>{p.qualification} • {p.experienceYears} Years Exp</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Charge: ₹{p.chargesPerSession}/session</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMode === 'CLINIC_VISIT' && clinics.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {clinics.map((c) => (
            <div key={c._id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{c.clinicName}</h4>
                <CheckCircle2 size={16} color="#10b981" />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{c.addressLine1}, {c.city}</p>
              <p style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.4rem' }}>Contact: {c.phone}</p>
            </div>
          ))}
        </div>
      )}

      {selectedMode === 'LAB_VISIT' && labs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {labs.map((l) => (
            <div key={l._id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{l.labName}</h4>
                <CheckCircle2 size={16} color="#10b981" />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{l.addressLine1}, {l.city}</p>
              <p style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.4rem' }}>Home Collection Fee: ₹{l.homeCollectionFee}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
