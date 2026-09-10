import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminClient';

export const AdminSettlementManagementPage: React.FC = () => {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchSettlements = async () => {
    try {
      let query = '';
      if (statusFilter !== 'ALL') query += `status=${statusFilter}&`;
      if (roleFilter !== 'ALL') query += `entityRole=${roleFilter}&`;

      const res = await adminApi.get(`/settlements/admin-ledger?${query}`);
      if (res.data.success) {
        setSettlements(res.data.settlements);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to load settlements ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, [statusFilter, roleFilter]);

  const handleProcessSettlement = async (settlementId: string) => {
    const ref = window.prompt('Enter Bank Payout / Transaction Reference ID:', `TXN-SETTLE-${Date.now()}`);
    if (!ref) return;

    try {
      const res = await adminApi.post(`/settlements/process/${settlementId}`, {
        settlementReference: ref,
        notes: 'Payout processed by Admin',
      });

      if (res.data.success) {
        alert('Settlement payout processed successfully!');
        fetchSettlements();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Settlement processing failed');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Provider, Clinic & Lab Settlement Ledger</h1>
        <p style={{ color: '#64748b' }}>Calculate gross earnings, platform commission fees, and process partner payouts</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>TOTAL GROSS VOLUME</span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem' }}>₹{summary?.totalGross || 0}</h2>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #d97706' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>PLATFORM REVENUE (FEES)</span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#d97706' }}>₹{summary?.totalPlatformFees || 0}</h2>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #dc2626' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>PENDING PAYOUTS</span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#dc2626' }}>₹{summary?.pendingPayable || 0}</h2>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>SETTLED PAYOUTS</span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#16a34a' }}>₹{summary?.settledTotal || 0}</h2>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', backgroundColor: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Role:</span>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="form-select" style={{ width: '150px' }}>
            <option value="ALL">All Roles</option>
            <option value="PROVIDER">PROVIDER</option>
            <option value="CLINIC">CLINIC</option>
            <option value="LAB">LAB</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Settlement Status:</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select" style={{ width: '150px' }}>
            <option value="ALL">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="SETTLED">SETTLED</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading settlement ledger...</div>
      ) : settlements.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          No settlement records found.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Settlement #</th>
              <th>Partner Entity</th>
              <th>Role</th>
              <th>Gross</th>
              <th>Fee (10%)</th>
              <th>Net Payout</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s._id}>
                <td style={{ fontWeight: 700 }}>#{s.settlementId}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{typeof s.entityUserId === 'object' ? s.entityUserId.email : 'Partner'}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{typeof s.entityUserId === 'object' ? s.entityUserId.phone : 'N/A'}</div>
                </td>
                <td>
                  <span className="badge badge-manual">{s.entityRole}</span>
                </td>
                <td>₹{s.grossAmount}</td>
                <td style={{ color: '#d97706' }}>-₹{s.platformFee}</td>
                <td style={{ fontWeight: 800, color: '#16a34a' }}>₹{s.netEarning}</td>
                <td>
                  <span className={`badge ${s.status === 'SETTLED' ? 'badge-verified' : 'badge-pending'}`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  {s.status === 'PENDING' && (
                    <button onClick={() => handleProcessSettlement(s._id)} className="btn btn-primary btn-sm">
                      Process Payout
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
