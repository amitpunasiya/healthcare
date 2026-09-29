import {
  isCoordinatesInIndia,
  validateIndianAddress,
  INDIAN_PINCODE_REGEX,
  INDIAN_STATES_AND_UTS,
  normalizeIndianState,
  extractCity,
  extractDistrict,
  extractPincode,
  extractAddressLine1,
  parseNominatimAddress,
} from './indiaValidation';
import { calculateHaversineDistance } from './distance';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASSED: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAILED: ${testName}`);
    testsFailed++;
  }
}

console.log('\n==================================================');
console.log(' RUNNING INDIA LOCATION & ADDRESS VALIDATION TESTS ');
console.log('==================================================\n');

// Test 1: GPS location in India bounding box
console.log('Group 1: GPS Coordinates Bounding Box Check');
assert(isCoordinatesInIndia(22.7196, 75.8577) === true, 'Indore coordinates (22.7196, 75.8577) are inside India');
assert(isCoordinatesInIndia(26.9124, 75.7873) === true, 'Jaipur coordinates (26.9124, 75.7873) are inside India');
assert(isCoordinatesInIndia(19.0760, 72.8777) === true, 'Mumbai coordinates (19.0760, 72.8777) are inside India');
assert(isCoordinatesInIndia(28.6139, 77.2090) === true, 'Delhi coordinates (28.6139, 77.2090) are inside India');
assert(isCoordinatesInIndia(40.7128, -74.0060) === false, 'New York coordinates (40.7128, -74.0060) are OUTSIDE India');
assert(isCoordinatesInIndia(51.5074, -0.1278) === false, 'London coordinates (51.5074, -0.1278) are OUTSIDE India');

// Test 2: State & District Mapping Logic
console.log('\nGroup 2: State, City & District Normalization & Mapping');
assert(normalizeIndianState('Madhya Pradesh') === 'Madhya Pradesh', 'Normalizes "Madhya Pradesh" to canonical Indian state');
assert(normalizeIndianState('rajasthan') === 'Rajasthan', 'Normalizes lowercase "rajasthan" to canonical "Rajasthan"');
assert(normalizeIndianState('State') === '', 'Rejects placeholder "State" and returns empty string');

const nominatimSample = {
  address: {
    house_number: 'Flat 4B',
    road: 'MG Road',
    suburb: 'Vijay Nagar',
    city: 'Indore',
    state_district: 'Indore District',
    state: 'Madhya Pradesh',
    postcode: '452010',
    country: 'India',
    country_code: 'in',
  },
  display_name: 'Flat 4B, MG Road, Vijay Nagar, Indore, Madhya Pradesh, 452010, India',
};

assert(extractCity(nominatimSample.address) === 'Indore', 'City is extracted as "Indore"');
assert(extractDistrict(nominatimSample.address) === 'Indore District', 'District extracted correctly from state_district');
assert(extractCity(nominatimSample.address) !== 'Madhya Pradesh', 'City is NOT mapped to state');
assert(normalizeIndianState(nominatimSample.address.state) === 'Madhya Pradesh', 'State is extracted as "Madhya Pradesh"');
assert(normalizeIndianState(nominatimSample.address.state) !== 'Indore', 'State is NOT mapped to city');
assert(extractCity({ city: 'Metropolis' }) === '', 'Rejects demo city "Metropolis" and returns empty string');

// Test 3: Indian PIN code validation (6 digits)
console.log('\nGroup 3: Indian 6-Digit PIN Code Validation');
assert(INDIAN_PINCODE_REGEX.test('452001') === true, '452001 is a valid 6-digit PIN code');
assert(INDIAN_PINCODE_REGEX.test('302001') === true, '302001 (Jaipur) is a valid 6-digit PIN code');
assert(INDIAN_PINCODE_REGEX.test('110001') === true, '110001 is a valid 6-digit PIN code');
assert(INDIAN_PINCODE_REGEX.test('010001') === false, 'PIN starting with 0 is invalid');
assert(INDIAN_PINCODE_REGEX.test('12345') === false, '5-digit PIN code is invalid');
assert(INDIAN_PINCODE_REGEX.test('1234567') === false, '7-digit PIN code is invalid');
assert(INDIAN_PINCODE_REGEX.test('abc123') === false, 'Alphanumeric PIN code is invalid');

// Test 4: Dynamic non-hardcoded Reverse Geocoding
console.log('\nGroup 4: Non-hardcoded India-wide Reverse Geocoding');
const nominatimJaipur = {
  address: {
    city: 'Jaipur',
    state: 'Rajasthan',
    postcode: '302001',
    country: 'India',
    country_code: 'in',
  },
};
const parsedJaipur = parseNominatimAddress(nominatimJaipur, 26.9124, 75.7873);
assert(parsedJaipur.city === 'Jaipur', 'GPS detects Jaipur dynamically');
assert(parsedJaipur.state === 'Rajasthan', 'GPS detects Rajasthan state dynamically');
assert(parsedJaipur.country === 'India', 'Country is "India"');

const nominatimForeign = {
  address: {
    city: 'London',
    country: 'United Kingdom',
    country_code: 'gb',
  },
};
const parsedForeign = parseNominatimAddress(nominatimForeign, 51.5074, -0.1278);
assert(parsedForeign.isValidInIndia === false, 'Foreign location is correctly flagged as invalid in India');

// Test 5: Reverse geocoding failure does not create fake address values
console.log('\nGroup 5: Handling Missing / Empty Reverse Geocoding Data');
const nominatimPartial = {
  address: {
    road: 'Main Street',
    country: 'India',
    country_code: 'in',
  },
};
const parsedPartial = parseNominatimAddress(nominatimPartial, 22.7196, 75.8577);
assert(parsedPartial.city === '', 'Missing city is left as empty string (no fake Metropolis)');
assert(parsedPartial.state === '', 'Missing state is left as empty string (no fake State)');
assert(parsedPartial.pincode === '', 'Missing pincode is left as empty string (no fake 110001)');
assert(parsedPartial.hasMissingFields === true, 'Flags missing fields correctly');

// Test 6: Backend validateIndianAddress rules & Haversine calculation
console.log('\nGroup 6: Backend Validator & Haversine Distance');
assert(validateIndianAddress({ city: 'Indore', state: 'Madhya Pradesh', pincode: '452001', country: 'India' }).isValid === true, 'Valid Indian address passes backend validator');
assert(validateIndianAddress({ city: 'Metropolis', pincode: '452001' }).isValid === false, 'Demo city Metropolis rejected by backend validator');
assert(validateIndianAddress({ state: 'State', pincode: '452001' }).isValid === false, 'Demo state State rejected by backend validator');

const distWithin5KM = calculateHaversineDistance(26.9124, 75.7873, 26.9200, 75.7900);
assert(distWithin5KM <= 5.0, `Calculated Haversine distance (${distWithin5KM} km) is within 5 KM`);

console.log('\n==================================================');
console.log(` TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('==================================================\n');

if (testsFailed > 0) {
  process.exit(1);
}

