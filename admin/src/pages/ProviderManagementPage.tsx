import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminClient';
import { Search, ShieldAlert, CheckCircle, XCircle, Ban, RefreshCw, X, ExternalLink, Award, MapPin, DollarSign, Calendar } from 'lucide-react';

interface ProviderManagementPageProps {
  initialCategory?: string; // Optional category override (e.g. 'physiotherapy', 'occupational-therapy', 'elder-care')
  title?: string;
  subtitle?: string;
}

export const ProviderManagementPage: React.FC<ProviderManagementPageProps> = ({
  initialCategory = '',
  title = 'Healthcare Providers Directory',
  subtitle = 'Manage registered specialists, verify credentials, monitor performance, and manage account statuses',
}) => {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(initialCategory || 'ALL');
  const [verifFilter, setVerifFilter] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [providerDetail, setProviderDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Rejection Modal state
  const [rejectionModalUser, setRejectionModalUser] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Block / Unblock Modal state
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [targetProvider, setTargetProvider] = useState<any | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockActionError, setBlockActionError] = useState<string | null>(null);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      let query = `search=${encodeURIComponent(searchQuery)}&`;
      const cat = categoryFilter !== 'ALL' ? categoryFilter : initialCategory;
      if (cat) query += `category=${cat}&`;
      if (verifFilter !== 'ALL') query += `verificationStatus=${verifFilter}&`;
      if (activeFilter === 'BLOCKED') {
        query += `status=BLOCKED&`;
      } else if (activeFilter !== 'ALL') {
        query += `isActive=${activeFilter === 'ACTIVE'}&`;
      }

      const res = await adminApi.get(`/admin/providers?${query}`);
      if (res.data.success) {
        setProviders(res.data.providers || []);
      }
    } catch (err) {
      console.error('Failed to load providers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBlockModal = (p: any) => {
    setTargetProvider(p);
    setIsUnblocking(false);
    setBlockReason('');
    setBlockActionError(null);
    setBlockModalOpen(true);
  };

  const handleOpenUnblockModal = (p: any) => {
    setTargetProvider(p);
    setIsUnblocking(true);
    setBlockReason('');
    setBlockActionError(null);
    setBlockModalOpen(true);
  };

  const handleConfirmBlockAction = async () => {
    if (!targetProvider) return;
    setBlockSubmitting(true);
    setBlockActionError(null);
    try {
      const targetId = targetProvider.userId || targetProvider._id;
      if (isUnblocking) {
        const res = await adminApi.patch(`/admin/users/${targetId}/unblock`, {
          reason: blockReason || 'Unblocked by administrator',
        });
        if (res.data.success) {
          setProviders((prev) =>
            prev.map((p) =>
              p._id === targetProvider._id
                ? { ...p, isBlocked: false, blockedAt: null, blockedReason: null }
                : p
            )
          );
          setBlockModalOpen(false);
        }
      } else {
        if (!blockReason.trim()) {
          setBlockActionError('Please enter a valid reason for blocking this provider.');
          setBlockSubmitting(false);
          return;
        }
        const res = await adminApi.patch(`/admin/users/${targetId}/block`, {
          reason: blockReason.trim(),
        });
        if (res.data.success) {
          setProviders((prev) =>
            prev.map((p) =>
              p._id === targetProvider._id
                ? { ...p, isBlocked: true, blockedAt: new Date().toISOString(), blockedReason: blockReason.trim() }
                : p
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
    fetchProviders();
  }, [categoryFilter, verifFilter, activeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProviders();
  };

  const handleOpenDetail = async (providerId: string) => {
    setSelectedProviderId(providerId);
    setLoadingDetail(true);
    setProviderDetail(null);
    try {
      const res = await adminApi.get(`/admin/providers/${providerId}`);
      if (res.data.success) {
        setProviderDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to load provider details', err);
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
        alert('Provider account verified successfully!');
        fetchProviders();
        if (selectedProviderId === userId) handleOpenDetail(userId);
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
        fetchProviders();
        if (selectedProviderId) setSelectedProviderId(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rejection failed');
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      const res = await adminApi.patch(`/admin/providers/${userId}/status`);
      if (res.data.success) {
        alert(res.data.message);
        fetchProviders();
        if (selectedProviderId === userId) handleOpenDetail(userId);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Status toggle failed');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{title}</h1>
        <p style={{ color: '#64748b' }}>{subtitle}</p>
      </div>

      {/* Search and Filters Bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, minWidth: '220px', display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Search Provider Name, Qualification, Phone, City..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
          />
          <button type="submit" className="btn btn-primary">
            <Search size={16} /> Search
          </button>
        </div>

        {!initialCategory && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Category:</span>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="form-select" style={{ width: '170px' }}>
              <option value="ALL">All Categories</option>
              <option value="physiotherapy">Physiotherapy</option>
              <option value="occupational-therapy">Occupational Therapy</option>
              <option value="elder-care">Adult / Elder Care</option>
            </select>
          </div>
        )}

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
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading provider records...</div>
      ) : providers.length === 0 ? (
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
          No registered healthcare providers found for the selected criteria.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Provider Name</th>
              <th>Category & Qualification</th>
              <th>Experience</th>
              <th>Contact Details</th>
              <th>Location</th>
              <th>Verification</th>
              <th>Account</th>
              <th>Bookings</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p._id} style={{ backgroundColor: p.isBlocked ? '#fff1f2' : undefined }}>
                <td style={{ fontWeight: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {p.photo ? (
                      <img src={p.photo} alt={p.fullName} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: p.isBlocked ? '#fecdd3' : '#fef3c7', color: p.isBlocked ? '#e11d48' : '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {p.fullName ? p.fullName.charAt(0).toUpperCase() : 'P'}
                      </div>
                    )}
                    <div>
                      <div>{p.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>₹{p.chargesPerSession}/session</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.categoryName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.qualification}</div>
                </td>
                <td style={{ fontWeight: 600 }}>{p.experienceYears} yrs</td>
                <td>
                  <div>{p.phone}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{p.email}</div>
                </td>
                <td>
                  <div>{p.city || 'N/A'}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{p.pincode ? `PIN: ${p.pincode}` : 'India'}</div>
                </td>
                <td>
                  {p.verificationStatus === 'VERIFIED' ? (
                    <span className="badge badge-verified">VERIFIED</span>
                  ) : p.verificationStatus === 'REJECTED' ? (
                    <span className="badge badge-rejected">REJECTED</span>
                  ) : (
                    <span className="badge badge-pending">PENDING</span>
                  )}
                </td>
                <td>
                  {p.isBlocked ? (
                    <div>
                      <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <Ban size={12} /> BLOCKED
                      </span>
                      {p.blockedReason && (
                        <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '3px', maxWidth: '160px', wordBreak: 'break-word', lineHeight: 1.2 }}>
                          <strong>Reason:</strong> {p.blockedReason}
                        </div>
                      )}
                      {p.blockedAt && (
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                          Blocked: {new Date(p.blockedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  ) : p.isActive ? (
                    <span className="badge badge-verified">ACTIVE</span>
                  ) : (
                    <span className="badge badge-rejected">SUSPENDED</span>
                  )}
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: '#0284c7' }}>{p.totalBookings}</span> total
                  <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>{p.completedBookings} done</div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => handleOpenDetail(p._id)} className="btn btn-outline btn-sm">
                      <ExternalLink size={14} /> Details
                    </button>
                    {p.isBlocked ? (
                      <button
                        onClick={() => handleOpenUnblockModal(p)}
                        className="btn btn-sm"
                        style={{ backgroundColor: '#10b981', color: 'white', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                        title="Unblock Provider"
                      >
                        <CheckCircle size={13} /> Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenBlockModal(p)}
                        className="btn btn-sm btn-outline"
                        style={{ borderColor: '#ef4444', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                        title="Block Provider"
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

      {/* Detail Drawer / Modal */}
      {selectedProviderId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Healthcare Provider Dossier</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Provider User ID: {selectedProviderId}</p>
              </div>
              <button onClick={() => setSelectedProviderId(null)} className="btn btn-outline" style={{ padding: '0.4rem' }}>
                <X size={18} />
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>Loading full provider file & earnings...</div>
            ) : providerDetail ? (
              <div>
                {/* Main Header Card */}
                <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {providerDetail.provider.photo ? (
                      <img src={providerDetail.provider.photo} alt={providerDetail.provider.fullName} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#0284c7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
                        {providerDetail.provider.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{providerDetail.provider.fullName}</h3>
                      <p style={{ color: '#0284c7', fontWeight: 700, fontSize: '0.9rem' }}>
                        {providerDetail.provider.category?.name || 'Healthcare Specialist'} • {providerDetail.provider.qualification} ({providerDetail.provider.experienceYears} yrs exp)
                      </p>
                      <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        📞 {providerDetail.provider.phone} • ✉️ {providerDetail.provider.email}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {providerDetail.provider.verificationStatus !== 'VERIFIED' && (
                      <button onClick={() => handleApprove(providerDetail.provider._id)} className="btn btn-success">
                        <CheckCircle size={16} /> Approve Credentials
                      </button>
                    )}

                    {providerDetail.provider.verificationStatus !== 'REJECTED' && (
                      <button onClick={() => setRejectionModalUser(providerDetail.provider)} className="btn btn-danger">
                        <XCircle size={16} /> Reject Application
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleActive(providerDetail.provider._id)}
                      className={`btn ${providerDetail.provider.isActive ? 'btn-outline' : 'btn-primary'}`}
                    >
                      {providerDetail.provider.isActive ? <Ban size={16} color="#ef4444" /> : <RefreshCw size={16} />}
                      {providerDetail.provider.isActive ? 'Suspend Account' : 'Reactivate Account'}
                    </button>
                  </div>
                </div>

                {/* Professional Specs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: 'white' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>VERIFICATION STATUS</span>
                    <div style={{ marginTop: '0.25rem' }}>
                      <span className={`badge badge-${providerDetail.provider.verificationStatus.toLowerCase()}`}>
                        {providerDetail.provider.verificationStatus}
                      </span>
                    </div>
                    {providerDetail.provider.rejectionReason && (
                      <p style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: '0.4rem' }}>
                        Reason: {providerDetail.provider.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: 'white' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>SERVICE RATES & MODES</span>
                    <p style={{ fontWeight: 800, color: '#0284c7', fontSize: '1.1rem', marginTop: '0.2rem' }}>₹{providerDetail.provider.chargesPerSession} / session</p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Home Visit: {providerDetail.provider.homeVisitAvailable ? 'YES' : 'NO'} • Clinic Visit: {providerDetail.provider.clinicVisitAvailable ? 'YES' : 'NO'}
                    </p>
                  </div>

                  <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: 'white' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>LOCATION & PINCODE</span>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.2rem' }}>{providerDetail.provider.address || 'Address registered'}</p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{providerDetail.provider.city}, {providerDetail.provider.pincode} • India</p>
                  </div>

                  <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: 'white' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>EARNINGS & PAYOUTS</span>
                    <p style={{ fontWeight: 800, color: '#16a34a', fontSize: '1.1rem', marginTop: '0.2rem' }}>
                      ₹{providerDetail.earningsSummary?.netEarnings || 0} Net
                    </p>
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Gross: ₹{providerDetail.earningsSummary?.grossTotal || 0} • Fee (20%): ₹{providerDetail.earningsSummary?.platformFees || 0}
                    </p>
                  </div>
                </div>

                {/* Services Offered list */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>Offered Services / Treatments</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {providerDetail.provider.servicesOffered?.map((srv: any) => (
                      <span key={srv._id || srv} style={{ padding: '4px 10px', borderRadius: '20px', backgroundColor: '#f1f5f9', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                        {srv.name || 'Treatment Service'}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Booking History Table */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={16} color="#0284c7" /> Patient Appointments History ({providerDetail.bookings?.length || 0})
                  </h4>
                  {providerDetail.bookings?.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No booking records linked to this provider.</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Booking #</th>
                          <th>Customer Phone</th>
                          <th>Service & Mode</th>
                          <th>Date & Slot</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {providerDetail.bookings.map((b: any) => (
                          <tr key={b._id}>
                            <td style={{ fontWeight: 700 }}>#{b.bookingNumber}</td>
                            <td>
                              <div>{b.customerDetails?.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.customerDetails?.phone}</div>
                            </td>
                            <td>
                              <div>{b.serviceId?.name || 'Service'}</div>
                              <span style={{ fontSize: '0.75rem', color: '#0284c7' }}>{b.serviceMode}</span>
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
              <p style={{ color: '#ef4444' }}>Failed to load provider details.</p>
            )}
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectionModalUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Reject Provider Credentials</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
              State the reason for rejecting {rejectionModalUser.fullName || rejectionModalUser.name}:
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="form-group">
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="form-textarea"
                  placeholder="e.g. Council registration certificate expired or unreadable."
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
      {blockModalOpen && targetProvider && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: isUnblocking ? '#d1fae5' : '#fee2e2', color: isUnblocking ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isUnblocking ? <CheckCircle size={22} /> : <Ban size={22} />}
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  {isUnblocking ? 'Unblock Healthcare Provider' : 'Block Healthcare Provider'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  {targetProvider.fullName} ({targetProvider.email})
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
                <>Are you sure you want to unblock this provider? Their account will be restored, making them visible in searches and allowing them to accept bookings.</>
              ) : (
                <>
                  Are you sure you want to block this provider? <strong>Blocked providers cannot log in, their active sessions are invalidated, they cannot accept new bookings, and they are immediately hidden from public directories.</strong>
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
                  placeholder="Enter specific violation reason (e.g. Unverified credentials, patient safety complaint, no-shows)..."
                  className="form-input"
                  style={{ width: '100%', resize: 'vertical', fontSize: '0.85rem' }}
                />
              </div>
            ) : (
              targetProvider.blockedReason && (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.825rem' }}>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>Previous Block Reason:</div>
                  <div style={{ color: '#dc2626', marginTop: '2px' }}>{targetProvider.blockedReason}</div>
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
