import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { RazorpayCheckoutModal } from '../components/payment/RazorpayCheckoutModal';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  AlertCircle,
  Phone,
  RefreshCw,
  Home,
  User,
  CreditCard,
  Key,
  Play,
  ArrowRight,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

export const BookingLiveStatusPage: React.FC = () => {
  const { user } = useAuth();
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchLiveStatus = async () => {
    if (!bookingId) return;
    try {
      const res = await api.get(`/bookings/${bookingId}/live-status`);
      if (res.data.success) {
        setBooking(res.data.booking);
      }
    } catch (err: any) {
      console.error('Error fetching live status:', err);
      setErrorMsg(err.response?.data?.message || 'Could not load booking status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate(`/auth/login?redirect=/booking-live/${bookingId}`);
      return;
    }
    fetchLiveStatus();
    // Real-Time Polling every 3 seconds for live request state updates
    const interval = setInterval(fetchLiveStatus, 3000);
    return () => clearInterval(interval);
  }, [user, bookingId]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '5rem 1.5rem', textAlign: 'center' }}>
        <RefreshCw size={36} className="spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Connecting to Live Specialist Dispatch...</h2>
      </div>
    );
  }

  if (errorMsg || !booking) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '600px', textAlign: 'center' }}>
        <AlertCircle size={48} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Booking Request Error</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>{errorMsg || 'Booking not found'}</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
          Return to Home
        </Link>
      </div>
    );
  }

  const {
    bookingNumber,
    status,
    paymentStatus,
    serviceId,
    serviceCategoryId,
    serviceAddress,
    pricing,
    nearbyProviderCount = 0,
    acceptedCount = 0,
    rejectedCount = 0,
    waitingCount = 0,
    assignedProvider,
    serviceOtp,
    serviceStartedAt,
    serviceCompletedAt,
    paidAt,
  } = booking;

  const isSearching = status === 'REQUESTED' || status === 'SEARCHING' || status === 'PENDING';
  const isAccepted = status === 'ACCEPTED';
  const isInProgress = status === 'IN_PROGRESS';
  const isCompletedPendingPayment = status === 'COMPLETED' || status === 'PAYMENT_PENDING';
  const isPaid = status === 'PAID' || paymentStatus === 'PAID';
  const isNoProvider = status === 'NO_PROVIDER_FOUND';

  const serviceName = serviceId?.name || 'Healthcare Service';
  const categoryName = serviceCategoryId?.name || 'Healthcare';

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '720px' }}>
      {/* Top Header Card */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Live Service Dispatch • India 🇮🇳
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
          {serviceName} Request
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
          Reference ID: <strong>#{bookingNumber}</strong>
        </p>
      </div>

      {/* =========================================================================
          STATE 1: SEARCHING FOR NEARBY PROVIDERS (0 upfront payment)
         ========================================================================= */}
      {isSearching && (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', border: '2px solid var(--primary-light)' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              animation: 'pulse 1.8s infinite ease-in-out',
            }}
          >
            <RefreshCw size={36} className="spin" />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
            Finding a {categoryName} Specialist near you...
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
            Broadcasting request to verified specialists within 5 KM radius of your address.
          </p>

          {/* Live Request Status Counts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
              gap: '0.75rem',
              backgroundColor: '#f8fafc',
              padding: '1rem',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              marginBottom: '1.75rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Nearby Found</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem' }}>
                {nearbyProviderCount}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📍 Within 5 KM</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Accepted</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>
                {acceptedCount}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#16a34a' }}>✓ Specialist Ready</span>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Waiting</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#eab308', marginTop: '0.2rem' }}>
                {waitingCount}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>⌛ Responding...</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600 }}>
            🛡️ <strong>Post-Service Payment Protection:</strong> No payment is required right now. You pay only after the specialist completes your service session.
          </div>
        </div>
      )}

      {/* =========================================================================
          STATE 2: PROVIDER ACCEPTED & FIXED OTP GENERATED
         ========================================================================= */}
      {isAccepted && (
        <div className="card" style={{ padding: '2.5rem', border: '2px solid #16a34a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#15803d' }}>
            <CheckCircle2 size={32} />
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Specialist Assigned & On The Way!</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Your verified healthcare provider has accepted the request.</p>
            </div>
          </div>

          {/* Assigned Provider Card */}
          {assignedProvider && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                backgroundColor: '#f8fafc',
                padding: '1.25rem',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                marginBottom: '1.75rem',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {assignedProvider.fullName ? assignedProvider.fullName.charAt(0) : <User size={32} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{assignedProvider.fullName}</h3>
                  <span style={{ fontSize: '0.7rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                    VERIFIED ✓
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {assignedProvider.qualification || 'Certified Specialist'} • {assignedProvider.experienceYears || 3}+ Yrs Experience
                </p>
              </div>
            </div>
          )}

          {/* Fixed Single-Booking OTP Card */}
          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '2px dashed #3b82f6',
              padding: '1.75rem',
              borderRadius: '16px',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#1d4ed8', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <Key size={20} /> YOUR SERVICE START OTP
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '0.25em', color: '#1e40af', margin: '0.25rem 0' }}>
              {serviceOtp || '1234'}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600, margin: 0 }}>
              🔒 Share this 4-digit OTP with your specialist when they arrive at your home to start your session.
            </p>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Status: <strong>Provider Arriving • Payment Pending After Completion</strong>
          </div>
        </div>
      )}

      {/* =========================================================================
          STATE 3: SERVICE IN PROGRESS
         ========================================================================= */}
      {isInProgress && (
        <div className="card" style={{ padding: '2.5rem', border: '2px solid #0284c7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: '#0369a1' }}>
            <Play size={32} />
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Service Session In Progress</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Specialist verified OTP and started your session.</p>
            </div>
          </div>

          <div style={{ backgroundColor: '#f0f9ff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span>Requested Service:</span>
              <strong>{serviceName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span>Started Timestamp:</span>
              <strong>{serviceStartedAt ? new Date(serviceStartedAt).toLocaleTimeString() : 'In Progress'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Payment Status:</span>
              <strong style={{ color: '#d97706' }}>Due After Service Completion (₹{pricing?.totalAmount})</strong>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STATE 4: SERVICE COMPLETED -> PAYMENT DUE (Pay Now button)
         ========================================================================= */}
      {isCompletedPendingPayment && !isPaid && (
        <div className="card" style={{ padding: '2.5rem', border: '2px solid #eab308' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <CheckCircle2 size={52} color="#ca8a04" style={{ margin: '0 auto 0.75rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#854d0e' }}>Service Completed!</h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Your specialist has marked the service session as finished. Please complete your payment below.
            </p>
          </div>

          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 600, color: '#92400e' }}>Service Amount Due:</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#b45309' }}>₹{pricing?.totalAmount}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={16} /> 100% Secure Payment via Razorpay Gateway (UPI, Cards, NetBanking)
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)' }}
          >
            <CreditCard size={22} /> PAY ₹{pricing?.totalAmount} NOW
          </button>
        </div>
      )}

      {/* =========================================================================
          STATE 5: PAYMENT COMPLETED & CLOSED
         ========================================================================= */}
      {isPaid && (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', border: '2px solid #16a34a' }}>
          <CheckCircle2 size={56} color="#16a34a" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d' }}>Payment Successful & Booking Closed!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.35rem', marginBottom: '1.75rem' }}>
            Thank you for using CarePulse. Your payment has been verified and settled.
          </p>

          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.25rem', borderRadius: '12px', textAlign: 'left', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              <span>Total Amount Paid:</span>
              <strong>₹{pricing?.totalAmount}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              <span>Payment Status:</span>
              <strong style={{ color: '#15803d' }}>PAID ✓</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Completion Time:</span>
              <strong>{serviceCompletedAt ? new Date(serviceCompletedAt).toLocaleString() : 'Completed'}</strong>
            </div>
          </div>

          <Link to="/customer/dashboard" className="btn btn-primary">
            Go to My Dashboard <ArrowRight size={18} />
          </Link>
        </div>
      )}

      {/* =========================================================================
          STATE 6: NO PROVIDERS FOUND / ALL REJECTED
         ========================================================================= */}
      {isNoProvider && (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <AlertCircle size={48} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
            No Available Specialist Nearby
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.4rem', marginBottom: '1.75rem' }}>
            We could not find an available verified {categoryName} specialist within 5 km right now. You were <strong>not charged</strong> any fee.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '360px', margin: '0 auto' }}>
            <button onClick={() => navigate('/book?mode=HOME_VISIT')} className="btn btn-primary">
              🔄 Try Again (Search Home Visit)
            </button>
          </div>
        </div>
      )}

      {/* Razorpay Checkout Modal for Post-Service Payment */}
      {showPaymentModal && (
        <RazorpayCheckoutModal
          bookingId={booking._id}
          bookingNumber={bookingNumber}
          totalAmount={pricing?.totalAmount || 0}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchLiveStatus();
          }}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
};
