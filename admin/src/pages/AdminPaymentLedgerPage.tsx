import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminClient';

export const AdminPaymentLedgerPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      const res = await adminApi.get('/payments');
      if (res.data.success) {
        setPayments(res.data.payments);
      }
    } catch (err) {
      console.error('Failed to load payment ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleMarkManualPaid = async (bookingId: string) => {
    try {
      const res = await adminApi.patch(`/payments/manual/${bookingId}`, {
        paymentStatus: 'PAID',
        notes: 'Marked PAID by Admin offline desk',
      });
      if (res.data.success) {
        fetchPayments();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update payment status');
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (sourceFilter !== 'ALL' && p.paymentSource !== sourceFilter) return false;
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrder = p.gatewayOrderId?.toLowerCase().includes(q);
      const matchPayment = p.gatewayPaymentId?.toLowerCase().includes(q);
      const matchBooking = (typeof p.bookingId === 'object' ? p.bookingId.bookingNumber : '').toLowerCase().includes(q);
      if (!matchOrder && !matchPayment && !matchBooking) return false;
    }
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Master Payment Ledger</h1>
        <p style={{ color: '#64748b' }}>Audit ledger of all online gateway & offline manual payments</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search Order ID, Payment ID, Booking #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Source:</span>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="form-select" style={{ width: '130px' }}>
            <option value="ALL">All Sources</option>
            <option value="ONLINE">ONLINE</option>
            <option value="MANUAL">MANUAL</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Status:</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select" style={{ width: '150px' }}>
            <option value="ALL">All Statuses</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading payment ledger...</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Booking #</th>
              <th>Source</th>
              <th>Method</th>
              <th>Gateway Payment ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.map((p) => (
              <tr key={p._id}>
                <td style={{ fontWeight: 700 }}>#{typeof p.bookingId === 'object' ? p.bookingId.bookingNumber : 'N/A'}</td>
                <td>
                  <span className={`badge ${p.paymentSource === 'MANUAL' ? 'badge-manual' : 'badge-online'}`}>
                    {p.paymentSource}
                  </span>
                </td>
                <td>{p.paymentMethod}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.825rem' }}>{p.gatewayPaymentId || 'N/A'}</td>
                <td style={{ fontWeight: 800 }}>₹{p.amount}</td>
                <td>
                  <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>
                </td>
                <td>
                  {p.paymentSource === 'MANUAL' && p.status === 'PENDING' && (
                    <button
                      onClick={() => handleMarkManualPaid(typeof p.bookingId === 'object' ? p.bookingId._id : p.bookingId)}
                      className="btn btn-primary btn-sm"
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
