import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { LabProfile } from '../types';
import { FlaskConical, MapPin, CheckCircle2, ShieldCheck, Home, ArrowRight } from 'lucide-react';

export const LabsPage: React.FC = () => {
  const [labs, setLabs] = useState<LabProfile[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [homeCollectionOnly, setHomeCollectionOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchLabs = async () => {
    setLoading(true);
    try {
      let query = '/labs?';
      if (searchCity) query += `city=${encodeURIComponent(searchCity)}&`;
      if (homeCollectionOnly) query += `homeSampleCollection=true&`;

      const res = await api.get(query);
      if (res.data.success) {
        setLabs(res.data.labs);
      }
    } catch (err) {
      console.error('Failed to fetch labs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, [homeCollectionOnly]);

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 3rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Diagnostic & Pathology Centers
        </span>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.3rem', marginBottom: '0.75rem' }}>
          Verified Diagnostic Labs & Pathology Centers
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Book blood test panels, thyroid diagnostics, and full body checkups with certified pathology labs offering home sample collection.
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{ backgroundColor: 'white', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: '2.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Search by city or location..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            onBlur={fetchLabs}
            className="form-input"
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
          <input type="checkbox" checked={homeCollectionOnly} onChange={(e) => setHomeCollectionOnly(e.target.checked)} />
          <Home size={16} color="var(--primary)" /> Home Sample Collection Available
        </label>
      </div>

      {/* Labs Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading verified diagnostic labs...</div>
      ) : labs.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No registered diagnostic labs found matching your search.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          {labs.map((l) => (
            <div key={l._id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{l.labName}</h3>
                  <CheckCircle2 size={18} color="#10b981" />
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}>
                  <MapPin size={16} color="var(--primary)" /> {l.addressLine1}, {l.city} ({l.pincode})
                </p>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {l.homeSampleCollectionAvailable && (
                    <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                      Home Collection (+₹{l.homeCollectionFee})
                    </span>
                  )}
                  {l.labVisitAvailable && (
                    <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600 }}>
                      Center Visit
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
                  <strong>Contact:</strong> {l.phone} • {l.email}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link to={`/labs/${l._id}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  View Lab Profile
                </Link>
                <button
                  onClick={() => navigate('/services/lab-tests')}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Book Lab Test
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const LabProfilePage: React.FC = () => {
  const { labId } = useParams<{ labId: string }>();
  const [lab, setLab] = useState<LabProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLab = async () => {
      try {
        const res = await api.get(`/labs/${labId}`);
        if (res.data.success) {
          setLab(res.data.lab);
        }
      } catch (err) {
        console.error('Failed to load lab profile', err);
      } finally {
        setLoading(false);
      }
    };
    if (labId) fetchLab();
  }, [labId]);

  if (loading) return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Loading diagnostic lab profile...</div>;
  if (!lab) return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Lab profile not found.</div>;

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '1000px' }}>
      <div className="card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>{lab.labName}</h1>
          <ShieldCheck size={26} color="#10b981" />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
          <MapPin size={18} color="var(--primary)" /> {lab.addressLine1}, {lab.city}, {lab.state} - {lab.pincode}
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
          <span><strong>Home Sample Collection:</strong> {lab.homeSampleCollectionAvailable ? `Available (₹${lab.homeCollectionFee})` : 'Not Available'}</span>
          <span><strong>Contact Phone:</strong> {lab.phone}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div>
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Available Test Panels</h3>
            {lab.testsOffered && lab.testsOffered.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {lab.testsOffered.map((t) => (
                  <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{t.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.durationMinutes} mins turnaround</p>
                    </div>
                    <button onClick={() => navigate(`/book/${t._id}`)} className="btn btn-primary btn-sm">
                      Book Test ₹{t.basePrice}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Diagnostic blood panels and pathology tests available.</p>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Lab Collection Hours</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
              {lab.openingHours && lab.openingHours.map((w, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600 }}>{w.day}</span>
                  {w.available ? <span style={{ color: '#16a34a', fontWeight: 600 }}>{w.startTime} - {w.endTime}</span> : <span style={{ color: '#94a3b8' }}>Closed</span>}
                </div>
              ))}
            </div>

            <button onClick={() => navigate('/services/lab-tests')} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}>
              Book Lab Test Now <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
