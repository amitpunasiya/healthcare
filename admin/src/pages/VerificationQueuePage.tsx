import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminClient';
import { CheckCircle, XCircle, FileText, Eye, AlertTriangle, ShieldCheck, Filter } from 'lucide-react';

export const VerificationQueuePage: React.FC = () => {
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Rejection Modal
  const [rejectionModalUser, setRejectionModalUser] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Document Inspection Modal State
  const [selectedDocModal, setSelectedDocModal] = useState<{ docId: string; docType: string; originalName?: string; mimeType?: string } | null>(null);
  const [docRejectReason, setDocRejectReason] = useState('');

  const fetchPendingQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.get('/verifications/pending');
      if (res.data.success) {
        setPendingList(res.data.pendingVerifications || []);
      }
    } catch (err: any) {
      console.error('Failed to load pending queue', err);
      setError(err.response?.data?.message || 'Failed to load pending verification queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingQueue();
  }, []);

  const handleApproveUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to VERIFY and approve this healthcare account?')) return;
    try {
      const res = await adminApi.patch(`/verifications/${userId}`, {
        status: 'VERIFIED',
      });
      if (res.data.success) {
        alert('Healthcare account verified and approved successfully!');
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

  const handleVerifyDocument = async (docId: string, status: 'VERIFIED' | 'REJECTED', reason?: string) => {
    try {
      const res = await adminApi.post(`/admin/verify-document/${docId}`, {
        status,
        rejectionReason: reason,
      });
      if (res.data.success) {
        alert(`Document ${status === 'VERIFIED' ? 'verified' : 'rejected'} successfully!`);
        setSelectedDocModal(null);
        setDocRejectReason('');
        fetchPendingQueue();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Document verification update failed');
    }
  };

  const filteredQueue = pendingList.filter((item) => {
    if (categoryFilter === 'ALL') return true;

    const role = item.user?.role;
    const catName = (item.profile?.category?.name || '').toLowerCase();
    const catSlug = (item.profile?.category?.slug || '').toLowerCase();

    if (categoryFilter === 'LAB_TEST') return role === 'LAB';
    if (categoryFilter === 'PHYSIOTHERAPY') return catSlug.includes('physio') || catName.includes('physio');
    if (categoryFilter === 'OCCUPATIONAL_THERAPY') return catSlug.includes('occupational') || catName.includes('occupational');
    if (categoryFilter === 'ELDER_CARE') return catSlug.includes('elder') || catSlug.includes('adult') || catName.includes('elder') || catName.includes('adult');

    return true;
  });

  const renderDocBadge = (docObj: any, label: string) => {
    if (!docObj) {
      return (
        <div style={{ padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '0.785rem', color: '#64748b' }}>
          📄 {label}: <em style={{ color: '#94a3b8' }}>Not Provided</em>
        </div>
      );
    }

    const docId = typeof docObj === 'object' ? docObj._id : docObj;
    const docStatus = typeof docObj === 'object' ? docObj.status : 'UNDER_REVIEW';
    const docName = typeof docObj === 'object' ? docObj.originalName || label : label;
    const isRejected = docStatus === 'REJECTED';
    const isVerified = docStatus === 'VERIFIED';

    return (
      <div
        key={docId}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.6rem 0.85rem',
          backgroundColor: isVerified ? '#f0fdf4' : isRejected ? '#fef2f2' : '#eff6ff',
          border: `1px solid ${isVerified ? '#bbf7d0' : isRejected ? '#fca5a5' : '#bfdbfe'}`,
          borderRadius: '10px',
          fontSize: '0.8rem',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
          <FileText size={16} color={isVerified ? '#16a34a' : isRejected ? '#dc2626' : '#2563eb'} />
          <span style={{ fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '160px' }}>
            {label} ({docName})
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '0.675rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '6px',
              backgroundColor: isVerified ? '#dcfce7' : isRejected ? '#fee2e2' : '#dbeafe',
              color: isVerified ? '#15803d' : isRejected ? '#b91c1c' : '#1e40af',
            }}
          >
            {docStatus}
          </span>
          <button
            type="button"
            onClick={() => setSelectedDocModal({ docId, docType: label, originalName: docName })}
            className="btn btn-outline btn-sm"
            style={{ padding: '2px 6px', fontSize: '0.725rem', borderRadius: '4px' }}
          >
            <Eye size={12} /> Inspect
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Category-Wise Document Verification Queue</h1>
          <p style={{ color: '#64748b', marginTop: '0.2rem' }}>
            Inspect education degrees, identity docs, lab certificates & approve eligible healthcare applicants
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '10px' }}>
          <button onClick={() => setCategoryFilter('ALL')} style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer', backgroundColor: categoryFilter === 'ALL' ? '#0284c7' : 'transparent', color: categoryFilter === 'ALL' ? 'white' : '#64748b' }}>
            All Categories ({pendingList.length})
          </button>
          <button onClick={() => setCategoryFilter('PHYSIOTHERAPY')} style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer', backgroundColor: categoryFilter === 'PHYSIOTHERAPY' ? '#0284c7' : 'transparent', color: categoryFilter === 'PHYSIOTHERAPY' ? 'white' : '#64748b' }}>
            Physiotherapy
          </button>
          <button onClick={() => setCategoryFilter('OCCUPATIONAL_THERAPY')} style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer', backgroundColor: categoryFilter === 'OCCUPATIONAL_THERAPY' ? '#0284c7' : 'transparent', color: categoryFilter === 'OCCUPATIONAL_THERAPY' ? 'white' : '#64748b' }}>
            Occupational Therapy
          </button>
          <button onClick={() => setCategoryFilter('LAB_TEST')} style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer', backgroundColor: categoryFilter === 'LAB_TEST' ? '#0284c7' : 'transparent', color: categoryFilter === 'LAB_TEST' ? 'white' : '#64748b' }}>
            Lab Test
          </button>
          <button onClick={() => setCategoryFilter('ELDER_CARE')} style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer', backgroundColor: categoryFilter === 'ELDER_CARE' ? '#0284c7' : 'transparent', color: categoryFilter === 'ELDER_CARE' ? 'white' : '#64748b' }}>
            Elder Care
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading document verification queue...</div>
      ) : error ? (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '2rem', borderRadius: '12px', textAlign: 'center', color: '#991b1b' }}>
          <p style={{ fontWeight: 600, marginBottom: '1rem' }}>⚠️ {error}</p>
          <button onClick={fetchPendingQueue} className="btn btn-outline" style={{ borderColor: '#fca5a5', color: '#991b1b' }}>
            Retry Loading Queue
          </button>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
          ✨ No pending applications for this category! All accounts verified.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredQueue.map((item) => {
            const u = item.user;
            const p = item.profile || {};
            const isLab = u.role === 'LAB';

            return (
              <div key={u._id} className="card" style={{ padding: '1.5rem', borderRadius: '16px', backgroundColor: 'white', border: '1px solid #cbd5e1' }}>
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                      <span className="badge badge-pending" style={{ fontWeight: 800 }}>{u.role}</span>
                      {p.category?.name && (
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '999px' }}>
                          Category: {p.category.name}
                        </span>
                      )}
                    </div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {p.fullName || p.labName || p.clinicName || 'Applicant'}
                    </h2>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                      📧 {u.email} | 📞 {u.phone} | Registered: {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button onClick={() => handleApproveUser(u._id)} className="btn btn-success" style={{ fontWeight: 800 }}>
                      <CheckCircle size={16} /> Verify & Approve Account
                    </button>
                    <button onClick={() => setRejectionModalUser(item)} className="btn btn-danger" style={{ fontWeight: 800 }}>
                      <XCircle size={16} /> Reject Account
                    </button>
                  </div>
                </div>

                {/* Body Content - Category Specific Details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                  {/* Left Column: Education & Experience Details */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {isLab ? '🧪 Diagnostic Laboratory Info' : '🎓 Education & Professional Experience'}
                    </h4>

                    {isLab ? (
                      <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div><strong>Lab Name:</strong> {p.labName}</div>
                        <div><strong>License/Cert #:</strong> {p.labCertNumber || 'Not specified'}</div>
                        <div><strong>Owner Name:</strong> {p.ownerFullName || p.contactPerson}</div>
                        <div><strong>DMLT Qualification:</strong> {p.dmltQualification || 'DMLT Practitioner'} (Cert #: {p.dmltCertNumber || 'N/A'})</div>
                        <div><strong>Lab Address:</strong> {p.addressLine1}, {p.city}, {p.district ? `${p.district}, ` : ''}{p.state} - {p.pincode}</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div><strong>College / University:</strong> {p.education?.collegeName || 'N/A'} (Student ID: {p.education?.studentIdNumber || 'N/A'})</div>
                        <div><strong>Course & Status:</strong> {p.education?.courseName || p.qualification} ({p.education?.courseStatus === 'CURRENTLY_STUDYING' ? 'Currently Studying' : 'Completed'})</div>
                        <div><strong>Total Experience:</strong> {p.experienceValue || p.experienceYears || 0} {p.experienceType || 'Years'}</div>
                        {p.isNurse && (
                          <div style={{ color: '#059669', fontWeight: 700 }}>
                            🩺 Certified Nurse (Qualification: {p.nursingDetails?.qualification || 'N/A'}, Reg #: {p.nursingDetails?.registrationNumber || 'N/A'})
                          </div>
                        )}

                        {Array.isArray(p.experienceWorkplaces) && p.experienceWorkplaces.length > 0 && (
                          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
                            <strong style={{ fontSize: '0.8rem', color: '#475569' }}>Workplace History:</strong>
                            {p.experienceWorkplaces.map((wp: any, wIdx: number) => (
                              <div key={wIdx} style={{ fontSize: '0.785rem', color: '#334155', marginTop: '0.2rem' }}>
                                • {wp.facilityName} ({wp.fromYear} - {wp.toYear})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Attached Category Documents Grid */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      📁 Mandatory Category Documents ({isLab ? 'Lab & Owner Docs' : 'Identity & Degree Docs'})
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {isLab ? (
                        <>
                          {renderDocBadge(p.labCertDocId, 'Laboratory Registration Certificate')}
                          {renderDocBadge(p.ownerAadhaarDocId, 'Owner Aadhaar Card')}
                          {renderDocBadge(p.ownerPanDocId, 'Owner PAN Card')}
                          {renderDocBadge(p.dmltCertDocId, 'DMLT Qualification Certificate')}
                        </>
                      ) : (
                        <>
                          {p.education?.courseStatus === 'CURRENTLY_STUDYING'
                            ? renderDocBadge(p.studentIdDocId, 'College / Student ID Card')
                            : renderDocBadge(p.degreeDocId, 'Degree / Diploma Certificate')}

                          {renderDocBadge(p.aadhaarDocId, 'Aadhaar Card Document')}
                          {renderDocBadge(p.panDocId, 'PAN Card Document')}

                          {p.isNurse && (
                            <>
                              {renderDocBadge(p.nursingDetails?.degreeDocId, 'Nursing Degree / Diploma')}
                              {renderDocBadge(p.nursingDetails?.registrationDocId, 'Nursing Registration Certificate')}
                            </>
                          )}

                          {Array.isArray(p.experienceWorkplaces) &&
                            p.experienceWorkplaces.map((wp: any, wIdx: number) =>
                              renderDocBadge(wp.certificateDocId, `Workplace #${wIdx + 1} (${wp.facilityName}) Certificate`)
                            )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DOCUMENT INSPECTION & REJECTION MODAL */}
      {selectedDocModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '1.75rem', borderRadius: '16px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText color="#0284c7" size={20} /> Secure Document Inspection
              </h3>
              <button onClick={() => setSelectedDocModal(null)} className="btn btn-outline btn-sm" style={{ borderRadius: '6px' }}>Close</button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
              <div><strong>Document Type:</strong> {selectedDocModal.docType}</div>
              <div><strong>File Name:</strong> {selectedDocModal.originalName || 'Attachment'}</div>
              <div style={{ marginTop: '0.75rem' }}>
                <a
                  href={`${typeof window !== 'undefined' && window.location.hostname ? `http://${window.location.hostname}:5000` : 'http://localhost:5000'}/api/v1/documents/view/${selectedDocModal.docId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  <Eye size={14} /> Open Document Binary Stream (New Tab)
                </a>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.5rem' }}>Admin Document Actions</h4>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => handleVerifyDocument(selectedDocModal.docId, 'VERIFIED')}
                  className="btn btn-success"
                  style={{ flex: 1, fontWeight: 800 }}
                >
                  <CheckCircle size={16} /> Mark Document VERIFIED
                </button>
              </div>

              <div style={{ backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '10px', border: '1px solid #fca5a5' }}>
                <label className="form-label" style={{ color: '#991b1b', fontSize: '0.85rem' }}>Reject Document & Request Re-upload:</label>
                <textarea
                  rows={2}
                  value={docRejectReason}
                  onChange={(e) => setDocRejectReason(e.target.value)}
                  className="form-textarea"
                  placeholder="e.g. Document copy is blurry or unreadable. Please upload a clear original scanned copy."
                  style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => handleVerifyDocument(selectedDocModal.docId, 'REJECTED', docRejectReason)}
                  className="btn btn-danger btn-sm"
                  style={{ width: '100%', fontWeight: 800 }}
                >
                  <XCircle size={14} /> Reject Document with Reason
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT REJECTION MODAL */}
      {rejectionModalUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Reject Application</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
              Specify rejection reason for {rejectionModalUser.profile?.fullName || rejectionModalUser.profile?.labName}:
            </p>

            <form onSubmit={handleRejectSubmit}>
              <div className="form-group">
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="form-textarea"
                  placeholder="e.g. Mandatory degree and identity documents missing or invalid."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setRejectionModalUser(null)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-danger">Confirm Account Rejection</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
