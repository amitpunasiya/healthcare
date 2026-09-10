import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Booking } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CheckCircle, XCircle, Play, CheckCheck, AlertTriangle, TestTube, Calendar, Clock, MapPin, Home, Building } from 'lucide-react';

export const LabBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Reject Modal State
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('Lab kit/capacity unavailable');
  const [processing, setProcessing] = useState(false);

  const fetchLabBookings = async () => {
    try {
      const res = await api.get('/bookings/lab');
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
    fetchLabBookings();
  }, []);

  const handleAccept = async (id: string) => {
    setProcessing(true);
    try {
      const res = await api.patch(`/bookings/${id}/accept`);
      if (res.data.success) {
        fetchLabBookings();
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
        fetchLabBookings();
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
        fetchLabBookings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start sample collection / lab processing');
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteService = async (id: string) => {
    setProcessing(true);
    try {
      const res = await api.patch(`/bookings/${id}/complete`);
      if (res.data.success) {
        fetchLabBookings();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete lab test');
    } finally {
      setProcessing(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'NEW_PENDING') return b.status === 'PENDING';
    return b.status === selectedFilter;
  });

  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
  const acceptedCount = bookings.filter((b) => b.status === 'ACCEPTED').length;
  const inProgressCount = bookings.filter((b) => b.status === 'IN_PROGRESS').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <TestTube className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl sm:truncate">
                Diagnostic Lab Orders & Sample Collection
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage lab test bookings, home sample collection requests, and test completions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unverified Warning Banner if applicable */}
      {user?.verificationStatus !== 'VERIFIED' && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800 dark:text-amber-300">
              Lab Verification Pending
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Your lab profile is currently under review. You can view lab test orders, but accepting new test requests requires administrative verification.
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <button
          onClick={() => setSelectedFilter('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFilter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          All Orders ({bookings.length})
        </button>
        <button
          onClick={() => setSelectedFilter('NEW_PENDING')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            selectedFilter === 'NEW_PENDING'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          Requests Needed
          {pendingCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setSelectedFilter('ACCEPTED')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFilter === 'ACCEPTED'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          Accepted ({acceptedCount})
        </button>
        <button
          onClick={() => setSelectedFilter('IN_PROGRESS')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFilter === 'IN_PROGRESS'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          In Progress ({inProgressCount})
        </button>
        <button
          onClick={() => setSelectedFilter('COMPLETED')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFilter === 'COMPLETED'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          Completed / Results Sent
        </button>
        <button
          onClick={() => setSelectedFilter('REJECTED')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFilter === 'REJECTED'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          Rejected
        </button>
        <button
          onClick={() => setSelectedFilter('CANCELLED')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFilter === 'CANCELLED'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          Cancelled
        </button>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading lab orders...</div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400">No lab orders match the selected tab filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredBookings.map((b) => (
            <div
              key={b._id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                      ORDER #: {b._id.substring(b._id.length - 8)}
                    </span>
                    <StatusBadge status={b.status} />
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {b.visitType === 'LAB_VISIT' ? (
                        <>
                          <Building className="w-3 h-3" /> Visit Lab Center
                        </>
                      ) : (
                        <>
                          <Home className="w-3 h-3" /> Home Sample Collection
                        </>
                      )}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {typeof b.serviceId === 'object' ? (b.serviceId as any).name : 'Diagnostic Lab Test'}
                  </h3>
                </div>

                <div className="text-left lg:text-right">
                  <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                    ₹{b.totalPrice}
                  </div>
                  <div className="text-xs text-slate-500">
                    Payment Status: <span className="font-medium text-slate-700 dark:text-slate-300">{b.paymentStatus}</span>
                  </div>
                </div>
              </div>

              {/* Customer & Slot Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400 font-medium mb-1">PATIENT / CUSTOMER</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {typeof b.customerId === 'object' ? (b.customerId as any).name : 'Customer'}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Phone: {typeof b.customerId === 'object' ? (b.customerId as any).phone || 'N/A' : 'N/A'}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Email: {typeof b.customerId === 'object' ? (b.customerId as any).email : 'N/A'}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400 font-medium mb-1">COLLECTION SLOT</div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    {new Date(b.bookingDate || b.scheduledDate || Date.now()).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1.5">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    {b.scheduledTime}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400 font-medium mb-1">
                    {b.visitType === 'LAB_VISIT' ? 'CENTER ADDRESS' : 'SAMPLE PICKUP ADDRESS'}
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>
                      {b.address?.street
                        ? `${b.address.street}, ${b.address.city}, ${b.address.state} - ${b.address.zipCode}`
                        : 'At Lab Center'}
                    </span>
                  </div>
                  {b.notes && (
                    <div className="mt-2 text-xs italic text-slate-500 bg-amber-50/50 dark:bg-amber-950/20 p-1.5 rounded">
                      "{b.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Rejection Reason display if status === REJECTED */}
              {b.status === 'REJECTED' && b.rejectionReason && (
                <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 rounded-lg text-xs text-red-700 dark:text-red-300">
                  <strong>Rejection Reason:</strong> {b.rejectionReason}
                </div>
              )}

              {/* Action Buttons based on status */}
              <div className="flex items-center justify-end gap-3 pt-2">
                {b.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => setRejectingBookingId(b._id)}
                      disabled={processing}
                      className="px-4 py-2 bg-slate-100 hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Decline Order
                    </button>
                    <button
                      onClick={() => handleAccept(b._id)}
                      disabled={processing || user?.verificationStatus !== 'VERIFIED'}
                      title={
                        user?.verificationStatus !== 'VERIFIED'
                          ? 'Account must be verified by Admin to accept lab orders'
                          : ''
                      }
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" /> Accept Order
                    </button>
                  </>
                )}

                {b.status === 'ACCEPTED' && (
                  <button
                    onClick={() => handleStartService(b._id)}
                    disabled={processing}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Play className="w-4 h-4" /> Start Sample Collection / Processing
                  </button>
                )}

                {b.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleCompleteService(b._id)}
                    disabled={processing}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCheck className="w-4 h-4" /> Mark Test Completed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingBookingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Decline Lab Test Order
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Please state a reason for declining this lab order. This will be visible to the customer.
            </p>
            <form onSubmit={handleRejectSubmit}>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                rows={3}
                placeholder="e.g. Lab equipment under maintenance, Home sample collection slot unavailable..."
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-none mb-4"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectingBookingId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold"
                >
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
