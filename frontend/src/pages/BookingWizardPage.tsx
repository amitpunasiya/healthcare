import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ServiceCategory, Service, ServiceMode, EngagementType, ProviderProfile, ClinicProfile, LabProfile } from '../types';
import { INDIAN_STATES_AND_UTS, parseNominatimAddress, reverseGeocodeLocation, buildReadableAddress, calculateHaversineDistance, lookupIndianPincode } from '../utils/location';
import { LocationMap } from '../components/LocationMap';
import { Calendar, Clock, MapPin, Check, ArrowLeft, ArrowRight, Home, Building2, FlaskConical, AlertCircle, Search, Navigation, Edit2, ShieldCheck, Activity, HeartHandshake, UserCheck, RefreshCw, Lock, LogIn, X } from 'lucide-react';

const DEFAULT_CATEGORIES: ServiceCategory[] = [
  {
    _id: 'cat_physiotherapy',
    name: 'Physiotherapy',
    slug: 'physiotherapy',
    description: 'Physiotherapy home visit',
    iconName: 'Activity',
    displayOrder: 1,
    isActive: true,
  },
  {
    _id: 'cat_occupational_therapy',
    name: 'Occupational Therapy',
    slug: 'occupational-therapy',
    description: 'Occupational therapy home visit',
    iconName: 'HeartHandshake',
    displayOrder: 2,
    isActive: true,
  },
  {
    _id: 'cat_elder_care',
    name: 'Elder Care',
    slug: 'elder-care',
    description: 'Elder / geriatric care at home',
    iconName: 'UserCheck',
    displayOrder: 3,
    isActive: true,
  },
  {
    _id: 'cat_lab_test',
    name: 'Lab Test',
    slug: 'lab-test',
    description: 'Home sample collection',
    iconName: 'FlaskConical',
    displayOrder: 4,
    isActive: true,
  },
];

