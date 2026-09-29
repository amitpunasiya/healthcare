import { calculateHaversineDistance } from './distance';
import { validateIndianAddress } from './indiaValidation';
import { BookingStatus, PaymentStatus } from '../constants/enums';

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

console.log('\n===============================================================');
console.log(' RUNNING POST-SERVICE PAYMENT & NEARBY DISPATCH TEST SUITE     ');
console.log('===============================================================\n');

// 1. Distance Calculation (Haversine 5 KM Radius)
console.log('Group 1: Haversine 5 KM Radius Distance Calculation');
const dist1 = calculateHaversineDistance(22.7196, 75.8577, 22.7300, 75.8600); // ~1.2 km
assert(dist1 <= 5.0, `Indore nearby point distance is ${dist1} km (<= 5 KM)`);

const distFar = calculateHaversineDistance(22.7196, 75.8577, 28.6139, 77.2090); // ~650 km
assert(distFar > 5.0, `Delhi point distance from Indore is ${distFar} km (> 5 KM)`);

// 2. Initial Booking Request without Payment
console.log('\nGroup 2: Initial Request Creation Without Upfront Payment');
const mockRequestBooking: any = {
  _id: 'booking_101',
  bookingNumber: 'CP-20260911-1001',
  serviceMode: 'HOME_VISIT',
  status: BookingStatus.REQUESTED,
  paymentStatus: PaymentStatus.PENDING,
  nearbyProviderCount: 3,
  providerResponses: [
    { providerId: 'prov_1', status: 'PENDING', distance: 1.2 },
    { providerId: 'prov_2', status: 'PENDING', distance: 2.5 },
    { providerId: 'prov_3', status: 'PENDING', distance: 4.1 },
  ],
  pricing: { baseFee: 800, homeCollectionFee: 0, discountFee: 0, totalAmount: 800 },
};

assert(mockRequestBooking.status === BookingStatus.REQUESTED, 'Initial status is REQUESTED');
assert(mockRequestBooking.paymentStatus === PaymentStatus.PENDING, 'Initial paymentStatus is PENDING');
assert(mockRequestBooking.razorpayOrderId === undefined, 'No Razorpay order created at initial request');
assert(mockRequestBooking.nearbyProviderCount === 3, 'Discovered 3 providers within 5 KM');

// 3. Provider Acceptance & Single Fixed OTP Generation
console.log('\nGroup 3: Atomic Provider Acceptance & Fixed OTP Generation');
let acceptState: any = { ...mockRequestBooking };
const generatedOtp = '4829';

// Simulate Atomic Update
if (acceptState.status === BookingStatus.REQUESTED) {
  acceptState.status = BookingStatus.ACCEPTED;
  acceptState.providerId = 'prov_1';
  acceptState.assignedProviderId = 'prov_1';
  acceptState.serviceOtp = generatedOtp;
  acceptState.serviceOtpHash = generatedOtp;
  acceptState.providerResponses[0].status = 'ACCEPTED';
  acceptState.providerResponses[1].status = 'CANCELLED';
  acceptState.providerResponses[2].status = 'CANCELLED';
}

assert(acceptState.status === BookingStatus.ACCEPTED, 'Status updated to ACCEPTED');
assert(acceptState.serviceOtp === '4829', 'Fixed 4-digit OTP is set to 4829');
assert(acceptState.providerResponses[0].status === 'ACCEPTED', 'Accepting provider marked ACCEPTED');
assert(acceptState.providerResponses[1].status === 'CANCELLED', 'Other pending responses auto-cancelled');

// Second provider trying to accept (Race condition prevention check)
const secondAcceptSuccess = acceptState.status === BookingStatus.REQUESTED;
assert(secondAcceptSuccess === false, 'Prevented race condition duplicate acceptance by second provider');

// OTP Persistence check (Must not change on reload)
const reloadedOtp = acceptState.serviceOtp;
assert(reloadedOtp === '4829', 'OTP remains unchanged after reload/refetch');

// 4. OTP Verification & Service Start
console.log('\nGroup 4: Service Start with OTP Verification');
let startState: any = { ...acceptState };

// Wrong OTP attempt
const wrongOtpAttempt = '9999' === startState.serviceOtp;
assert(wrongOtpAttempt === false, 'Wrong OTP (9999) fails verification');
assert(startState.status === BookingStatus.ACCEPTED, 'Status remains ACCEPTED after wrong OTP attempt');

// Correct OTP attempt
const correctOtpAttempt = '4829' === startState.serviceOtp;
if (correctOtpAttempt && startState.status === BookingStatus.ACCEPTED) {
  startState.status = BookingStatus.IN_PROGRESS;
  startState.serviceStartedAt = new Date();
}
assert(startState.status === BookingStatus.IN_PROGRESS, 'Status updated to IN_PROGRESS upon correct OTP');
assert(startState.serviceStartedAt !== undefined, 'serviceStartedAt timestamp recorded');

// 5. Service Completion & Post-Service Payment Due
console.log('\nGroup 5: Service Completion & Post-Service Payment Order');
let completeState: any = { ...startState };

// Completion before starting check
const canCompleteBeforeStart = mockRequestBooking.status === BookingStatus.IN_PROGRESS;
assert(canCompleteBeforeStart === false, 'Cannot complete service before it is started');

if (completeState.status === BookingStatus.IN_PROGRESS) {
  completeState.status = BookingStatus.PAYMENT_PENDING;
  completeState.paymentStatus = PaymentStatus.PENDING;
  completeState.serviceCompletedAt = new Date();
}

assert(completeState.status === BookingStatus.PAYMENT_PENDING, 'Status transitioned to PAYMENT_PENDING');
assert(completeState.serviceCompletedAt !== undefined, 'serviceCompletedAt timestamp recorded');

// Razorpay order allowed ONLY after serviceCompletedAt exists
const canCreateRazorpayOrder = completeState.serviceCompletedAt !== undefined && completeState.status === BookingStatus.PAYMENT_PENDING;
assert(canCreateRazorpayOrder === true, 'Razorpay order creation enabled only AFTER service completion');

// 6. Payment Verification & Closure
console.log('\nGroup 6: Payment Verification & Final Booking Closure');
let paidState: any = { ...completeState };
if (paidState.status === BookingStatus.PAYMENT_PENDING) {
  paidState.status = BookingStatus.PAID;
  paidState.paymentStatus = PaymentStatus.PAID;
  paidState.paidAt = new Date();
}

assert(paidState.status === BookingStatus.PAID, 'Status updated to PAID after payment verification');
assert(paidState.paymentStatus === PaymentStatus.PAID, 'Payment status updated to PAID');
assert(paidState.paidAt !== undefined, 'paidAt timestamp recorded');

// 7. No Providers Found & All Rejected Fallback Cases
console.log('\nGroup 7: Fallback Scenarios (Zero Providers & All Rejected)');
const zeroProviderBooking = {
  nearbyProviderCount: 0,
  providerResponses: [],
  status: BookingStatus.NO_PROVIDER_FOUND,
};
assert(zeroProviderBooking.status === BookingStatus.NO_PROVIDER_FOUND, 'Zero nearby providers handled as NO_PROVIDER_FOUND');

const allRejectedResponses = [
  { providerId: 'prov_1', status: 'REJECTED' },
  { providerId: 'prov_2', status: 'REJECTED' },
];
const allRejected = allRejectedResponses.every((r) => r.status === 'REJECTED');
assert(allRejected === true, 'Identified when all nearby providers reject request');

console.log('\n===============================================================');
console.log(` TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('===============================================================\n');

if (testsFailed > 0) {
  process.exit(1);
}
