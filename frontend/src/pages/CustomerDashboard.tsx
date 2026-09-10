import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Booking } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, Clock, Eye, XCircle, Repeat } from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [childSessions, setChildSessions] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

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
    fetchBookings();
  }, []);

  const handleOpenDetails = async (b: Booking) => {
    setSelectedBooking(b);
    setChildSessions([]);
    if (b.isRecurringParent) {
      try {
        const res = await api.get(`/bookings/${b._id}`);
        if (res.data.success && res.data.childSessions) {
          setChildSessions(res.data.childSessions);
        }
      } catch (err) {
        console.error('Failed to load child sessions', err);
      }
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking/plan?')) return;
    try {
      const res = await api.patch(`/bookings/${bookingId}/status`, {
        status: 'CANCELLED',
        notes: 'Cancelled by customer',
      });
      if (res.data.success) {
        fetchBookings();
        if (selectedBooking?._id === bookingId) {
          setSelectedBooking(res.data.booking);
        }
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
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>Patient Portal</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your appointments & regular recurring hiring plans</p>
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

      {/* Bookings List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading appointments...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No bookings found under this filter.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredBookings.map((b) => (
            <div key={b._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: b.isRecurringParent ? '2px solid var(--primary)' : '1px solid var(--border)' }}>
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

                {b.status === 'REJECTED' && b.rejectionReason && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', color: '#991b1b', marginBottom: '1rem' }}>
                    <strong>Rejection Reason:</strong> {b.rejectionReason}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>₹{b.pricing?.totalAmount}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleOpenDetails(b)} className="btn btn-outline btn-sm">
                    <Eye size={14} /> Details
                  </button>
                  {['PENDING', 'ACCEPTED'].includes(b.status) && (
                    <button onClick={() => handleCancelBooking(b._id)} className="btn btn-danger btn-sm">
                      <XCircle size={14} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedBooking && (
        <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
              {selectedBooking.isRecurringParent ? 'Recurring Plan Details' : 'Booking Details'} #{selectedBooking.bookingNumber}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <StatusBadge status={selectedBooking.status} />
              <StatusBadge status={selectedBooking.bookingSource} />
              {selectedBooking.isRecurringParent && <span className="badge badge-manual">RECURRING MASTER PLAN</span>}
            </div>

            <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <div><strong>Service:</strong> {selectedBooking.serviceId?.name}</div>
              <div><strong>Service Mode:</strong> {selectedBooking.serviceMode}</div>
              <div><strong>Start Date & Time:</strong> {selectedBooking.bookingDate} ({selectedBooking.timeSlot?.startTime} - {selectedBooking.timeSlot?.endTime})</div>
              <div><strong>Total Amount:</strong> ₹{selectedBooking.pricing?.totalAmount}</div>
              {selectedBooking.serviceAddress && (
                <div><strong>Address:</strong> {selectedBooking.serviceAddress.addressLine1}, {selectedBooking.serviceAddress.city}</div>
              )}
              {selectedBooking.status === 'REJECTED' && selectedBooking.rejectionReason && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.65rem', borderRadius: '6px', color: '#991b1b', marginTop: '0.5rem' }}>
                  <strong>Rejection Reason:</strong> {selectedBooking.rejectionReason}
                </div>
              )}
            </div>

            {/* If Recurring Parent, render list of generated child sessions */}
            {selectedBooking.isRecurringParent && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Scheduled Sessions ({childSessions.length})
                </h4>

                {childSessions.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No child sessions generated yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {childSessions.map((s) => (
                      <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div>
                          <strong>#{s.bookingNumber}</strong> — {s.bookingDate} ({s.timeSlot?.startTime})
                        </div>
                        <StatusBadge status={s.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setSelectedBooking(null)} className="btn btn-outline" style={{ width: '100%', marginTop: '1.5rem' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
