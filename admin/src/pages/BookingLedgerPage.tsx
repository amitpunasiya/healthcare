import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminClient';
import { Eye, Filter } from 'lucide-react';

export const BookingLedgerPage: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      const res = await adminApi.get('/bookings');
      if (res.data.success) {
        setBookings(res.data.bookings);
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
            <option value="PENDING">PENDING</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
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
        <div style={{ padding: '3rem', textAlign: 'center' }}>Loading ledger data...</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Booking #</th>
              <th>Source</th>
              <th>Customer</th>
              <th>Service & Mode</th>
              <th>Date & Time</th>
              <th>Amount</th>
              <th>Status</th>
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
                  <div>{b.serviceId?.name}</div>
                  <div style={{ color: '#0284c7', fontSize: '0.8rem' }}>{b.serviceMode}</div>
                </td>
                <td>
                  <div>{b.bookingDate}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{b.timeSlot?.startTime} - {b.timeSlot?.endTime}</div>
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
  );
};
