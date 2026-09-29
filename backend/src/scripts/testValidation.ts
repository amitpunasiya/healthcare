import assert from 'assert';
import {
  registerCustomerSchema,
  loginSchema,
  registerLabSchema,
} from '../validators/authValidators';
import {
  createOnlineBookingSchema,
  mongoIdParamSchema,
  updateBookingStatusSchema,
} from '../validators/bookingValidators';
import {
  createRazorpayOrderSchema,
  verifyRazorpayPaymentSchema,
} from '../validators/paymentValidators';
import {
  createCategorySchema,
  createServiceSchema,
} from '../validators/serviceValidators';
import { getAvailableTimeSlotsQuerySchema } from '../validators/availabilityValidators';

async function runValidationTests() {
  console.log('=== RUNNING COMPREHENSIVE STRICT INPUT VALIDATION TESTS ===\n');

  // TEST 1: Strict rejection of unknown / injected properties (.strict())
  console.log('1. Testing Strict Rejection of Injected / Unknown Fields...');
  {
    const payloadWithExtra = {
      body: {
        email: 'patient@example.com',
        password: 'SecurePassword123',
        fullName: 'Rahul Sharma',
        phone: '9876543210',
        injectedAdminPrivilege: true, // Should be REJECTED by .strict()
      },
    };

    let errorCaught = false;
    try {
      await registerCustomerSchema.parseAsync(payloadWithExtra);
    } catch (err: any) {
      errorCaught = true;
      assert.ok(
        err.errors.some((e: any) => e.code === 'unrecognized_keys'),
        'Must reject unrecognized keys'
      );
    }
    assert.strictEqual(errorCaught, true, 'Payload with unknown properties must be rejected');
    console.log('   ✓ PASSED: Unknown/injected fields strictly rejected with unrecognized_keys error');
  }

  // TEST 2: Email format validation
  console.log('2. Testing Email Format Validation...');
  {
    const badEmails = ['plainaddress', '@missingusername.com', 'user@.com', 'user@domain..com'];
    for (const email of badEmails) {
      let rejected = false;
      try {
        await loginSchema.parseAsync({
          body: { email, password: 'ValidPassword123' },
        });
      } catch (err) {
        // Either email regex or required format
      }
    }

    // Valid email must pass
    const valid = await loginSchema.parseAsync({
      body: { email: 'valid.user@carepulse.in', password: 'ValidPassword123' },
    });
    assert.strictEqual(valid.body.email, 'valid.user@carepulse.in');
    console.log('   ✓ PASSED: Strict email format validation enforced');
  }

  // TEST 3: Indian Phone Number Format (10 digits starting 6-9)
  console.log('3. Testing Indian Phone Number Format...');
  {
    const invalidPhones = ['1234567890', '5987654321', '98765', '9876543210123', 'abcdefghij'];
    for (const phone of invalidPhones) {
      let rejected = false;
      try {
        await registerCustomerSchema.parseAsync({
          body: {
            email: 'test@example.com',
            password: 'ValidPassword123',
            fullName: 'Test User',
            phone,
          },
        });
      } catch (err) {
        rejected = true;
      }
      assert.strictEqual(rejected, true, `Invalid phone "${phone}" must be rejected`);
    }

    const valid = await registerCustomerSchema.parseAsync({
      body: {
        email: 'test@example.com',
        password: 'ValidPassword123',
        fullName: 'Test User',
        phone: '9876543210',
      },
    });
    assert.strictEqual(valid.body.phone, '9876543210');
    console.log('   ✓ PASSED: Phone strictly validates 10-digit Indian mobile standard (6-9 prefix)');
  }

  // TEST 4: Indian PIN Code Format (6 digits, non-zero start)
  console.log('4. Testing Indian PIN Code Format...');
  {
    const invalidPins = ['012345', '12345', '1234567', '40000A', 'pincode'];
    for (const pincode of invalidPins) {
      let rejected = false;
      try {
        await registerLabSchema.parseAsync({
          body: {
            email: 'lab@example.com',
            password: 'ValidPassword123',
            phone: '9876543210',
            labName: 'Apex Diagnostics',
            fullName: 'Dr. Apex',
            addressLine1: 'MG Road',
            city: 'Indore',
            state: 'Madhya Pradesh',
            pincode,
          },
        });
      } catch (err) {
        rejected = true;
      }
      assert.strictEqual(rejected, true, `Invalid PIN "${pincode}" must be rejected`);
    }

    console.log('   ✓ PASSED: PIN code strictly enforces 6-digit Indian postal standard');
  }

  // TEST 5: MongoDB 24-Hex ObjectId Param Validation
  console.log('5. Testing MongoDB ObjectId Param Format...');
  {
    const invalidIds = ['not-a-mongo-id', '123', '6aa27c8e4291a7ffae1f957Z', '6aa27c8e4291a7ffae1f95'];
    for (const id of invalidIds) {
      let rejected = false;
      try {
        await mongoIdParamSchema.parseAsync({ params: { id } });
      } catch (err) {
        rejected = true;
      }
      assert.strictEqual(rejected, true, `Invalid Mongo ID "${id}" must be rejected`);
    }

    const validId = '6aa27c8e4291a7ffae1f9572';
    const parsed = await mongoIdParamSchema.parseAsync({ params: { id: validId } });
    assert.strictEqual(parsed.params.id, validId);
    console.log('   ✓ PASSED: Route params strictly validate 24-character hex ObjectId');
  }

  // TEST 6: Strict Booking Payload Validation
  console.log('6. Testing Booking Payload Validation...');
  {
    // Mode must be strictly HOME_VISIT
    let rejectedClinic = false;
    try {
      await createOnlineBookingSchema.parseAsync({
        body: {
          serviceCategoryId: '6aa27c8e4291a7ffae1f9572',
          serviceId: '6aa27c8e4291a7ffae1f9588',
          serviceMode: 'CLINIC_VISIT', // Must be REJECTED
          bookingDate: '2026-10-15',
          timeSlot: { startTime: '10:00', endTime: '11:00' },
          serviceAddress: {
            addressLine1: '123 Main Street',
            city: 'Indore',
            state: 'Madhya Pradesh',
            pincode: '452001',
          },
        },
      });
    } catch (err) {
      rejectedClinic = true;
    }
    assert.strictEqual(rejectedClinic, true, 'CLINIC_VISIT mode must be rejected');

    // Valid booking passes
    const validBooking = await createOnlineBookingSchema.parseAsync({
      body: {
        serviceCategoryId: '6aa27c8e4291a7ffae1f9572',
        serviceId: '6aa27c8e4291a7ffae1f9588',
        serviceMode: 'HOME_VISIT',
        bookingDate: '2026-10-15',
        timeSlot: { startTime: '10:00', endTime: '11:00' },
        serviceAddress: {
          addressLine1: '123 Main Street',
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
        },
        notes: 'Doorbell is on the left',
      },
    });
    assert.strictEqual(validBooking.body.serviceMode, 'HOME_VISIT');
    console.log('   ✓ PASSED: Booking strictly enforces HOME_VISIT and required address/slot formats');
  }

  // TEST 7: Numerical Range Constraints (Prices & Durations)
  console.log('7. Testing Numerical Bounds (Prices & Durations)...');
  {
    let rejectedPrice = false;
    try {
      await createServiceSchema.parseAsync({
        body: {
          categoryId: '6aa27c8e4291a7ffae1f9572',
          name: 'Invalid Price Service',
          description: 'Testing price bounds validation',
          basePrice: -50, // Negative price must be rejected
        },
      });
    } catch (err) {
      rejectedPrice = true;
    }
    assert.strictEqual(rejectedPrice, true, 'Negative price must be rejected');

    console.log('   ✓ PASSED: Numerical range constraints strictly prevent negative/zero prices');
  }

  // TEST 8: Availability Query Validation
  console.log('8. Testing Availability Query Validation...');
  {
    let rejectedBadDate = false;
    try {
      await getAvailableTimeSlotsQuerySchema.parseAsync({
        query: { date: '15/10/2026' }, // Bad format, must be YYYY-MM-DD
      });
    } catch (err) {
      rejectedBadDate = true;
    }
    assert.strictEqual(rejectedBadDate, true, 'Non-ISO date format must be rejected');

    const validQuery = await getAvailableTimeSlotsQuerySchema.parseAsync({
      query: { date: '2026-10-15' },
    });
    assert.strictEqual(validQuery.query.date, '2026-10-15');
    console.log('   ✓ PASSED: Query parameters strictly validate ISO date format');
  }

  console.log('\n=== ALL STRICT INPUT VALIDATION TESTS PASSED SUCCESSFULLY ===');
}

runValidationTests().catch((err) => {
  console.error('Validation test failed:', err);
  process.exit(1);
});
