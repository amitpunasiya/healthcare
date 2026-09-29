import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { ClinicProfile } from '../types';
import { extractCity } from '../utils/location';
import { Building2, MapPin, Phone, ShieldCheck, CheckCircle2, ArrowRight, Navigation } from 'lucide-react';

export const ClinicsPage: React.FC = () => {
  const [clinics, setClinics] = useState<ClinicProfile[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [locLoading, setLocLoading] = useState(false);
  const [locStatus, setLocStatus] = useState('');
  const navigate = useNavigate();

  const fetchClinics = async (overrideCity?: string) => {
    setLoading(true);
    try {
      let query = '/clinics?';
      const cityToUse = overrideCity !== undefined ? overrideCity : searchCity;
      if (cityToUse) query += `city=${encodeURIComponent(cityToUse)}&`;

      const res = await api.get(query);
      if (res.data.success) {
        setClinics(res.data.clinics);
      }
    } catch (err) {
      console.error('Failed to load clinics', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    setLocStatus('');
    if (!navigator.geolocation) {
      setLocStatus('Geolocation is not supported by your browser.');
      return;
    }
    setLocLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const inIndiaBounds = lat >= 6.5 && lat <= 35.7 && lng >= 68.1 && lng <= 97.4;
        if (!inIndiaBounds) {
          setLocLoading(false);
          setLocStatus('Sorry, our services are currently available only in India.');
          return;
        }
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data && data.address) {
            const countryCode = data.address.country_code?.toLowerCase();
            const countryName = data.address.country?.toLowerCase();
            if ((countryCode && countryCode !== 'in') || (countryName && !countryName.includes('india'))) {
              setLocLoading(false);
              setLocStatus('Sorry, our services are currently available only in India.');
              return;
            }
            const detectedCity = extractCity(data.address);
            if (detectedCity) {
              setSearchCity(detectedCity);
              setLocStatus(`📍 Nearby clinics in ${detectedCity} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
              fetchClinics(detectedCity);
            } else {
              setLocStatus(`📍 GPS Location captured (${lat.toFixed(4)}, ${lng.toFixed(4)}). Please enter city name manually.`);
              fetchClinics();
            }
          } else {
            fetchClinics();
          }
        } catch (err) {
          fetchClinics();
        } finally {
          setLocLoading(false);
        }
      },
      (err) => {
        setLocLoading(false);
        let msg = 'Location access denied or unavailable. Please enter city manually.';
        if (err.code === 1) msg = 'Location permission denied. Please search clinic location manually.';
        setLocStatus(msg);
      }
    );
  };

  useEffect(() => {
    fetchClinics();
  }, []);

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 3rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Registered Healthcare Centers
        </span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.3rem', marginBottom: '0.75rem' }}>
          Verified Clinics & Health Centers
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Book clinic appointments with certified therapy centers, medical clinics, and specialist practices.
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{ backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: '2.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Search by city or location..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            onBlur={() => fetchClinics()}
            className="form-input"
          />
        </div>

        <button
          type="button"
          disabled={locLoading}
          onClick={handleUseCurrentLocation}
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0f766e', borderColor: '#0d9488', backgroundColor: '#ccfbf1', fontWeight: 700 }}
        >
          <Navigation size={16} color="#0d9488" />
          {locLoading ? 'Locating...' : '📍 Use Current Location'}
        </button>

        <button onClick={() => fetchClinics()} className="btn btn-primary btn-sm">
          Filter Clinics
        </button>

        {locStatus && (
          <div style={{ width: '100%', fontSize: '0.85rem', color: locStatus.includes('denied') ? '#92400e' : '#166534', fontWeight: 600, marginTop: '0.25rem' }}>
            {locStatus}
          </div>
        )}
      </div>

      {/* Clinics Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading verified clinics...</div>
      ) : clinics.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No registered clinics found matching your search.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          {clinics.map((c) => (
            <div key={c._id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{c.clinicName}</h3>
                  <CheckCircle2 size={18} color="#10b981" />
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}>
                  <MapPin size={16} color="var(--primary)" /> {c.addressLine1}, {c.city} ({c.pincode})
                </p>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  {c.description || 'Modern registered clinic offering outpatient healthcare services and specialized therapy.'}
                </p>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                  <strong>Contact:</strong> {c.phone} • {c.email}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link to={`/clinics/${c._id}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  View Clinic
                </Link>
                <button
                  onClick={() => navigate('/book?mode=HOME_VISIT')}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Book Home Visit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ClinicProfilePage: React.FC = () => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [clinic, setClinic] = useState<ClinicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClinic = async () => {
      try {
        const res = await api.get(`/clinics/${clinicId}`);
        if (res.data.success) {
          setClinic(res.data.clinic);
        }
      } catch (err) {
        console.error('Failed to load clinic details', err);
      } finally {
        setLoading(false);
      }
    };
    if (clinicId) fetchClinic();
  }, [clinicId]);

  if (loading) return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Loading clinic profile...</div>;
  if (!clinic) return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Clinic not found</div>;

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '1000px' }}>
      <button onClick={() => navigate(-1)} className="btn btn-outline btn-sm" style={{ marginBottom: '1.5rem' }}>
        ← Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              {clinic.clinicName}
            </h1>
            <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', fontSize: '0.95rem' }}>
              <MapPin size={16} color="var(--primary)" /> {clinic.addressLine1}, {clinic.city} ({clinic.pincode})
            </p>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              {clinic.description || 'Verified healthcare center offering home visit specialists and clinical consultation.'}
            </p>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Services Available</h3>
            {clinic.servicesOffered && clinic.servicesOffered.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {clinic.servicesOffered.map((s: any, idx) => (
                  <span key={idx} style={{ background: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                    {s.name || s}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Comprehensive clinic services available.</p>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Opening Hours</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
              {clinic.openingHours && clinic.openingHours.map((w, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600 }}>{w.day}</span>
                  {w.available ? <span style={{ color: '#16a34a', fontWeight: 600 }}>{w.startTime} - {w.endTime}</span> : <span style={{ color: '#94a3b8' }}>Closed</span>}
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/book?mode=HOME_VISIT')}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
            >
              Book Home Visit Care <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
