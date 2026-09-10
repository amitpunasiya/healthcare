import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Booking, BookingStatus, Service } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PlusCircle, ShieldCheck, AlertTriangle, Calendar, Clock, CheckCircle } from 'lucide-react';

export const ClinicDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Booking Modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [customPrice, setCustomPrice] = useState(800);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings');
      if (res.data.success) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('Failed to load clinic bookings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    const fetchServices = async () => {
      const res = await api.get('/services');
      if (res.data.success) {
        setServices(res.data.services);
        if (res.data.services.length > 0) setSelectedServiceId(res.data.services[0]._id);
      }
    };
    fetchServices();
  }, []);

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedSrv = services.find((s) => s._id === selectedServiceId);
      const res = await api.post('/bookings/manual', {
        customerName: patientName,
        customerPhone: patientPhone,
        clinicId: user?.id,
        serviceCategoryId: typeof selectedSrv?.categoryId === 'object' ? selectedSrv?.categoryId._id : selectedSrv?.categoryId,
        serviceId: selectedServiceId,
        serviceMode: 'CLINIC_VISIT',
        bookingDate,
        timeSlot: { startTime, endTime },
        customPrice: Number(customPrice),
        notes: 'Walk-in / Phone Manual Booking by Clinic Staff',
      });

      if (res.data.success) {
        setShowManualModal(false);
        setPatientName('');
        setPatientPhone('');
        fetchBookings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Manual booking failed');
    }
  };

  const handleStatusChange = async (id: string, status: BookingStatus) => {
    try {
      const res = await api.patch(`/bookings/${id}/status`, { status });
      if (res.data.success) fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Clinic & Center Portal</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage appointments & manual walk-in / phone call bookings</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href="/clinic/bookings" className="btn btn-outline" style={{ textDecoration: 'none' }}>
            Open Booking Manager &rarr;
          </a>
          <button onClick={() => setShowManualModal(true)} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem' }}>
            <PlusCircle size={18} /> Create Manual Booking
          </button>
        </div>
      </div>

      {user?.verificationStatus === 'PENDING_VERIFICATION' && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', color: '#92400e' }}>
          <AlertTriangle size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          Clinic account is pending Admin Verification.
        </div>
      )}

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Appointments Ledger</h2>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading ledger...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {bookings.map((b) => (
            <div key={b._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>#{b.bookingNumber}</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <StatusBadge status={b.bookingSource} />
                  <StatusBadge status={b.status} />
                </div>
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{b.serviceId?.name}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                Patient: {b.customerDetails?.name} ({b.customerDetails?.phone})
              </p>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                <div>Date: {b.bookingDate} ({b.timeSlot?.startTime} - {b.timeSlot?.endTime})</div>
                <div>Total Fee: ₹{b.pricing?.totalAmount}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {b.status === 'PENDING' && (
                  <button onClick={() => handleStatusChange(b._id, 'ACCEPTED')} className="btn btn-success btn-sm">Accept</button>
                )}
                {b.status === 'ACCEPTED' && (
                  <button onClick={() => handleStatusChange(b._id, 'COMPLETED')} className="btn btn-primary btn-sm">Complete Session</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Booking Modal */}
      {showManualModal && (
        <div className="modal-overlay" onClick={() => setShowManualModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Create Manual Clinic Booking</h3>
            
            <form onSubmit={handleCreateManualBooking}>
              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input type="text" required value={patientName} onChange={(e) => setPatientName(e.target.value)} className="form-input" placeholder="Walk-in Patient Name" />
              </div>

              <div className="form-group">
                <label className="form-label">Patient Phone Number</label>
                <input type="tel" required value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} className="form-input" placeholder="+1 555-0199" />
              </div>

              <div className="form-group">
                <label className="form-label">Select Service</label>
                <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)} className="form-select">
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} (Base ₹{s.basePrice})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" required value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input type="number" required value={customPrice} onChange={(e) => setCustomPrice(Number(e.target.value))} className="form-input" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowManualModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Manual Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
