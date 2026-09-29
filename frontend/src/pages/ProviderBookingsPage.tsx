import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Booking } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { buildReadableAddress, calculateHaversineDistance } from '../utils/location';
import { ProviderDestinationMap } from '../components/ProviderDestinationMap';
import {
  CheckCircle,
  XCircle,
  Play,
  CheckCheck,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  Repeat,
  Key,
  Navigation,
  Compass,
  Eye,
  X,
  RefreshCw,
} from 'lucide-react';

export const ProviderBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Provider Location State
  const [providerCoords, setProviderCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  // Modal States
  const [selectedBookingModal, setSelectedBookingModal] = useState<Booking | null>(null);
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('Schedule unavailable');

  // Start Service OTP Modal State
  const [startingBookingId, setStartingBookingId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');

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
    const interval = setInterval(fetchProviderBookings, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleGetProviderLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setProviderCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocLoading(false);
      },
      (err) => {
        setLocLoading(false);
        alert('Could not retrieve current location. Customer destination map is still available.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAccept = async (id: string) => {
    if (user?.verificationStatus !== 'VERIFIED') {
      alert('Your account is currently PENDING VERIFICATION. Account verification must be approved by an Administrator in the Admin Portal before you can accept patient booking requests.');
      return;
    }
    setProcessing(true);
    try {
      const res = await api.patch(`/bookings/${id}/accept`);
      if (res.data.success) {
        fetchProviderBookings();
        if (selectedBookingModal && selectedBookingModal._id === id) {
          setSelectedBookingModal(res.data.booking);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Accept request failed. Request may no longer be available.');
      fetchProviderBookings();
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
        if (selectedBookingModal && selectedBookingModal._id === rejectingBookingId) {
          setSelectedBookingModal(null);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rejection failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleStartServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startingBookingId) return;
    setOtpError('');

    if (!/^\d{4}$/.test(otpInput.trim())) {
      setOtpError('Please enter a valid 4-digit numeric OTP.');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.patch(`/bookings/${startingBookingId}/start`, {
        otp: otpInput.trim(),
      });
      if (res.data.success) {
        setStartingBookingId(null);
        setOtpInput('');
        fetchProviderBookings();
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Invalid OTP. Please check the OTP with the patient.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteService = async (id: string) => {
    if (!window.confirm('Are you sure you have finished all requested work for this session?')) return;
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

  const openNavigation = (lat?: number, lng?: number, addressStr?: string) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else if (addressStr) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressStr)}`, '_blank');
    } else {
      alert('Destination coordinates unavailable.');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'NEW_REQUESTS') {
      return b.status === 'REQUESTED' || b.status === 'SEARCHING' || b.status === 'PENDING';
    }
    return b.status === selectedFilter;
  });

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Provider Service Dispatch & Bookings</h1>
          <p style={{ color: 'var(--text-muted)' }}>Respond to nearby broadcast requests, navigate to destination, enter OTP, and complete sessions</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleGetProviderLocation}
            disabled={locLoading}
            className="btn btn-outline"
            style={{ fontWeight: 700, borderRadius: '12px' }}
          >
            <Navigation size={16} className={locLoading ? 'animate-spin' : ''} />
            {locLoading ? 'Detecting GPS...' : providerCoords ? '📍 GPS Location Active' : '📍 Use My Current Location'}
          </button>

          <button type="button" onClick={fetchProviderBookings} className="btn btn-outline" style={{ borderRadius: '12px', fontWeight: 700 }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {user?.verificationStatus === 'PENDING_VERIFICATION' && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '1.25rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertTriangle color="#d97706" size={28} />
          <div>
            <h4 style={{ color: '#92400e', fontWeight: 700 }}>Verification Pending</h4>
            <p style={{ color: '#b45309', fontSize: '0.875rem' }}>Your account is under Admin Review. Admin approval is required before accepting patient booking requests.</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {['ALL', 'NEW_REQUESTS', 'ACCEPTED', 'IN_PROGRESS', 'PAYMENT_PENDING', 'PAID', 'CANCELLED', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedFilter(st)}
            className={`btn btn-sm ${selectedFilter === st ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: '999px', fontWeight: 700, padding: '0.35rem 0.85rem' }}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading service requests...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '20px' }}>
          No appointment requests found under this filter.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.75rem' }}>
          {filteredBookings.map((b) => {
            const isPendingRequest = b.status === 'REQUESTED' || b.status === 'SEARCHING' || b.status === 'PENDING';
            const isAccepted = b.status === 'ACCEPTED';
            const isInProgress = b.status === 'IN_PROGRESS';
            
            // Resolve Destination based on booking mode
            let destLabel = 'CUSTOMER HOME DESTINATION';
            let destLat = b.serviceAddress?.latitude;
            let destLng = b.serviceAddress?.longitude;
            let destAddressText = buildReadableAddress(b.serviceAddress || {}).singleLine || b.serviceAddress?.addressLine1 || `${b.serviceAddress?.city || 'Customer location'}`;

            if (b.serviceMode === 'CLINIC_VISIT' && b.clinicId) {
              destLabel = 'CLINIC DESTINATION';
              destLat = b.clinicId.latitude || b.serviceAddress?.latitude;
              destLng = b.clinicId.longitude || b.serviceAddress?.longitude;
              destAddressText = [b.clinicId.clinicName, b.clinicId.addressLine1, `${b.clinicId.city}, ${b.clinicId.state}${b.clinicId.pincode ? ` - ${b.clinicId.pincode}` : ''}`].filter(Boolean).join('\n');
            } else if (b.serviceMode === 'LAB_VISIT' && b.labId && !b.serviceAddress?.latitude) {
              destLabel = 'LABORATORY DESTINATION';
              destLat = b.labId.latitude;
              destLng = b.labId.longitude;
              destAddressText = [b.labId.labName, b.labId.addressLine1, `${b.labId.city}, ${b.labId.state}${b.labId.pincode ? ` - ${b.labId.pincode}` : ''}`].filter(Boolean).join('\n');
            }

            const distanceKm = (providerCoords && destLat && destLng)
              ? calculateHaversineDistance(providerCoords.latitude, providerCoords.longitude, destLat, destLng)
              : undefined;

            return (
              <div
                key={b._id}
                className="card card-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '20px',
                  border: isPendingRequest ? '2px solid var(--primary)' : '1px solid var(--border)',
                  padding: '1.5rem',
                  backgroundColor: isPendingRequest ? '#faf5ff' : 'white',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>#{b.bookingNumber}</span>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      {b.isRecurringParent && (
                        <span className="badge badge-manual" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Repeat size={12} /> RECURRING
                        </span>
                      )}
                      <StatusBadge status={b.status} />
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    {b.serviceId?.name || 'Healthcare Service'}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 700 }}>
                      🏠 {b.serviceMode.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <Calendar size={14} style={{ display: 'inline', marginRight: '0.2rem' }} />
                      {b.bookingDate} {b.timeSlot?.startTime ? `(${b.timeSlot.startTime} - ${b.timeSlot.endTime})` : ''}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 700, marginBottom: '1rem' }}>
                    Patient: {b.customerDetails?.name} {b.customerDetails?.phone ? `(${b.customerDetails.phone})` : ''}
                  </p>

                  {/* Customer / Service Destination Section */}
                  <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <MapPin size={14} /> {destLabel}
                      </span>
                      {distanceKm !== undefined ? (
                        <span style={{ fontSize: '0.725rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 800 }}>
                          📍 {distanceKm} km away
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Distance unavailable
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: '1.45', whiteSpace: 'pre-line' }}>
                      {destAddressText}
                    </div>

                    {/* Map Preview if coordinates present */}
                    {destLat && destLng && (
                      <div style={{ marginTop: '0.85rem' }}>
                        <ProviderDestinationMap
                          customerLat={destLat}
                          customerLng={destLng}
                          customerAddressLabel={b.customerDetails?.name || destLabel}
                          providerLat={providerCoords?.latitude}
                          providerLng={providerCoords?.longitude}
                          height="180px"
                        />
                      </div>
                    )}
                  </div>

                  {b.notes && (
                    <div style={{ backgroundColor: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: '10px', fontSize: '0.8rem', marginBottom: '1rem', color: '#475569', border: '1px solid #e2e8f0' }}>
                      <strong>Patient Notes:</strong> {b.notes}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)' }}>Payable Fee:</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>₹{b.pricing?.totalAmount}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {destLat && destLng && (
                      <button
                        type="button"
                        onClick={() => openNavigation(destLat, destLng, destAddressText)}
                        className="btn btn-outline btn-sm"
                        style={{ borderRadius: '10px', fontWeight: 700 }}
                      >
                        <Compass size={14} /> Navigate
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedBookingModal(b)}
                      className="btn btn-outline btn-sm"
                      style={{ borderRadius: '10px', fontWeight: 700 }}
                    >
                      <Eye size={14} /> Details
                    </button>

                    {isPendingRequest && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAccept(b._id)}
                          disabled={processing}
                          className="btn btn-success btn-sm"
                          style={{ flex: 1, justifyContent: 'center', fontWeight: 800, borderRadius: '10px' }}
                        >
                          <CheckCircle size={14} /> ACCEPT REQUEST
                        </button>

                        <button
                          type="button"
                          onClick={() => setRejectingBookingId(b._id)}
                          disabled={processing}
                          className="btn btn-danger btn-sm"
                          style={{ borderRadius: '10px', fontWeight: 700 }}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </>
                    )}

                    {isAccepted && (
                      <button
                        type="button"
                        onClick={() => {
                          setStartingBookingId(b._id);
                          setOtpInput('');
                          setOtpError('');
                        }}
                        disabled={processing}
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%', justifyContent: 'center', fontWeight: 800, borderRadius: '10px' }}
                      >
                        <Key size={14} /> Arrived (Enter Patient OTP)
                      </button>
                    )}

                    {isInProgress && (
                      <button
                        type="button"
                        onClick={() => handleCompleteService(b._id)}
                        disabled={processing}
                        className="btn btn-success btn-sm"
                        style={{ width: '100%', justifyContent: 'center', fontWeight: 800, borderRadius: '10px' }}
                      >
                        <CheckCheck size={14} /> Complete Service Work
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details & Map Modal */}
      {selectedBookingModal && (
        <div className="modal-overlay" onClick={() => setSelectedBookingModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', borderRadius: '24px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>#{selectedBookingModal.bookingNumber}</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.1rem 0' }}>
                  {selectedBookingModal.serviceId?.name || 'Healthcare Booking'}
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedBookingModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '14px', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Patient: {selectedBookingModal.customerDetails?.name} ({selectedBookingModal.customerDetails?.phone})
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                📅 Date: {selectedBookingModal.bookingDate} {selectedBookingModal.timeSlot?.startTime ? `(${selectedBookingModal.timeSlot.startTime} - ${selectedBookingModal.timeSlot.endTime})` : ''}
              </div>
            </div>

            {/* Destination Address & Map Block */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284c7', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <MapPin size={16} /> CUSTOMER DESTINATION
              </div>

              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: '1.5', whiteSpace: 'pre-line', marginBottom: '0.85rem', backgroundColor: 'white', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                {buildReadableAddress(selectedBookingModal.serviceAddress || {}).singleLine || selectedBookingModal.serviceAddress?.addressLine1}
              </div>

              {selectedBookingModal.serviceAddress?.latitude && selectedBookingModal.serviceAddress?.longitude && (
                <div>
                  <ProviderDestinationMap
                    customerLat={selectedBookingModal.serviceAddress.latitude}
                    customerLng={selectedBookingModal.serviceAddress.longitude}
                    customerAddressLabel={selectedBookingModal.customerDetails?.name || 'Customer Destination'}
                    providerLat={providerCoords?.latitude}
                    providerLng={providerCoords?.longitude}
                    height="220px"
                  />

                  <button
                    type="button"
                    onClick={() => openNavigation(selectedBookingModal.serviceAddress?.latitude, selectedBookingModal.serviceAddress?.longitude)}
                    className="btn btn-outline"
                    style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center', fontWeight: 800, borderRadius: '12px' }}
                  >
                    <Compass size={16} /> Open Navigation in Google Maps
                  </button>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              {(selectedBookingModal.status === 'REQUESTED' || selectedBookingModal.status === 'SEARCHING' || selectedBookingModal.status === 'PENDING') && (
                <>
                  <button
                    type="button"
                    onClick={() => handleAccept(selectedBookingModal._id)}
                    disabled={processing || user?.verificationStatus !== 'VERIFIED'}
                    className="btn btn-success btn-lg"
                    style={{ flex: 1, justifyContent: 'center', fontWeight: 800, borderRadius: '12px' }}
                  >
                    <CheckCircle size={18} /> ACCEPT REQUEST
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBookingModal(null);
                      setRejectingBookingId(selectedBookingModal._id);
                    }}
                    disabled={processing}
                    className="btn btn-danger btn-lg"
                    style={{ borderRadius: '12px', fontWeight: 700 }}
                  >
                    <XCircle size={18} /> Reject
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setSelectedBookingModal(null)}
                className="btn btn-outline"
                style={{ borderRadius: '12px', fontWeight: 700 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Service OTP Modal */}
      {startingBookingId && (
        <div className="modal-overlay" onClick={() => setStartingBookingId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '2rem', borderRadius: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <Key size={40} color="var(--primary)" style={{ margin: '0 auto 0.5rem' }} />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Enter Patient Service OTP</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                Ask the patient for the 4-digit OTP shown on their live tracking screen to authorize session start.
              </p>
            </div>

            {otpError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                ⚠️ {otpError}
              </div>
            )}

            <form onSubmit={handleStartServiceSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="e.g. 1234"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="form-input"
                  style={{ textAlign: 'center', fontSize: '1.75rem', letterSpacing: '0.3em', fontWeight: 800 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setStartingBookingId(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={processing} className="btn btn-primary" style={{ fontWeight: 800 }}>
                  Verify & Start Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingBookingId && (
        <div className="modal-overlay" onClick={() => setRejectingBookingId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ borderRadius: '24px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>Reject Patient Booking Request</h3>
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
                <button type="submit" disabled={processing} className="btn btn-danger" style={{ fontWeight: 800 }}>
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
