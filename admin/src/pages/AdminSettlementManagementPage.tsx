import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import adminApi from '../api/adminClient';

export const AdminSettlementManagementPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ALL';

  const [activeTab, setActiveTab] = useState<'PAYOUTS' | 'CASH_PAYABLES'>('PAYOUTS');
  const [settlements, setSettlements] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Cash payables state
  const [cashSettlements, setCashSettlements] = useState<any[]>([]);
  const [cashSummary, setCashSummary] = useState<any>(null);
  const [cashStatusFilter, setCashStatusFilter] = useState('ALL');

  const fetchSettlements = async () => {
    try {
      let query = '';
      if (statusFilter !== 'ALL') query += `status=${statusFilter}&`;
      if (roleFilter !== 'ALL') query += `entityRole=${roleFilter}&`;

      const res = await adminApi.get(`/settlements/admin-ledger?${query}`);
      if (res.data.success) {
        setSettlements(res.data.settlements || []);
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to load settlements ledger', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCashPayables = async () => {
    try {
      setLoading(true);
      let query = '';
      if (cashStatusFilter !== 'ALL') query += `status=${cashStatusFilter}&`;

      const res = await adminApi.get(`/settlements/admin-cash-payables?${query}`);
      if (res.data.success) {
        setCashSettlements(res.data.settlements || []);
        setCashSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to load cash payables ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'PAYOUTS') {
      fetchSettlements();
    } else {
      fetchCashPayables();
    }
  }, [activeTab, statusFilter, roleFilter, cashStatusFilter]);

  useEffect(() => {
    if (searchParams.get('status')) {
      setStatusFilter(searchParams.get('status')!);
    }
  }, [searchParams]);

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

  const handleVerifyCashSettlement = async (settlementId: string, currentStatus: string) => {
    const newStatus = window.prompt(
      `Update Platform Payable Status for #${settlementId.substring(0, 8)}:\nOptions: VERIFIED, PAID, DISPUTED, DUE`,
      currentStatus === 'SUBMITTED' ? 'PAID' : 'PAID'
    );
    if (!newStatus) return;

    const upperStatus = newStatus.trim().toUpperCase();
    if (!['DUE', 'SUBMITTED', 'VERIFIED', 'PAID', 'DISPUTED'].includes(upperStatus)) {
      alert('Invalid status. Choose from: DUE, SUBMITTED, VERIFIED, PAID, DISPUTED');
      return;
    }

    const txnRef = window.prompt('Enter Bank/Payment Transaction ID (Optional):', `VERIFY-ADMIN-${Date.now()}`);

    try {
      const res = await adminApi.post(`/settlements/admin-verify-cash/${settlementId}`, {
        status: upperStatus,
        txnReference: txnRef || undefined,
        notes: `Admin manually updated status to ${upperStatus}`,
      });

      if (res.data.success) {
        alert(`Cash settlement updated to ${upperStatus} successfully!`);
        fetchCashPayables();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update cash settlement status');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Settlement & Platform Fee Ledger</h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem' }}>Manage partner payouts and cash payment platform dues</p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('PAYOUTS')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'PAYOUTS' ? '#0284c7' : 'transparent',
              color: activeTab === 'PAYOUTS' ? 'white' : '#64748b',
              transition: 'all 0.2s ease',
            }}
          >
            💳 Partner Payouts (Online)
          </button>
          <button
            onClick={() => setActiveTab('CASH_PAYABLES')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'CASH_PAYABLES' ? '#059669' : 'transparent',
              color: activeTab === 'CASH_PAYABLES' ? 'white' : '#64748b',
              transition: 'all 0.2s ease',
            }}
          >
            💰 Platform Payables (Cash Collections)
          </button>
        </div>
      </div>

      {activeTab === 'PAYOUTS' ? (
        <>
          {/* Payouts KPI Cards */}
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
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              No settlement records found for the selected status.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Settlement #</th>
                  <th>Partner Entity</th>
                  <th>Role</th>
                  <th>Gross</th>
                  <th>Fee (20%)</th>
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
                      <div style={{ fontWeight: 600 }}>{typeof s.entityUserId === 'object' ? (s.entityUserId?.fullName || s.entityUserId?.email) : 'Partner'}</div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{typeof s.entityUserId === 'object' ? s.entityUserId?.phone : 'N/A'}</div>
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
        </>
      ) : (
        <>
          {/* Cash Payables KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #059669' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>TOTAL CASH COLLECTED</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#059669' }}>₹{cashSummary?.totalCashCollected || 0}</h2>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #d97706' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>PLATFORM FEE DUE (CAREPULSE)</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#d97706' }}>₹{cashSummary?.totalPlatformFeeDue || 0}</h2>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>PLATFORM FEE PAID/VERIFIED</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#16a34a' }}>₹{cashSummary?.totalPlatformFeePaid || 0}</h2>
            </div>

            <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>CASH BOOKINGS COUNT</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.25rem', color: '#0284c7' }}>{cashSummary?.count || 0}</h2>
            </div>
          </div>

          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', backgroundColor: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Platform Settlement Status:</span>
              <select value={cashStatusFilter} onChange={(e) => setCashStatusFilter(e.target.value)} className="form-select" style={{ width: '180px' }}>
                <option value="ALL">All Statuses</option>
                <option value="DUE">DUE</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="PAID">PAID</option>
                <option value="DISPUTED">DISPUTED</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>Loading provider cash platform payables...</div>
          ) : cashSettlements.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              No cash platform payables found for the selected status.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Settlement #</th>
                  <th>Provider / Partner</th>
                  <th>Booking Service</th>
                  <th>Gross Cash</th>
                  <th>Platform Fee (20%)</th>
                  <th>Provider Net</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cashSettlements.map((s) => {
                  const statusColors: Record<string, { bg: string; color: string }> = {
                    DUE: { bg: '#fff7ed', color: '#c2410c' },
                    SUBMITTED: { bg: '#eff6ff', color: '#1d4ed8' },
                    VERIFIED: { bg: '#f0fdf4', color: '#15803d' },
                    PAID: { bg: '#f0fdf4', color: '#16a34a' },
                    DISPUTED: { bg: '#fef2f2', color: '#b91c1c' },
                  };
                  const st = statusColors[s.platformSettlementStatus] || { bg: '#f1f5f9', color: '#475569' };

                  return (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 700 }}>#{s.settlementId}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{typeof s.entityUserId === 'object' ? (s.entityUserId?.fullName || s.entityUserId?.email) : 'Provider'}</div>
                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{typeof s.entityUserId === 'object' ? s.entityUserId?.phone : 'N/A'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.bookingId?.serviceId?.name || 'Healthcare Service'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Method: CASH</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>₹{s.cashCollectedByProvider || s.grossAmount}</td>
                      <td style={{ fontWeight: 800, color: '#d97706' }}>₹{s.platformPayableAmount || s.platformFee}</td>
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{s.netEarning}</td>
                      <td>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: st.bg,
                            color: st.color,
                            display: 'inline-block',
                          }}
                        >
                          {s.platformSettlementStatus}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleVerifyCashSettlement(s._id, s.platformSettlementStatus)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                        >
                          Verify / Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};
