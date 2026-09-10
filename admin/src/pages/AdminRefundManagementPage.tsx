import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminClient';

export const AdminRefundManagementPage: React.FC = () => {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRefunds = async () => {
    try {
      const rRes = await adminApi.get('/refunds');
      const pRes = await adminApi.get('/payments');
      if (rRes.data.success) setRefunds(rRes.data.refunds);
      if (pRes.data.success) setPayments(pRes.data.payments.filter((p: any) => p.status === 'PAID'));
    } catch (err) {
      console.error('Failed to load refunds data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleInitiateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentId) return;
    setSubmitting(true);

    try {
      const res = await adminApi.post('/refunds/initiate', {
        paymentId: selectedPaymentId,
        amount: refundAmount,
        reason: refundReason,
      });

      if (res.data.success) {
        alert(`Refund of ₹${refundAmount} processed successfully!`);
        setSelectedPaymentId('');
        setRefundReason('');
        setRefundAmount(0);
        fetchRefunds();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Refund processing failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryRefund = async (refundId: string) => {
    try {
      const res = await adminApi.post(`/refunds/${refundId}/retry`);
      if (res.data.success) {
        fetchRefunds();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Retry failed');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Refund Console</h1>
        <p style={{ color: '#64748b' }}>Initiate authorized customer refunds, view refund logs, and retry failed transactions</p>
      </div>

      {/* Initiate Refund Form Card */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          Initiate Authorized Refund
        </h3>

        <form onSubmit={handleInitiateRefund} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group">
            <label className="form-label">Select Paid Transaction</label>
            <select
              value={selectedPaymentId}
              onChange={(e) => {
                setSelectedPaymentId(e.target.value);
                const found = payments.find((p) => p._id === e.target.value);
                if (found) setRefundAmount(found.amount);
              }}
              className="form-select"
            >
              <option value="">-- Choose Paid Payment --</option>
              {payments.map((p) => (
                <option key={p._id} value={p._id}>
                  #{typeof p.bookingId === 'object' ? p.bookingId.bookingNumber : p.bookingId} — ₹{p.amount} ({p.paymentSource})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Refund Amount (₹)</label>
            <input
              type="number"
              required
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reason for Refund</label>
            <input
              type="text"
              required
              placeholder="e.g. Patient medical cancellation"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="form-input"
            />
          </div>

          <button type="submit" disabled={submitting || !selectedPaymentId} className="btn btn-primary" style={{ padding: '0.75rem' }}>
            {submitting ? 'Processing...' : 'Issue Refund'}
          </button>
        </form>
      </div>

      {/* Refunds History Table */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Master Refund Audit Log</h3>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading refund records...</div>
      ) : refunds.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          No refund records found.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Refund #</th>
              <th>Booking #</th>
              <th>Amount</th>
              <th>Initiated By</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((r) => (
              <tr key={r._id}>
                <td style={{ fontWeight: 700 }}>#{r.refundId}</td>
                <td>#{typeof r.bookingId === 'object' ? r.bookingId.bookingNumber : 'N/A'}</td>
                <td style={{ fontWeight: 800, color: '#dc2626' }}>₹{r.amount}</td>
                <td>{r.initiatedBy}</td>
                <td>{r.reason}</td>
                <td>
                  <span className={`badge ${r.status === 'PROCESSED' ? 'badge-verified' : 'badge-rejected'}`}>
                    {r.status}
                  </span>
                </td>
                <td>
                  {r.status === 'FAILED' && (
                    <button onClick={() => handleRetryRefund(r._id)} className="btn btn-primary btn-sm">
                      Retry
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
