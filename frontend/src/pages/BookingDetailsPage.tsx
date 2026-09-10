import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { Booking } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { RazorpayCheckoutModal } from '../components/payment/RazorpayCheckoutModal';
import { Calendar, Clock, MapPin, Repeat, ArrowLeft, XCircle, ShieldCheck, UserCheck, Activity } from 'lucide-react';

export const BookingDetailsPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [childSessions, setChildSessions] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const navigate = useNavigate();

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/bookings/${bookingId}`);
      if (res.data.success) {
        setBooking(res.data.booking);
        if (res.data.childSessions) {
          setChildSessions(res.data.childSessions);
        }
      }
    } catch (err) {
      console.error('Failed to load booking details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) fetchDetails();
  }, [bookingId]);

  const handleCancelBooking = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking/plan?')) return;
    setCancelling(true);
    try {
      const res = await api.patch(`/bookings/${bookingId}/cancel`, {
        cancellationReason: 'Cancelled by user from booking details page',
      });
      if (res.data.success) {
        fetchDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Loading appointment record...</div>;
  }

  if (!booking) {
    return <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Booking record not found or access denied.</div>;
  }

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '950px' }}>
      <button onClick={() => navigate(-1)} className="btn btn-outline btn-sm" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
        <ArrowLeft size={16} /> Back to Bookings
      </button>

      {/* Header Banner */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              BOOKING REFERENCE
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
              #{booking.bookingNumber}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <StatusBadge status={booking.bookingSource} />
            <StatusBadge status={booking.status} />
            {booking.isRecurringParent && (
              <span className="badge badge-manual" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Repeat size={12} /> RECURRING PLAN ({booking.planStatus || 'ACTIVE'})
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <span><strong>Service Mode:</strong> {booking.serviceMode.replace('_', ' ')}</span>
          <span><strong>Engagement Type:</strong> {booking.engagementType.replace('_', ' ')}</span>
          <span><strong>Created On:</strong> {new Date(booking.createdAt).toLocaleDateString()}</span>
        </div>

        {booking.status === 'REJECTED' && booking.rejectionReason && (
          <div style={{ marginTop: '1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '0.85rem 1rem', borderRadius: '8px', color: '#991b1b', fontSize: '0.9rem' }}>
            <strong>Rejection Reason:</strong> {booking.rejectionReason}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Left Column: Service, Provider/Clinic & Location */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Service Details
            </h3>

            <div style={{ fontSize: '0.925rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div><strong>Service Name:</strong> {booking.serviceId?.name || 'Healthcare Service'}</div>
              <div><strong>Base Price:</strong> ₹{booking.pricing?.baseFee}</div>
              <div><strong>Duration:</strong> {booking.serviceId?.durationMinutes || 45} mins per session</div>
              {booking.serviceId?.prepInstructions && (
                <div style={{ background: '#fffbeb', padding: '0.65rem', borderRadius: '6px', color: '#92400e', fontSize: '0.825rem' }}>
                  <strong>Prep:</strong> {booking.serviceId.prepInstructions}
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Patient & Delivery Address
            </h3>

            <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><strong>Patient Name:</strong> {booking.customerDetails?.name}</div>
              <div><strong>Contact Phone:</strong> {booking.customerDetails?.phone}</div>
              {booking.customerDetails?.email && <div><strong>Email:</strong> {booking.customerDetails.email}</div>}

              {booking.serviceAddress && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                  <strong>Home Visit Address:</strong>
                  <p style={{ color: 'var(--text-muted)' }}>
                    {booking.serviceAddress.addressLine1}, {booking.serviceAddress.city}, {booking.serviceAddress.state} - {booking.serviceAddress.pincode}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Status Timeline */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Financial Summary
            </h3>

            <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Service Fee:</span>
                <span>₹{booking.pricing?.baseFee}</span>
              </div>
              {booking.pricing?.homeCollectionFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Home Collection Fee:</span>
                  <span>₹{booking.pricing.homeCollectionFee}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
                <span>Total Amount:</span>
                <span style={{ color: 'var(--primary)' }}>₹{booking.pricing?.totalAmount}</span>
              </div>

              {booking.status === 'PENDING' && (
                <button
                  onClick={() => setShowCheckoutModal(true)}
                  className="btn btn-primary"
                  style={{ marginTop: '1rem', width: '100%' }}
                >
                  Pay ₹{booking.pricing?.totalAmount} Now via Razorpay
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Status History Timeline
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {booking.statusHistory?.map((h, idx) => (
                <div key={idx} style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', borderLeft: '3px solid var(--primary)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700 }}>{h.status}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.775rem' }}>
                    {new Date(h.timestamp).toLocaleString()} {h.notes && `— ${h.notes}`}
                  </div>
                </div>
              ))}
            </div>

            {['PENDING', 'ACCEPTED'].includes(booking.status) && (
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="btn btn-danger btn-sm"
                style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}
              >
                <XCircle size={16} /> {cancelling ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* If Master Recurring Plan: Child Sessions Table */}
      {booking.isRecurringParent && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Repeat size={20} color="var(--primary)" /> Scheduled Child Sessions ({childSessions.length})
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Recurring Schedule: <strong>{booking.recurringConfig?.frequency}</strong> for <strong>{booking.recurringConfig?.durationWeeks} Weeks</strong>.
          </p>

          {childSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No child sessions generated yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '0.65rem 1rem' }}>Session #</th>
                    <th style={{ padding: '0.65rem 1rem' }}>Date</th>
                    <th style={{ padding: '0.65rem 1rem' }}>Time Slot</th>
                    <th style={{ padding: '0.65rem 1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {childSessions.map((s) => (
                    <tr key={s._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>#{s.bookingNumber}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{s.bookingDate}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>{s.timeSlot?.startTime} - {s.timeSlot?.endTime}</td>
                      <td style={{ padding: '0.65rem 1rem' }}>
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showCheckoutModal && booking && (
        <RazorpayCheckoutModal
          bookingId={booking._id}
          bookingNumber={booking.bookingNumber}
          totalAmount={booking.pricing?.totalAmount || 0}
          onSuccess={() => {
            setShowCheckoutModal(false);
            fetchDetails();
          }}
          onClose={() => setShowCheckoutModal(false)}
        />
      )}
    </div>
  );
};
