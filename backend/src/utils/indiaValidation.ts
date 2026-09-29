/**
 * India Geographic Boundary & Address Validator
 * Geographic Bounding Box for India:
 * Latitude: 6.5° N to 35.7° N
 * Longitude: 68.1° E to 97.4° E
 */

export const INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export const INDIA_BOUNDS = {
  minLat: 6.5,
  maxLat: 35.7,
  minLng: 68.1,
  maxLng: 97.4,
};

export const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const INDIAN_PHONE_REGEX = /^(\+91[\-\s]?)?[6-9]\d{9}$/;

export const isCoordinatesInIndia = (latitude?: number, longitude?: number): boolean => {
  if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
    return true; // Skip if no GPS coordinates provided
  }
  const numLat = Number(latitude);
  const numLng = Number(longitude);
  if (isNaN(numLat) || isNaN(numLng) || (numLat === 0 && numLng === 0)) {
    return true;
  }
  return (
    numLat >= INDIA_BOUNDS.minLat &&
    numLat <= INDIA_BOUNDS.maxLat &&
    numLng >= INDIA_BOUNDS.minLng &&
    numLng <= INDIA_BOUNDS.maxLng
  );
};

export const normalizeIndianState = (rawState?: string): string => {
  if (!rawState) return '';
  const trimmed = rawState.trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === 'state' ||
    trimmed.toLowerCase() === 'detected state' ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null'
  ) {
    return '';
  }

  const matched = INDIAN_STATES_AND_UTS.find(
    (s) => s.toLowerCase() === trimmed.toLowerCase()
  );
  if (matched) return matched;

  const partialMatch = INDIAN_STATES_AND_UTS.find(
    (s) => trimmed.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(trimmed.toLowerCase())
  );

  return partialMatch || trimmed;
};

export const extractCity = (address: any): string => {
  if (!address) return '';
  // Requirement 14: city → town → village → municipality
  const candidate =
    address.city ||
    address.town ||
    address.village ||
    address.municipality;

  if (!candidate) return '';
  const trimmed = String(candidate).trim();
  if (
    trimmed.toLowerCase() === 'metropolis' ||
    trimmed.toLowerCase() === 'detected city' ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null'
  ) {
    return '';
  }
  return trimmed;
};

export const extractDistrict = (address: any): string => {
  if (!address) return '';
  // Requirement 14: state_district → district → county
  const candidate =
    address.state_district ||
    address.district ||
    address.county;

  if (!candidate) return '';
  const trimmed = String(candidate).trim();
  if (
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null'
  ) {
    return '';
  }
  return trimmed;
};

export const extractPincode = (address: any): string => {
  if (!address || !address.postcode) return '';
  const clean = String(address.postcode).replace(/\D/g, '').slice(0, 6);
  if (INDIAN_PINCODE_REGEX.test(clean)) {
    return clean;
  }
  return '';
};

