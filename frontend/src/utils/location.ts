/**
 * India Geographic & Location Utility Functions
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

/**
 * Calculate Haversine Distance between two geographical coordinates (in Kilometers)
 */
export const calculateHaversineDistance = (
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number => {
  if (
    lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined ||
    lat1 === null || lon1 === null || lat2 === null || lon2 === null ||
    isNaN(Number(lat1)) || isNaN(Number(lon1)) || isNaN(Number(lat2)) || isNaN(Number(lon2))
  ) {
    return 999;
  }

  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  const R = 6371; // Earth radius in km
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
};

export const isCoordinatesInIndia = (lat?: number, lng?: number): boolean => {
  if (lat === undefined || lng === undefined || lat === null || lng === null) return true;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng) || (numLat === 0 && numLng === 0)) return true;
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

  // Partial match check
  const partialMatch = INDIAN_STATES_AND_UTS.find(
    (s) => trimmed.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(trimmed.toLowerCase())
  );

  return partialMatch || trimmed;
};

export const extractCity = (address: any): string => {
  if (!address) return '';
  // Priority: city -> town -> municipality -> city_district -> village -> suburb
  const candidate =
    address.city ||
    address.town ||
    address.municipality ||
    address.city_district ||
    address.village ||
    address.suburb;

  if (!candidate) return '';
  const trimmed = String(candidate).trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === 'metropolis' ||
    trimmed.toLowerCase() === 'detected city' ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'unknown'
  ) {
    return '';
  }
  return trimmed;
};

export const extractDistrict = (address: any): string => {
  if (!address) return '';
  // Priority: state_district -> district -> county
  const candidate =
    address.state_district ||
    address.district ||
    address.county;

  if (!candidate) return '';
  const trimmed = String(candidate).trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'unknown'
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

export const extractLandmark = (address: any): string => {
  if (!address) return '';
  const candidate =
    address.landmark ||
    address.amenity ||
    address.point_of_interest ||
    address.hospital ||
    address.temple ||
    address.bank ||
    address.school ||
    address.college ||
    address.shopping_mall ||
    address.supermarket;

  if (!candidate) return '';
  const trimmed = String(candidate).trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'unknown'
  ) {
    return '';
  }
  return trimmed;
};

export const extractAddressLine1 = (address: any, displayName?: string): string => {
  if (!address) return '';
  const rawParts = [
    address.house_number || address.flat_number || address.door_number,
    address.building || address.apartment || address.residential || address.housing_society,
    address.road || address.street,
    address.suburb || address.neighbourhood || address.quarter,
  ].filter(Boolean).map((p: string) => p.trim());

  // Deduplicate case-insensitively
  const parts: string[] = [];
  for (const part of rawParts) {
    if (!parts.some((p) => p.toLowerCase() === part.toLowerCase())) {
      parts.push(part);
    }
  }

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
  accuracy?: number;
  isValidInIndia: boolean;
  hasMissingFields: boolean;
  missingFields: string[];
  formattedLines: string[];
  formattedSingleLine: string;
  error?: string;
}

/**
  * Builds clean, human-readable multi-line and single-line Rapido-style address blocks
  */
export const buildReadableAddress = (data: {
  houseNumber?: string;
  flatNumber?: string;
  buildingName?: string;
  street?: string;
  area?: string;
  landmark?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  addressLine1?: string;
}): { lines: string[]; singleLine: string } => {
  const lines: string[] = [];

  // Line 1: House/Flat & Building (only real, non-empty values)
  const premiseParts = [
    data.houseNumber || data.flatNumber,
    data.buildingName,
  ].filter(Boolean).map((s) => s!.trim());

  let premiseStr = '';
  if (premiseParts.length > 0) {
    premiseStr = premiseParts.join(', ');
    lines.push(premiseStr);
  }

  // Line 2: Street & Locality/Area (only real, non-empty, non-duplicate values)
  const streetParts = [data.street, data.area].filter(Boolean).map((s) => s!.trim());
  const uniqueStreetParts: string[] = [];
  for (const part of streetParts) {
    if (
      !uniqueStreetParts.some((p) => p.toLowerCase() === part.toLowerCase()) &&
      (!premiseStr || !premiseStr.toLowerCase().includes(part.toLowerCase()))
    ) {
      uniqueStreetParts.push(part);
    }
  }

  let streetStr = '';
  if (uniqueStreetParts.length > 0) {
    streetStr = uniqueStreetParts.join(', ');
    lines.push(streetStr);
  } else if (!premiseStr && data.addressLine1) {
    lines.push(data.addressLine1);
  }

  // Line 3: Landmark (only when genuinely available and non-duplicate)
  if (data.landmark && data.landmark.trim()) {
    const lm = data.landmark.trim();
    const lmLower = lm.toLowerCase();
    const isAlreadyInPremise = premiseStr.toLowerCase().includes(lmLower);
    const isAlreadyInStreet = streetStr.toLowerCase().includes(lmLower);
    if (!isAlreadyInPremise && !isAlreadyInStreet) {
      const formattedLm = lmLower.startsWith('near') ? lm : `Near ${lm}`;
      lines.push(formattedLm);
    }
  }

  // Line 4: City, State - PIN code
  const cityStateParts: string[] = [];
  if (data.city) cityStateParts.push(data.city);

  let statePin = data.state || '';
  if (data.pincode) {
    statePin += statePin ? ` - ${data.pincode}` : data.pincode;
  }
  if (statePin) cityStateParts.push(statePin);

  if (cityStateParts.length > 0) {
    lines.push(cityStateParts.join(', '));
  }

  const singleLine = lines.join('\n');
  return { lines, singleLine };
};

