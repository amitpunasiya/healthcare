import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Booking } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, Clock, Eye, XCircle, Repeat } from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings');
      if (res.data.success) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('Failed to fetch bookings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth/login?redirect=/bookings');
      return;
    }
    if (user.role === 'PROVIDER') {
      navigate('/provider/bookings');
      return;
    }
    if (user.role === 'CLINIC') {
      navigate('/clinic/bookings');
      return;
    }
    if (user.role === 'LAB') {
      navigate('/lab/bookings');
      return;
    }
    fetchBookings();
  }, [user]);

  const handleCancelBooking = async (e: React.MouseEvent, bookingId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await api.patch(`/bookings/${bookingId}/cancel`, {
        cancellationReason: 'Cancelled by customer',
      });
      if (res.data.success) {
        fetchBookings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'RECURRING_PLANS') return b.isRecurringParent;
    return b.status === selectedFilter;
  });

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>My Bookings & Recurring Plans</h1>
          <p style={{ color: 'var(--text-muted)' }}>Audit history of your appointments, home visits, and regular care plans</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {['ALL', 'RECURRING_PLANS', 'PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedFilter(st)}
            className={`btn btn-sm ${selectedFilter === st ? 'btn-primary' : 'btn-outline'}`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Bookings Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading appointments...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          No bookings found under this filter.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          {filteredBookings.map((b) => (
            <div
              key={b._id}
              className="card card-hover"
              onClick={() => navigate(`/bookings/${b._id}`)}
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', border: b.isRecurringParent ? '2px solid var(--primary)' : '1px solid var(--border)' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>#{b.bookingNumber}</span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {b.isRecurringParent && (
                      <span className="badge badge-manual" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Repeat size={12} /> RECURRING PLAN
                      </span>
                    )}
                    <StatusBadge status={b.status} />
                  </div>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  {b.serviceId?.name || 'Healthcare Service'}
                </h3>

                <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Mode: {b.serviceMode.replace('_', ' ')} • {b.engagementType.replace('_', ' ')}
                </p>

                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={16} /> Date / Start: {b.bookingDate}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={16} /> Time Slot: {b.timeSlot?.startTime} - {b.timeSlot?.endTime}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>₹{b.pricing?.totalAmount}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to={`/bookings/${b._id}`} className="btn btn-outline btn-sm" onClick={(e) => e.stopPropagation()}>
                    <Eye size={14} /> Details
                  </Link>
                  {['PENDING', 'ACCEPTED'].includes(b.status) && (
                    <button onClick={(e) => handleCancelBooking(e, b._id)} className="btn btn-danger btn-sm">
                      <XCircle size={14} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
