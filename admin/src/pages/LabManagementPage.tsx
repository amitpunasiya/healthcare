import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminClient';
import { Search, FlaskConical, CheckCircle, XCircle, Ban, RefreshCw, X, ExternalLink, MapPin, Calendar, Clock } from 'lucide-react';

export const LabManagementPage: React.FC = () => {
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [verifFilter, setVerifFilter] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [labDetail, setLabDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Rejection modal
  const [rejectionModalUser, setRejectionModalUser] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Block / Unblock Modal state
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [targetLab, setTargetLab] = useState<any | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockActionError, setBlockActionError] = useState<string | null>(null);

  const fetchLabs = async () => {
    setLoading(true);
    try {
      let query = `search=${encodeURIComponent(searchQuery)}&`;
      if (verifFilter !== 'ALL') query += `verificationStatus=${verifFilter}&`;
      if (activeFilter === 'BLOCKED') {
        query += `status=BLOCKED&`;
      } else if (activeFilter !== 'ALL') {
        query += `isActive=${activeFilter === 'ACTIVE'}&`;
      }

      const res = await adminApi.get(`/admin/labs?${query}`);
      if (res.data.success) {
        setLabs(res.data.labs || []);
      }
    } catch (err) {
      console.error('Failed to load diagnostic labs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBlockModal = (lab: any) => {
    setTargetLab(lab);
    setIsUnblocking(false);
    setBlockReason('');
    setBlockActionError(null);
    setBlockModalOpen(true);
  };

  const handleOpenUnblockModal = (lab: any) => {
    setTargetLab(lab);
    setIsUnblocking(true);
    setBlockReason('');
    setBlockActionError(null);
    setBlockModalOpen(true);
  };

  const handleConfirmBlockAction = async () => {
    if (!targetLab) return;
    setBlockSubmitting(true);
    setBlockActionError(null);
    try {
      const targetId = targetLab.userId || targetLab._id;
      if (isUnblocking) {
        const res = await adminApi.patch(`/admin/users/${targetId}/unblock`, {
          reason: blockReason || 'Unblocked by administrator',
        });
        if (res.data.success) {
          setLabs((prev) =>
            prev.map((l) =>
              l._id === targetLab._id
                ? { ...l, isBlocked: false, blockedAt: null, blockedReason: null }
                : l
            )
          );
          setBlockModalOpen(false);
        }
      } else {
        if (!blockReason.trim()) {
          setBlockActionError('Please enter a valid reason for blocking this lab.');
          setBlockSubmitting(false);
          return;
        }
        const res = await adminApi.patch(`/admin/users/${targetId}/block`, {
          reason: blockReason.trim(),
        });
        if (res.data.success) {
          setLabs((prev) =>
            prev.map((l) =>
              l._id === targetLab._id
                ? { ...l, isBlocked: true, blockedAt: new Date().toISOString(), blockedReason: blockReason.trim() }
                : l
            )
          );
          setBlockModalOpen(false);
        }
      }
    } catch (err: any) {
      setBlockActionError(err.response?.data?.message || 'Block action failed. Please try again.');
    } finally {
      setBlockSubmitting(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, [verifFilter, activeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLabs();
  };

  const handleOpenDetail = async (labId: string) => {
    setSelectedLabId(labId);
    setLoadingDetail(true);
    setLabDetail(null);
    try {
      const res = await adminApi.get(`/admin/labs/${labId}`);
      if (res.data.success) {
        setLabDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to load lab detail', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const res = await adminApi.patch(`/verifications/${userId}`, {
        status: 'VERIFIED',
      });
      if (res.data.success) {
        alert('Lab diagnostic center verified successfully!');
        fetchLabs();
        if (selectedLabId === userId) handleOpenDetail(userId);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalUser) return;
    try {
      const res = await adminApi.patch(`/verifications/${rejectionModalUser._id || rejectionModalUser.userId}`, {
        status: 'REJECTED',
        rejectionReason,
      });
      if (res.data.success) {
        setRejectionModalUser(null);
        setRejectionReason('');
        fetchLabs();
        if (selectedLabId) setSelectedLabId(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rejection failed');
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      const res = await adminApi.patch(`/admin/labs/${userId}/status`);
      if (res.data.success) {
        alert(res.data.message);
        fetchLabs();
        if (selectedLabId === userId) handleOpenDetail(userId);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Status update failed');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Diagnostic Labs Directory</h1>
        <p style={{ color: '#64748b' }}>Manage diagnostic centers, verify clinical pathology licenses, and inspect test orders</p>
      </div>

      {/* Search and Filters Bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, minWidth: '240px', display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Search Lab Name, Director, Phone, City..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
          />
          <button type="submit" className="btn btn-primary">
            <Search size={16} /> Search
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Verification:</span>
          <select value={verifFilter} onChange={(e) => setVerifFilter(e.target.value)} className="form-select" style={{ width: '160px' }}>
            <option value="ALL">All Statuses</option>
            <option value="PENDING_VERIFICATION">Pending Approval</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Account:</span>
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="form-select" style={{ width: '150px' }}>
            <option value="ALL">All Accounts</option>
            <option value="ACTIVE">Active</option>
            <option value="BLOCKED">Blocked</option>
            <option value="INACTIVE">Suspended</option>
          </select>
        </div>
      </form>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading diagnostic labs...</div>
      ) : labs.length === 0 ? (
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
          No diagnostic lab centers found matching your query.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Diagnostic Lab Name</th>
              <th>Contact Person</th>
              <th>Phone & Email</th>
              <th>Address / City</th>
              <th>Collection Fees</th>
              <th>Verification</th>
              <th>Account</th>
              <th>Total Orders</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {labs.map((l) => (
              <tr key={l._id} style={{ backgroundColor: l.isBlocked ? '#fff1f2' : undefined }}>
                <td style={{ fontWeight: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: l.isBlocked ? '#fecdd3' : '#e0f2fe', color: l.isBlocked ? '#e11d48' : '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FlaskConical size={20} />
                    </div>
                    <div>
                      <div>{l.labName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{l.testsOffered?.length || 0} Pathology Panels</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontWeight: 600 }}>{l.contactPerson}</td>
                <td>
                  <div>{l.phone}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{l.email}</div>
                </td>
                <td>
                  <div>{l.addressLine1}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{l.city}, {l.state} - {l.pincode}</div>
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: '#0284c7' }}>₹{l.homeCollectionFee || 150}</span>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Home Collection</div>
                </td>
                <td>
                  {l.verificationStatus === 'VERIFIED' ? (
                    <span className="badge badge-verified">VERIFIED</span>
                  ) : l.verificationStatus === 'REJECTED' ? (
                    <span className="badge badge-rejected">REJECTED</span>
                  ) : (
                    <span className="badge badge-pending">PENDING</span>
                  )}
                </td>
                <td>
                  {l.isBlocked ? (
                    <div>
                      <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <Ban size={12} /> BLOCKED
                      </span>
                      {l.blockedReason && (
                        <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '3px', maxWidth: '160px', wordBreak: 'break-word', lineHeight: 1.2 }}>
                          <strong>Reason:</strong> {l.blockedReason}
                        </div>
                      )}
                      {l.blockedAt && (
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                          Blocked: {new Date(l.blockedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  ) : l.isActive ? (
                    <span className="badge badge-verified">ACTIVE</span>
                  ) : (
                    <span className="badge badge-rejected">SUSPENDED</span>
                  )}
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: '#0284c7' }}>{l.totalBookings}</span> total
                  <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>{l.completedBookings} completed</div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => handleOpenDetail(l._id)} className="btn btn-outline btn-sm">
                      <ExternalLink size={14} /> Details
                    </button>
                    {l.isBlocked ? (
                      <button
                        onClick={() => handleOpenUnblockModal(l)}
                        className="btn btn-sm"
                        style={{ backgroundColor: '#10b981', color: 'white', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                        title="Unblock Lab"
                      >
                        <CheckCircle size={13} /> Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenBlockModal(l)}
                        className="btn btn-sm btn-outline"
                        style={{ borderColor: '#ef4444', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                        title="Block Lab"
                      >
                        <Ban size={13} /> Block
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Lab Detail Modal */}
      {selectedLabId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Diagnostic Lab Dossier</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Lab User ID: {selectedLabId}</p>
              </div>
              <button onClick={() => setSelectedLabId(null)} className="btn btn-outline" style={{ padding: '0.4rem' }}>
                <X size={18} />
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>Loading diagnostic lab profile & test orders...</div>
            ) : labDetail ? (
              <div>
                {/* Header Card */}
                <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#0284c7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FlaskConical size={30} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{labDetail.lab.labName}</h3>
                      <p style={{ color: '#0284c7', fontWeight: 700, fontSize: '0.9rem' }}>
                        Director/Contact: {labDetail.lab.contactPerson}
                      </p>
                      <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        📞 {labDetail.lab.phone} • ✉️ {labDetail.lab.email}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {labDetail.lab.verificationStatus !== 'VERIFIED' && (
                      <button onClick={() => handleApprove(labDetail.lab._id)} className="btn btn-success">
                        <CheckCircle size={16} /> Approve Lab
                      </button>
                    )}

                    {labDetail.lab.verificationStatus !== 'REJECTED' && (
                      <button onClick={() => setRejectionModalUser(labDetail.lab)} className="btn btn-danger">
                        <XCircle size={16} /> Reject Application
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleActive(labDetail.lab._id)}
                      className={`btn ${labDetail.lab.isActive ? 'btn-outline' : 'btn-primary'}`}
                    >
                      {labDetail.lab.isActive ? <Ban size={16} color="#ef4444" /> : <RefreshCw size={16} />}
                      {labDetail.lab.isActive ? 'Suspend Lab' : 'Reactivate Lab'}
                    </button>
                  </div>
                </div>

                {/* Specs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: 'white' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>VERIFICATION STATUS</span>
                    <div style={{ marginTop: '0.25rem' }}>
                      <span className={`badge badge-${labDetail.lab.verificationStatus.toLowerCase()}`}>
                        {labDetail.lab.verificationStatus}
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: 'white' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>COLLECTION FEES</span>
                    <p style={{ fontWeight: 800, color: '#0284c7', fontSize: '1.1rem', marginTop: '0.2rem' }}>₹{labDetail.lab.homeCollectionFee} / visit</p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Home Collection: {labDetail.lab.homeSampleCollectionAvailable ? 'YES' : 'NO'}
                    </p>
                  </div>

                  <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: 'white' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>LOCATION ADDRESS</span>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '0.2rem' }}>{labDetail.lab.addressLine1} {labDetail.lab.addressLine2}</p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{labDetail.lab.city}, {labDetail.lab.state} - {labDetail.lab.pincode}</p>
                  </div>
                </div>

                {/* Tests Offered */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>Pathology & Blood Tests Offered ({labDetail.lab.testsOffered?.length || 0})</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {labDetail.lab.testsOffered?.map((t: any) => (
                      <span key={t._id || t} style={{ padding: '4px 10px', borderRadius: '20px', backgroundColor: '#e0f2fe', fontSize: '0.8rem', fontWeight: 600, color: '#0369a1' }}>
                        {t.name || 'Pathology Test'} {t.basePrice ? `(₹${t.basePrice})` : ''}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Test Orders Table */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={16} color="#0284c7" /> Lab Test Bookings ({labDetail.bookings?.length || 0})
                  </h4>
                  {labDetail.bookings?.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No lab orders placed yet.</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Booking #</th>
                          <th>Patient Phone</th>
                          <th>Test Package</th>
                          <th>Date & Slot</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labDetail.bookings.map((b: any) => (
                          <tr key={b._id}>
                            <td style={{ fontWeight: 700 }}>#{b.bookingNumber}</td>
                            <td>
                              <div>{b.customerDetails?.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.customerDetails?.phone}</div>
                            </td>
                            <td>
                              <div>{b.serviceId?.name || 'Lab Test'}</div>
                            </td>
                            <td>
                              <div>{b.bookingDate}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.timeSlot?.startTime} - {b.timeSlot?.endTime}</div>
                            </td>
                            <td style={{ fontWeight: 700 }}>₹{b.pricing?.totalAmount}</td>
                            <td>
                              <span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ color: '#ef4444' }}>Failed to load lab profile details.</p>
            )}
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectionModalUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Reject Lab License Application</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
              State rejection reason for {rejectionModalUser.labName}:
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="form-group">
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="form-textarea"
                  placeholder="e.g. Pathology lab license registration unverified."
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

      {/* Block / Unblock Confirmation Modal */}
      {blockModalOpen && targetLab && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: isUnblocking ? '#d1fae5' : '#fee2e2', color: isUnblocking ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isUnblocking ? <CheckCircle size={22} /> : <Ban size={22} />}
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  {isUnblocking ? 'Unblock Diagnostic Lab' : 'Block Diagnostic Lab'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  {targetLab.labName} ({targetLab.email})
                </p>
              </div>
            </div>

            {blockActionError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.825rem', marginBottom: '1rem' }}>
                {blockActionError}
              </div>
            )}

            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, marginBottom: '1rem' }}>
              {isUnblocking ? (
                <>Are you sure you want to unblock this lab? Their diagnostic center and sample collection services will be restored to the public platform.</>
              ) : (
                <>
                  Are you sure you want to block this lab? <strong>Blocked labs cannot log in, their active sessions are invalidated, they cannot process tests, and they are immediately removed from patient search results.</strong>
                </>
              )}
            </p>

            {!isUnblocking ? (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>
                  Reason for Blocking <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Enter specific violation reason (e.g. Invalid NABL/clinical establishment license, diagnostic report errors)..."
                  className="form-input"
                  style={{ width: '100%', resize: 'vertical', fontSize: '0.85rem' }}
                />
              </div>
            ) : (
              targetLab.blockedReason && (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.825rem' }}>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>Previous Block Reason:</div>
                  <div style={{ color: '#dc2626', marginTop: '2px' }}>{targetLab.blockedReason}</div>
                </div>
              )
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setBlockModalOpen(false)}
                disabled={blockSubmitting}
                className="btn btn-outline"
                style={{ padding: '0.6rem 1.25rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBlockAction}
                disabled={blockSubmitting}
                className="btn"
                style={{
                  padding: '0.6rem 1.25rem',
                  backgroundColor: isUnblocking ? '#10b981' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                }}
              >
                {blockSubmitting
                  ? 'Processing...'
                  : isUnblocking
                  ? 'Confirm Unblock'
                  : 'Confirm Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
