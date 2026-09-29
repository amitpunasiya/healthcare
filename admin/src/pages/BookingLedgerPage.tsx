import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import adminApi from '../api/adminClient';
import { Eye, Filter, X, ArrowRight, User, Stethoscope, FlaskConical, MapPin } from 'lucide-react';

export const BookingLedgerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSource = searchParams.get('source') || 'ALL';
  const initialStatus = searchParams.get('status') || 'ALL';

  const [bookings, setBookings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState(initialSource);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [modeFilter, setModeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail Modal State
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  const fetchBookings = async () => {
    try {
      const res = await adminApi.get('/bookings');
      if (res.data.success) {
        setBookings(res.data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to load master ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (searchParams.get('source')) setSourceFilter(searchParams.get('source')!);
    if (searchParams.get('status')) setStatusFilter(searchParams.get('status')!);
  }, [searchParams]);

  const filteredBookings = bookings.filter((b) => {
    if (sourceFilter !== 'ALL' && b.bookingSource !== sourceFilter) return false;
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (modeFilter !== 'ALL' && b.serviceMode !== modeFilter) return false;
    if (dateFilter && b.bookingDate !== dateFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = b.bookingNumber?.toLowerCase().includes(q);
      const matchName = b.customerDetails?.name?.toLowerCase().includes(q);
      const matchPhone = b.customerDetails?.phone?.toLowerCase().includes(q);
      const matchService = b.serviceId?.name?.toLowerCase().includes(q);
      if (!matchNumber && !matchName && !matchPhone && !matchService) return false;
    }
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Master Booking Ledger</h1>
        <p style={{ color: '#64748b' }}>Complete audit ledger of all Online & Manual bookings across all healthcare services</p>
      </div>

      {/* Search & Filters Bar */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search Booking ID, Patient, Phone..."
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
            <option value="REQUESTED">REQUESTED</option>
            <option value="SEARCHING">SEARCHING</option>
            <option value="PENDING">PENDING</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="PAYMENT_PENDING">PAYMENT_PENDING</option>
            <option value="PAID">PAID</option>
            <option value="NO_PROVIDER_FOUND">NO_PROVIDER_FOUND</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Mode:</span>
          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="form-select" style={{ width: '140px' }}>
            <option value="ALL">All Modes</option>
            <option value="HOME_VISIT">HOME_VISIT</option>
            <option value="CLINIC_VISIT">CLINIC_VISIT</option>
            <option value="LAB_VISIT">LAB_VISIT</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Date:</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="form-input"
            style={{ width: '150px' }}
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="btn btn-outline btn-sm">Clear</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading master ledger data...</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Booking #</th>
              <th>Source</th>
              <th>Customer</th>
              <th>Service & Mode</th>
              <th>Assigned Fulfillment</th>
              <th>Date & Time</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map((b) => (
              <tr key={b._id}>
                <td style={{ fontWeight: 700 }}>#{b.bookingNumber}</td>
                <td>
                  <span className={`badge ${b.bookingSource === 'MANUAL' ? 'badge-manual' : 'badge-online'}`}>
                    {b.bookingSource}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{b.customerDetails?.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{b.customerDetails?.phone}</div>
                </td>
                <td>
                  <div>{b.serviceId?.name || 'Healthcare Service'}</div>
                  <div style={{ color: '#0284c7', fontSize: '0.8rem' }}>{b.serviceMode}</div>
                </td>
                <td>
                  {b.providerId ? (
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Provider Assigned</span>
                    </div>
                  ) : b.labId ? (
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0284c7' }}>Diagnostic Lab</span>
                    </div>
                  ) : b.clinicId ? (
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b21a8' }}>Medical Clinic</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600 }}>Marketplace Unassigned</span>
                  )}
                </td>
                <td>
                  <div>{b.bookingDate}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{b.timeSlot?.startTime} - {b.timeSlot?.endTime}</div>
                </td>
                <td style={{ fontWeight: 700 }}>₹{b.pricing?.totalAmount}</td>
                <td>
                  <span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span>
                </td>
                <td>
                  <button onClick={() => setSelectedBooking(b)} className="btn btn-outline btn-sm">
                    <Eye size={14} /> Audit Flow
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Booking Relationship Chain Drawer */}
      {selectedBooking && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Booking Audit Lifecycle & Relationship Chain</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Booking #{selectedBooking.bookingNumber}</p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="btn btn-outline" style={{ padding: '0.4rem' }}>
                <X size={18} />
              </button>
            </div>

            {/* Relationship Chain Diagram */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.75rem' }}>FULFILLMENT RELATIONSHIP CHAIN</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.85rem', fontWeight: 700 }}>
                <div style={{ background: 'white', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <User size={16} color="#0284c7" /> {selectedBooking.customerDetails?.name} (Customer)
                </div>
                <ArrowRight size={16} color="#94a3b8" />
                <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  #{selectedBooking.bookingNumber} ({selectedBooking.serviceMode})
                </div>
                <ArrowRight size={16} color="#94a3b8" />
                <div style={{ background: 'white', padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Stethoscope size={16} color="#16a34a" />
                  {selectedBooking.providerId ? 'Assigned Provider' : selectedBooking.labId ? 'Diagnostic Lab' : 'Marketplace Broadcast'}
                </div>
              </div>
            </div>

            {/* Detailed Specs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>SERVICE NAME</span>
                <p style={{ fontWeight: 700, marginTop: '0.2rem' }}>{selectedBooking.serviceId?.name || 'Healthcare Service'}</p>
              </div>

              <div style={{ padding: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>PRICING BREAKDOWN</span>
                <p style={{ fontWeight: 700, color: '#0284c7', marginTop: '0.2rem' }}>Total: ₹{selectedBooking.pricing?.totalAmount}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Base: ₹{selectedBooking.pricing?.baseFee} • Collection: ₹{selectedBooking.pricing?.homeCollectionFee || 0}</p>
              </div>

              <div style={{ padding: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>BOOKING DATE & TIME</span>
                <p style={{ fontWeight: 700, marginTop: '0.2rem' }}>{selectedBooking.bookingDate}</p>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedBooking.timeSlot?.startTime} - {selectedBooking.timeSlot?.endTime}</p>
              </div>

              <div style={{ padding: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>PAYMENT STATUS</span>
                <p style={{ fontWeight: 700, color: selectedBooking.paymentStatus === 'PAID' ? '#16a34a' : '#d97706', marginTop: '0.2rem' }}>
                  {selectedBooking.paymentStatus || 'PENDING'}
                </p>
              </div>
            </div>

            {/* Destination Address */}
            {selectedBooking.serviceAddress && (
              <div style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: 'white', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={14} color="#0284c7" /> SERVICE DESTINATION ADDRESS
                </span>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.35rem' }}>
                  {[selectedBooking.serviceAddress.houseNumber, selectedBooking.serviceAddress.buildingName, selectedBooking.serviceAddress.street, selectedBooking.serviceAddress.addressLine1].filter(Boolean).join(', ')}
                </p>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {[selectedBooking.serviceAddress.area, selectedBooking.serviceAddress.city, selectedBooking.serviceAddress.state].filter(Boolean).join(', ')} - {selectedBooking.serviceAddress.pincode}
                </p>
              </div>
            )}

            {/* Audit Status History */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>Audit Status Log History</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedBooking.statusHistory?.map((hist: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.85rem', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 700 }} className={`badge badge-${hist.status.toLowerCase()}`}>{hist.status}</span>
                    <span style={{ color: '#64748b' }}>{new Date(hist.timestamp).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
