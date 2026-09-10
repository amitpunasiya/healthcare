import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Booking, BookingStatus, Service } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PlusCircle, FlaskConical, AlertTriangle, CheckCircle } from 'lucide-react';

export const LabDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [labTests, setLabTests] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Booking Modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [selectedTestId, setSelectedTestId] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().slice(0, 10));
  const [sampleMode, setSampleMode] = useState<'HOME_VISIT' | 'LAB_VISIT'>('HOME_VISIT');
  const [customFee, setCustomFee] = useState(999);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings');
      if (res.data.success) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('Failed to load lab bookings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    const fetchLabTests = async () => {
      const res = await api.get('/services');
      if (res.data.success) {
        setLabTests(res.data.services);
        if (res.data.services.length > 0) setSelectedTestId(res.data.services[0]._id);
      }
    };
    fetchLabTests();
  }, []);

  const handleCreateManualTestBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetTest = labTests.find((t) => t._id === selectedTestId);
      const res = await api.post('/bookings/manual', {
        customerName: patientName,
        customerPhone: patientPhone,
        labId: user?.id,
        serviceCategoryId: typeof targetTest?.categoryId === 'object' ? targetTest?.categoryId._id : targetTest?.categoryId,
        serviceId: selectedTestId,
        serviceMode: sampleMode,
        bookingDate,
        timeSlot: { startTime: '08:00', endTime: '09:00' },
        customPrice: Number(customFee),
        notes: 'Manual Lab Test Order created by Lab Desk',
      });

      if (res.data.success) {
        setShowManualModal(false);
        setPatientName('');
        setPatientPhone('');
        fetchBookings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Manual lab booking failed');
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
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Diagnostic Lab Portal</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage home sample collections & lab center walk-in test orders</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href="/lab/bookings" className="btn btn-outline" style={{ textDecoration: 'none' }}>
            Open Orders Manager &rarr;
          </a>
          <button onClick={() => setShowManualModal(true)} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem' }}>
            <PlusCircle size={18} /> Create Manual Test Order
          </button>
        </div>
      </div>

      {user?.verificationStatus === 'PENDING_VERIFICATION' && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', color: '#92400e' }}>
          <AlertTriangle size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          Diagnostic Lab account is pending Admin Verification.
        </div>
      )}

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Lab Test & Sample Collection Orders</h2>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading lab orders...</div>
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
                <div>Mode: {b.serviceMode.replace('_', ' ')}</div>
                <div>Total Fee: ₹{b.pricing?.totalAmount}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {b.status === 'PENDING' && (
                  <button onClick={() => handleStatusChange(b._id, 'ACCEPTED')} className="btn btn-success btn-sm">Accept Request</button>
                )}
                {b.status === 'ACCEPTED' && (
                  <button onClick={() => handleStatusChange(b._id, 'IN_PROGRESS')} className="btn btn-primary btn-sm">Sample Collected</button>
                )}
                {b.status === 'IN_PROGRESS' && (
                  <button onClick={() => handleStatusChange(b._id, 'COMPLETED')} className="btn btn-success btn-sm">Report Ready (Completed)</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Test Order Modal */}
      {showManualModal && (
        <div className="modal-overlay" onClick={() => setShowManualModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Create Manual Lab Test Order</h3>
            
            <form onSubmit={handleCreateManualTestBooking}>
              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input type="text" required value={patientName} onChange={(e) => setPatientName(e.target.value)} className="form-input" />
              </div>

              <div className="form-group">
                <label className="form-label">Patient Phone Number</label>
                <input type="tel" required value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} className="form-input" />
              </div>

              <div className="form-group">
                <label className="form-label">Select Lab Test Panel</label>
                <select value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)} className="form-select">
                  {labTests.map((t) => (
                    <option key={t._id} value={t._id}>{t.name} (Base ₹{t.basePrice})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" required value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Fee (₹)</label>
                  <input type="number" required value={customFee} onChange={(e) => setCustomFee(Number(e.target.value))} className="form-input" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowManualModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Test Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
