import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Address } from '../types';
import { User, MapPin, Plus, Save, CheckCircle } from 'lucide-react';

export const CustomerProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.profile?.fullName || user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emergencyContact, setEmergencyContact] = useState(user?.profile?.emergencyContact || '');

  const [addresses, setAddresses] = useState<Address[]>(user?.profile?.addresses || [
    { label: 'Home', addressLine1: '123 Health Ave, Suite 4B', city: 'Metropolis', state: 'State', pincode: '110001', isDefault: true }
  ]);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [label, setLabel] = useState('Home');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('Metropolis');
  const [state, setState] = useState('State');
  const [pincode, setPincode] = useState('110001');

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const newAddr: Address = {
      label,
      addressLine1,
      city,
      state,
      pincode,
    };
    setAddresses([...addresses, newAddr]);
    setShowAddressModal(false);
    setAddressLine1('');
  };

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '800px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Patient Profile & Saved Addresses</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage your personal healthcare profile and saved home visit delivery addresses</p>
      </div>

      {/* Account Info Form */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={20} color="var(--primary)" /> Personal Details
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" disabled value={user?.email || ''} className="form-input" style={{ backgroundColor: '#f1f5f9' }} />
          </div>

          <div className="form-group">
            <label className="form-label">Emergency Contact Number</label>
            <input type="tel" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} className="form-input" placeholder="+1 555-0199" />
          </div>
        </div>
      </div>

      {/* Addresses Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={20} color="var(--primary)" /> Saved Delivery Addresses
          </h3>
          <button onClick={() => setShowAddressModal(true)} className="btn btn-outline btn-sm" style={{ display: 'flex', gap: '0.35rem' }}>
            <Plus size={16} /> Add Address
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {addresses.map((addr, idx) => (
            <div key={idx} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                  {addr.label}
                </span>
                <p style={{ fontWeight: 600, marginTop: '0.35rem', fontSize: '0.925rem' }}>{addr.addressLine1}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{addr.city}, {addr.state} - {addr.pincode}</p>
              </div>
              {addr.isDefault && <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>Default Address</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddressModal && (
        <div className="modal-overlay" onClick={() => setShowAddressModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add New Delivery Address</h3>
            
            <form onSubmit={handleAddAddress}>
              <div className="form-group">
                <label className="form-label">Address Label</label>
                <select value={label} onChange={(e) => setLabel(e.target.value)} className="form-select">
                  <option value="Home">Home</option>
                  <option value="Work">Work / Office</option>
                  <option value="Parents">Parents House</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Street Address / House No</label>
                <input type="text" required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="form-input" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input type="text" required value={state} onChange={(e) => setState(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input type="text" required value={pincode} onChange={(e) => setPincode(e.target.value)} className="form-input" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowAddressModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Address</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
