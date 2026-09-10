import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminClient';
import { CheckCircle, XCircle, ShieldAlert } from 'lucide-react';

export const VerificationQueuePage: React.FC = () => {
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionModalUser, setRejectionModalUser] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchPendingQueue = async () => {
    try {
      const res = await adminApi.get('/verifications/pending');
      if (res.data.success) {
        setPendingList(res.data.pendingVerifications);
      }
    } catch (err) {
      console.error('Failed to load pending queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingQueue();
  }, []);

  const handleApprove = async (userId: string) => {
    try {
      const res = await adminApi.patch(`/verifications/${userId}`, {
        status: 'VERIFIED',
      });
      if (res.data.success) {
        alert('Account verified successfully!');
        fetchPendingQueue();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Verification approval failed');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalUser) return;
    try {
      const res = await adminApi.patch(`/verifications/${rejectionModalUser.user._id}`, {
        status: 'REJECTED',
        rejectionReason,
      });
      if (res.data.success) {
        setRejectionModalUser(null);
        setRejectionReason('');
        fetchPendingQueue();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rejection failed');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Provider Verification Queue</h1>
        <p style={{ color: '#64748b' }}>Review qualifications and approve healthcare professionals, clinics, and diagnostic labs</p>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading verification queue...</div>
      ) : pendingList.length === 0 ? (
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
          ✨ No pending verification applications! All providers up-to-date.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Applicant Name / Entity</th>
              <th>Email & Phone</th>
              <th>Details / Qualification</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingList.map((item) => (
              <tr key={item.user._id}>
                <td>
                  <span className="badge badge-pending">{item.user.role}</span>
                </td>
                <td style={{ fontWeight: 700 }}>
                  {item.profile?.fullName || item.profile?.clinicName || item.profile?.labName || 'Applicant'}
                </td>
                <td>
                  <div>{item.user.email}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.user.phone}</div>
                </td>
                <td style={{ fontSize: '0.85rem' }}>
                  {item.user.role === 'PROVIDER' && (
                    <div>{item.profile?.qualification} ({item.profile?.experienceYears} yrs exp)</div>
                  )}
                  {item.user.role === 'CLINIC' && (
                    <div>{item.profile?.addressLine1}, {item.profile?.city}</div>
                  )}
                  {item.user.role === 'LAB' && (
                    <div>{item.profile?.addressLine1}, {item.profile?.city}</div>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleApprove(item.user._id)} className="btn btn-success">
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => setRejectionModalUser(item)} className="btn btn-danger">
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Rejection Reason Modal */}
      {rejectionModalUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Reject Application</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
              Specify rejection reason for {rejectionModalUser.profile?.fullName || rejectionModalUser.profile?.clinicName}:
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="form-group">
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="form-textarea"
                  placeholder="e.g. Invalid medical license documentation submitted."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setRejectionModalUser(null)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-danger">Confirm Rejection</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