const DEFAULT_SERVICES: Service[] = [
  // Physiotherapy (ALL ₹450 with 25% discount)
  { _id: 'srv_physio_home', categoryId: 'cat_physiotherapy', name: 'Home Physiotherapy', description: 'Full physiotherapy sessions delivered at your doorstep.', basePrice: 450, originalPrice: 600, discountPercent: 25, durationMinutes: 60, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_physio_geriatric', categoryId: 'cat_physiotherapy', name: 'Geriatric Physiotherapy', description: 'Mobility and strength care for the elderly.', basePrice: 450, originalPrice: 600, discountPercent: 25, durationMinutes: 60, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_physio_pain', categoryId: 'cat_physiotherapy', name: 'Pain Management', description: 'Evidence-based relief for chronic pain.', basePrice: 450, originalPrice: 600, discountPercent: 25, durationMinutes: 45, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_physio_joint_back', categoryId: 'cat_physiotherapy', name: 'Joint & Back Pain', description: 'Targeted therapy for knees, hips and spine.', basePrice: 450, originalPrice: 600, discountPercent: 25, durationMinutes: 60, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_physio_sports', categoryId: 'cat_physiotherapy', name: 'Sports Injury Rehab', description: 'Return-to-play plans for athletes.', basePrice: 450, originalPrice: 600, discountPercent: 25, durationMinutes: 60, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_physio_hand', categoryId: 'cat_physiotherapy', name: 'Hand Therapy', description: 'Fine motor recovery and splinting.', basePrice: 450, originalPrice: 600, discountPercent: 25, durationMinutes: 45, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_physio_balance', categoryId: 'cat_physiotherapy', name: 'Balance & Fall Prevention', description: 'Gait training and balance work.', basePrice: 450, originalPrice: 600, discountPercent: 25, durationMinutes: 50, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },

  // Occupational Therapy (ALL ₹550 with 27% discount)
  { _id: 'srv_ot_general', categoryId: 'cat_occupational_therapy', name: 'Occupational Therapy', description: 'Regain independence in everyday activities.', basePrice: 550, originalPrice: 750, discountPercent: 27, durationMinutes: 60, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_ot_pediatric', categoryId: 'cat_occupational_therapy', name: 'Pediatric Occupational Therapy', description: "Therapy focused on children's developmental and everyday functional skills.", basePrice: 550, originalPrice: 750, discountPercent: 27, durationMinutes: 60, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_ot_hand', categoryId: 'cat_occupational_therapy', name: 'Hand & Fine Motor Therapy', description: 'Improve hand function, coordination and fine motor skills.', basePrice: 550, originalPrice: 750, discountPercent: 27, durationMinutes: 50, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_ot_adl', categoryId: 'cat_occupational_therapy', name: 'Activities of Daily Living Training', description: 'Support independence in dressing, eating, grooming and everyday activities.', basePrice: 550, originalPrice: 750, discountPercent: 27, durationMinutes: 60, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_ot_sensory', categoryId: 'cat_occupational_therapy', name: 'Sensory Integration Therapy', description: 'Support sensory processing, regulation and functional participation.', basePrice: 550, originalPrice: 750, discountPercent: 27, durationMinutes: 60, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_ot_cognitive', categoryId: 'cat_occupational_therapy', name: 'Cognitive & Functional Rehabilitation', description: 'Improve cognitive and functional skills needed for everyday activities.', basePrice: 550, originalPrice: 750, discountPercent: 27, durationMinutes: 60, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },

  // Elder Care
  { _id: 'srv_elder_companion', categoryId: 'cat_elder_care', name: 'Senior Companion & Caregiver', description: 'Assistance with daily living activities (bathing, dressing, meals, mobility, medication reminders).', basePrice: 1100, originalPrice: 1375, discountPercent: 20, durationMinutes: 240, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_elder_nursing', categoryId: 'cat_elder_care', name: 'Geriatric Nursing & Wound Care', description: 'Catheter care, bed sore treatment, IV drip management, and vital checks for elderly patients.', basePrice: 1400, originalPrice: 1750, discountPercent: 20, durationMinutes: 60, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },

  // Lab Test
  { _id: 'srv_lab_fullbody', categoryId: 'cat_lab_test', name: 'Full Body Health Checkup Panel', description: 'Complete blood count, lipid profile, liver function, kidney function, and blood sugar test.', basePrice: 1199, originalPrice: 1499, discountPercent: 20, durationMinutes: 30, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_lab_thyroid', categoryId: 'cat_lab_test', name: 'Thyroid & Diabetes Profile', description: 'TSH, T3, T4, HbA1c, Fasting Blood Sugar test.', basePrice: 799, originalPrice: 999, discountPercent: 20, durationMinutes: 30, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
  { _id: 'srv_lab_cbc', categoryId: 'cat_lab_test', name: 'Complete Blood Count (CBC)', description: 'Essential 24-parameter blood test profile', basePrice: 350, originalPrice: 450, discountPercent: 22, durationMinutes: 15, serviceModesSupported: ['HOME_VISIT'], engagementTypesSupported: ['ONE_TIME'], isActive: true },
];

export const deduplicateCategories = (cats: ServiceCategory[]): ServiceCategory[] => {
  const seen = new Set<string>();
  return cats.filter((cat) => {
    const key = (cat.slug || cat.name).toLowerCase().replace(/s$/, '').replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const BookingWizardPage: React.FC = () => {
  const { serviceId: paramServiceId } = useParams<{ serviceId?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const queryMode = searchParams.get('mode') as ServiceMode | null;
  const queryClinicId = searchParams.get('clinicId') || '';
  const queryLabId = searchParams.get('labId') || '';
  const queryCategory = searchParams.get('category') || '';

  // Active Multi-Screen Step Index (1 to 6)
  // 1: Visit Mode | 2: Category | 3: Specific Service | 4: Location/Address | 5: Specialist/Facility | 6: Schedule & Confirm
  const [step, setStep] = useState<number>(1);

  // Selected Booking State
  const [serviceMode, setServiceMode] = useState<ServiceMode>(queryMode || 'HOME_VISIT');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(paramServiceId || '');
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Lab Visit Sub-purpose: 'LAB_CENTER' | 'HOME_COLLECTION'
  const [labVisitSubMode, setLabVisitSubMode] = useState<'LAB_CENTER' | 'HOME_COLLECTION'>('LAB_CENTER');

  // Candidate Entities
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [clinics, setClinics] = useState<ClinicProfile[]>([]);
  const [labs, setLabs] = useState<LabProfile[]>([]);
  const [clinicSearchQuery, setClinicSearchQuery] = useState('');
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');

  // Selected Entity ID
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedClinicId, setSelectedClinicId] = useState<string>(queryClinicId);
  const [selectedLabId, setSelectedLabId] = useState<string>(queryLabId);

  // Schedule & Slot State
  const [engagementType, setEngagementType] = useState<EngagementType>('ONE_TIME');
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [availableSlots, setAvailableSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [notes, setNotes] = useState<string>('');

  // Structured Address State (Zero Hardcoded Defaults)
  const [houseNumber, setHouseNumber] = useState<string>('');
  const [flatNumber, setFlatNumber] = useState<string>('');
  const [buildingName, setBuildingName] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [addressLine1, setAddressLine1] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [isPincodeLoading, setIsPincodeLoading] = useState<boolean>(false);
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string>('');
  const [pinErrorMsg, setPinErrorMsg] = useState<string>('');

  const handlePincodeChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setPincode(clean);
    setPinErrorMsg('');
    setPinSuccessMsg('');

    if (!clean) {
      setCity('');
      setDistrict('');
      setState('');
      return;
    }

    if (clean.length < 6) {
      setCity('');
      setDistrict('');
      setState('');
      setPinErrorMsg('Invalid PIN code. Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    setIsPincodeLoading(true);
    try {
      const res = await lookupIndianPincode(clean);
      if (res.success) {
        setCity(res.city);
        setDistrict(res.district);
        setState(res.state);
        setPinSuccessMsg(`✓ Location identified: ${res.city}, ${res.state}`);
        setPinErrorMsg('');
      } else {
        setCity('');
        setDistrict('');
        setState('');
        setPinErrorMsg(res.error || 'Location not found for this PIN code. Please check the PIN code and try again.');
      }
    } catch (err) {
      setCity('');
      setDistrict('');
      setState('');
      setPinErrorMsg('Location not found for this PIN code. Please check the PIN code and try again.');
    } finally {
      setIsPincodeLoading(false);
    }
  };

  // Location UI State
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [formattedAddressLines, setFormattedAddressLines] = useState<string[]>([]);
  const [locationChoice, setLocationChoice] = useState<'GPS' | 'MANUAL' | null>(null);
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [locLoading, setLocLoading] = useState(false);
  const [locSuccessMsg, setLocSuccessMsg] = useState('');
  const [locErrorMsg, setLocErrorMsg] = useState('');

  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);

  // Restore saved pending booking state after login/register
  useEffect(() => {
    const savedState = sessionStorage.getItem('pending_booking_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.serviceMode) setServiceMode(parsed.serviceMode);
        if (parsed.selectedCategoryId) setSelectedCategoryId(parsed.selectedCategoryId);
        if (parsed.selectedCategory) setSelectedCategory(parsed.selectedCategory);
        if (parsed.selectedServiceId) setSelectedServiceId(parsed.selectedServiceId);
        if (parsed.selectedService) setSelectedService(parsed.selectedService);
        if (parsed.houseNumber) setHouseNumber(parsed.houseNumber);
        if (parsed.flatNumber) setFlatNumber(parsed.flatNumber);
        if (parsed.buildingName) setBuildingName(parsed.buildingName);
        if (parsed.street) setStreet(parsed.street);
        if (parsed.area) setArea(parsed.area);
        if (parsed.landmark) setLandmark(parsed.landmark);
        if (parsed.district) setDistrict(parsed.district);
        if (parsed.addressLine1) setAddressLine1(parsed.addressLine1);
        if (parsed.city) setCity(parsed.city);
        if (parsed.state) setState(parsed.state);
        if (parsed.pincode) setPincode(parsed.pincode);
        if (parsed.userCoords) setUserCoords(parsed.userCoords);
        if (parsed.selectedProviderId) setSelectedProviderId(parsed.selectedProviderId);
        if (parsed.engagementType) setEngagementType(parsed.engagementType);
        if (parsed.bookingDate) setBookingDate(parsed.bookingDate);
        if (parsed.selectedSlot) setSelectedSlot(parsed.selectedSlot);
        if (parsed.notes) setNotes(parsed.notes);

        if (user) {
          setStep(6);
          sessionStorage.removeItem('pending_booking_state');
        } else {
          setStep(parsed.step || 6);
        }
      } catch (err) {
        console.error('Error parsing saved pending booking state:', err);
      }
    }
  }, [user]);

  // Fetch catalog data from backend API
  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setCatalogError(null);
    try {
      const [cRes, sRes, pRes, clRes, lRes] = await Promise.all([
        api.get('/services/categories'),
        api.get('/services'),
        api.get('/providers'),
        api.get('/clinics'),
        api.get('/labs'),
      ]);

      if (cRes.data.success && Array.isArray(cRes.data.categories) && cRes.data.categories.length > 0) {
        setCategories(deduplicateCategories(cRes.data.categories));
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }

      if (sRes.data.success && Array.isArray(sRes.data.services)) {
        setServices(sRes.data.services);
        if (paramServiceId) {
          const found = sRes.data.services.find((s: Service) => s._id === paramServiceId);
          if (found) {
            setSelectedService(found);
            setSelectedServiceId(found._id);
            const cId = typeof found.categoryId === 'object' ? found.categoryId._id : found.categoryId;
            setSelectedCategoryId(cId);
            const foundCat = (cRes.data.categories || DEFAULT_CATEGORIES).find((c: ServiceCategory) => c._id === cId);
            if (foundCat) setSelectedCategory(foundCat);
            setStep(4);
          }
        }
      }

      if (pRes.data.success) setProviders(pRes.data.providers);
      if (clRes.data.success) setClinics(clRes.data.clinics);
      if (lRes.data.success) setLabs(lRes.data.labs);
    } catch (err: any) {
      console.error('Catalog load error', err);
      setCatalogError('Unable to load healthcare services.');
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, [paramServiceId]);

  // Initial Load
  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const displayCategories = deduplicateCategories(categories.length > 0 ? categories : DEFAULT_CATEGORIES);

  // Synchronize URL path, search parameters & step index
  useEffect(() => {
    const path = location.pathname;

    if (path.startsWith('/book/home') || queryMode === 'HOME_VISIT') {
      setServiceMode('HOME_VISIT');
      const parts = path.replace('/book/home', '').split('/').filter(Boolean);
      const catSlug = parts[0] || queryCategory;

      if (catSlug) {
        const found = displayCategories.find(
          (c) =>
            c.slug === catSlug ||
            c._id === catSlug ||
            c.name.toLowerCase().replace(/\s+/g, '-') === catSlug.toLowerCase() ||
            (catSlug === 'lab-test' && c.slug === 'lab-tests') ||
            (catSlug === 'lab-tests' && c.slug === 'lab-test')
        );

        if (found) {
          setSelectedCategory(found);
          setSelectedCategoryId(found._id);
          setStep((prev) => (prev < 3 ? 3 : prev));
        } else {
          setStep((prev) => (prev < 2 ? 2 : prev));
        }
      } else {
        setStep((prev) => (prev < 2 ? 2 : prev));
      }
    } else if (path.startsWith('/book/clinic') || queryMode === 'CLINIC_VISIT') {
      setServiceMode('HOME_VISIT');
      navigate('/book/home', { replace: true });
    } else if (path.startsWith('/book/lab') || queryMode === 'LAB_VISIT') {
      setServiceMode('HOME_VISIT');
      setStep((prev) => (prev < 2 ? 2 : prev));
    }
  }, [location.pathname, queryMode, queryCategory, displayCategories]);

  // Update selected Category Object
  useEffect(() => {
    if (selectedCategoryId && categories.length > 0) {
      const found = categories.find((c) => c._id === selectedCategoryId);
      if (found) setSelectedCategory(found);
    }
  }, [selectedCategoryId, categories]);

  // Update selected Service Object
  useEffect(() => {
    if (selectedServiceId && services.length > 0) {
      const found = services.find((s) => s._id === selectedServiceId);
      if (found) setSelectedService(found);
    }
  }, [selectedServiceId, services]);

const DEFAULT_FALLBACK_SLOTS = [
  { startTime: '09:00', endTime: '10:00' },
  { startTime: '10:00', endTime: '11:00' },
  { startTime: '11:00', endTime: '12:00' },
  { startTime: '12:00', endTime: '13:00' },
  { startTime: '14:00', endTime: '15:00' },
  { startTime: '15:00', endTime: '16:00' },
  { startTime: '16:00', endTime: '17:00' },
  { startTime: '17:00', endTime: '18:00' },
];

  // Fetch Available Slots for Step 6
  useEffect(() => {
    const fetchSlots = async () => {
      if (!bookingDate) return;
      try {
        let queryParams = `date=${bookingDate}`;
        let targetEntityUserId = '';

        if (selectedProviderId) {
          targetEntityUserId = selectedProviderId;
        } else if (selectedLabId) {
          targetEntityUserId = selectedLabId;
        }

        if (targetEntityUserId) {
          if (providers.some((p) => (p.userId?._id || p.userId) === targetEntityUserId)) {
            queryParams += `&providerId=${targetEntityUserId}`;
          } else if (labs.some((l) => (l.userId?._id || l.userId) === targetEntityUserId)) {
            queryParams += `&labId=${targetEntityUserId}`;
          }
        }

        const res = await api.get(`/availability/slots?${queryParams}`);
        if (res.data.success && Array.isArray(res.data.availableSlots) && res.data.availableSlots.length > 0) {
          setAvailableSlots(res.data.availableSlots);
          setSelectedSlot(res.data.availableSlots[0]);
        } else {
          setAvailableSlots(DEFAULT_FALLBACK_SLOTS);
          setSelectedSlot(DEFAULT_FALLBACK_SLOTS[0]);
        }
      } catch (err) {
        console.error('Slot fetch error, applying standard slots', err);
        setAvailableSlots(DEFAULT_FALLBACK_SLOTS);
        setSelectedSlot(DEFAULT_FALLBACK_SLOTS[0]);
      }
    };
    fetchSlots();
  }, [bookingDate, selectedProviderId, selectedClinicId, selectedLabId, serviceMode]);

  // Dynamically format address lines when manual address inputs change
  useEffect(() => {
    const { lines } = buildReadableAddress({
      houseNumber,
      flatNumber,
      buildingName,
      street,
      area,
      landmark,
      city,
      district,
      state,
      pincode,
      addressLine1,
    });
    setFormattedAddressLines(lines);
  }, [houseNumber, flatNumber, buildingName, street, area, landmark, city, district, state, pincode, addressLine1]);

  // GPS Location Handler with Rapido-style reverse geocoding and location card
  const handleUseCurrentLocation = () => {
    setLocErrorMsg('');
    setLocSuccessMsg('');

    if (!navigator.geolocation) {
      setLocErrorMsg('Geolocation is not supported by your browser. Please enter your address manually.');
      setLocationChoice('MANUAL');
      setIsEditingAddress(true);
      return;
    }

    setLocLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        try {
          const parsed = await reverseGeocodeLocation(lat, lng, accuracy);

          if (!parsed.isValidInIndia) {
            setUserCoords(null);
            setLocLoading(false);
            setLocErrorMsg(parsed.error || 'This service is currently available only in India.');
            setLocationChoice(null);
            return;
          }

          setUserCoords({ latitude: lat, longitude: lng, accuracy });

          if (parsed.houseNumber) setHouseNumber(parsed.houseNumber);
          if (parsed.flatNumber) setFlatNumber(parsed.flatNumber);
          if (parsed.buildingName) setBuildingName(parsed.buildingName);
          if (parsed.street) setStreet(parsed.street);
          if (parsed.area) setArea(parsed.area);
          if (parsed.landmark) setLandmark(parsed.landmark);
          if (parsed.district) setDistrict(parsed.district);
          if (parsed.city) setCity(parsed.city);
          if (parsed.state) setState(parsed.state);
          if (parsed.pincode) setPincode(parsed.pincode);
          if (parsed.addressLine1) setAddressLine1(parsed.addressLine1);

          setFormattedAddressLines(parsed.formattedLines);
          setLocationChoice('GPS');
          setIsEditingAddress(false);
          setLocSuccessMsg('✓ Location detected');
        } catch (err) {
          console.warn('Geocoding error:', err);
          setUserCoords({ latitude: lat, longitude: lng, accuracy });
          setLocErrorMsg('Could not detect your exact location. Please enter your address manually.');
          setLocationChoice('MANUAL');
          setIsEditingAddress(true);
        } finally {
          setLocLoading(false);
        }
      },
      (err) => {
        setLocLoading(false);
        let msg = 'Could not detect your exact location. Please enter your address manually.';
        if (err.code === 1) msg = 'Location permission is required to detect your current address.';
        else if (err.code === 2) msg = 'Could not detect your exact location. Please enter your address manually.';
        else if (err.code === 3) msg = 'Location detection timed out. Please enter your address manually.';
        setLocErrorMsg(msg);
        setLocationChoice('MANUAL');
        setIsEditingAddress(true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleMapLocationChange = async (newLat: number, newLng: number) => {
    setLocLoading(true);
    setLocErrorMsg('');
    try {
      const parsed = await reverseGeocodeLocation(newLat, newLng);
      if (!parsed.isValidInIndia) {
        setLocErrorMsg(parsed.error || 'This service is currently available only in India.');
        return;
      }
      setUserCoords({ latitude: newLat, longitude: newLng, accuracy: userCoords?.accuracy });
      if (parsed.houseNumber) setHouseNumber(parsed.houseNumber);
      if (parsed.flatNumber) setFlatNumber(parsed.flatNumber);
      if (parsed.buildingName) setBuildingName(parsed.buildingName);
      if (parsed.street) setStreet(parsed.street);
      if (parsed.area) setArea(parsed.area);
      if (parsed.landmark) setLandmark(parsed.landmark);
      if (parsed.district) setDistrict(parsed.district);
      if (parsed.city) setCity(parsed.city);
      if (parsed.state) setState(parsed.state);
      if (parsed.pincode) setPincode(parsed.pincode);
      if (parsed.addressLine1) setAddressLine1(parsed.addressLine1);
      setFormattedAddressLines(parsed.formattedLines);
      setLocSuccessMsg('✓ Location updated from map pin');
    } catch (err) {
      console.warn('Map pin location update error:', err);
    } finally {
      setLocLoading(false);
    }
  };

  const handleManualAddressChoice = () => {
    setLocationChoice('MANUAL');
    setIsEditingAddress(true);
    setLocErrorMsg('');
    setLocSuccessMsg('');
  };

  const validateAddress = (): boolean => {
    if (!/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      setPinErrorMsg('Invalid PIN code. Please enter a valid 6-digit Indian PIN code.');
      setErrorMsg('Invalid PIN code. Please enter a valid 6-digit Indian PIN code.');
      return false;
    }
    if (!city.trim() || city.toLowerCase() === 'metropolis' || city.toLowerCase() === 'unknown') {
      setErrorMsg('Location not found for this PIN code. Please check the PIN code and try again.');
      return false;
    }
    if (!state.trim() || state.toLowerCase() === 'state') {
      setErrorMsg('Please select a valid Indian State or Union Territory from dropdown.');
      return false;
    }
    return true;
  };

  // Submit Booking Payload
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      const pendingState = {
        step: 6,
        serviceMode,
        selectedCategoryId,
        selectedCategory,
        selectedServiceId,
        selectedService,
        houseNumber,
        flatNumber,
        buildingName,
        street,
        area,
        landmark,
        district,
        addressLine1,
        city,
        state,
        pincode,
        userCoords,
        selectedProviderId,
        engagementType,
        bookingDate,
        selectedSlot,
        notes,
      };
      sessionStorage.setItem('pending_booking_state', JSON.stringify(pendingState));
      setShowAuthRequiredModal(true);
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

    if ((serviceMode === 'HOME_VISIT' || (serviceMode === 'LAB_VISIT' && labVisitSubMode === 'HOME_COLLECTION')) && !validateAddress()) {
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      let finalProviderId: string | undefined = undefined;
      let finalLabId: string | undefined = undefined;

      const isLabTest = selectedService?.categoryId && (typeof selectedService.categoryId === 'object' ? selectedService.categoryId.slug === 'lab-tests' || selectedService.categoryId.slug === 'lab-test' : false);
      if (isLabTest) {
        finalLabId = selectedLabId || (labs.length > 0 ? (labs[0].userId?._id || labs[0].userId) : undefined);
      } else {
        finalProviderId = selectedProviderId || undefined;
      }

      const constructedLine1 = addressLine1 || [houseNumber || flatNumber, buildingName, street || area].filter(Boolean).join(', ') || `${city}, ${state}`;

      const payload: any = {
        serviceCategoryId: typeof selectedService!.categoryId === 'object' ? selectedService!.categoryId._id : selectedService!.categoryId,
        serviceId: selectedService!._id,
        serviceMode: 'HOME_VISIT',
        engagementType,
        providerId: finalProviderId,
        labId: finalLabId,
        bookingDate,
        timeSlot: selectedSlot,
        serviceAddress: {
          label: 'Home',
          addressLine1: constructedLine1,
          houseNumber,
          flatNumber,
          buildingName,
          street,
          area,
          landmark,
          district: district || city,
          city,
          state,
          pincode,
          country: 'India',
          countryCode: 'IN',
          latitude: userCoords?.latitude,
          longitude: userCoords?.longitude,
        },
        notes,
      };

      const res = await api.post('/bookings', payload);
      if (res.data.success) {
        navigate(`/booking-live/${res.data.booking._id}`);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit booking request. Slot may no longer be available.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to resolve icon, title, description, and visual styling for each category card
  const getCategoryDetails = (cat: ServiceCategory) => {
    const slug = (cat.slug || cat.name).toLowerCase();
    if (slug.includes('physio')) {
      return {
        emoji: '🧑‍⚕️',
        title: 'Physiotherapy',
        description: 'Physiotherapy home visit',
        icon: <Activity size={24} color="#0284c7" />,
        badgeBg: '#e0f2fe',
      };
    }
    if (slug.includes('occupational') || slug.includes('ot')) {
      return {
        emoji: '🧑‍⚕️',
        title: 'Occupational Therapy',
        description: 'Occupational therapy home visit',
        icon: <HeartHandshake size={24} color="#0d9488" />,
        badgeBg: '#ccfbf1',
      };
    }
    if (slug.includes('elder') || slug.includes('geriatric')) {
      return {
        emoji: '👵',
        title: 'Elder Care',
        description: 'Elder / geriatric care at home',
        icon: <UserCheck size={24} color="#7c3aed" />,
        badgeBg: '#f3e8ff',
      };
    }
    if (slug.includes('lab') || slug.includes('test') || slug.includes('pathology')) {
      return {
        emoji: '🧪',
        title: 'Lab Test',
        description: 'Home sample collection',
        icon: <FlaskConical size={24} color="#0284c7" />,
        badgeBg: '#e0f2fe',
      };
    }
    return {
      emoji: '🩺',
      title: cat.name,
      description: cat.description || 'Healthcare service home visit',
      icon: <Activity size={24} color="#0284c7" />,
      badgeBg: '#e0f2fe',
    };
  };

  const displayServices = services.length > 0 ? services : DEFAULT_SERVICES;

  // Filter Services strictly for Selected Category (by ID, Slug, or Name)
  const categoryServices = displayServices.filter((s) => {
    if (!selectedCategory && !selectedCategoryId) return true;

    const sCatId = typeof s.categoryId === 'object' ? s.categoryId._id : s.categoryId;
    const sCatSlug = typeof s.categoryId === 'object' ? s.categoryId.slug : '';
    const sCatName = typeof s.categoryId === 'object' ? s.categoryId.name : '';

    const targetId = selectedCategoryId;
    const targetSlug = (selectedCategory?.slug || searchParams.get('category') || '').toLowerCase();
    const targetName = (selectedCategory?.name || '').toLowerCase();

    // 1. Exact ID match
    if (targetId && sCatId === targetId) return true;

    // 2. ID match with selectedCategory._id
    if (selectedCategory?._id && sCatId === selectedCategory._id) return true;

    // 3. Slug match (flexible matching for physio, occupational/ot, elder, lab)
    if (targetSlug && sCatSlug) {
      const sSlugClean = sCatSlug.toLowerCase();
      if (sSlugClean === targetSlug) return true;
      if ((targetSlug === 'lab-test' || targetSlug === 'lab-tests') && (sSlugClean === 'lab-test' || sSlugClean === 'lab-tests')) return true;
      if ((targetSlug === 'physiotherapy' || targetSlug === 'physio') && sSlugClean.includes('physio')) return true;
      if ((targetSlug === 'occupational-therapy' || targetSlug === 'ot') && (sSlugClean.includes('occupational') || sSlugClean.includes('ot'))) return true;
      if ((targetSlug === 'elder-care' || targetSlug === 'elder') && (sSlugClean.includes('elder') || sSlugClean.includes('geriatric'))) return true;
    }

    // 4. Name match (case-insensitive substring match)
    if (targetName && sCatName) {
      const sNameClean = sCatName.toLowerCase();
      if (sNameClean === targetName) return true;
      if (targetName.includes('physio') && sNameClean.includes('physio')) return true;
      if (targetName.includes('occupational') && sNameClean.includes('occupational')) return true;
      if (targetName.includes('elder') && sNameClean.includes('elder')) return true;
      if (targetName.includes('lab') && sNameClean.includes('lab')) return true;
    }

    return false;
  });

  // Filter category services by user search input
  const filteredCategoryServices = categoryServices.filter((s) => {
    if (!serviceSearchQuery.trim()) return true;
    const q = serviceSearchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.testCategory && s.testCategory.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

  // Calculate distances & filter Clinics & Labs
  const filteredClinics = clinics
    .map((c) => {
      let dist = 999;
      if (userCoords && c.latitude && c.longitude) {
        dist = calculateHaversineDistance(userCoords.latitude, userCoords.longitude, c.latitude, c.longitude);
      }
      return { ...c, distance: dist };
    })
    .filter((c) => {
      if (!clinicSearchQuery.trim()) return true;
      const q = clinicSearchQuery.toLowerCase();
      return c.clinicName.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.addressLine1.toLowerCase().includes(q);
    })
    .sort((a, b) => a.distance - b.distance);

  const filteredLabs = labs
    .map((l) => {
      let dist = 999;
      if (userCoords && l.latitude && l.longitude) {
        dist = calculateHaversineDistance(userCoords.latitude, userCoords.longitude, l.latitude, l.longitude);
      }
      return { ...l, distance: dist };
    })
    .filter((l) => {
      if (!labSearchQuery.trim()) return true;
      const q = labSearchQuery.toLowerCase();
      return l.labName.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || l.addressLine1.toLowerCase().includes(q);
    })
    .sort((a, b) => a.distance - b.distance);

  const basePrice = selectedService?.basePrice || 0;
  const isHomeLabTest = (serviceMode === 'LAB_VISIT' && labVisitSubMode === 'HOME_COLLECTION') || (serviceMode === 'HOME_VISIT' && selectedService?.categoryId && (typeof selectedService.categoryId === 'object' ? selectedService.categoryId.slug === 'lab-tests' : false));
  const homeFee = isHomeLabTest ? 150 : 0;
  const totalAmount = basePrice + homeFee;

  // Category Selection Handler
  const handleSelectCategory = (cat: ServiceCategory) => {
    setSelectedCategoryId(cat._id);
    setSelectedCategory(cat);
    setStep(3);
    const slug = cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-');
    if (serviceMode === 'HOME_VISIT') {
      navigate(`/book/home/${slug}`, { replace: false });
    }
  };

  // Service Selection Handler
  const handleSelectService = (srv: Service) => {
    setSelectedServiceId(srv._id);
    setSelectedService(srv);
    const cId = typeof srv.categoryId === 'object' ? srv.categoryId._id : srv.categoryId;
    setSelectedCategoryId(cId);
    setStep(4);
  };

  // Step Back Navigation Helper
  const handleGoBack = () => {
    setErrorMsg('');
    if (step === 3) {
      setStep(2);
      setSelectedCategoryId('');
      setSelectedCategory(null);
      if (serviceMode === 'HOME_VISIT') {
        navigate('/book/home');
      }
    } else if (step === 2) {
      setStep(1);
      navigate('/book');
    } else if (step > 3) {
      setStep(step - 1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem', maxWidth: '720px' }}>
      {/* Top Header & Progress Bar */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={handleGoBack}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          <span style={{ fontSize: '0.775rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            CarePulse Mobile Booking • Step {step} of 6
          </span>
        </div>

        {/* Compact Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#e2e8f0', height: '6px', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ width: `${(step / 6) * 100}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'all 0.3s ease' }}></div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* =========================================================================
          SCREEN 1: HOME VISIT MODE SELECTION
         ========================================================================= */}
      {step === 1 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)' }}>
              CarePulse Home Visit Booking
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginTop: '0.35rem' }}>
              Healthcare professional visits your home for personalized care.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
            {/* Prominent Card: Home Visit */}
            <div
              onClick={() => {
                setServiceMode('HOME_VISIT');
                setStep(2);
                navigate('/book/home');
              }}
              style={{
                padding: '1.5rem',
                borderRadius: '20px',
                border: '2px solid var(--primary)',
                backgroundColor: 'var(--primary-light)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.15)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Home size={30} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>🏠 Home Visit</h3>
                  <ArrowRight size={22} color="var(--primary)" />
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                  Healthcare professional visits your home. Certified specialists for Physiotherapy, OT, Elder Care & Home Lab Sample Collection.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setServiceMode('HOME_VISIT');
                setStep(2);
                navigate('/book/home');
              }}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', fontWeight: 800, padding: '0.9rem', fontSize: '1rem', borderRadius: '14px' }}
            >
              Select Service Category <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 2: SELECT SERVICE CATEGORY ONLY
         ========================================================================= */}
      {step === 2 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 700 }}>
              Mode: 🏠 Home Visit Only
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>
              What service category do you need?
            </h2>
          </div>

          {loading ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <RefreshCw size={28} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 1rem', display: 'block' }} />
              <p style={{ fontWeight: 700, color: 'var(--text-main)' }}>Loading healthcare services...</p>
            </div>
          ) : catalogError && categories.length === 0 ? (
            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '16px', border: '1px solid #fca5a5' }}>
              <AlertCircle size={32} color="#dc2626" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.5rem' }}>
                Unable to load healthcare services.
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#7f1d1d', marginBottom: '1.25rem' }}>
                Please check your network connection and try again.
              </p>
              <button
                type="button"
                onClick={fetchCatalog}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 700 }}
              >
                Try Again
              </button>
            </div>
          ) : displayCategories.length === 0 ? (
            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '1rem' }}>
                No home visit services are currently available.
              </p>
              <button
                type="button"
                onClick={fetchCatalog}
                className="btn btn-outline btn-sm"
              >
                Refresh Services
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {displayCategories.map((cat) => {
                const details = getCategoryDetails(cat);
                const isSelected = selectedCategoryId === cat._id || selectedCategory?.slug === cat.slug;
                return (
                  <div
                    key={cat._id || cat.slug}
                    onClick={() => handleSelectCategory(cat)}
                    className="card card-hover"
                    style={{
                      padding: '1.25rem 1.5rem',
                      borderRadius: '16px',
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: isSelected ? 'var(--primary-light)' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: details.badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {details.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{details.emoji}</span>
                        <span>{details.title}</span>
                      </h3>
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: '1.35' }}>
                        {details.description}
                      </p>
                    </div>
                    <ArrowRight size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SCREEN 3: SELECT SPECIFIC SERVICE ONLY
         ========================================================================= */}
      {step === 3 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <span style={{ fontSize: '0.8rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 700 }}>
              Category: {selectedCategory?.name || 'Selected Category'}
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>
              What type of {selectedCategory?.name || 'service'} do you need?
            </h2>
          </div>

          {/* Search Input for Tests / Services */}
          {categoryServices.length > 4 && (
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-control"
                placeholder={`Search ${categoryServices.length} tests or services...`}
                value={serviceSearchQuery}
                onChange={(e) => setServiceSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.5rem', borderRadius: '12px' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {categoryServices.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <p style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  No active services found for {selectedCategory?.name || 'this category'}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    if (serviceMode === 'HOME_VISIT') navigate('/book/home');
                  }}
                  className="btn btn-outline btn-sm"
                >
                  ← Select Another Category
                </button>
              </div>
            ) : filteredCategoryServices.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                  No tests or services found matching &quot;{serviceSearchQuery}&quot;.
                </p>
              </div>
            ) : (
              filteredCategoryServices.map((srv) => (
                <div
                  key={srv._id}
                  onClick={() => handleSelectService(srv)}
                  className="card card-hover"
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderRadius: '16px',
                    border: `2px solid ${selectedServiceId === srv._id ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: selectedServiceId === srv._id ? 'var(--primary-light)' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                      {srv.testCategory && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                          {srv.testCategory}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.35 }}>{srv.name}</h3>
                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{srv.description}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                        ₹{srv.basePrice}
                      </span>
                      {srv.originalPrice && srv.originalPrice > srv.basePrice && (
                        <>
                          <span style={{ fontSize: '0.9rem', textDecoration: 'line-through', color: '#94a3b8', fontWeight: 500 }}>
                            ₹{srv.originalPrice}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                            {srv.discountPercent ? `${srv.discountPercent}% OFF` : `${Math.round(((srv.originalPrice - srv.basePrice) / srv.originalPrice) * 100)}% OFF`}
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#fef3c7', color: '#92400e', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            Special Offer
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 4: LOCATION & ADDRESS FORM
         ========================================================================= */}
      {step === 4 && (
        <div>
          {/* Selected Service Summary Header */}
          <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.85rem 1rem', borderRadius: '14px', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }}>Selected Service:</div>
            <div style={{ fontWeight: 800, color: '#0c4a6e', fontSize: '0.95rem' }}>
              {selectedService?.name} (₹{basePrice})
            </div>
          </div>

          {/* Optional Lab Collection Sub-purpose Selection */}
          {serviceMode === 'LAB_VISIT' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Choose Sample Collection Method:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setLabVisitSubMode('LAB_CENTER')}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '12px',
                    border: `2px solid ${labVisitSubMode === 'LAB_CENTER' ? '#0284c7' : 'var(--border)'}`,
                    backgroundColor: labVisitSubMode === 'LAB_CENTER' ? '#e0f2fe' : 'white',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: labVisitSubMode === 'LAB_CENTER' ? '#0369a1' : 'var(--text-main)',
                  }}
                >
                  🧪 Visit Lab Center
                </button>

                <button
                  type="button"
                  onClick={() => setLabVisitSubMode('HOME_COLLECTION')}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '12px',
                    border: `2px solid ${labVisitSubMode === 'HOME_COLLECTION' ? '#0284c7' : 'var(--border)'}`,
                    backgroundColor: labVisitSubMode === 'HOME_COLLECTION' ? '#e0f2fe' : 'white',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: labVisitSubMode === 'HOME_COLLECTION' ? '#0369a1' : 'var(--text-main)',
                  }}
                >
                  🏠 Collect at Home (+₹150)
                </button>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {serviceMode === 'HOME_VISIT' || labVisitSubMode === 'HOME_COLLECTION' ? 'Where should the specialist visit?' : 'Where are you located?'}
            </h2>
          </div>

          {/* Location Choice Block */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
              <button
                type="button"
                disabled={locLoading}
                onClick={handleUseCurrentLocation}
                style={{
                  padding: '1rem',
                  borderRadius: '14px',
                  border: `2px solid ${locationChoice === 'GPS' ? 'var(--primary)' : 'var(--border)'}`,
                  backgroundColor: locationChoice === 'GPS' ? 'var(--primary-light)' : 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                  <Navigation size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    {locLoading ? 'Detecting Location...' : '📍 Use Current Location'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Detect GPS automatically</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleManualAddressChoice}
                style={{
                  padding: '1rem',
                  borderRadius: '14px',
                  border: `2px solid ${locationChoice === 'MANUAL' ? '#0d9488' : 'var(--border)'}`,
                  backgroundColor: locationChoice === 'MANUAL' ? '#ccfbf1' : 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: '#ccfbf1', color: '#0f766e' }}>
                  <Edit2 size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    ✏️ Enter Address Manually
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enter house, area, PIN code</div>
                </div>
              </button>
            </div>

            {/* Rapido-Style Location Summary Card */}
            {locationChoice === 'GPS' && userCoords && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                border: '2px solid var(--primary)',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                boxShadow: '0 8px 24px rgba(2, 132, 199, 0.12)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                      📍
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                        Current Location
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.15rem 0.55rem', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                        ✓ GPS Location Detected {userCoords.accuracy ? `(±${Math.round(userCoords.accuracy)}m)` : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(!isEditingAddress)}
                    className="btn btn-outline btn-sm"
                    style={{ borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700, padding: '0.4rem 0.85rem' }}
                  >
                    <Edit2 size={14} style={{ marginRight: '0.3rem' }} />
                    {isEditingAddress ? 'Hide Form' : 'Edit Address'}
                  </button>
                </div>

                {/* Structured Multi-line Display Card */}
                <div style={{ backgroundColor: '#f8fafc', padding: '1.1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                  {formattedAddressLines.length > 0 ? (
                    formattedAddressLines.map((line, idx) => (
                      <div key={idx} style={{
                        fontSize: idx === 0 ? '0.975rem' : '0.875rem',
                        fontWeight: idx === 0 ? 800 : 600,
                        color: idx === 0 ? 'var(--text-main)' : 'var(--text-muted)',
                        lineHeight: '1.5',
                        marginBottom: idx < formattedAddressLines.length - 1 ? '0.2rem' : 0,
                      }}>
                        {line}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: '1.5' }}>
                      {[houseNumber || flatNumber, buildingName, street || area, `${city}, ${state}${pincode ? ` - ${pincode}` : ''}`].filter(Boolean).join('\n')}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600, marginTop: '0.5rem' }}>
                    Detected from your current GPS location
                  </div>
                </div>

                {/* Map Location Preview */}
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={16} color="#0284c7" />
                    <span>Location Pin Preview</span>
                  </div>
                  <LocationMap
                    latitude={userCoords.latitude}
                    longitude={userCoords.longitude}
                    onLocationChange={handleMapLocationChange}
                    height="220px"
                  />
                </div>
              </div>
            )}

            {locErrorMsg && (
              <div style={{ backgroundColor: '#fffbebf0', border: '1px solid #fde68a', color: '#92400e', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                ⚠️ {locErrorMsg}
              </div>
            )}

            {(isEditingAddress || locationChoice === 'MANUAL') && (
              <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.85rem' }}>Full Address Details</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>House / Flat / Door No.</label>
                    <input type="text" placeholder="e.g. Flat 204" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Building / Apartment Name</label>
                    <input type="text" placeholder="e.g. Shree Residency" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Street / Road / Area</label>
                    <input type="text" placeholder="e.g. Vijay Nagar" value={street || addressLine1} onChange={(e) => { setStreet(e.target.value); setAddressLine1(e.target.value); }} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Landmark (Optional)</label>
                    <input type="text" placeholder="e.g. Near Apollo Hospital" value={landmark} onChange={(e) => setLandmark(e.target.value)} className="form-input" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>PIN Code (6 digits) *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          required
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="e.g. 452010"
                          value={pincode}
                          onChange={(e) => handlePincodeChange(e.target.value)}
                          className="form-input"
                        />
                        {isPincodeLoading && (
                          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.725rem', color: 'var(--primary)', fontWeight: 700 }}>
                            Validating...
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>City *</label>
                      <input type="text" required placeholder="Auto-populated from PIN" value={city} onChange={(e) => setCity(e.target.value)} className="form-input" />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>District</label>
                      <input type="text" placeholder="District" value={district || city} onChange={(e) => setDistrict(e.target.value)} className="form-input" />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>State / UT *</label>
                      <select required value={state} onChange={(e) => setState(e.target.value)} className="form-input">
                        <option value="">Select State / UT</option>
                        {INDIAN_STATES_AND_UTS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Country</label>
                      <input type="text" readOnly value="India 🇮🇳" className="form-input" style={{ backgroundColor: '#e2e8f0', fontWeight: 700 }} />
                    </div>
                  </div>

                  {pinErrorMsg && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.65rem 0.85rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.75rem' }}>
                      ⚠️ {pinErrorMsg}
                    </div>
                  )}

                  {pinSuccessMsg && (
                    <div style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '0.65rem 0.85rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.75rem' }}>
                      {pinSuccessMsg}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if ((serviceMode === 'HOME_VISIT' || labVisitSubMode === 'HOME_COLLECTION') && !validateAddress()) return;
              setErrorMsg('');
              setStep(5);
            }}
            className="btn btn-primary btn-lg btn-mobile-full"
            style={{ width: '100%', justifyContent: 'center', fontWeight: 800 }}
          >
            Next: Find Nearby Specialists <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* =========================================================================
          SCREEN 5: SELECT NEARBY PROVIDER / CLINIC / LAB
         ========================================================================= */}
      {step === 5 && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 700 }}>
              📍 Search Radius: Within 5 KM
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.4rem' }}>
              Select Nearby Verified Professional
            </h2>
          </div>

          {/* HOME VISIT PROVIDER SELECTION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            <div
              onClick={() => {
                setSelectedProviderId('');
                setStep(6);
              }}
              className="card card-hover"
              style={{
                padding: '1.25rem',
                borderRadius: '16px',
                border: `2px solid ${selectedProviderId === '' ? 'var(--primary)' : 'var(--border)'}`,
                backgroundColor: selectedProviderId === '' ? 'var(--primary-light)' : 'white',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--text-main)',
              }}
            >
              ⚡ Any Available Verified Professional (Fastest Auto-Assignment)
            </div>

            {(() => {
              const categoryFiltered = providers.filter((p) => {
                if (!selectedCategory && !selectedCategoryId) return true;
                const pCatId = typeof p.category === 'object' ? p.category?._id : p.category;
                if (!pCatId) return true;

                const matchId = selectedCategoryId && pCatId === selectedCategoryId;
                const matchCatObjId = selectedCategory?._id && pCatId === selectedCategory._id;

                let matchSlugOrName = false;
                if (typeof p.category === 'object' && p.category) {
                  const pCatSlug = p.category.slug?.toLowerCase() || '';
                  const pCatName = p.category.name?.toLowerCase() || '';
                  const targetSlug = (selectedCategory?.slug || '').toLowerCase();
                  const targetName = (selectedCategory?.name || '').toLowerCase();

                  if (targetSlug && pCatSlug && (pCatSlug === targetSlug || (targetSlug.includes('physio') && pCatSlug.includes('physio')) || (targetSlug.includes('occupational') && pCatSlug.includes('occupational')))) {
                    matchSlugOrName = true;
                  }
                  if (targetName && pCatName && ((targetName.includes('physio') && pCatName.includes('physio')) || (targetName.includes('occupational') && pCatName.includes('occupational')))) {
                    matchSlugOrName = true;
                  }
                }

                return matchId || matchCatObjId || matchSlugOrName;
              });

              const displayProvidersList = categoryFiltered.length > 0 ? categoryFiltered : providers;

              // Compute Haversine distance and sort by proximity
              const providersWithDistance = displayProvidersList.map((p) => {
                const distanceKm = (userCoords?.latitude && userCoords?.longitude && p.latitude && p.longitude)
                  ? calculateHaversineDistance(userCoords.latitude, userCoords.longitude, p.latitude, p.longitude)
                  : undefined;
                return { ...p, distanceKm };
              });

              if (userCoords) {
                providersWithDistance.sort((a, b) => {
                  if (a.distanceKm === undefined) return 1;
                  if (b.distanceKm === undefined) return -1;
                  return a.distanceKm - b.distanceKm;
                });
              }

              return providersWithDistance.map((p) => {
                const entityUserId = p.userId?._id || p.userId;
                return (
                  <div
                    key={p._id}
                    onClick={() => {
                      setSelectedProviderId(entityUserId);
                      setStep(6);
                    }}
                    className="card card-hover"
                    style={{
                      padding: '1.25rem',
                      borderRadius: '16px',
                      border: `2px solid ${selectedProviderId === entityUserId ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: selectedProviderId === entityUserId ? 'var(--primary-light)' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontWeight: 800, fontSize: '1rem' }}>{p.fullName}</h4>
                        <span style={{ fontSize: '0.7rem', backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                          VERIFIED
                        </span>
                        {p.distanceKm !== undefined && (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.55rem', borderRadius: '999px', fontWeight: 700 }}>
                            📍 {p.distanceKm} km away
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {p.qualification} • {p.experienceYears} Yrs Exp • {p.city || 'Available'}
                      </p>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>₹{basePrice || p.chargesPerSession}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 6: SCHEDULE DATE, SLOT & FINAL CONFIRMATION
         ========================================================================= */}
      {step === 6 && (
        <form onSubmit={handleSubmitBooking}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Schedule Appointment & Finalize
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Pick your preferred date and available time slot.
            </p>
          </div>

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

          <div className="form-group" style={{ marginTop: '1.25rem', marginBottom: '1.5rem' }}>
            <label className="form-label">Available Time Slots for {bookingDate}</label>
            {availableSlots.length === 0 ? (
              <p style={{ color: '#dc2626', fontSize: '0.875rem', padding: '0.85rem', background: '#fee2e2', borderRadius: '10px' }}>
                No available slots for this date. Please pick another date.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.6rem', marginTop: '0.4rem' }}>
                {availableSlots.map((slot, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    style={{
                      padding: '0.6rem 0.4rem',
                      borderRadius: '10px',
                      border: `1.5px solid ${selectedSlot?.startTime === slot.startTime ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: selectedSlot?.startTime === slot.startTime ? 'var(--primary)' : 'white',
                      color: selectedSlot?.startTime === slot.startTime ? 'white' : 'var(--text-main)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      minHeight: '44px',
                    }}
                  >
                    {slot.startTime} - {slot.endTime}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Special Patient Instructions / Notes</label>
            <textarea rows={2} placeholder="Any specific health or entry instructions..." value={notes} onChange={(e) => setNotes(e.target.value)} className="form-textarea" />
          </div>

          {/* Summary Price Breakdown with Discount Highlight */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
            {selectedService?.originalPrice && selectedService.originalPrice > basePrice && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Standard Rate:</span>
                  <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontWeight: 600 }}>₹{selectedService.originalPrice}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.875rem', color: '#16a34a' }}>
                  <span style={{ fontWeight: 600 }}>Discount Available ({selectedService.discountPercent || Math.round(((selectedService.originalPrice - basePrice) / selectedService.originalPrice) * 100)}% OFF):</span>
                  <span style={{ fontWeight: 700 }}>-₹{selectedService.originalPrice - basePrice}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
              <span>Service Fee ({selectedService?.name}):</span>
              <span style={{ fontWeight: 700 }}>₹{basePrice}</span>
            </div>
            {isHomeLabTest && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                <span>Home Sample Collection Fee:</span>
                <span style={{ fontWeight: 700 }}>₹150</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.65rem', marginTop: '0.65rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 900 }}>
              <span>Total Amount Payable:</span>
              <span style={{ color: 'var(--primary)' }}>₹{totalAmount}</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} />
            <span>Post-Service Payment: No payment required upfront. You pay only after the session is completed.</span>
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedSlot}
            className="btn btn-primary btn-lg btn-mobile-full"
            style={{ width: '100%', justifyContent: 'center', fontWeight: 800, fontSize: '1.05rem', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)' }}
          >
            {submitting ? 'Submitting Request...' : (serviceMode === 'HOME_VISIT' || labVisitSubMode === 'HOME_COLLECTION' ? '🚀 SEND HOME VISIT SERVICE REQUEST' : 'CONFIRM APPOINTMENT BOOKING')}
          </button>
        </form>
      )}

      {/* Login Required Overlay Modal for Guest Users */}
      {showAuthRequiredModal && (
        <div className="modal-overlay" onClick={() => setShowAuthRequiredModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'center', padding: '2.25rem 1.75rem', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-1rem -0.5rem 0.5rem 0' }}>
              <button type="button" onClick={() => setShowAuthRequiredModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#e0f2fe', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 4px 12px rgba(2,132,199,0.2)' }}>
              <Lock size={32} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Login Required
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: '1.5', marginBottom: '1.75rem' }}>
              Login required to book a healthcare service.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => navigate('/auth/login?redirect=/book')}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', fontWeight: 800, padding: '0.85rem' }}
              >
                <LogIn size={18} /> Login
              </button>
              <button
                type="button"
                onClick={() => navigate('/auth/register?redirect=/book')}
                className="btn btn-outline btn-lg"
                style={{ width: '100%', justifyContent: 'center', fontWeight: 700, padding: '0.85rem' }}
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
