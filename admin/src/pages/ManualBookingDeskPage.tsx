import React, { useEffect, useState } from 'react';
import adminApi from '../api/adminClient';
import { Building, User, Calendar, DollarSign, CheckCircle } from 'lucide-react';

export const ManualBookingDeskPage: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);

  // Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceMode, setServiceMode] = useState('HOME_VISIT');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [priceOverride, setPriceOverride] = useState(900);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const cRes = await adminApi.get('/services/categories');
      const sRes = await adminApi.get('/services');
      const pRes = await adminApi.get('/providers');

      if (cRes.data.success) {
        setCategories(cRes.data.categories);
        if (cRes.data.categories.length > 0) setSelectedCatId(cRes.data.categories[0]._id);
      }
      if (sRes.data.success) {
        setServices(sRes.data.services);
        if (sRes.data.services.length > 0) setSelectedServiceId(sRes.data.services[0]._id);
      }
      if (pRes.data.success) setProviders(pRes.data.providers);
    };
    fetchData();
  }, []);

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');

    try {
      const res = await adminApi.post('/bookings/manual', {
        customerName,
        customerPhone,
        customerEmail,
        serviceCategoryId: selectedCatId,
        serviceId: selectedServiceId,
        serviceMode,
        bookingDate,
        timeSlot: { startTime, endTime },
        customPrice: Number(priceOverride),
        notes,
      });

      if (res.data.success) {
        setSuccessMsg(`Manual Booking Created Successfully! Booking Number: #${res.data.booking.bookingNumber}`);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setNotes('');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Manual booking creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Manual Booking Desk</h1>
        <p style={{ color: '#64748b' }}>Create bookings manually for phone calls, walk-in patients, or offline requests</p>
      </div>

      {successMsg && (
        <div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
          <CheckCircle size={24} /> {successMsg}
        </div>
      )}

      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleCreateManualBooking}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            1. Patient Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Customer Name</label>
              <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="form-input" placeholder="Patient Full Name" />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="form-input" placeholder="+1 555-0199" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Optional)</label>
            <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="form-input" placeholder="patient@example.com" />
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '1.5rem 0 1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            2. Service & Delivery Mode
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select value={selectedCatId} onChange={(e) => setSelectedCatId(e.target.value)} className="form-select">
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Sub-Service</label>
              <select value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)} className="form-select">
                {services.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} (Base ₹{s.basePrice})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Service Mode</label>
            <select value={serviceMode} onChange={(e) => setServiceMode(e.target.value)} className="form-select">
              <option value="HOME_VISIT">Home Visit</option>
              <option value="CLINIC_VISIT">Clinic Visit</option>
              <option value="LAB_VISIT">Lab Visit</option>
            </select>
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '1.5rem 0 1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            3. Date, Time & Pricing Override
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Booking Date</label>
              <input type="date" required value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">Price Override (₹)</label>
              <input type="number" required value={priceOverride} onChange={(e) => setPriceOverride(Number(e.target.value))} className="form-input" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Staff Notes / Instructions</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="form-textarea" placeholder="Manual booking notes..." />
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '1rem' }}>
            {submitting ? 'Processing Manual Booking...' : 'Save Manual Booking'}
          </button>
        </form>
      </div>
    </div>
  );
};
