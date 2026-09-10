import React from 'react';
import { Activity, ShieldCheck, Phone, Mail, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '4rem 0 2rem', marginTop: 'auto' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white', marginBottom: '1rem' }}>
            <Activity size={24} color="#38bdf8" />
            <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>CarePulse</span>
          </div>
          <p style={{ fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1rem' }}>
            Empowering patients & certified healthcare professionals with transparent Home Visits, Clinic Appointments, Diagnostic Labs, and Regular Hiring.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontSize: '0.85rem' }}>
            <ShieldCheck size={16} /> 100% Admin Verified Providers & Clinics
          </div>
        </div>

        <div>
          <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, marginBottom: '1.2rem' }}>Services Marketplace</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
            <li>Physiotherapy Home & Clinic</li>
            <li>Occupational Therapy</li>
            <li>Pediatric & Child Care</li>
            <li>Elder & Geriatric Care</li>
            <li>Home Lab Sample Collection</li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, marginBottom: '1.2rem' }}>For Partners & Providers</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
            <li>Join as Healthcare Professional</li>
            <li>Register Clinic / Health Center</li>
            <li>Register Diagnostic Lab</li>
            <li>Manual Booking Staff Portal</li>
            <li>Verification Process Guide</li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, marginBottom: '1.2rem' }}>Contact & Support</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Phone size={16} color="#0d9488" /> +1 (800) 227-3785</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Mail size={16} color="#0d9488" /> support@carepulse.com</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}><MapPin size={16} color="#0d9488" /> Healthcare Hub, Medical District</div>
          </div>
        </div>
      </div>

      <div className="container" style={{ borderTop: '1px solid #1e293b', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
        <p>&copy; {new Date().getFullYear()} CarePulse Healthcare Services Marketplace. Production-Ready Booking Architecture.</p>
      </div>
    </footer>
  );
};
