import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Booking } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { buildReadableAddress, calculateHaversineDistance } from '../utils/location';
import { ProviderDestinationMap } from '../components/ProviderDestinationMap';
import { ProviderAnalyticsChart } from '../components/ProviderAnalyticsChart';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Calendar,
  MapPin,
  Navigation,
  Compass,
  Eye,
  RefreshCw,
  X,
  Key,
  CheckCheck,
  TrendingUp,
  DollarSign,
  Filter,
  BarChart3,
  List,
  Search,
  Wallet,
  ArrowRight,
  CreditCard,
} from 'lucide-react';

export const ProviderDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Provider Location State
  const [providerCoords, setProviderCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  // Detail Modal State
  const [selectedBookingModal, setSelectedBookingModal] = useState<Booking | null>(null);

  // Start Service OTP Modal State
  const [startingBookingId, setStartingBookingId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<string>('today');
  const [selectedDateInput, setSelectedDateInput] = useState<string>('');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  const [chartMetric, setChartMetric] = useState<'earnings' | 'bookings'>('earnings');
  const [breakdownTab, setBreakdownTab] = useState<'weekly' | 'monthly'>('weekly');

  // Pay Platform Fee Modal State
  const [showPayPlatformModal, setShowPayPlatformModal] = useState(false);
  const [payTxnRef, setPayTxnRef] = useState('');
  const [payProcessing, setPayProcessing] = useState(false);

  const handleVerifySelf = async () => {
    try {
      const res = await api.post('/auth/verify-self');
      if (res.data.success) {
        if (refreshUser) await refreshUser();
        fetchBookings();
        fetchAnalytics();
        alert('Account verified successfully! You can now accept patient requests.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Auto-verification failed');
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/provider');
      if (res.data.success) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const params: any = {};
      if (selectedDateInput) {
        params.date = selectedDateInput;
      } else if (selectedRange === 'custom') {
        params.range = 'custom';
        if (customFromDate) params.fromDate = customFromDate;
        if (customToDate) params.toDate = customToDate;
      } else {
        params.range = selectedRange;
      }

      const res = await api.get('/bookings/provider/analytics', { params });
      if (res.data.success) {
        setAnalyticsData(res.data);
      }
    } catch (err) {
      console.error('Failed to load provider analytics', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (!user || (user.role !== 'PROVIDER' && user.role !== 'ADMIN')) return;
    fetchBookings();
    fetchAnalytics();
    const interval = setInterval(() => {
      fetchBookings();
      fetchAnalytics();
    }, 12000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user || (user.role !== 'PROVIDER' && user.role !== 'ADMIN')) return;
    fetchAnalytics();
  }, [user, selectedRange, selectedDateInput]);

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFromDate || !customToDate) {
      alert('Please select both From Date and To Date.');
      return;
    }
    setSelectedRange('custom');
    setSelectedDateInput('');
    fetchAnalytics();
  };

  const handlePayPlatformFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayProcessing(true);
    try {
      const res = await api.post('/settlements/pay-platform-fee', {
        txnReference: payTxnRef.trim() || `PAY-PLATFORM-${Date.now()}`,
      });

      if (res.data.success) {
        alert(res.data.message || `Platform fee payment of ₹${res.data.totalAmountPaid} processed successfully! Platform due cleared.`);
        setShowPayPlatformModal(false);
        setPayTxnRef('');
        fetchAnalytics();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process platform fee payment');
    } finally {
      setPayProcessing(false);
    }
  };

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
        alert('Could not retrieve current location. Patient destination map is still available.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAcceptRequest = async (bookingId: string) => {
    if (user?.verificationStatus !== 'VERIFIED') {
      alert('Your account is currently PENDING VERIFICATION. Account verification must be approved by an Administrator in the Admin Portal before you can accept patient booking requests.');
      return;
    }
    setProcessingId(bookingId);
    try {
      const res = await api.patch(`/bookings/${bookingId}/accept`);
      if (res.data.success) {
        fetchBookings();
        fetchAnalytics();
        if (selectedBookingModal && selectedBookingModal._id === bookingId) {
          setSelectedBookingModal(res.data.booking);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'This booking request is no longer available or has already been accepted.');
      fetchBookings();
      fetchAnalytics();
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to decline this booking request?')) return;
    setProcessingId(bookingId);
    try {
      const res = await api.patch(`/bookings/${bookingId}/reject`, {
        rejectionReason: 'Provider declined request',
      });
      if (res.data.success) {
        fetchBookings();
        fetchAnalytics();
        if (selectedBookingModal && selectedBookingModal._id === bookingId) {
          setSelectedBookingModal(null);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject booking request');
    } finally {
      setProcessingId(null);
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

    setProcessingId(startingBookingId);
    try {
      const res = await api.patch(`/bookings/${startingBookingId}/start`, {
        otp: otpInput.trim(),
      });
      if (res.data.success) {
        setStartingBookingId(null);
        setOtpInput('');
        fetchBookings();
        fetchAnalytics();
        if (selectedBookingModal && selectedBookingModal._id === startingBookingId) {
          setSelectedBookingModal(res.data.booking);
        }
      }
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Invalid OTP. Please check the OTP with the patient.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCompleteService = async (id: string) => {
    if (!window.confirm('Are you sure you have finished all requested work for this session?')) return;
    setProcessingId(id);
    try {
      const res = await api.patch(`/bookings/${id}/complete`);
      if (res.data.success) {
        fetchBookings();
        fetchAnalytics();
        if (selectedBookingModal && selectedBookingModal._id === id) {
          setSelectedBookingModal(res.data.booking);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete service session.');
    } finally {
      setProcessingId(null);
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

  const summary = analyticsData?.summary || {};
  const filteredAnalytics = analyticsData?.filteredAnalytics || {};
  const weeklyBreakdown = analyticsData?.weeklyBreakdown || [];
  const monthlyBreakdown = analyticsData?.monthlyBreakdown || [];

  return (
    <div className="container" style={{ padding: '3rem 1.5rem' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Professional Healthcare Portal</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage patient appointment requests, cash settlement payables & earnings analytics</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
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

          <button
            type="button"
            onClick={() => {
              fetchBookings();
              fetchAnalytics();
            }}
            className="btn btn-outline"
            style={{ fontWeight: 700, borderRadius: '12px' }}
          >
            <RefreshCw size={16} className={analyticsLoading ? 'animate-spin' : ''} />
            Refresh Analytics
          </button>

          <a href="/provider/bookings" className="btn btn-primary" style={{ textDecoration: 'none', borderRadius: '12px', fontWeight: 700 }}>
            Full Booking Manager &rarr;
          </a>
        </div>
      </div>

      {/* Verification Status Alert Banner */}
      {user?.verificationStatus === 'PENDING_VERIFICATION' && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '1.25rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <AlertTriangle color="#d97706" size={28} />
            <div>
              <h4 style={{ color: '#92400e', fontWeight: 700 }}>Account Verification Pending</h4>
              <p style={{ color: '#b45309', fontSize: '0.875rem' }}>
                Your profile is under <strong>Admin Review</strong>. Account verification must be approved by an Administrator before accepting patient requests.
              </p>
            </div>
          </div>
          {import.meta.env.DEV && (
            <button type="button" onClick={handleVerifySelf} className="btn btn-primary btn-sm" style={{ borderRadius: '10px', fontWeight: 800 }}>
              ⚡ Verify Account (Development Only)
            </button>
          )}
        </div>
      )}

      {user?.verificationStatus === 'VERIFIED' && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem 1.25rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck color="#16a34a" size={24} />
            <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.95rem' }}>Verified Professional Account (Active in Directory)</span>
          </div>
          <button type="button" onClick={() => { fetchBookings(); fetchAnalytics(); }} className="btn btn-outline btn-sm" style={{ borderRadius: '8px' }}>
            <RefreshCw size={14} /> Refresh Data
          </button>
        </div>
      )}

      {/* SECTION 1: EARNINGS & PLATFORM PAYABLE KPI CARDS */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={22} color="var(--primary)" /> Earnings & Cash Settlement Summary
        </h2>

        {/* 5 Net Earnings & Cash Payable Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
          {/* PLATFORM AMOUNT DUE CARD */}
          <div
            className="card"
            style={{
              padding: '1.4rem',
              borderRadius: '18px',
              borderLeft: `5px solid ${summary.totalPlatformAmountDue > 0 ? '#dc2626' : '#16a34a'}`,
              backgroundColor: summary.totalPlatformAmountDue > 0 ? '#fef2f2' : 'white',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: summary.totalPlatformAmountDue > 0 ? '#991b1b' : '#15803d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {summary.totalPlatformAmountDue > 0 ? '💰 PLATFORM AMOUNT DUE' : '✅ ALL PLATFORM DUES CLEARED'}
              </span>
              {summary.totalPlatformAmountDue > 0 ? (
                <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>ACTION DUE</span>
              ) : (
                <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>ALL PAID</span>
              )}
            </div>
            <h2
              style={{
                fontSize: '1.85rem',
                fontWeight: 900,
                marginTop: '0.35rem',
                color: summary.totalPlatformAmountDue > 0 ? '#dc2626' : '#15803d'
              }}
            >
              ₹{summary.totalPlatformAmountDue || 0}
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {summary.totalPlatformAmountDue > 0
                  ? `${summary.cashBookingsCount ? `${summary.cashBookingsCount} Cash Bookings` : 'No outstanding cash settlement'}`
                  : `₹${summary.totalPlatformAmountPaid || 0} total platform commission paid`}
              </span>
              {summary.totalPlatformAmountDue > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPayPlatformModal(true)}
                  className="btn btn-danger btn-sm"
                  style={{ borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem' }}
                >
                  Pay Platform Amount
                </button>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: '1.4rem', borderRadius: '18px', borderLeft: '5px solid #16a34a', backgroundColor: 'white', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL EARNINGS (NET)</span>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 900, marginTop: '0.35rem', color: '#15803d' }}>
              ₹{summary.totalEarnings || 0}
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From completed & paid services</span>
          </div>

          <div className="card" style={{ padding: '1.4rem', borderRadius: '18px', borderLeft: '5px solid #0284c7', backgroundColor: 'white', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TODAY'S EARNINGS</span>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 900, marginTop: '0.35rem', color: '#0284c7' }}>
              ₹{summary.todayEarnings || 0}
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed sessions today</span>
          </div>

          <div className="card" style={{ padding: '1.4rem', borderRadius: '18px', borderLeft: '5px solid #8b5cf6', backgroundColor: 'white', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>THIS WEEK'S EARNINGS</span>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 900, marginTop: '0.35rem', color: '#7c3aed' }}>
              ₹{summary.thisWeekEarnings || 0}
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current week (Mon - Sun)</span>
          </div>

          <div className="card" style={{ padding: '1.4rem', borderRadius: '18px', borderLeft: '5px solid #d97706', backgroundColor: 'white', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>THIS MONTH'S EARNINGS</span>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 900, marginTop: '0.35rem', color: '#b45309' }}>
              ₹{summary.thisMonthEarnings || 0}
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current calendar month</span>
          </div>
        </div>

        {/* 4 Booking Volume KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.15rem 1.4rem', borderRadius: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Total Assigned Bookings</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
              {summary.totalBookings || 0} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#16a34a' }}>({summary.completedBookingsCount || 0} completed)</span>
            </div>
          </div>

          <div className="card" style={{ padding: '1.15rem 1.4rem', borderRadius: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Total Cash Collected</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
              ₹{summary.totalCashCollected || 0}
            </div>
          </div>

          <div className="card" style={{ padding: '1.15rem 1.4rem', borderRadius: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>This Week's Bookings</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
              {summary.thisWeekBookings || 0}
            </div>
          </div>

          <div className="card" style={{ padding: '1.15rem 1.4rem', borderRadius: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>This Month's Bookings</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
              {summary.thisMonthBookings || 0}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ANALYTICS & DATE FILTERS TOOLBAR */}
      <div className="card" style={{ padding: '1.5rem', borderRadius: '20px', marginBottom: '2rem', backgroundColor: 'white', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={18} color="var(--primary)" /> Date & Date-Range Analytics Filter
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {selectedDateInput && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDateInput('');
                  setSelectedRange('today');
                }}
                className="btn btn-outline btn-sm"
                style={{ borderRadius: '8px', fontSize: '0.8rem' }}
              >
                ✖ Clear Date ({selectedDateInput})
              </button>
            )}
          </div>
        </div>

        {/* Preset Range Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {[
            { id: 'today', label: "Today" },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'last_week', label: 'Last Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'custom', label: 'Custom Range' },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setSelectedRange(r.id);
                setSelectedDateInput('');
              }}
              className={`btn btn-sm ${selectedRange === r.id && !selectedDateInput ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: '10px', fontWeight: 700, padding: '0.4rem 0.85rem' }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Date Pickers & Custom Range Form */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          {/* Single Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Select Specific Date:</span>
            <input
              type="date"
              value={selectedDateInput}
              onChange={(e) => {
                setSelectedDateInput(e.target.value);
                setSelectedRange('');
              }}
              className="form-input"
              style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', fontSize: '0.85rem' }}
            />
          </div>

          {/* Custom Date Range Inputs if Custom Range Selected */}
          {selectedRange === 'custom' && (
            <form onSubmit={handleApplyCustomRange} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>From:</span>
              <input
                type="date"
                required
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="form-input"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', fontSize: '0.85rem' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>To:</span>
              <input
                type="date"
                required
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="form-input"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', fontSize: '0.85rem' }}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ borderRadius: '8px', fontWeight: 800 }}>
                Apply Filter
              </button>
            </form>
          )}
        </div>
      </div>

      {/* SECTION 3: SELECTED PERIOD SUMMARY & CHART VISUALIZATION */}
      <div style={{ marginBottom: '2.5rem' }}>
        {/* Period Summary KPI Banner */}
        <div style={{ backgroundColor: '#0f172a', color: 'white', borderRadius: '20px', padding: '1.5rem 1.75rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-md)', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ backgroundColor: '#0284c7', color: 'white', fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 0.75rem', borderRadius: '999px', letterSpacing: '0.05em' }}>
                SELECTED PERIOD: {filteredAnalytics.filterLabel || 'Today'}
              </span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginTop: '0.4rem', marginBottom: 0 }}>
                Period Settlement Summary
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setChartMetric('earnings')}
                className={`btn btn-sm ${chartMetric === 'earnings' ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}
              >
                ₹ Earnings
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('bookings')}
                className={`btn btn-sm ${chartMetric === 'bookings' ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}
              >
                📊 Bookings Count
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', paddingTop: '0.5rem', borderTop: '1px solid #334155' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>PERIOD BOOKINGS</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{filteredAnalytics.totalBookings || 0}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>COMPLETED & PAID</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>{filteredAnalytics.completedBookings || 0}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>GROSS CASH COLLECTED</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>₹{filteredAnalytics.totalCashCollected || 0}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 800 }}>PLATFORM FEE DUE</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>₹{filteredAnalytics.platformFeeDue || 0}</div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 800 }}>NET PROVIDER EARNING</span>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#38bdf8' }}>₹{filteredAnalytics.totalEarnings || 0}</div>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart Component */}
        <ProviderAnalyticsChart
          data={breakdownTab === 'weekly' ? weeklyBreakdown : monthlyBreakdown}
          metric={chartMetric}
          title={breakdownTab === 'weekly' ? 'Weekly Performance Trend (Mon - Sun)' : 'Monthly Performance Trend (Date-wise)'}
          onSelectDate={(dStr) => {
            setSelectedDateInput(dStr);
            setSelectedRange('');
          }}
        />
      </div>

      {/* SECTION 4: CASH PAYMENT LEDGER & DAY-BY-DAY BREAKDOWN */}
      <div className="card" style={{ padding: '1.5rem', borderRadius: '20px', marginBottom: '2.5rem', backgroundColor: 'white', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Wallet size={18} color="var(--primary)" /> Cash Payment Ledger & Platform Settlement Status
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.1rem 0 0' }}>
              Track cash collected directly from patients, CarePulse 20% platform commission due, and settlement verification status.
            </p>
          </div>

          {summary.totalPlatformAmountDue > 0 && (
            <button
              type="button"
              onClick={() => setShowPayPlatformModal(true)}
              className="btn btn-danger"
              style={{ borderRadius: '10px', fontWeight: 800 }}
            >
              Pay Platform Amount (₹{summary.totalPlatformAmountDue})
            </button>
          )}
        </div>

        {analyticsLoading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem' }}>Loading cash payment ledger...</div>
        ) : !filteredAnalytics.bookingsList || filteredAnalytics.bookingsList.filter((b: any) => b.isCash).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
            <Wallet size={36} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#334155' }}>No cash payment transactions recorded for this period</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Platform Fee Due: <strong style={{ color: '#0f172a' }}>₹0</strong>
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ backgroundColor: 'white' }}>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Service</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Gross Cash Collected</th>
                  <th>Payment Method</th>
                  <th>Platform Fee (20%)</th>
                  <th>Provider Net Earning</th>
                  <th>Platform Fee Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnalytics.bookingsList.filter((b: any) => b.isCash).map((b: any) => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>#{b.bookingNumber}</td>
                    <td style={{ fontWeight: 700 }}>{b.serviceName}</td>
                    <td style={{ fontSize: '0.85rem' }}>{b.customerName}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.bookingDate}</td>
                    <td style={{ fontWeight: 800, color: '#16a34a' }}>₹{b.grossAmount}</td>
                    <td><span className="badge badge-manual">💵 CASH</span></td>
                    <td style={{ fontWeight: 800, color: '#dc2626' }}>₹{b.platformFee}</td>
                    <td style={{ fontWeight: 800, color: '#0284c7' }}>₹{b.netEarning}</td>
                    <td>
                      <span className={`badge ${b.platformSettlementStatus === 'PAID' || b.platformSettlementStatus === 'VERIFIED' ? 'badge-verified' : b.platformSettlementStatus === 'SUBMITTED' ? 'badge-manual' : 'badge-danger'}`}>
                        {b.platformSettlementStatus === 'DUE' ? 'PLATFORM FEE DUE' : b.platformSettlementStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 5: WEEKLY & MONTHLY BREAKDOWN TABLES */}
      <div className="card" style={{ padding: '1.5rem', borderRadius: '20px', marginBottom: '2.5rem', backgroundColor: 'white', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <BarChart3 size={18} color="var(--primary)" /> Day-by-Day Performance Breakdown
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setBreakdownTab('weekly')}
              className={`btn btn-sm ${breakdownTab === 'weekly' ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: '8px', fontWeight: 700 }}
            >
              Current Week (Mon-Sun)
            </button>
            <button
              type="button"
              onClick={() => setBreakdownTab('monthly')}
              className={`btn btn-sm ${breakdownTab === 'monthly' ? 'btn-primary' : 'btn-outline'}`}
              style={{ borderRadius: '8px', fontWeight: 700 }}
            >
              Current Month (Date-wise)
            </button>
          </div>
        </div>

        {breakdownTab === 'weekly' ? (
          <table className="data-table" style={{ backgroundColor: 'white' }}>
            <thead>
              <tr>
                <th>Day</th>
                <th>Date</th>
                <th>Total Bookings</th>
                <th>Completed Sessions</th>
                <th>Net Provider Earnings</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {weeklyBreakdown.map((row: any, idx: number) => (
                <tr key={idx} style={{ backgroundColor: selectedDateInput === row.date ? '#eff6ff' : 'transparent' }}>
                  <td style={{ fontWeight: 800 }}>{row.day}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{row.date}</td>
                  <td style={{ fontWeight: 700 }}>{row.bookings}</td>
                  <td style={{ fontWeight: 700, color: row.completed > 0 ? '#16a34a' : 'inherit' }}>{row.completed}</td>
                  <td style={{ fontWeight: 900, color: '#0284c7' }}>₹{row.earnings}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDateInput(row.date);
                        setSelectedRange('');
                      }}
                      className="btn btn-outline btn-sm"
                      style={{ borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      Inspect Date
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
            <table className="data-table" style={{ backgroundColor: 'white' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Bookings</th>
                  <th>Completed Sessions</th>
                  <th>Net Provider Earnings</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.map((row: any, idx: number) => (
                  <tr key={idx} style={{ backgroundColor: selectedDateInput === row.date ? '#eff6ff' : 'transparent' }}>
                    <td style={{ fontWeight: 800 }}>{row.label} ({row.date})</td>
                    <td style={{ fontWeight: 700 }}>{row.bookings}</td>
                    <td style={{ fontWeight: 700, color: row.completed > 0 ? '#16a34a' : 'inherit' }}>{row.completed}</td>
                    <td style={{ fontWeight: 900, color: '#0284c7' }}>₹{row.earnings}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDateInput(row.date);
                          setSelectedRange('');
                        }}
                        className="btn btn-outline btn-sm"
                        style={{ borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        Inspect Date
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 6: DATE-WISE / PERIOD BOOKING LEDGER DETAILS */}
      <div className="card" style={{ padding: '1.5rem', borderRadius: '20px', marginBottom: '2.5rem', backgroundColor: 'white', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <List size={18} color="var(--primary)" /> Booking Details ({filteredAnalytics.filterLabel || 'Today'})
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.1rem 0 0' }}>
              Detailed breakdown of appointments and individual net settlement earnings for this period.
            </p>
          </div>
        </div>

        {analyticsLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading analytics ledger...</div>
        ) : !filteredAnalytics.bookingsList || filteredAnalytics.bookingsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <Calendar size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#334155' }}>No bookings found for this period</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Earnings for selected period: <strong style={{ color: '#0f172a' }}>₹0</strong>
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ backgroundColor: 'white' }}>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Service</th>
                  <th>Customer</th>
                  <th>Date & Time</th>
                  <th>Booking Status</th>
                  <th>Payment Status</th>
                  <th>Gross Fee</th>
                  <th>Platform Fee (20%)</th>
                  <th>Net Provider Earning</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnalytics.bookingsList.map((b: any) => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>#{b.bookingNumber}</td>
                    <td style={{ fontWeight: 700 }}>{b.serviceName}</td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <strong>{b.customerName}</strong> ({b.customerPhone})
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {b.bookingDate} {b.timeSlot?.startTime ? `(${b.timeSlot.startTime} - ${b.timeSlot.endTime})` : ''}
                    </td>
                    <td><StatusBadge status={b.status} /></td>
                    <td><StatusBadge status={b.paymentStatus} /></td>
                    <td style={{ fontWeight: 600 }}>₹{b.grossAmount}</td>
                    <td style={{ color: '#d97706' }}>-₹{b.platformFee}</td>
                    <td style={{ fontWeight: 900, fontSize: '1rem', color: b.isEligible ? '#16a34a' : 'var(--text-muted)' }}>
                      {b.isEligible ? `₹${b.netEarning}` : '₹0 (Pending/Ineligible)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 7: EXISTING PROVIDER DASHBOARD PANELS (Live Match Banner & Incoming Requests) */}

      {/* Rapido / Uber Style Live Match Flash Banner */}
      {(() => {
        const activeMatch = bookings.find((b) => b.status === 'REQUESTED' || b.status === 'SEARCHING' || b.status === 'PENDING');
        if (!activeMatch) return null;

        let flashDestText = buildReadableAddress(activeMatch.serviceAddress || {}).singleLine || activeMatch.serviceAddress?.addressLine1 || `${activeMatch.serviceAddress?.city || 'Customer location'}`;
        let flashDist = (providerCoords && activeMatch.serviceAddress?.latitude && activeMatch.serviceAddress?.longitude)
          ? calculateHaversineDistance(providerCoords.latitude, providerCoords.longitude, activeMatch.serviceAddress.latitude, activeMatch.serviceAddress.longitude)
          : undefined;

        return (
          <div style={{
            backgroundColor: '#0f172a',
            color: 'white',
            borderRadius: '20px',
            padding: '1.5rem 1.75rem',
            marginBottom: '2.5rem',
            boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.3), 0 8px 10px -6px rgba(15, 23, 42, 0.2)',
            border: '2px solid #38bdf8',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ backgroundColor: '#0284c7', color: 'white', fontSize: '0.75rem', fontWeight: 800, padding: '0.3rem 0.75rem', borderRadius: '999px', letterSpacing: '0.05em' }}>
                  ⚡ LIVE MATCHED REQUEST IN YOUR AREA
                </span>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>
                  #{activeMatch.bookingNumber}
                </span>
              </div>
              {flashDist !== undefined ? (
                <span style={{ backgroundColor: '#16a34a', color: 'white', fontSize: '0.8rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '999px' }}>
                  📍 {flashDist} km away from your location
                </span>
              ) : (
                <span style={{ backgroundColor: '#334155', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                  INDORE REGION MATCH
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '0.35rem' }}>
                  {activeMatch.serviceId?.name || 'Healthcare Service'}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Patient: <strong style={{ color: 'white' }}>{activeMatch.customerDetails?.name}</strong> ({activeMatch.customerDetails?.phone})
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
                  <MapPin size={16} color="#38bdf8" />
                  <span>{flashDestText}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem', minWidth: '180px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, display: 'block' }}>PAYABLE AMOUNT</span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8' }}>₹{activeMatch.pricing?.totalAmount}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => handleAcceptRequest(activeMatch._id)}
                    disabled={processingId === activeMatch._id}
                    className="btn btn-success"
                    style={{ flex: 1, justifyContent: 'center', fontWeight: 800, borderRadius: '12px', padding: '0.65rem 1rem' }}
                  >
                    <CheckCircle size={16} /> ACCEPT REQUEST
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRejectRequest(activeMatch._id)}
                    disabled={processingId === activeMatch._id}
                    className="btn btn-danger"
                    style={{ borderRadius: '12px', fontWeight: 700, padding: '0.65rem 0.85rem' }}
                  >
                    <XCircle size={16} /> Decline
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Incoming & Assigned Appointment Ledger</h2>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading appointment ledger...</div>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '16px' }}>
          No appointment requests found right now.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.75rem' }}>
          {bookings.map((b) => {
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
                  {/* Card Top Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>#{b.bookingNumber}</span>
                    <StatusBadge status={b.status} />
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

                  {/* Customer / Service Destination Block */}
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
                </div>

                {/* Bottom Pricing & Action Buttons */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-muted)' }}>Payable Amount:</span>
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
                          onClick={() => handleAcceptRequest(b._id)}
                          disabled={processingId === b._id}
                          className="btn btn-success btn-sm"
                          style={{ flex: 1, justifyContent: 'center', fontWeight: 800, borderRadius: '10px' }}
                        >
                          <CheckCircle size={15} /> ACCEPT REQUEST
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRejectRequest(b._id)}
                          disabled={processingId === b._id}
                          className="btn btn-danger btn-sm"
                          style={{ borderRadius: '10px', fontWeight: 700 }}
                        >
                          <XCircle size={15} /> Reject
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
                        disabled={processingId === b._id}
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
                        disabled={processingId === b._id}
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

      {/* Booking Details & Map Modal */}
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
                    onClick={() => handleAcceptRequest(selectedBookingModal._id)}
                    disabled={processingId === selectedBookingModal._id}
                    className="btn btn-success btn-lg"
                    style={{ flex: 1, justifyContent: 'center', fontWeight: 800, borderRadius: '12px' }}
                  >
                    <CheckCircle size={18} /> ACCEPT REQUEST
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRejectRequest(selectedBookingModal._id)}
                    disabled={processingId === selectedBookingModal._id}
                    className="btn btn-danger btn-lg"
                    style={{ borderRadius: '12px', fontWeight: 700 }}
                  >
                    <XCircle size={18} /> Reject
                  </button>
                </>
              )}

              {selectedBookingModal.status === 'ACCEPTED' && (
                <button
                  type="button"
                  onClick={() => {
                    const bId = selectedBookingModal._id;
                    setSelectedBookingModal(null);
                    setStartingBookingId(bId);
                    setOtpInput('');
                    setOtpError('');
                  }}
                  disabled={processingId === selectedBookingModal._id}
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1, justifyContent: 'center', fontWeight: 800, borderRadius: '12px' }}
                >
                  <Key size={18} /> Arrived (Enter Patient OTP)
                </button>
              )}

              {selectedBookingModal.status === 'IN_PROGRESS' && (
                <button
                  type="button"
                  onClick={() => {
                    handleCompleteService(selectedBookingModal._id);
                  }}
                  disabled={processingId === selectedBookingModal._id}
                  className="btn btn-success btn-lg"
                  style={{ flex: 1, justifyContent: 'center', fontWeight: 800, borderRadius: '12px' }}
                >
                  <CheckCheck size={18} /> Complete Service Work
                </button>
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
                <button type="submit" disabled={processingId === startingBookingId} className="btn btn-primary" style={{ fontWeight: 800 }}>
                  Verify & Start Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Platform Amount Modal */}
      {showPayPlatformModal && (
        <div className="modal-overlay" onClick={() => setShowPayPlatformModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', padding: '2rem', borderRadius: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <CreditCard size={44} color="#dc2626" style={{ margin: '0 auto 0.5rem' }} />
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>Pay Platform Amount Due</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                CarePulse 20% platform commission accumulated from cash collected from patients.
              </p>
            </div>

            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>AMOUNT DUE TO CAREPULSE</span>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#dc2626', margin: '0.2rem 0' }}>
                ₹{summary.totalPlatformAmountDue || 0}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#7f1d1d', fontWeight: 700 }}>
                Across {summary.cashBookingsCount || 0} cash booking sessions
              </span>
            </div>

            <form onSubmit={handlePayPlatformFeeSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', display: 'block' }}>
                  Online Payment / UPI / Bank Reference ID (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI-TXN-984712039 or Ref #"
                  value={payTxnRef}
                  onChange={(e) => setPayTxnRef(e.target.value)}
                  className="form-input"
                  style={{ borderRadius: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowPayPlatformModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={payProcessing} className="btn btn-danger" style={{ fontWeight: 800 }}>
                  {payProcessing ? 'Submitting Payment...' : 'Pay Now & Submit Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
