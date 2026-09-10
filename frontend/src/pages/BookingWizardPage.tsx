import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ServiceCategory, Service, ServiceMode, EngagementType, ProviderProfile, ClinicProfile, LabProfile } from '../types';
import { Calendar, Clock, MapPin, Check, ArrowRight, Home, Building2, FlaskConical, Repeat, ShieldCheck, AlertCircle, Search, Navigation } from 'lucide-react';

export const BookingWizardPage: React.FC = () => {
  const { serviceId: paramServiceId } = useParams<{ serviceId?: string }>();
  const [searchParams] = useSearchParams();
  
  const queryMode = searchParams.get('mode') as ServiceMode | null;
  const queryClinicId = searchParams.get('clinicId') || '';
  const queryLabId = searchParams.get('labId') || '';
  const queryCategory = searchParams.get('category') || '';

  const { user } = useAuth();
  const navigate = useNavigate();

  // Primary Visit Mode: HOME_VISIT | CLINIC_VISIT | LAB_VISIT
  const [serviceMode, setServiceMode] = useState<ServiceMode>(queryMode || 'HOME_VISIT');

  // Catalog
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(paramServiceId || '');
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Candidate Entities
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [clinics, setClinics] = useState<ClinicProfile[]>([]);
  const [labs, setLabs] = useState<LabProfile[]>([]);
  
  // Search Filters for Clinic & Lab Visits
  const [clinicSearchQuery, setClinicSearchQuery] = useState('');
  const [labSearchQuery, setLabSearchQuery] = useState('');

  // Selected Entity
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedClinicId, setSelectedClinicId] = useState<string>(queryClinicId);
  const [selectedLabId, setSelectedLabId] = useState<string>(queryLabId);

  // Engagement Type & Schedule
  const [engagementType, setEngagementType] = useState<EngagementType>('ONE_TIME');
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [availableSlots, setAvailableSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null);

  // Recurring Config
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [durationWeeks, setDurationWeeks] = useState<number>(2);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 3]);

  // Home Address
  const [addressLine1, setAddressLine1] = useState<string>('123 Healthcare Ave, Flat 4B');
  const [city, setCity] = useState<string>('Metropolis');
  const [state, setState] = useState<string>('State');
  const [pincode, setPincode] = useState<string>('110001');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  // Load Categories & Services Catalog
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const cRes = await api.get('/services/categories');
        const sRes = await api.get('/services');
        const pRes = await api.get('/providers');
        const clRes = await api.get('/clinics');
        const lRes = await api.get('/labs');

        if (cRes.data.success && cRes.data.categories.length > 0) {
          setCategories(cRes.data.categories);
          if (queryCategory) {
            const matchedCat = cRes.data.categories.find((c: ServiceCategory) => c.slug === queryCategory);
            if (matchedCat) setSelectedCategoryId(matchedCat._id);
            else setSelectedCategoryId(cRes.data.categories[0]._id);
          } else {
            setSelectedCategoryId(cRes.data.categories[0]._id);
          }
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

        if (pRes.data.success) setProviders(pRes.data.providers);
        if (clRes.data.success) setClinics(clRes.data.clinics);
        if (lRes.data.success) setLabs(lRes.data.labs);
      } catch (err) {
        console.error('Catalog load error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [paramServiceId, queryCategory]);

  // Handle Mode Change from Top Mode Bar
  const handleModeSwitch = (mode: ServiceMode) => {
    setServiceMode(mode);
    setCurrentStep(1);
    setErrorMsg('');
    if (mode === 'CLINIC_VISIT' && clinics.length > 0 && !selectedClinicId) {
      const cUserId = clinics[0].userId?._id || clinics[0].userId;
      setSelectedClinicId(cUserId);
    }
    if (mode === 'LAB_VISIT' && labs.length > 0 && !selectedLabId) {
      const lUserId = labs[0].userId?._id || labs[0].userId;
      setSelectedLabId(lUserId);
    }
  };

  // Update Selected Service
  useEffect(() => {
    if (selectedServiceId && services.length > 0) {
      const found = services.find((s) => s._id === selectedServiceId);
      if (found) setSelectedService(found);
    }
  }, [selectedServiceId, services]);

  // Fetch Slots
  useEffect(() => {
    const fetchSlots = async () => {
      if (!bookingDate) return;
      try {
        let queryParams = `date=${bookingDate}`;
        let targetEntityUserId = '';

        if (serviceMode === 'HOME_VISIT' && selectedProviderId) {
          targetEntityUserId = selectedProviderId;
        } else if (serviceMode === 'CLINIC_VISIT' && selectedClinicId) {
          targetEntityUserId = selectedClinicId;
        } else if (serviceMode === 'LAB_VISIT' && selectedLabId) {
          targetEntityUserId = selectedLabId;
        }

        if (targetEntityUserId) {
          if (providers.some((p) => (p.userId?._id || p.userId) === targetEntityUserId)) {
            queryParams += `&providerId=${targetEntityUserId}`;
          } else if (clinics.some((c) => (c.userId?._id || c.userId) === targetEntityUserId)) {
            queryParams += `&clinicId=${targetEntityUserId}`;
          } else if (labs.some((l) => (l.userId?._id || l.userId) === targetEntityUserId)) {
            queryParams += `&labId=${targetEntityUserId}`;
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
  }, [bookingDate, selectedProviderId, selectedClinicId, selectedLabId, serviceMode]);

  // Location States
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locSuccessMsg, setLocSuccessMsg] = useState('');
  const [locErrorMsg, setLocErrorMsg] = useState('');

  const handleUseCurrentLocation = (mode?: ServiceMode) => {
    setLocErrorMsg('');
    setLocSuccessMsg('');

    if (!navigator.geolocation) {
      setLocErrorMsg('Geolocation is not supported by your device or browser. Please enter your location manually.');
      return;
    }

    setLocLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserCoords({ latitude: lat, longitude: lng });

        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
            headers: { 'Accept-Language': 'en' },
          });
          const data = await response.json();

          if (data && data.address) {
            const addr = data.address;
            const detectedLine1 = [addr.house_number, addr.road, addr.suburb, addr.neighbourhood]
              .filter(Boolean)
              .join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            const detectedCity = addr.city || addr.town || addr.village || addr.county || addr.suburb || 'Detected City';
            const detectedState = addr.state || 'Detected State';
            const detectedPincode = addr.postcode || pincode || '110001';

            if (mode === 'HOME_VISIT' || serviceMode === 'HOME_VISIT') {
              setAddressLine1(detectedLine1);
              setCity(detectedCity);
              setState(detectedState);
              setPincode(detectedPincode);
            }

            if (mode === 'CLINIC_VISIT' || serviceMode === 'CLINIC_VISIT') {
              setClinicSearchQuery(detectedCity);
            }

            if (mode === 'LAB_VISIT' || serviceMode === 'LAB_VISIT') {
              setLabSearchQuery(detectedCity);
            }

            setLocSuccessMsg(`📍 Location detected: ${detectedCity}, ${detectedState} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          } else {
            setLocSuccessMsg(`📍 GPS Coordinates captured (${lat.toFixed(4)}, ${lng.toFixed(4)}). Please verify or edit details below.`);
          }
        } catch (err) {
          console.warn('Geocoding error:', err);
          setLocSuccessMsg(`📍 GPS Coordinates captured (${lat.toFixed(4)}, ${lng.toFixed(4)}). You can edit address manually.`);
        } finally {
          setLocLoading(false);
        }
      },
      (err) => {
        setLocLoading(false);
        console.warn('Geolocation permission error:', err);
        let msg = 'Could not retrieve location. Please enter your location manually.';
        if (err.code === 1) {
          msg = 'Location permission was denied. Please enter your location manually or grant location access in browser settings.';
        } else if (err.code === 2) {
          msg = 'GPS position unavailable. Please enter your location manually.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please try again or enter location manually.';
        }
        setLocErrorMsg(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate(`/auth/login?redirect=/book?mode=${serviceMode}`);
      return;
    }

    if (!selectedServiceId) {
      setErrorMsg('Please select a service or diagnostic test panel.');
      return;
    }

    if (!selectedSlot) {
      setErrorMsg('Please select an available time slot.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      let finalProviderId: string | undefined = undefined;
      let finalClinicId: string | undefined = undefined;
      let finalLabId: string | undefined = undefined;

      if (serviceMode === 'HOME_VISIT') {
        const isLabTest = selectedService?.categoryId && (typeof selectedService.categoryId === 'object' ? selectedService.categoryId.slug === 'lab-tests' : false);
        if (isLabTest) {
          finalLabId = selectedLabId || (labs.length > 0 ? (labs[0].userId?._id || labs[0].userId) : undefined);
        } else {
          finalProviderId = selectedProviderId || undefined;
        }
      } else if (serviceMode === 'CLINIC_VISIT') {
        finalClinicId = selectedClinicId || (clinics.length > 0 ? (clinics[0].userId?._id || clinics[0].userId) : undefined);
      } else if (serviceMode === 'LAB_VISIT') {
        finalLabId = selectedLabId || (labs.length > 0 ? (labs[0].userId?._id || labs[0].userId) : undefined);
      }

      const payload: any = {
        serviceCategoryId: typeof selectedService!.categoryId === 'object' ? selectedService!.categoryId._id : selectedService!.categoryId,
        serviceId: selectedService!._id,
        serviceMode,
        engagementType,
        providerId: finalProviderId,
        clinicId: finalClinicId,
        labId: finalLabId,
        bookingDate,
        timeSlot: selectedSlot,
        serviceAddress:
          serviceMode === 'HOME_VISIT'
            ? {
                label: 'Home',
                addressLine1,
                city,
                state,
                pincode,
                latitude: userCoords?.latitude,
                longitude: userCoords?.longitude,
              }
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
      setErrorMsg(err.response?.data?.message || 'Failed to submit booking request. Slot may no longer be available.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Loading booking engine...</div>;
  }

  // Filter Services for Selected Category
  const categoryServices = services.filter((s) => {
    const cId = typeof s.categoryId === 'object' ? s.categoryId._id : s.categoryId;
    return cId === selectedCategoryId;
  });

  // Filter Clinics by Search
  const filteredClinics = clinics.filter((c) => {
    if (!clinicSearchQuery.trim()) return true;
    const q = clinicSearchQuery.toLowerCase();
    return c.clinicName.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.addressLine1.toLowerCase().includes(q);
  });

  // Filter Labs by Search
  const filteredLabs = labs.filter((l) => {
    if (!labSearchQuery.trim()) return true;
    const q = labSearchQuery.toLowerCase();
    return l.labName.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || l.addressLine1.toLowerCase().includes(q);
  });

  const basePrice = selectedService?.basePrice || 0;
  const isHomeLabTest = serviceMode === 'HOME_VISIT' && selectedService?.categoryId && (typeof selectedService.categoryId === 'object' ? selectedService.categoryId.slug === 'lab-tests' : false);
  const homeFee = isHomeLabTest ? 150 : 0;
  const totalAmount = basePrice + homeFee;

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '960px' }}>
      {/* Top Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Verified Healthcare Marketplace
        </span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
          Book Healthcare Service
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.4rem' }}>
          Choose your visit mode: <strong>Home Visit</strong>, <strong>Clinic Visit</strong>, or <strong>Lab Visit</strong>
        </p>
      </div>

      {!user && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#92400e', fontSize: '0.9rem' }}>
            <AlertCircle size={20} />
            <span>Please <strong>Log In</strong> or <strong>Register</strong> to submit your booking.</span>
          </div>
          <Link to={`/auth/login?redirect=/book?mode=${serviceMode}`} className="btn btn-primary btn-sm">
            Sign In Now
          </Link>
        </div>
      )}

      {/* TOP-LEVEL 3 VISIT MODES BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2.5rem' }}>
        <button
          type="button"
          onClick={() => handleModeSwitch('HOME_VISIT')}
          style={{
            padding: '1.1rem 0.75rem',
            borderRadius: '16px',
            border: `2px solid ${serviceMode === 'HOME_VISIT' ? 'var(--primary)' : 'var(--border)'}`,
            backgroundColor: serviceMode === 'HOME_VISIT' ? 'var(--primary-light)' : 'white',
            color: serviceMode === 'HOME_VISIT' ? 'var(--primary-dark)' : 'var(--text-main)',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: serviceMode === 'HOME_VISIT' ? '0 4px 12px rgba(2,132,199,0.15)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <Home size={24} color={serviceMode === 'HOME_VISIT' ? 'var(--primary)' : '#64748b'} />
          <span>1. Home Visit</span>
          <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)' }}>Provider Visits Home</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeSwitch('CLINIC_VISIT')}
          style={{
            padding: '1.1rem 0.75rem',
            borderRadius: '16px',
            border: `2px solid ${serviceMode === 'CLINIC_VISIT' ? '#0d9488' : 'var(--border)'}`,
            backgroundColor: serviceMode === 'CLINIC_VISIT' ? '#ccfbf1' : 'white',
            color: serviceMode === 'CLINIC_VISIT' ? '#0f766e' : 'var(--text-main)',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: serviceMode === 'CLINIC_VISIT' ? '0 4px 12px rgba(13,148,136,0.15)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <Building2 size={24} color={serviceMode === 'CLINIC_VISIT' ? '#0d9488' : '#64748b'} />
          <span>2. Clinic Visit</span>
          <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)' }}>Visit Nearby Clinic</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeSwitch('LAB_VISIT')}
          style={{
            padding: '1.1rem 0.75rem',
            borderRadius: '16px',
            border: `2px solid ${serviceMode === 'LAB_VISIT' ? '#0284c7' : 'var(--border)'}`,
            backgroundColor: serviceMode === 'LAB_VISIT' ? '#e0f2fe' : 'white',
            color: serviceMode === 'LAB_VISIT' ? '#0369a1' : 'var(--text-main)',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: serviceMode === 'LAB_VISIT' ? '0 4px 12px rgba(2,132,199,0.15)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <FlaskConical size={24} color={serviceMode === 'LAB_VISIT' ? '#0284c7' : '#64748b'} />
          <span>3. Lab Visit</span>
          <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)' }}>Visit Pathology Lab</span>
        </button>
      </div>

      <div className="card" style={{ padding: '2.5rem' }}>
        {errorMsg && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {errorMsg}
          </div>
        )}

        {/* =========================================================================
            MODE 1: HOME VISIT FLOW
           ========================================================================= */}
        {serviceMode === 'HOME_VISIT' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <Home size={22} color="var(--primary)" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>Home Visit Booking Flow</h2>
            </div>

            {/* Step 1: Select Home Service Category & Sub-Service */}
            {currentStep === 1 && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Step 1: Choose Home Service Category</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {categories.map((cat) => (
                    <div
                      key={cat._id}
                      onClick={() => {
                        setSelectedCategoryId(cat._id);
                        const firstSrv = services.find((s) => {
                          const cId = typeof s.categoryId === 'object' ? s.categoryId._id : s.categoryId;
                          return cId === cat._id;
                        });
                        if (firstSrv) setSelectedServiceId(firstSrv._id);
                      }}
                      style={{
                        padding: '1.1rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${selectedCategoryId === cat._id ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor: selectedCategoryId === cat._id ? 'var(--primary-light)' : 'white',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cat.name}</h4>
                      {cat.slug === 'lab-tests' && (
                        <span style={{ fontSize: '0.725rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700, display: 'inline-block', marginTop: '0.35rem' }}>
                          Home Sample Collection
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Select Specific Service / Diagnostic Panel</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                  {categoryServices.map((srv) => (
                    <div
                      key={srv._id}
                      onClick={() => setSelectedServiceId(srv._id)}
                      style={{
                        padding: '1.1rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${selectedServiceId === srv._id ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor: selectedServiceId === srv._id ? 'var(--primary-light)' : 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{srv.name}</div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', lineHeight: '1.4' }}>{srv.description}</p>
                      <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.1rem', marginTop: '0.5rem' }}>₹{srv.basePrice}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button disabled={!selectedServiceId} onClick={() => setCurrentStep(2)} className="btn btn-primary">
                    Next: Patient Address <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Patient Home Address */}
            {currentStep === 2 && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Step 2: Enter Patient Home Visit Address</h3>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={locLoading}
                    onClick={() => handleUseCurrentLocation('HOME_VISIT')}
                    className="btn btn-outline"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      borderColor: 'var(--primary)',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      backgroundColor: '#e0f2fe',
                    }}
                  >
                    <Navigation size={18} color="var(--primary)" />
                    {locLoading ? 'Detecting GPS Location...' : '📍 Use Current Location'}
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    (Or enter / edit location manually below)
                  </span>
                </div>

                {locSuccessMsg && serviceMode === 'HOME_VISIT' && (
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    {locSuccessMsg}
                  </div>
                )}

                {locErrorMsg && serviceMode === 'HOME_VISIT' && (
                  <div style={{ backgroundColor: '#fffbebf0', border: '1px solid #fde68a', color: '#92400e', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    ⚠️ {locErrorMsg}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Address Line 1</label>
                  <input
                    type="text"
                    required
                    placeholder="Flat/House No, Building Name, Street, Locality"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
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

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button onClick={() => setCurrentStep(1)} className="btn btn-outline">Back</button>
                  <button onClick={() => setCurrentStep(3)} className="btn btn-primary">Next: Select Provider <ArrowRight size={18} /></button>
                </div>
              </div>
            )}

            {/* Step 3: Provider Selection (Specific vs Auto-Assign) */}
            {currentStep === 3 && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
                  Step 3: Select Home Service Professional
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Choose a specific verified professional or let the platform find an available nearby provider automatically.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
                  {/* Option A: Auto-assign */}
                  <div
                    onClick={() => setSelectedProviderId('')}
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${selectedProviderId === '' ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: selectedProviderId === '' ? 'var(--primary-light)' : 'white',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    ⚡ Any Available Verified Professional (Fastest Auto-Assignment)
                  </div>

                  {/* Option B: Specific Provider */}
                  {providers.map((p) => {
                    const entityUserId = p.userId?._id || p.userId;
                    return (
                      <div
                        key={p._id}
                        onClick={() => setSelectedProviderId(entityUserId)}
                        style={{
                          padding: '1.25rem',
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${selectedProviderId === entityUserId ? 'var(--primary)' : 'var(--border)'}`,
                          backgroundColor: selectedProviderId === entityUserId ? 'var(--primary-light)' : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <h4 style={{ fontWeight: 700 }}>{p.fullName}</h4>
                            <span style={{ fontSize: '0.725rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>VERIFIED</span>
                          </div>
                          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {p.qualification} • {p.experienceYears} Yrs Exp • {p.city || 'Available in Location'}
                          </p>
                        </div>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>₹{p.chargesPerSession || basePrice}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button onClick={() => setCurrentStep(2)} className="btn btn-outline">Back</button>
                  <button onClick={() => setCurrentStep(4)} className="btn btn-primary">Next: Schedule Date & Time <ArrowRight size={18} /></button>
                </div>
              </div>
            )}

            {/* Step 4: Date, Slot & Confirmation */}
            {currentStep === 4 && (
              <form onSubmit={handleSubmitBooking}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Step 4: Schedule Date, Time & Finalize</h3>

                <div className="form-group">
                  <label className="form-label">Booking Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
                  <label className="form-label">Available Time Slots for {bookingDate}</label>
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

                <div className="form-group">
                  <label className="form-label">Notes for Healthcare Specialist</label>
                  <textarea rows={2} placeholder="Any specific patient health instructions..." value={notes} onChange={(e) => setNotes(e.target.value)} className="form-textarea" />
                </div>

                {/* Price Breakdown */}
                <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                    <span>Base Service Fee ({selectedService?.name}):</span>
                    <span style={{ fontWeight: 600 }}>₹{basePrice}</span>
                  </div>
                  {isHomeLabTest && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <span>Home Sample Collection Fee:</span>
                      <span style={{ fontWeight: 600 }}>₹150</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.6rem', marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
                    <span>Total Amount Payable:</span>
                    <span style={{ color: 'var(--primary)' }}>₹{totalAmount}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button type="button" onClick={() => setCurrentStep(3)} className="btn btn-outline">Back</button>
                  <button type="submit" disabled={submitting || !selectedSlot} className="btn btn-primary btn-lg">
                    {submitting ? 'Submitting Booking...' : 'CONFIRM HOME VISIT BOOKING'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* =========================================================================
            MODE 2: CLINIC VISIT FLOW
           ========================================================================= */}
        {serviceMode === 'CLINIC_VISIT' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <Building2 size={22} color="#0d9488" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>Clinic Visit Booking Flow</h2>
            </div>

            {/* Step 1: Search & Choose Verified Clinic */}
            {currentStep === 1 && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Step 1: Search & Select Nearby Verified Clinic</h3>
                
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, position: 'relative', minWidth: '240px' }}>
                    <input
                      type="text"
                      placeholder="Search clinics by name, city, or locality..."
                      value={clinicSearchQuery}
                      onChange={(e) => setClinicSearchQuery(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                    <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>

                  <button
                    type="button"
                    disabled={locLoading}
                    onClick={() => handleUseCurrentLocation('CLINIC_VISIT')}
                    className="btn btn-outline"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      borderColor: '#0d9488',
                      color: '#0f766e',
                      backgroundColor: '#ccfbf1',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Navigation size={16} color="#0d9488" />
                    {locLoading ? 'Locating...' : '📍 Use Current Location'}
                  </button>
                </div>

                {locSuccessMsg && serviceMode === 'CLINIC_VISIT' && (
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.65rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    {locSuccessMsg}
                  </div>
                )}

                {locErrorMsg && serviceMode === 'CLINIC_VISIT' && (
                  <div style={{ backgroundColor: '#fffbebf0', border: '1px solid #fde68a', color: '#92400e', padding: '0.65rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    ⚠️ {locErrorMsg}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                  {filteredClinics.map((c) => {
                    const entityUserId = c.userId?._id || c.userId;
                    return (
                      <div
                        key={c._id}
                        onClick={() => setSelectedClinicId(entityUserId)}
                        style={{
                          padding: '1.25rem',
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${selectedClinicId === entityUserId ? '#0d9488' : 'var(--border)'}`,
                          backgroundColor: selectedClinicId === entityUserId ? '#ccfbf1' : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <h4 style={{ fontWeight: 700 }}>🏥 {c.clinicName}</h4>
                            <span style={{ fontSize: '0.725rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>VERIFIED CLINIC</span>
                          </div>
                          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            {c.addressLine1}, {c.city}, {c.state} ({c.pincode})
                          </p>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0d9488', fontSize: '0.9rem' }}>Select Clinic</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button disabled={!selectedClinicId} onClick={() => setCurrentStep(2)} className="btn btn-primary" style={{ backgroundColor: '#0d9488', borderColor: '#0d9488' }}>
                    Next: Choose Clinic Service <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Choose Service Offered at Clinic */}
            {currentStep === 2 && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Step 2: Select Service Offered at Clinic</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                  {services.filter(s => s.serviceModesSupported.includes('CLINIC_VISIT')).map((srv) => (
                    <div
                      key={srv._id}
                      onClick={() => setSelectedServiceId(srv._id)}
                      style={{
                        padding: '1.1rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${selectedServiceId === srv._id ? '#0d9488' : 'var(--border)'}`,
                        backgroundColor: selectedServiceId === srv._id ? '#ccfbf1' : 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{srv.name}</div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', lineHeight: '1.4' }}>{srv.description}</p>
                      <div style={{ color: '#0d9488', fontWeight: 800, fontSize: '1.1rem', marginTop: '0.5rem' }}>₹{srv.basePrice}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button onClick={() => setCurrentStep(1)} className="btn btn-outline">Back</button>
                  <button disabled={!selectedServiceId} onClick={() => setCurrentStep(3)} className="btn btn-primary" style={{ backgroundColor: '#0d9488', borderColor: '#0d9488' }}>
                    Next: Schedule Date & Slot <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Date, Time & Final Confirmation */}
            {currentStep === 3 && (
              <form onSubmit={handleSubmitBooking}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Step 3: Schedule Date, Time & Confirm</h3>

                <div className="form-group">
                  <label className="form-label">Appointment Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
                  <label className="form-label">Available Clinic Time Slots for {bookingDate}</label>
                  {availableSlots.length === 0 ? (
                    <p style={{ color: '#dc2626', fontSize: '0.9rem', padding: '1rem', background: '#fee2e2', borderRadius: '8px' }}>
                      No available slots for this clinic on this date.
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
                            border: `1.5px solid ${selectedSlot?.startTime === slot.startTime ? '#0d9488' : 'var(--border)'}`,
                            backgroundColor: selectedSlot?.startTime === slot.startTime ? '#0d9488' : 'white',
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

                {/* Price Breakdown */}
                <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                    <span>Clinic Consultation Fee ({selectedService?.name}):</span>
                    <span style={{ fontWeight: 600 }}>₹{basePrice}</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.6rem', marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
                    <span>Total Amount Payable:</span>
                    <span style={{ color: '#0d9488' }}>₹{totalAmount}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button type="button" onClick={() => setCurrentStep(2)} className="btn btn-outline">Back</button>
                  <button type="submit" disabled={submitting || !selectedSlot} className="btn btn-primary btn-lg" style={{ backgroundColor: '#0d9488', borderColor: '#0d9488' }}>
                    {submitting ? 'Submitting Booking...' : 'CONFIRM CLINIC BOOKING'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* =========================================================================
            MODE 3: LAB VISIT FLOW
           ========================================================================= */}
        {serviceMode === 'LAB_VISIT' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <FlaskConical size={22} color="#0284c7" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>Lab Center Visit Booking Flow</h2>
            </div>

            {/* Step 1: Search & Choose Verified Lab */}
            {currentStep === 1 && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Step 1: Search & Select Nearby Pathology Lab</h3>
                
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, position: 'relative', minWidth: '240px' }}>
                    <input
                      type="text"
                      placeholder="Search labs by name, city, or locality..."
                      value={labSearchQuery}
                      onChange={(e) => setLabSearchQuery(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                    <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>

                  <button
                    type="button"
                    disabled={locLoading}
                    onClick={() => handleUseCurrentLocation('LAB_VISIT')}
                    className="btn btn-outline"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      borderColor: '#0284c7',
                      color: '#0369a1',
                      backgroundColor: '#e0f2fe',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Navigation size={16} color="#0284c7" />
                    {locLoading ? 'Locating...' : '📍 Use Current Location'}
                  </button>
                </div>

                {locSuccessMsg && serviceMode === 'LAB_VISIT' && (
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.65rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    {locSuccessMsg}
                  </div>
                )}

                {locErrorMsg && serviceMode === 'LAB_VISIT' && (
                  <div style={{ backgroundColor: '#fffbebf0', border: '1px solid #fde68a', color: '#92400e', padding: '0.65rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    ⚠️ {locErrorMsg}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                  {filteredLabs.map((l) => {
                    const entityUserId = l.userId?._id || l.userId;
                    return (
                      <div
                        key={l._id}
                        onClick={() => setSelectedLabId(entityUserId)}
                        style={{
                          padding: '1.25rem',
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${selectedLabId === entityUserId ? '#0284c7' : 'var(--border)'}`,
                          backgroundColor: selectedLabId === entityUserId ? '#e0f2fe' : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <h4 style={{ fontWeight: 700 }}>🧪 {l.labName}</h4>
                            <span style={{ fontSize: '0.725rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>VERIFIED LAB</span>
                          </div>
                          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            {l.addressLine1}, {l.city}, {l.state} ({l.pincode})
                          </p>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.9rem' }}>Select Lab</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button disabled={!selectedLabId} onClick={() => setCurrentStep(2)} className="btn btn-primary" style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}>
                    Next: Select Test Panel <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Select Diagnostic Test Offered by Lab */}
            {currentStep === 2 && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Step 2: Select Diagnostic Test Panel</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                  {services.filter(s => s.serviceModesSupported.includes('LAB_VISIT') || (typeof s.categoryId === 'object' && s.categoryId.slug === 'lab-tests')).map((srv) => (
                    <div
                      key={srv._id}
                      onClick={() => setSelectedServiceId(srv._id)}
                      style={{
                        padding: '1.1rem',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${selectedServiceId === srv._id ? '#0284c7' : 'var(--border)'}`,
                        backgroundColor: selectedServiceId === srv._id ? '#e0f2fe' : 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{srv.name}</div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', lineHeight: '1.4' }}>{srv.description}</p>
                      <div style={{ color: '#0284c7', fontWeight: 800, fontSize: '1.1rem', marginTop: '0.5rem' }}>₹{srv.basePrice}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button onClick={() => setCurrentStep(1)} className="btn btn-outline">Back</button>
                  <button disabled={!selectedServiceId} onClick={() => setCurrentStep(3)} className="btn btn-primary" style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}>
                    Next: Schedule Date & Slot <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Date, Time & Final Confirmation */}
            {currentStep === 3 && (
              <form onSubmit={handleSubmitBooking}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Step 3: Schedule Date, Time & Confirm</h3>

                <div className="form-group">
                  <label className="form-label">Lab Visit Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
                  <label className="form-label">Available Lab Time Slots for {bookingDate}</label>
                  {availableSlots.length === 0 ? (
                    <p style={{ color: '#dc2626', fontSize: '0.9rem', padding: '1rem', background: '#fee2e2', borderRadius: '8px' }}>
                      No available slots for this lab on this date.
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
                            border: `1.5px solid ${selectedSlot?.startTime === slot.startTime ? '#0284c7' : 'var(--border)'}`,
                            backgroundColor: selectedSlot?.startTime === slot.startTime ? '#0284c7' : 'white',
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

                {/* Price Breakdown */}
                <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                    <span>Diagnostic Test Panel Fee ({selectedService?.name}):</span>
                    <span style={{ fontWeight: 600 }}>₹{basePrice}</span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.6rem', marginTop: '0.6rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
                    <span>Total Amount Payable:</span>
                    <span style={{ color: '#0284c7' }}>₹{totalAmount}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button type="button" onClick={() => setCurrentStep(2)} className="btn btn-outline">Back</button>
                  <button type="submit" disabled={submitting || !selectedSlot} className="btn btn-primary btn-lg" style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}>
                    {submitting ? 'Submitting Booking...' : 'CONFIRM LAB VISIT BOOKING'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