export const parseNominatimAddress = (
  data: any,
  lat: number,
  lng: number,
  accuracy?: number
): ParsedLocationResult => {
  const INDIA_ERR_MSG = 'This service is currently available only in India.';

  const addr = data?.address || {};

  // Primary Check: Reverse-geocoded Country Validation
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
      accuracy,
      isValidInIndia: false,
      hasMissingFields: true,
      missingFields: ['country'],
      formattedLines: [],
      formattedSingleLine: '',
      error: INDIA_ERR_MSG,
    };
  }

  // Secondary Safeguard: Geographic Bounding Box Check
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
      accuracy,
      isValidInIndia: false,
      hasMissingFields: true,
      missingFields: ['country'],
      formattedLines: [],
      formattedSingleLine: '',
      error: INDIA_ERR_MSG,
    };
  }

  const houseNumber = addr.house_number || addr.door_number || '';
  const flatNumber = addr.flat_number || addr.unit || '';
  const buildingName = addr.building || addr.apartment || addr.residential || addr.housing_society || '';
  const street = addr.road || addr.street || '';
  const area = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || '';
  const landmark = extractLandmark(addr);
  const addressLine1 = extractAddressLine1(addr, data?.display_name);
  const city = extractCity(addr);
  const district = extractDistrict(addr) || city;
  const state = normalizeIndianState(addr.state);
  const pincode = extractPincode(addr);

  const missingFields: string[] = [];
  if (!city) missingFields.push('City');
  if (!state) missingFields.push('State');
  if (!pincode) missingFields.push('PIN Code');

  const { lines: formattedLines, singleLine: formattedSingleLine } = buildReadableAddress({
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
    accuracy,
    isValidInIndia: true,
    hasMissingFields: missingFields.length > 0,
    missingFields,
    formattedLines,
    formattedSingleLine,
  };
};

/**
  * Centralized helper to reverse-geocode lat/lng using OpenStreetMap Nominatim
  */
export const reverseGeocodeLocation = async (
  lat: number,
  lng: number,
  accuracy?: number
): Promise<ParsedLocationResult> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'HealthcareApp/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding HTTP status ${response.status}`);
    }

    const data = await response.json();
    return parseNominatimAddress(data, lat, lng, accuracy);
  } catch (err: any) {
    console.warn('Reverse geocoding error:', err);
    // Fallback object with coordinates saved
    const isIndia = isCoordinatesInIndia(lat, lng);
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
      accuracy,
      isValidInIndia: isIndia,
      hasMissingFields: true,
      missingFields: ['city', 'state', 'pincode'],
      formattedLines: [],
      formattedSingleLine: '',
      error: isIndia ? 'Could not reverse-geocode complete address. Please enter address manually.' : 'This service is currently available only in India.',
    };
  }
};

export interface PincodeLookupResult {
  success: boolean;
  city: string;
  district: string;
  state: string;
  pincode: string;
  error?: string;
}

/**
 * Validate and look up location for 6-digit Indian PIN codes
 */
export const lookupIndianPincode = async (pincode: string): Promise<PincodeLookupResult> => {
  const clean = (pincode || '').replace(/\D/g, '').slice(0, 6);

  if (!clean || clean.length < 6 || !INDIAN_PINCODE_REGEX.test(clean)) {
    return {
      success: false,
      city: '',
      district: '',
      state: '',
      pincode: clean,
      error: 'Invalid PIN code. Please enter a valid 6-digit Indian PIN code.',
    };
  }

  try {
    // 1. Primary Lookup: Official India Post Dataset API
    const response = await fetch(`https://api.postalpincode.in/pincode/${clean}`);
    if (response.ok) {
      const data = await response.json();
      if (
        Array.isArray(data) &&
        data.length > 0 &&
        data[0]?.Status === 'Success' &&
        Array.isArray(data[0].PostOffice) &&
        data[0].PostOffice.length > 0
      ) {
        const postOffice = data[0].PostOffice[0];
        const state = normalizeIndianState(postOffice.State);
        const district = (postOffice.District || postOffice.Division || '').trim();
        const cityCandidate = postOffice.Block && postOffice.Block !== 'NA' ? postOffice.Block : (postOffice.District || postOffice.Name || '');
        const city = String(cityCandidate).trim();

        return {
          success: true,
          city: city || district,
          district: district || city,
          state,
          pincode: clean,
        };
      }
    }

    // 2. Secondary Fallback: OpenStreetMap Nominatim Search API
    const nomUrl = `https://nominatim.openstreetmap.org/search?postalcode=${clean}&country=India&format=json&addressdetails=1`;
    const nomRes = await fetch(nomUrl, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'HealthcareApp/1.0',
      },
    });

    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0) {
        const addr = nomData[0].address || {};
        const state = normalizeIndianState(addr.state);
        const city = extractCity(addr);
        const district = extractDistrict(addr) || city;

        if (state || city || district) {
          return {
            success: true,
            city,
            district,
            state,
            pincode: clean,
          };
        }
      }
    }

    return {
      success: false,
      city: '',
      district: '',
      state: '',
      pincode: clean,
      error: 'Location not found for this PIN code. Please check the PIN code and try again.',
    };
  } catch (err) {
    console.warn('PIN code lookup error:', err);
    return {
      success: false,
      city: '',
      district: '',
      state: '',
      pincode: clean,
      error: 'Location not found for this PIN code. Please check the PIN code and try again.',
    };
  }
};

