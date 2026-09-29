import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminClient';
import { Search, User as UserIcon, MapPin, Calendar, CreditCard, X, ExternalLink, Ban, CheckCircle, AlertTriangle } from 'lucide-react';

export const CustomerManagementPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Block / Unblock Modal State
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState<any | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockActionError, setBlockActionError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let query = `search=${encodeURIComponent(searchQuery)}&`;
      if (statusFilter !== 'ALL') query += `status=${statusFilter}&`;
      const res = await adminApi.get(`/admin/customers?${query}`);
      if (res.data.success) {
        setCustomers(res.data.customers || []);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBlockModal = (customer: any) => {
    setTargetCustomer(customer);
    setIsUnblocking(false);
    setBlockReason('');
    setBlockActionError(null);
    setBlockModalOpen(true);
  };

  const handleOpenUnblockModal = (customer: any) => {
    setTargetCustomer(customer);
    setIsUnblocking(true);
    setBlockReason('');
    setBlockActionError(null);
    setBlockModalOpen(true);
  };

  const handleConfirmBlockAction = async () => {
    if (!targetCustomer) return;
    setBlockSubmitting(true);
    setBlockActionError(null);
    try {
      const targetId = targetCustomer.userId || targetCustomer._id;
      if (isUnblocking) {
        const res = await adminApi.patch(`/admin/users/${targetId}/unblock`, {
          reason: blockReason || 'Unblocked by administrator',
        });
        if (res.data.success) {
          setCustomers((prev) =>
            prev.map((c) =>
              c._id === targetCustomer._id
                ? { ...c, isBlocked: false, blockedAt: null, blockedReason: null }
                : c
            )
          );
          setBlockModalOpen(false);
        }
      } else {
        if (!blockReason.trim()) {
          setBlockActionError('Please enter a valid reason for blocking this user.');
          setBlockSubmitting(false);
          return;
        }
        const res = await adminApi.patch(`/admin/users/${targetId}/block`, {
          reason: blockReason.trim(),
        });
        if (res.data.success) {
          setCustomers((prev) =>
            prev.map((c) =>
              c._id === targetCustomer._id
                ? { ...c, isBlocked: true, blockedAt: new Date().toISOString(), blockedReason: blockReason.trim() }
                : c
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
    fetchCustomers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleOpenDetail = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setLoadingDetail(true);
    setCustomerDetail(null);
    try {
      const res = await adminApi.get(`/admin/customers/${customerId}`);
      if (res.data.success) {
        setCustomerDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to load customer details', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Customer Directory & Accounts</h1>
        <p style={{ color: '#64748b' }}>Complete directory of registered healthcare platform patients and service buyers</p>
      </div>

      {/* Search and Filters Bar */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, minWidth: '240px', display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Search by Name, Phone, Email, City..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
          />
          <button type="submit" className="btn btn-primary">
            <Search size={16} /> Search
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Account Status:</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select" style={{ width: '160px' }}>
            <option value="ALL">All Accounts</option>
            <option value="ACTIVE">Active Users</option>
            <option value="BLOCKED">Blocked Users</option>
            <option value="INACTIVE">Suspended</option>
            <option value="GUEST">Guest Users</option>
          </select>
        </div>
      </form>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading customer directory...</div>
      ) : customers.length === 0 ? (
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
          No customer accounts found matching your query.
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Contact Details</th>
              <th>Location</th>
              <th>Account Status</th>
              <th>Bookings (Total / Done)</th>
              <th>Total Spent</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c._id} style={{ backgroundColor: c.isBlocked ? '#fff1f2' : undefined }}>
                <td style={{ fontWeight: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: c.isBlocked ? '#fecdd3' : '#e0f2fe', color: c.isBlocked ? '#e11d48' : '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {c.fullName ? c.fullName.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div>{c.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>ID: {c._id.substring(0, 10)}...</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{c.phone}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{c.email}</div>
                </td>
                <td>
                  <div>{c.city || 'N/A'}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{c.state ? `${c.state} ${c.pincode ? `- ${c.pincode}` : ''}` : 'India'}</div>
                </td>
                <td>
                  {c.isBlocked ? (
                    <div>
                      <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <Ban size={12} /> BLOCKED
                      </span>
                      {c.blockedReason && (
                        <div style={{ fontSize: '0.73rem', color: '#dc2626', marginTop: '3px', maxWidth: '170px', wordBreak: 'break-word', lineHeight: 1.2 }}>
                          <strong>Reason:</strong> {c.blockedReason}
                        </div>
                      )}
                      {c.blockedAt && (
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                          Blocked: {new Date(c.blockedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  ) : c.isGuest ? (
                    <span className="badge badge-pending">GUEST</span>
                  ) : c.isActive ? (
                    <span className="badge badge-verified">ACTIVE</span>
                  ) : (
                    <span className="badge badge-rejected">SUSPENDED</span>
                  )}
                </td>
                <td>
                  <span style={{ fontWeight: 700, color: '#0284c7' }}>{c.totalBookings}</span> total
                  <span style={{ color: '#16a34a', fontSize: '0.85rem', marginLeft: '0.4rem' }}>({c.completedBookings} done)</span>
                </td>
                <td style={{ fontWeight: 800, color: '#0f172a' }}>₹{c.totalAmountSpent || 0}</td>
                <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => handleOpenDetail(c._id)} className="btn btn-outline btn-sm">
                      <ExternalLink size={14} /> Details
                    </button>
                    {c.isBlocked ? (
                      <button
                        onClick={() => handleOpenUnblockModal(c)}
                        className="btn btn-sm"
                        style={{ backgroundColor: '#10b981', color: 'white', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                        title="Unblock User"
                      >
                        <CheckCircle size={13} /> Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenBlockModal(c)}
                        className="btn btn-sm btn-outline"
                        style={{ borderColor: '#ef4444', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                        title="Block User"
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

      {/* Customer Detail Drawer/Modal */}
      {selectedCustomerId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Customer Profile & Booking History</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Account ID: {selectedCustomerId}</p>
              </div>
              <button onClick={() => setSelectedCustomerId(null)} className="btn btn-outline" style={{ padding: '0.4rem' }}>
                <X size={18} />
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>Loading full profile and booking history...</div>
            ) : customerDetail ? (
              <div>
                {/* Profile Overview Card */}
                <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>FULL NAME</span>
                    <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{customerDetail.customer.fullName}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>PHONE</span>
                    <p style={{ fontWeight: 600 }}>{customerDetail.customer.phone}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>EMAIL</span>
                    <p style={{ fontWeight: 600 }}>{customerDetail.customer.email}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>GENDER / DOB</span>
                    <p style={{ fontWeight: 600 }}>{[customerDetail.customer.gender, customerDetail.customer.dob].filter(Boolean).join(' • ') || 'Not specified'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>EMERGENCY CONTACT</span>
                    <p style={{ fontWeight: 600 }}>{customerDetail.customer.emergencyContact || 'N/A'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>ACCOUNT CREATED</span>
                    <p style={{ fontWeight: 600 }}>{new Date(customerDetail.customer.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                {/* Saved Addresses */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={18} color="#0284c7" /> Saved Addresses ({customerDetail.customer.addresses?.length || 0})
                  </h3>
                  {customerDetail.customer.addresses?.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No saved addresses found.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                      {customerDetail.customer.addresses?.map((addr: any, idx: number) => (
                        <div key={idx} style={{ padding: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>{addr.label || 'Home'}</span>
                          <p style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.35rem' }}>{addr.addressLine1}</p>
                          {addr.addressLine2 && <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{addr.addressLine2}</p>}
                          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{addr.city}, {addr.state} - {addr.pincode}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Booking History */}
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={18} color="#0284c7" /> Booking History ({customerDetail.bookings?.length || 0})
                  </h3>
                  {customerDetail.bookings?.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No bookings created yet.</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Booking #</th>
                          <th>Service & Mode</th>
                          <th>Assigned Provider / Lab</th>
                          <th>Date & Slot</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerDetail.bookings.map((b: any) => (
                          <tr key={b._id}>
                            <td style={{ fontWeight: 700 }}>#{b.bookingNumber}</td>
                            <td>
                              <div>{b.serviceId?.name || 'Service'}</div>
                              <span style={{ fontSize: '0.75rem', color: '#0284c7' }}>{b.serviceMode}</span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{b.providerName}</div>
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
              <p style={{ color: '#ef4444' }}>Failed to load customer profile.</p>
            )}
          </div>
        </div>
      )}

      {/* Block / Unblock Confirmation Modal */}
      {blockModalOpen && targetCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '1.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: isUnblocking ? '#d1fae5' : '#fee2e2', color: isUnblocking ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isUnblocking ? <CheckCircle size={22} /> : <Ban size={22} />}
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  {isUnblocking ? 'Unblock Customer Account' : 'Block Customer Account'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  {targetCustomer.fullName} ({targetCustomer.email})
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
                <>Are you sure you want to unblock this user? Their account will be restored, allowing them to log in and book services again.</>
              ) : (
                <>
                  Are you sure you want to block this user? <strong>Blocked users cannot log in, their active sessions are immediately invalidated, and they cannot create new bookings.</strong>
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
                  placeholder="Enter specific violation reason (e.g. Terms violation, payment fraud, abusive behavior)..."
                  className="form-input"
                  style={{ width: '100%', resize: 'vertical', fontSize: '0.85rem' }}
                />
              </div>
            ) : (
              targetCustomer.blockedReason && (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.825rem' }}>
                  <div style={{ color: '#64748b', fontWeight: 600 }}>Previous Block Reason:</div>
                  <div style={{ color: '#dc2626', marginTop: '2px' }}>{targetCustomer.blockedReason}</div>
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
