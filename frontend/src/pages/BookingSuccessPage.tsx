import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { Booking } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CheckCircle, Calendar, Clock, MapPin, Repeat, ArrowRight, Home, ListFilter } from 'lucide-react';

export const BookingSuccessPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [childSessions, setChildSessions] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const res = await api.get(`/bookings/${bookingId}`);
        if (res.data.success) {
          setBooking(res.data.booking);
          if (res.data.childSessions) {
            setChildSessions(res.data.childSessions);
          }
        }
      } catch (err) {
        console.error('Failed to load booking success details', err);
      } finally {
        setLoading(false);
      }
    };
    if (bookingId) fetchBookingDetails();
  }, [bookingId]);

  if (loading) {
    return <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Loading booking confirmation...</div>;
  }

  if (!booking) {
    return <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Booking record not found.</div>;
  }

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '750px' }}>
      <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <CheckCircle size={44} />
        </div>

        <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Booking Request Confirmed
        </span>

        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
          Thank You For Booking!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem' }}>
          Your appointment request <strong>#{booking.bookingNumber}</strong> has been submitted successfully.
        </p>

        {/* Core Summary Card */}
        <div style={{ backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', padding: '1.5rem', border: '1px solid var(--border)', textAlign: 'left', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{booking.serviceId?.name}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                {booking.serviceMode.replace('_', ' ')} • {booking.engagementType.replace('_', ' ')}
              </p>
            </div>
            <StatusBadge status={booking.status} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Date / Start Date</span>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={16} color="var(--primary)" /> {booking.bookingDate}
              </strong>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Preferred Time Slot</span>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={16} color="var(--primary)" /> {booking.timeSlot?.startTime} - {booking.timeSlot?.endTime}
              </strong>
            </div>
          </div>

          {booking.serviceAddress && (
            <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Home Visit Location</span>
              <strong>{booking.serviceAddress.addressLine1}, {booking.serviceAddress.city}</strong>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
            <span>Total Fee:</span>
            <span style={{ color: 'var(--primary)' }}>₹{booking.pricing?.totalAmount}</span>
          </div>
        </div>

        {/* If Recurring Master Plan */}
        {booking.isRecurringParent && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'left', marginBottom: '2rem' }}>
            <h4 style={{ color: '#15803d', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Repeat size={18} /> Personal / Regular Hiring Schedule
            </h4>
            <p style={{ fontSize: '0.875rem', color: '#166534', marginBottom: '0.75rem' }}>
              Frequency: <strong>{booking.recurringConfig?.frequency}</strong> for <strong>{booking.recurringConfig?.durationWeeks} Weeks</strong>.
            </p>
            <p style={{ fontSize: '0.85rem', color: '#15803d' }}>
              Scheduled Sessions Generated: <strong>{childSessions.length} sessions</strong>. You can monitor each session status individually.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={`/bookings/${booking._id}`} className="btn btn-primary" style={{ display: 'flex', gap: '0.4rem' }}>
            View Full Booking Details <ArrowRight size={16} />
          </Link>
          <Link to="/bookings" className="btn btn-outline" style={{ display: 'flex', gap: '0.4rem' }}>
            <ListFilter size={16} /> My Bookings
          </Link>
          <Link to="/" className="btn btn-secondary" style={{ display: 'flex', gap: '0.4rem' }}>
            <Home size={16} /> Go Home
          </Link>
        </div>
      </div>
    </div>
  );
};
