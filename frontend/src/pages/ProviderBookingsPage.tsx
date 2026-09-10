import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Booking, BookingStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CheckCircle, XCircle, Play, CheckCheck, AlertTriangle, ShieldCheck, Calendar, Clock, MapPin, Repeat } from 'lucide-react';

export const ProviderBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Reject Modal State
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('Schedule unavailable');
  const [processing, setProcessing] = useState(false);

  const fetchProviderBookings = async () => {
    try {
      const res = await api.get('/bookings/provider');
      if (res.data.success) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('Failed to load provider bookings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderBookings();
  }, []);

  const handleAccept = async (id: string) => {
    setProcessing(true);
    try {
      const res = await api.patch(`/bookings/${id}/accept`);
      if (res.data.success) {
        fetchProviderBookings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Accept booking failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBookingId) return;
    setProcessing(true);
    try {
      const res = await api.patch(`/bookings/${rejectingBookingId}/reject`, {
        rejectionReason,
      });
      if (res.data.success) {
        setRejectingBookingId(null);
        fetchProviderBookings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rejection failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleStartService = async (id: string) => {
    setProcessing(true);
    try {
      const res = await api.patch(`/bookings/${id}/start`);
      if (res.data.success) {
        fetchProviderBookings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start service');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteService = async (id: string) => {
    setProcessing(true);
    try {
      const res = await api.patch(`/bookings/${id}/complete`);
      if (res.data.success) {
        fetchProviderBookings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete service');
    } finally {
      setProcessing(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'NEW_PENDING') return b.status === 'PENDING';
    return b.status === selectedFilter;
  });

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Provider Booking Requests Management</h1>
        <p style={{ color: 'var(--text-muted)' }}>Accept, reject, start, and complete patient appointments assigned to you</p>
      </div>

      {user?.verificationStatus === 'PENDING_VERIFICATION' && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertTriangle color="#d97706" size={28} />
          <div>
            <h4 style={{ color: '#92400e', fontWeight: 700 }}>Verification Pending</h4>
            <p style={{ color: '#b45309', fontSize: '0.875rem' }}>Your account is under Admin Review. Admin approval is required before accepting patient booking requests.</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {['ALL', 'NEW_PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedFilter(st)}
            className={`btn btn-sm ${selectedFilter === st ? 'btn-primary' : 'btn-outline'}`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center' }}>Loading provider booking requests...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No appointment requests found under this filter.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.75rem' }}>
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

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem' }}>{b.serviceId?.name || 'Healthcare Service'}</h3>
                
                <p style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Patient: {b.customerDetails?.name} ({b.customerDetails?.phone})
                </p>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
                  <span><Calendar size={14} /> Date: {b.bookingDate}</span>
                  <span><Clock size={14} /> Time Slot: {b.timeSlot?.startTime} - {b.timeSlot?.endTime}</span>
                  <span>Mode: {b.serviceMode.replace('_', ' ')}</span>
                  {b.serviceAddress && (
                    <span><MapPin size={14} /> Address: {b.serviceAddress.addressLine1}, {b.serviceAddress.city}</span>
                  )}
                </div>

                {b.notes && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', color: '#475569' }}>
                    <strong>Notes:</strong> {b.notes}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1.1rem', fontWeight: 800 }}>
                  <span>Fee:</span>
                  <span style={{ color: 'var(--primary)' }}>₹{b.pricing?.totalAmount}</span>
                </div>

                {/* Action Buttons strictly bound to State Machine */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {b.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleAccept(b._id)}
                        disabled={processing || user?.verificationStatus !== 'VERIFIED'}
                        className="btn btn-success btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <CheckCircle size={14} /> Accept Booking
                      </button>
                      <button
                        onClick={() => setRejectingBookingId(b._id)}
                        disabled={processing}
                        className="btn btn-danger btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </>
                  )}

                  {b.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleStartService(b._id)}
                      disabled={processing}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Play size={14} /> Start Service
                    </button>
                  )}

                  {b.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleCompleteService(b._id)}
                      disabled={processing}
                      className="btn btn-success btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <CheckCheck size={14} /> Complete Service
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingBookingId && (
        <div className="modal-overlay" onClick={() => setRejectingBookingId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Reject Patient Booking Request</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Please select or provide a reason for rejecting this booking request:
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="form-group">
                <label className="form-label">Select Rejection Reason</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="form-select"
                >
                  <option value="Schedule unavailable">Schedule unavailable / Slot conflict</option>
                  <option value="Service location too far">Service location too far for home visit</option>
                  <option value="Specialist unavailable">Specialist unavailable on requested date</option>
                  <option value="Other emergency">Other personal or clinical emergency</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setRejectingBookingId(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={processing} className="btn btn-danger">
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
