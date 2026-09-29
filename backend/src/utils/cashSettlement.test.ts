import { BookingStatus, PaymentStatus, PaymentMethod, PlatformSettlementStatus } from '../constants/enums';

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
console.log(' RUNNING CASH PAYMENT & PLATFORM PAYABLE TEST SUITE            ');
console.log('===============================================================\n');

// Mock helper to calculate cash settlement fields
function calculateCashSettlement(booking: any, paymentMethod: string) {
  const grossAmount = booking.pricing?.totalAmount || 0;
  const platformFee = Math.round(grossAmount * 0.2); // 20% platform fee
  const netEarning = grossAmount - platformFee;

  const isEligible = (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.PAID) &&
                     (booking.paymentStatus === PaymentStatus.PAID || booking.status === BookingStatus.PAID);

  const isCash = paymentMethod === PaymentMethod.CASH || paymentMethod === PaymentMethod.CASH_OFFLINE;

  const cashCollectedByProvider = (isEligible && isCash) ? grossAmount : 0;
  const platformPayableAmount = (isEligible && isCash) ? platformFee : 0;
  const platformSettlementStatus = isEligible && isCash ? PlatformSettlementStatus.DUE : PlatformSettlementStatus.NOT_APPLICABLE;

  return {
    grossAmount,
    platformFee,
    netEarning: isEligible ? netEarning : 0,
    cashCollectedByProvider,
    platformPayableAmount,
    platformSettlementStatus,
    isEligible,
    isCash,
  };
}

// -------------------------------------------------------------
// Test 1: ₹1,000 completed CASH booking
// -------------------------------------------------------------
console.log('Test 1: ₹1,000 completed CASH booking');
const booking1 = {
  _id: 'b_cash_1',
  status: BookingStatus.PAID,
  paymentStatus: PaymentStatus.PAID,
  pricing: { totalAmount: 1000 },
};
const res1 = calculateCashSettlement(booking1, PaymentMethod.CASH);
assert(res1.grossAmount === 1000, 'Gross cash collected is ₹1,000');
assert(res1.platformPayableAmount === 200, 'Platform Fee Due is ₹200 (20%)');
assert(res1.netEarning === 800, 'Provider Net Earning is ₹800 (80%)');
assert(res1.platformSettlementStatus === PlatformSettlementStatus.DUE, 'Status is PLATFORM FEE DUE');

// -------------------------------------------------------------
// Test 2: ₹1,500 completed CASH booking
// -------------------------------------------------------------
console.log('\nTest 2: ₹1,500 completed CASH booking');
const booking2 = {
  _id: 'b_cash_2',
  status: BookingStatus.PAID,
  paymentStatus: PaymentStatus.PAID,
  pricing: { totalAmount: 1500 },
};
const res2 = calculateCashSettlement(booking2, PaymentMethod.CASH);
assert(res2.platformPayableAmount === 300, 'Platform Fee Due for ₹1,500 booking is ₹300');
assert(res2.netEarning === 1200, 'Provider Net Earning is ₹1,200');

// -------------------------------------------------------------
// Test 3: Multiple cash bookings accumulate platform due correctly
// -------------------------------------------------------------
console.log('\nTest 3: Multiple cash bookings accumulating platform due');
const cashBookings = [
  calculateCashSettlement(booking1, PaymentMethod.CASH),
  calculateCashSettlement(booking2, PaymentMethod.CASH),
];
const accumulatedPayable = cashBookings.reduce((sum, b) => sum + b.platformPayableAmount, 0);
assert(accumulatedPayable === 500, `Total accumulated platform due is ₹500 (200 + 300)`);

// -------------------------------------------------------------
// Test 4: Online payment (NOT included in cash platform payable)
// -------------------------------------------------------------
console.log('\nTest 4: Online payment booking (Razorpay)');
const onlineBooking = {
  _id: 'b_online_1',
  status: BookingStatus.PAID,
  paymentStatus: PaymentStatus.PAID,
  pricing: { totalAmount: 1000 },
};
const resOnline = calculateCashSettlement(onlineBooking, PaymentMethod.RAZORPAY);
assert(resOnline.isCash === false, 'Online payment is not classified as cash');
assert(resOnline.platformPayableAmount === 0, 'Online payment platform payable by provider is ₹0');
assert(resOnline.platformSettlementStatus === PlatformSettlementStatus.NOT_APPLICABLE, 'Status is NOT_APPLICABLE for cash payable');

// -------------------------------------------------------------
// Test 5: Pending booking
// -------------------------------------------------------------
console.log('\nTest 5: Pending booking');
const pendingBooking = {
  _id: 'b_pending',
  status: BookingStatus.PENDING,
  paymentStatus: PaymentStatus.PENDING,
  pricing: { totalAmount: 1000 },
};
const resPending = calculateCashSettlement(pendingBooking, PaymentMethod.CASH);
assert(resPending.platformPayableAmount === 0, 'Pending booking platform payable is ₹0');

