import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PaymentRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CreditCard, Calendar, ShieldCheck, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';

export const CustomerPaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPayments = async () => {
    try {
      const res = await api.get('/payments');
      if (res.data.success) {
        setPayments(res.data.payments);
      }
    } catch (err) {
      console.error('Failed to load payments history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth/login?redirect=/payments');
      return;
    }
    fetchPayments();
  }, [user]);

  const filteredPayments = payments.filter((p) => {
    if (selectedFilter === 'ALL') return true;
    return p.status === selectedFilter;
  });

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '1000px' }}>
      <button onClick={() => navigate(-1)} className="btn btn-outline btn-sm" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>My Payment & Refund Ledger</h1>
        <p style={{ color: 'var(--text-muted)' }}>Complete audit history of your online and manual payment transactions</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {['ALL', 'PAID', 'PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'].map((st) => (
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
        <div style={{ textAlign: 'center', padding: '4rem' }}>Loading payment ledger...</div>
      ) : filteredPayments.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No payment transactions found under this filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredPayments.map((p) => (
            <div key={p._id} className="card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>₹{p.amount}</span>
                  <StatusBadge status={p.status} />
                  <span className="badge badge-manual" style={{ fontSize: '0.75rem' }}>{p.paymentSource}</span>
                </div>

                <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600 }}>
                  Booking: #{typeof p.bookingId === 'object' ? p.bookingId.bookingNumber : 'N/A'}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Method: {p.paymentMethod} • Date: {new Date(p.createdAt).toLocaleDateString()}
                  {p.gatewayPaymentId && ` • Gateway ID: ${p.gatewayPaymentId}`}
                </div>
              </div>

              <div>
                {typeof p.bookingId === 'object' && (
                  <Link to={`/bookings/${p.bookingId._id}`} className="btn btn-outline btn-sm">
                    View Booking Receipt
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
