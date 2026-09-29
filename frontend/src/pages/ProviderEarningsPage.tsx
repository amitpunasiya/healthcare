import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SettlementRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { DollarSign, Wallet, ArrowUpRight, CheckCircle, Clock, ShieldCheck, Building2, TestTube, UserCheck } from 'lucide-react';

export const ProviderEarningsPage: React.FC = () => {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = async () => {
    try {
      const res = await api.get('/settlements/my-earnings');
      if (res.data.success) {
        setSettlements(res.data.settlements);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to load earnings dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Financial Earnings & Settlement Ledger</h1>
        <p style={{ color: 'var(--text-muted)' }}>Real-time earnings, platform fee breakdowns, and payout settlement records</p>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #0284c7' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL GROSS BOOKINGS</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#0f172a' }}>
            ₹{summary?.totalGross || 0}
          </h2>
        </div>

        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #d97706' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>PLATFORM FEES (20%)</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#d97706' }}>
            -₹{summary?.totalPlatformFee || 0}
          </h2>
        </div>

        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #16a34a' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>NET EARNINGS</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#16a34a' }}>
            ₹{summary?.totalNetEarnings || 0}
          </h2>
        </div>

        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>SETTLED AMOUNT</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#7c3aed' }}>
            ₹{summary?.settledAmount || 0}
          </h2>
        </div>
      </div>

      {/* Booking Earnings Breakdown Table */}
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Booking Earnings Breakdown</h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading earnings ledger...</div>
      ) : settlements.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          No completed service earnings recorded yet. Earnings appear once appointments are marked COMPLETED.
        </div>
      ) : (
        <table className="data-table" style={{ backgroundColor: 'white' }}>
          <thead>
            <tr>
              <th>Settlement #</th>
              <th>Booking #</th>
              <th>Gross Amount</th>
              <th>Platform Fee</th>
              <th>Net Earning</th>
              <th>Status</th>
              <th>Settlement Date</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s._id}>
                <td style={{ fontWeight: 700 }}>#{s.settlementId}</td>
                <td>#{typeof s.bookingId === 'object' ? s.bookingId.bookingNumber : 'N/A'}</td>
                <td style={{ fontWeight: 600 }}>₹{s.grossAmount}</td>
                <td style={{ color: '#d97706' }}>-₹{s.platformFee}</td>
                <td style={{ fontWeight: 800, color: '#16a34a' }}>₹{s.netEarning}</td>
                <td>
                  <span className={`badge ${s.status === 'SETTLED' ? 'badge-verified' : 'badge-pending'}`}>
                    {s.status}
                  </span>
                </td>
                <td>{s.settledAt ? new Date(s.settledAt).toLocaleDateString() : 'Pending Admin Settlement'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
