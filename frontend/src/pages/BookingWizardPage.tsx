import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ServiceCategory, Service, ServiceMode, EngagementType, ProviderProfile, ClinicProfile, LabProfile } from '../types';
import { Calendar, Clock, MapPin, Check, ArrowRight, Home, Building2, FlaskConical, Repeat, ShieldCheck, AlertCircle } from 'lucide-react';

export const BookingWizardPage: React.FC = () => {
  const { serviceId: paramServiceId } = useParams<{ serviceId?: string }>();
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') as ServiceMode) || 'HOME_VISIT';

  const { user } = useAuth();
  const navigate = useNavigate();

  // Categories & Services Catalog
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(paramServiceId || '');
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Entities
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [clinics, setClinics] = useState<ClinicProfile[]>([]);
  const [labs, setLabs] = useState<LabProfile[]>([]);

  // Wizard State
  const [serviceMode, setServiceMode] = useState<ServiceMode>(initialMode);
  const [engagementType, setEngagementType] = useState<EngagementType>('ONE_TIME');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [availableSlots, setAvailableSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null);

  // Recurring Config State
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [durationWeeks, setDurationWeeks] = useState<number>(2);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 3]); // Default Mon, Wed

  // Address
  const [addressLine1, setAddressLine1] = useState<string>('');
  const [city, setCity] = useState<string>('Metropolis');
  const [state, setState] = useState<string>('State');
  const [pincode, setPincode] = useState<string>('110001');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [currentStep, setCurrentStep] = useState(paramServiceId ? 2 : 1);

  // Load Catalog Categories & Services
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const cRes = await api.get('/services/categories');
        const sRes = await api.get('/services');

        if (cRes.data.success && cRes.data.categories.length > 0) {
          setCategories(cRes.data.categories);
          setSelectedCategoryId(cRes.data.categories[0]._id);
        }
        if (sRes.data.success) {
          setServices(sRes.data.services);
          if (paramServiceId) {
            const found = sRes.data.services.find((s: Service) => s._id === paramServiceId);
            if (found) {
              setSelectedService(found);
              setSelectedServiceId(found._id);
            }
          }
        }
      } catch (err) {
        console.error('Catalog load error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [paramServiceId]);

  // Update selected service object when selectedServiceId changes
  useEffect(() => {
    if (selectedServiceId && services.length > 0) {
      const found = services.find((s) => s._id === selectedServiceId);
      if (found) {
        setSelectedService(found);
        if (found.serviceModesSupported.length > 0) {
          setServiceMode(found.serviceModesSupported[0]);
        }
      }
    }
  }, [selectedServiceId, services]);

  // Fetch Providers, Clinics, Labs matching selected service category
  useEffect(() => {
    const fetchEntities = async () => {
      if (!selectedService) return;
      try {
        const catId = typeof selectedService.categoryId === 'object' ? selectedService.categoryId._id : selectedService.categoryId;
        const pRes = await api.get(`/providers?categoryId=${catId}`);
        if (pRes.data.success) setProviders(pRes.data.providers);

        const cRes = await api.get('/clinics');
        if (cRes.data.success) setClinics(cRes.data.clinics);

        const lRes = await api.get('/labs');
        if (lRes.data.success) setLabs(lRes.data.labs);
      } catch (err) {
        console.error('Failed to load candidate entities', err);
      }
    };
    fetchEntities();
  }, [selectedService]);

  // Fetch Available Slots from Backend Source of Truth
  useEffect(() => {
    const fetchSlots = async () => {
      if (!bookingDate) return;
      try {
        let queryParams = `date=${bookingDate}`;
        if (selectedEntityId) {
          if (providers.some((p) => p.userId._id === selectedEntityId || p.userId === selectedEntityId)) {
            queryParams += `&providerId=${selectedEntityId}`;
          } else if (clinics.some((c) => c.userId._id === selectedEntityId || c.userId === selectedEntityId)) {
            queryParams += `&clinicId=${selectedEntityId}`;
          } else if (labs.some((l) => l.userId._id === selectedEntityId || l.userId === selectedEntityId)) {
            queryParams += `&labId=${selectedEntityId}`;
          }
        }
        const res = await api.get(`/availability/slots?${queryParams}`);
        if (res.data.success) {
          setAvailableSlots(res.data.availableSlots);
          if (res.data.availableSlots.length > 0) {
            setSelectedSlot(res.data.availableSlots[0]);
          } else {
            setSelectedSlot(null);
          }
        }
      } catch (err) {
        console.error('Slot fetch error', err);
      }
    };
    fetchSlots();
  }, [bookingDate, selectedEntityId]);

  const toggleDayOfWeek = (dayNum: number) => {
    if (daysOfWeek.includes(dayNum)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== dayNum));
    } else {
      setDaysOfWeek([...daysOfWeek, dayNum].sort());
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate(`/auth/login?redirect=/book/${selectedServiceId || ''}`);
      return;
    }

    if (!selectedSlot) {
      setErrorMsg('Please select an available time slot.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload: any = {
        serviceCategoryId: typeof selectedService!.categoryId === 'object' ? selectedService!.categoryId._id : selectedService!.categoryId,
        serviceId: selectedService!._id,
        serviceMode,
        engagementType,
        providerId: providers.find((p) => p.userId._id === selectedEntityId || p._id === selectedEntityId)?.userId._id,
        clinicId: clinics.find((c) => c.userId._id === selectedEntityId || c._id === selectedEntityId)?.userId._id,
        labId: labs.find((l) => l.userId._id === selectedEntityId || l._id === selectedEntityId)?.userId._id,
        bookingDate,
        timeSlot: selectedSlot,
        serviceAddress:
          serviceMode === 'HOME_VISIT' || serviceMode === 'LAB_VISIT'
            ? { label: 'Home', addressLine1, city, state, pincode }
            : undefined,
        notes,
      };

      if (engagementType === 'REGULAR_RECURRING') {
        payload.recurringConfig = {
          frequency,
          durationWeeks,
          daysOfWeek: frequency === 'WEEKLY' ? daysOfWeek : undefined,
          preferredTimeSlot: selectedSlot,
        };
      }

      const res = await api.post('/bookings', payload);
      if (res.data.success) {
        navigate(`/booking-success/${res.data.booking._id}`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit booking. Slot may no longer be available.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Loading booking wizard...</div>;
  }

  const categoryServices = services.filter((s) => {
    const catId = typeof s.categoryId === 'object' ? s.categoryId._id : s.categoryId;
    return catId === selectedCategoryId;
  });

  const basePrice = selectedService?.basePrice || 0;
  const homeFee = serviceMode === 'HOME_VISIT' && labs.length > 0 ? 150 : 0;
  const totalAmount = basePrice + homeFee;

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '900px' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Healthcare Appointment & Hiring Engine
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
          {selectedService ? selectedService.name : 'Healthcare Service Booking'}
        </h1>
      </div>

      {!user && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#92400e', fontSize: '0.9rem' }}>
            <AlertCircle size={20} />
            <span>Please <strong>Log In</strong> or <strong>Register</strong> to submit your booking.</span>
          </div>
          <Link to={`/auth/login?redirect=/book/${selectedServiceId || ''}`} className="btn btn-primary btn-sm">
            Sign In Now
          </Link>
        </div>
      )}

      {/* Progress Steps Header */}
      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '2.5rem' }}>
        {[
          { num: 1, label: 'Service' },
          { num: 2, label: 'Mode & Concept' },
          { num: 3, label: 'Provider / Center' },
          { num: 4, label: 'Date & Slot' },
          { num: 5, label: 'Review & Confirm' },
        ].map((step) => (
          <div key={step.num} style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: currentStep >= step.num ? 'var(--primary)' : '#e2e8f0',
                color: currentStep >= step.num ? 'white' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                margin: '0 auto 0.4rem',
                fontSize: '0.9rem',
              }}
            >
              {currentStep > step.num ? <Check size={18} /> : step.num}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: currentStep === step.num ? 700 : 500, color: currentStep === step.num ? 'var(--text-main)' : 'var(--text-muted)' }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '2.5rem' }}>
        {errorMsg && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Step 1: Select Category & Sub-Service */}
        {currentStep === 1 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Step 1: Select Healthcare Category & Service</h3>

            <div className="form-group">
              <label className="form-label">Healthcare Category</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  const firstSrv = services.find((s) => {
                    const cId = typeof s.categoryId === 'object' ? s.categoryId._id : s.categoryId;
                    return cId === e.target.value;
                  });
                  if (firstSrv) setSelectedServiceId(firstSrv._id);
                }}
                className="form-select"
              >
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">Select Specific Service</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                {categoryServices.map((srv) => (
                  <div
                    key={srv._id}
                    onClick={() => setSelectedServiceId(srv._id)}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${selectedServiceId === srv._id ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: selectedServiceId === srv._id ? 'var(--primary-light)' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{srv.name}</div>
                    <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.1rem', marginTop: '0.25rem' }}>₹{srv.basePrice}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
              <button disabled={!selectedServiceId} onClick={() => setCurrentStep(2)} className="btn btn-primary">
                Next: Select Delivery Mode <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Mode & Engagement Concept */}
        {currentStep === 2 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Step 2: Service Delivery Mode & Hiring Concept</h3>

            <div className="form-group">
              <label className="form-label">Supported Service Modes</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {selectedService?.serviceModesSupported.includes('HOME_VISIT') && (
                  <div
                    onClick={() => setServiceMode('HOME_VISIT')}
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${serviceMode === 'HOME_VISIT' ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: serviceMode === 'HOME_VISIT' ? 'var(--primary-light)' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <Home size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                    <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>Home Visit / Collection</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Professional visits patient home</p>
                  </div>
                )}

                {selectedService?.serviceModesSupported.includes('CLINIC_VISIT') && (
                  <div
                    onClick={() => setServiceMode('CLINIC_VISIT')}
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${serviceMode === 'CLINIC_VISIT' ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: serviceMode === 'CLINIC_VISIT' ? 'var(--primary-light)' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <Building2 size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                    <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>Clinic / Center Visit</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Customer visits registered clinic</p>
                  </div>
                )}

                {selectedService?.serviceModesSupported.includes('LAB_VISIT') && (
                  <div
                    onClick={() => setServiceMode('LAB_VISIT')}
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${serviceMode === 'LAB_VISIT' ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: serviceMode === 'LAB_VISIT' ? 'var(--primary-light)' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <FlaskConical size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                    <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>Lab Center Visit</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sample given at pathology center</p>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '2rem' }}>
              <label className="form-label">Booking Hiring Concept</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div
                  onClick={() => setEngagementType('ONE_TIME')}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${engagementType === 'ONE_TIME' ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: engagementType === 'ONE_TIME' ? 'var(--primary-light)' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>One-Time Appointment</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Single visit session or lab collection</p>
                </div>

                <div
                  onClick={() => setEngagementType('REGULAR_RECURRING')}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${engagementType === 'REGULAR_RECURRING' ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: engagementType === 'REGULAR_RECURRING' ? 'var(--primary-light)' : 'white',
                    cursor: 'pointer',
                  }}
                >
                  <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>Personal / Regular Hiring</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recurring daily/weekly sessions plan</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
              <button onClick={() => setCurrentStep(1)} className="btn btn-outline">Back</button>
              <button onClick={() => setCurrentStep(3)} className="btn btn-primary">Next: Select Provider <ArrowRight size={18} /></button>
            </div>
          </div>
        )}

        {/* Step 3: Provider / Clinic / Lab Selection */}
        {currentStep === 3 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              Step 3: Choose Verified {serviceMode === 'CLINIC_VISIT' ? 'Clinic' : serviceMode === 'LAB_VISIT' ? 'Laboratory' : 'Professional or Center'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div
                onClick={() => setSelectedEntityId('')}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${selectedEntityId === '' ? 'var(--primary)' : 'var(--border)'}`,
                  backgroundColor: selectedEntityId === '' ? 'var(--primary-light)' : 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ⚡ Any Available Verified {serviceMode === 'CLINIC_VISIT' ? 'Clinic' : serviceMode === 'LAB_VISIT' ? 'Lab Center' : 'Specialist'} (Fastest Assignment)
              </div>

              {/* Providers List (for HOME_VISIT or CLINIC_VISIT) */}
              {(serviceMode === 'HOME_VISIT' || serviceMode === 'CLINIC_VISIT') &&
                providers.map((p) => {
                  const entityUserId = p.userId?._id || p.userId;
                  return (
                    <div
                      key={p._id}
                      onClick={() => setSelectedEntityId(entityUserId)}
                      style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${selectedEntityId === entityUserId ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor: selectedEntityId === entityUserId ? 'var(--primary-light)' : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <h4 style={{ fontWeight: 700 }}>{p.fullName}</h4>
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>VERIFIED</span>
                        </div>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {p.qualification} • {p.experienceYears} Yrs Exp • {p.city || 'Available in Service Area'}
                        </p>
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>₹{p.chargesPerSession || selectedService?.basePrice}</span>
                    </div>
                  );
                })}

              {/* Clinics List (for CLINIC_VISIT) */}
              {serviceMode === 'CLINIC_VISIT' &&
                clinics.map((c) => {
                  const entityUserId = c.userId?._id || c.userId;
                  return (
                    <div
                      key={c._id}
                      onClick={() => setSelectedEntityId(entityUserId)}
                      style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${selectedEntityId === entityUserId ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor: selectedEntityId === entityUserId ? 'var(--primary-light)' : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <h4 style={{ fontWeight: 700 }}>🏥 {c.clinicName}</h4>
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>VERIFIED CLINIC</span>
                        </div>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {c.addressLine1}, {c.city}, {c.state} • Contact: {c.phone}
                        </p>
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>₹{selectedService?.basePrice}</span>
                    </div>
                  );
                })}

              {/* Labs List (for LAB_VISIT or HOME_VISIT lab tests) */}
              {serviceMode === 'LAB_VISIT' &&
                labs.map((l) => {
                  const entityUserId = l.userId?._id || l.userId;
                  return (
                    <div
                      key={l._id}
                      onClick={() => setSelectedEntityId(entityUserId)}
                      style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${selectedEntityId === entityUserId ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor: selectedEntityId === entityUserId ? 'var(--primary-light)' : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <h4 style={{ fontWeight: 700 }}>🧪 {l.labName}</h4>
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>VERIFIED LAB</span>
                        </div>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {l.addressLine1}, {l.city} • Home Sample Fee: ₹{l.homeCollectionFee}
                        </p>
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>₹{selectedService?.basePrice}</span>
                    </div>
                  );
                })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
              <button onClick={() => setCurrentStep(2)} className="btn btn-outline">Back</button>
              <button onClick={() => setCurrentStep(4)} className="btn btn-primary">Next: Schedule & Date <ArrowRight size={18} /></button>
            </div>
          </div>
        )}

        {/* Step 4: Date, Time & Recurring Configuration */}
        {currentStep === 4 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Step 4: Schedule Date, Time & Recurrence</h3>

            {engagementType === 'REGULAR_RECURRING' && (
              <div style={{ backgroundColor: '#f0fdf4', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0', marginBottom: '2rem' }}>
                <h4 style={{ color: '#15803d', fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Repeat size={18} /> Recurring Hiring Schedule Configurator
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Frequency</label>
                    <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)} className="form-select">
                      <option value="DAILY">Daily (Every Day)</option>
                      <option value="WEEKLY">Weekly (Specific Days)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Plan Duration (Weeks)</label>
                    <select value={durationWeeks} onChange={(e) => setDurationWeeks(Number(e.target.value))} className="form-select">
                      <option value={1}>1 Week Plan</option>
                      <option value={2}>2 Weeks Plan</option>
                      <option value={4}>4 Weeks (1 Month) Plan</option>
                    </select>
                  </div>
                </div>

                {frequency === 'WEEKLY' && (
                  <div className="form-group">
                    <label className="form-label">Select Scheduled Days of Week</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[
                        { num: 1, label: 'Mon' },
                        { num: 2, label: 'Tue' },
                        { num: 3, label: 'Wed' },
                        { num: 4, label: 'Thu' },
                        { num: 5, label: 'Fri' },
                        { num: 6, label: 'Sat' },
                        { num: 0, label: 'Sun' },
                      ].map((day) => (
                        <button
                          key={day.num}
                          type="button"
                          onClick={() => toggleDayOfWeek(day.num)}
                          className={`btn btn-sm ${daysOfWeek.includes(day.num) ? 'btn-primary' : 'btn-outline'}`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.85rem', color: '#166534', backgroundColor: 'white', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #bbf7d0', marginTop: '0.5rem' }}>
                  <strong>Recurring Summary:</strong> {frequency === 'DAILY' ? 'Daily sessions' : `Weekly sessions on selected days`} for {durationWeeks} weeks starting on {bookingDate}.
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Start Date / Booking Date</label>
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">Available Real-Time Time Slots for {bookingDate}</label>

              {availableSlots.length === 0 ? (
                <p style={{ color: '#dc2626', fontSize: '0.9rem', padding: '1rem', background: '#fee2e2', borderRadius: '8px' }}>
                  No available slots for this date. Please pick another date.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {availableSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        padding: '0.65rem 0.5rem',
                        borderRadius: '8px',
                        border: `1.5px solid ${selectedSlot?.startTime === slot.startTime ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor: selectedSlot?.startTime === slot.startTime ? 'var(--primary)' : 'white',
                        color: selectedSlot?.startTime === slot.startTime ? 'white' : 'var(--text-main)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      {slot.startTime} - {slot.endTime}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
              <button onClick={() => setCurrentStep(3)} className="btn btn-outline">Back</button>
              <button disabled={!selectedSlot} onClick={() => setCurrentStep(5)} className="btn btn-primary">
                Next: Address & Confirm <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Address & Review Confirmation */}
        {currentStep === 5 && (
          <form onSubmit={handleSubmitBooking}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Step 5: Address & Final Confirmation</h3>

            {(serviceMode === 'HOME_VISIT' || serviceMode === 'LAB_VISIT') && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Patient Home Visit / Collection Address</h4>
                <div className="form-group">
                  <label className="form-label">Address Line 1</label>
                  <input
                    type="text"
                    required
                    placeholder="House/Flat No, Street, Area"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input type="text" required value={state} onChange={(e) => setState(e.target.value)} className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input type="text" required value={pincode} onChange={(e) => setPincode(e.target.value)} className="form-input" />
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Instructions / Notes for Provider</label>
              <textarea
                rows={2}
                placeholder="Mention any specific patient medical notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-textarea"
              />
            </div>

            {/* Price Summary Breakdown */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '2rem' }}>
              <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '1rem' }}>Pricing Summary</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span>Base Session Fee ({selectedService?.name}):</span>
                <span style={{ fontWeight: 600 }}>₹{basePrice}</span>
              </div>
              {homeFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span>Home Collection Fee:</span>
                  <span style={{ fontWeight: 600 }}>₹{homeFee}</span>
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
                <span>Total Amount per Session:</span>
                <span style={{ color: 'var(--primary)' }}>₹{totalAmount}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button type="button" onClick={() => setCurrentStep(4)} className="btn btn-outline">Back</button>
              <button type="submit" disabled={submitting} className="btn btn-primary btn-lg">
                {submitting ? 'Creating Booking Request...' : 'CONFIRM BOOKING'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