export const extractAddressLine1 = (address: any, displayName?: string): string => {
  if (!address) return '';
  const parts = [
    address.house_number,
    address.building,
    address.road,
    address.suburb,
    address.neighbourhood,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  if (displayName) {
    const splitParts = displayName.split(',').slice(0, 2).map((p: string) => p.trim()).filter(Boolean);
    if (splitParts.length > 0) {
      return splitParts.join(', ');
    }
  }

  return '';
};

export interface ParsedLocationResult {
  houseNumber: string;
  flatNumber: string;
  buildingName: string;
  street: string;
  area: string;
  landmark: string;
  addressLine1: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  isValidInIndia: boolean;
  hasMissingFields: boolean;
  missingFields: string[];
  error?: string;
}

export const parseNominatimAddress = (
  data: any,
  lat: number,
  lng: number
): ParsedLocationResult => {
  if (!isCoordinatesInIndia(lat, lng)) {
    return {
      houseNumber: '',
      flatNumber: '',
      buildingName: '',
      street: '',
      area: '',
      landmark: '',
      addressLine1: '',
      city: '',
      district: '',
      state: '',
      pincode: '',
      country: 'India',
      countryCode: 'IN',
      latitude: lat,
      longitude: lng,
      isValidInIndia: false,
      hasMissingFields: true,
      missingFields: ['country'],
      error: 'Sorry, CarePulse currently provides services only in India.',
    };
  }

  const addr = data?.address || {};
  const countryCode = (addr.country_code || '').toLowerCase();
  const countryName = (addr.country || '').toLowerCase();

  if ((countryCode && countryCode !== 'in') || (countryName && !countryName.includes('india'))) {
    return {
      houseNumber: '',
      flatNumber: '',
      buildingName: '',
      street: '',
      area: '',
      landmark: '',
      addressLine1: '',
      city: '',
      district: '',
      state: '',
      pincode: '',
      country: 'India',
      countryCode: 'IN',
      latitude: lat,
      longitude: lng,
      isValidInIndia: false,
      hasMissingFields: true,
      missingFields: ['country'],
      error: 'Sorry, CarePulse currently provides services only in India.',
    };
  }

  const houseNumber = addr.house_number || '';
  const flatNumber = addr.flat_number || '';
  const buildingName = addr.building || addr.apartment || '';
  const street = addr.road || addr.street || '';
  const area = addr.suburb || addr.neighbourhood || addr.residential || '';
  const landmark = addr.landmark || '';
  const addressLine1 = extractAddressLine1(addr, data?.display_name);
  const city = extractCity(addr);
  const district = extractDistrict(addr) || city;
  const state = normalizeIndianState(addr.state);
  const pincode = extractPincode(addr);

  const missingFields: string[] = [];
  if (!city) missingFields.push('City');
  if (!state) missingFields.push('State');
  if (!pincode) missingFields.push('PIN Code');

  return {
    houseNumber,
    flatNumber,
    buildingName,
    street,
    area,
    landmark,
    addressLine1,
    city,
    district,
    state,
    pincode,
    country: 'India',
    countryCode: 'IN',
    latitude: lat,
    longitude: lng,
    isValidInIndia: true,
    hasMissingFields: missingFields.length > 0,
    missingFields,
  };
};

export const validateIndianAddress = (serviceAddress?: any): { isValid: boolean; message?: string } => {
  if (!serviceAddress) return { isValid: true };

  const { city, state, pincode, latitude, longitude, country, countryCode } = serviceAddress;

  // 1. Country validation
  if (country) {
    const c = String(country).trim().toLowerCase();
    if (c !== 'india' && c !== 'in') {
      return {
        isValid: false,
        message: 'Sorry, our services are currently available only in India.',
      };
    }
  }

  if (countryCode) {
    const cc = String(countryCode).trim().toLowerCase();
    if (cc !== 'in' && cc !== 'india') {
      return {
        isValid: false,
        message: 'Sorry, our services are currently available only in India.',
      };
    }
  }

  // 2. Demo/Placeholder check
  if (city) {
    const cStr = String(city).trim().toLowerCase();
    if (cStr === 'metropolis' || cStr === 'detected city') {
      return {
        isValid: false,
        message: 'Please enter a valid city name.',
      };
    }
  }

  if (state) {
    const sStr = String(state).trim().toLowerCase();
    if (sStr === 'state' || sStr === 'detected state') {
      return {
        isValid: false,
        message: 'Please select a valid Indian State or Union Territory.',
      };
    }
  }

  // 3. 6-digit Indian PIN code validation
  if (pincode) {
    const cleanPin = String(pincode).trim();
    if (!INDIAN_PINCODE_REGEX.test(cleanPin)) {
      return {
        isValid: false,
        message: 'Invalid PIN code. Please enter a valid 6-digit Indian PIN code (e.g. 110001).',
      };
    }
  }

  // 4. GPS Coordinates India bounding box check
  if (latitude !== undefined && longitude !== undefined && (latitude !== 0 || longitude !== 0)) {
    if (!isCoordinatesInIndia(Number(latitude), Number(longitude))) {
      return {
        isValid: false,
        message: 'Sorry, our services are currently available only in India.',
      };
    }
  }

  return { isValid: true };
};
