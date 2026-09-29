import React from 'react';
import { Activity, ShieldCheck, Phone, Mail, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '3rem 0 1.5rem', marginTop: 'auto' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white', marginBottom: '0.85rem' }}>
            <Activity size={22} color="#38bdf8" />
            <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>CarePulse</span>
          </div>
          <p style={{ fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '0.85rem' }}>
            Empowering patients & certified healthcare professionals with transparent Home Visits, Home Physiotherapy, Occupational Therapy, Elder Care, and Home Lab Sample Collection.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontSize: '0.8rem' }}>
            <ShieldCheck size={16} /> 100% Admin Verified Home Visit Professionals
          </div>
        </div>

        <div>
          <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem' }}>Services Marketplace</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <li>Home Physiotherapy</li>
            <li>Occupational Therapy</li>
            <li>Elder & Geriatric Care</li>
            <li>Home Lab Sample Collection</li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem' }}>For Partners & Providers</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <li>Join as Healthcare Professional</li>
            <li>Register Clinic / Health Center</li>
            <li>Register Diagnostic Lab</li>
            <li>Manual Booking Staff Portal</li>
            <li>Verification Process Guide</li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.85rem' }}>Contact & Support</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={15} color="#0d9488" /> +1 (800) 227-3785</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={15} color="#0d9488" /> support@carepulse.com</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={15} color="#0d9488" /> Healthcare Hub, Medical District</div>
          </div>
        </div>
      </div>

      <div className="container" style={{ borderTop: '1px solid #1e293b', paddingTop: '1.25rem', textAlign: 'center', fontSize: '0.8rem' }}>
        <p>&copy; {new Date().getFullYear()} CarePulse Healthcare Services Marketplace. Production-Ready Mobile Architecture.</p>
      </div>
    </footer>
  );
};
