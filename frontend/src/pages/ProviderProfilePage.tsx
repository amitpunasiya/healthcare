import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { ProviderProfile } from '../types';
import { CheckCircle2, ShieldCheck, Clock, MapPin, Award, Calendar, ArrowRight } from 'lucide-react';

export const ProviderProfilePage: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/providers/${providerId}`);
        if (res.data.success) {
          setProvider(res.data.provider);
        }
      } catch (err) {
        console.error('Failed to load provider profile', err);
      } finally {
        setLoading(false);
      }
    };
    if (providerId) fetchProfile();
  }, [providerId]);

  if (loading) {
    return <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Loading provider profile...</div>;
  }

  if (!provider) {
    return <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Provider profile not found or pending verification.</div>;
  }

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '1000px' }}>
      {/* Header Profile Summary */}
      <div className="card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, flexShrink: 0 }}>
            {provider.fullName.charAt(0)}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{provider.fullName}</h1>
              <ShieldCheck size={24} color="#10b981" />
            </div>

            <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
              {provider.category?.name} Specialist
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Award size={16} /> {provider.qualification}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Clock size={16} /> {provider.experienceYears} Years Clinical Experience</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
              ₹{provider.category?.slug === 'physiotherapy' ? 450 : provider.category?.slug === 'occupational-therapy' ? 550 : (provider.chargesPerSession || 450)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Left Column: Bio & Services */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>About Professional</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              {provider.bio || 'Dedicated healthcare specialist committed to restoring patient health, mobility, and independence through personalized therapeutic care.'}
            </p>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Services Offered</h3>
            {provider.servicesOffered && provider.servicesOffered.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {provider.servicesOffered.map((srv) => (
                  <div key={srv._id} style={{ padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{srv.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{srv.durationMinutes} mins session</p>
                    </div>
                    <button onClick={() => navigate(`/book/${srv._id}`)} className="btn btn-primary btn-sm">
                      Book Service
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>All category sub-services available.</p>
            )}
          </div>
        </div>

        {/* Right Column: Availability & Service Area */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Working Hours Schedule</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
              {provider.workingHours && provider.workingHours.map((w, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{w.day}</span>
                  {w.available ? (
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>{w.startTime} - {w.endTime}</span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>Closed / Day Off</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Delivery Options</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                <CheckCircle2 size={18} /> 🏠 100% Home Visit Care Available
              </div>
            </div>

            <button
              onClick={() => {
                const firstSrvId = provider.servicesOffered?.[0]?._id;
                if (firstSrvId) navigate(`/book/${firstSrvId}`);
                else navigate(`/services/${provider.category?.slug || 'physiotherapy'}`);
              }}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
            >
              Book Appointment Now <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