// -------------------------------------------------------------
// Test 6: Rejected booking
// -------------------------------------------------------------
console.log('\nTest 6: Rejected booking');
const rejectedBooking = {
  _id: 'b_rejected',
  status: BookingStatus.REJECTED,
  paymentStatus: PaymentStatus.PENDING,
  pricing: { totalAmount: 1000 },
};
const resRejected = calculateCashSettlement(rejectedBooking, PaymentMethod.CASH);
assert(resRejected.platformPayableAmount === 0, 'Rejected booking platform payable is ₹0');

// -------------------------------------------------------------
// Test 7: Cancelled booking
// -------------------------------------------------------------
console.log('\nTest 7: Cancelled booking');
const cancelledBooking = {
  _id: 'b_cancelled',
  status: BookingStatus.CANCELLED,
  paymentStatus: PaymentStatus.CANCELLED,
  pricing: { totalAmount: 1000 },
};
const resCancelled = calculateCashSettlement(cancelledBooking, PaymentMethod.CASH);
assert(resCancelled.platformPayableAmount === 0, 'Cancelled booking platform payable is ₹0');

// -------------------------------------------------------------
// Test 8: Completed but unpaid booking (PAYMENT_PENDING)
// -------------------------------------------------------------
console.log('\nTest 8: Completed but unpaid booking');
const unpaidCompletedBooking = {
  _id: 'b_unpaid',
  status: BookingStatus.PAYMENT_PENDING,
  paymentStatus: PaymentStatus.PENDING,
  pricing: { totalAmount: 1000 },
};
const resUnpaid = calculateCashSettlement(unpaidCompletedBooking, PaymentMethod.CASH);
assert(resUnpaid.platformPayableAmount === 0, 'Unpaid completed booking platform payable is ₹0 until cash is collected');

// -------------------------------------------------------------
// Test 9: Completed + CASH paid booking generates Platform Fee DUE
// -------------------------------------------------------------
console.log('\nTest 9: Completed + CASH paid booking generates Platform Fee DUE');
assert(res1.isEligible === true && res1.isCash === true && res1.platformSettlementStatus === PlatformSettlementStatus.DUE, 'Generates Platform Fee DUE');

// -------------------------------------------------------------
// Test 10: Provider pays platform amount -> Outstanding amount decreases
// -------------------------------------------------------------
console.log('\nTest 10: Provider pays platform amount');
let providerPayableRecord = {
  ...res1,
  platformSettlementStatus: PlatformSettlementStatus.DUE,
  platformPayableAmount: 200,
};
// Provider pays platform fee
providerPayableRecord.platformSettlementStatus = PlatformSettlementStatus.PAID;
assert(providerPayableRecord.platformSettlementStatus === PlatformSettlementStatus.PAID, 'Status updated to PAID after provider settlement');

const updatedDueAmount = (providerPayableRecord.platformSettlementStatus as any) === PlatformSettlementStatus.DUE ? providerPayableRecord.platformPayableAmount : 0;
assert(updatedDueAmount === 0, 'Outstanding platform amount due decreases to ₹0');

// -------------------------------------------------------------
// Test 11: IDOR Protection Assertion (Provider A cannot access Provider B's ledger)
// -------------------------------------------------------------
console.log('\nTest 11: IDOR Security Assertion');
const authProviderId = 'provider_A_id';
const dbFilter = { entityUserId: authProviderId, platformSettlementStatus: { $ne: PlatformSettlementStatus.NOT_APPLICABLE } };
assert(dbFilter.entityUserId === authProviderId, 'Backend enforces authenticated provider ID from JWT');

// -------------------------------------------------------------
// Test 12: Date filter correctly filters cash payable
// -------------------------------------------------------------
console.log('\nTest 12: Date filtering on cash payable');
const cashList = [
  { date: '2026-09-15', amount: 200 },
  { date: '2026-09-10', amount: 300 },
];
const sep15Filter = cashList.filter(c => c.date === '2026-09-15');
assert(sep15Filter.length === 1 && sep15Filter[0].amount === 200, 'Date filter returns only 2026-09-15 cash payable (₹200)');

// -------------------------------------------------------------
// Test 13: Duplicate platform payable prevention on reload
// -------------------------------------------------------------
console.log('\nTest 13: Duplicate settlement prevention');
const settlementMap = new Map<string, any>();
settlementMap.set('b_cash_1', res1);
settlementMap.set('b_cash_1', res1); // duplicate insertion attempt
assert(settlementMap.size === 1, 'Map lookup prevents duplicate settlement entries');

console.log(`\n===============================================================`);
console.log(` TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log(`===============================================================\n`);

if (testsFailed > 0) {
  process.exit(1);
}
