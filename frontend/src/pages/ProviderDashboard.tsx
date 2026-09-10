import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Booking, BookingStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CheckCircle, XCircle, AlertTriangle, ShieldCheck, Clock, Calendar } from 'lucide-react';

export const ProviderDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings');
      if (res.data.success) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleUpdateStatus = async (bookingId: string, status: BookingStatus) => {
    try {
      const res = await api.patch(`/bookings/${bookingId}/status`, { status });
      if (res.data.success) {
        fetchBookings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Status update failed');
    }
  };

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Professional Healthcare Portal</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage patient appointment requests & schedule availability</p>
        </div>
        <a href="/provider/bookings" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Open Full Booking Manager &rarr;
        </a>
      </div>

      {/* Verification Status Alert Banner */}
      {user?.verificationStatus === 'PENDING_VERIFICATION' && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertTriangle color="#d97706" size={28} />
          <div>
            <h4 style={{ color: '#92400e', fontWeight: 700 }}>Account Verification Pending</h4>
            <p style={{ color: '#b45309', fontSize: '0.875rem' }}>
              Your profile is currently under <strong>Admin Review</strong>. Once verified, patients will be able to discover and book your services publicly.
            </p>
          </div>
        </div>
      )}

      {user?.verificationStatus === 'VERIFIED' && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck color="#16a34a" size={24} />
          <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.95rem' }}>Verified Professional Account (Active in Directory)</span>
        </div>
      )}

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Appointment Requests</h2>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading appointment ledger...</div>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No appointment requests yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {bookings.map((b) => (
            <div key={b._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>#{b.bookingNumber}</span>
                <StatusBadge status={b.status} />
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.2rem' }}>{b.serviceId?.name}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem' }}>
                Patient: {b.customerDetails?.name} ({b.customerDetails?.phone})
              </p>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                <div><Calendar size={14} /> {b.bookingDate} ({b.timeSlot?.startTime} - {b.timeSlot?.endTime})</div>
                <div>Mode: {b.serviceMode}</div>
                {b.serviceAddress && <div>Address: {b.serviceAddress.addressLine1}, {b.serviceAddress.city}</div>}
              </div>

              {/* Status Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {b.status === 'PENDING' && (
                  <>
                    <button onClick={() => handleUpdateStatus(b._id, 'ACCEPTED')} className="btn btn-success btn-sm">
                      <CheckCircle size={14} /> Accept Request
                    </button>
                    <button onClick={() => handleUpdateStatus(b._id, 'REJECTED')} className="btn btn-danger btn-sm">
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}

                {b.status === 'ACCEPTED' && (
                  <button onClick={() => handleUpdateStatus(b._id, 'IN_PROGRESS')} className="btn btn-primary btn-sm">
                    Start Session (In Progress)
                  </button>
                )}

                {b.status === 'IN_PROGRESS' && (
                  <button onClick={() => handleUpdateStatus(b._id, 'COMPLETED')} className="btn btn-success btn-sm">
                    Mark Completed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
