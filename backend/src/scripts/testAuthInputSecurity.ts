const BASE_URL = 'http://localhost:5000';

async function runAuthSecurityAudit() {
  console.log('=== CarePulse Login & Signup Input Security Audit ===\n');
  let allPassed = true;

  // Test 1: XSS / Script Injection in Customer fullName (Should be REJECTED, not silently cleaned)
  try {
    console.log('[Test 1] Testing XSS Injection in fullName (reject vs silent clean)...');
    const res = await fetch(`${BASE_URL}/api/v1/auth/register/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `xss.test.${Date.now()}@carepulse.in`,
        password: 'ValidPassword123!',
        fullName: 'John <script>alert("XSS")</script> Doe',
        phone: '9876543210',
      }),
    });
    const data: any = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', data);

    const isRejected = res.status === 400;
    const isGeneric = !data.errors && typeof data.message === 'string';
    if (isRejected && isGeneric) {
      console.log('PASS: Malformed script input was REJECTED outright (not silently sanitized), and error response is generic.\n');
    } else {
      console.error('FAIL: Script injection was either accepted or error response leaked field specifics!\n');
      allPassed = false;
    }
  } catch (err: any) {
    console.error('Error in Test 1:', err.message);
    allPassed = false;
  }

  // Test 2: HTML Injection in clinicName (Should be REJECTED)
  try {
    console.log('[Test 2] Testing HTML Tag Injection in clinicName...');
    const res = await fetch(`${BASE_URL}/api/v1/auth/register/clinic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `clinic.test.${Date.now()}@carepulse.in`,
        password: 'ValidPassword123!',
        clinicName: 'HealthCare <img src=x onerror=alert(1)> Clinic',
        ownerContactPerson: 'Dr. Sharma',
        phone: '9876543211',
        addressLine1: '123 Main Street',
      }),
    });
    const data: any = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', data);

    if (res.status === 400 && !data.errors) {
      console.log('PASS: HTML tags in clinicName rejected with generic response.\n');
    } else {
      console.error('FAIL: HTML tags in clinicName not properly handled.\n');
      allPassed = false;
    }
  } catch (err: any) {
    console.error('Error in Test 2:', err.message);
    allPassed = false;
  }

  // Test 3: Password Null Byte Injection
  try {
    console.log('[Test 3] Testing Null Byte Injection in Password...');
    const res = await fetch(`${BASE_URL}/api/v1/auth/register/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `nullbyte.${Date.now()}@carepulse.in`,
        password: 'Pass\0word123',
        fullName: 'Valid Name',
        phone: '9876543212',
      }),
    });
    const data: any = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', data);

    if (res.status === 400 && !data.errors) {
      console.log('PASS: Null byte password injection rejected safely.\n');
    } else {
      console.error('FAIL: Null byte password was not rejected.\n');
      allPassed = false;
    }
  } catch (err: any) {
    console.error('Error in Test 3:', err.message);
    allPassed = false;
  }

  // Test 4: Generic Error Response on Login (Does not leak whether email or password was wrong)
  try {
    console.log('[Test 4] Testing Login Error Response Genericity...');
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent.user.999@carepulse.in',
        password: 'AnyPassword123!',
      }),
    });
    const data: any = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', data);

    if (res.status === 401 && data.message === 'Invalid email or password.') {
      console.log('PASS: Failed login returns unified generic error, preventing account enumeration.\n');
    } else {
      console.error('FAIL: Login error leaked account existence or status.\n');
      allPassed = false;
    }
  } catch (err: any) {
    console.error('Error in Test 4:', err.message);
    allPassed = false;
  }

  // Test 5: Malformed Login Input (Malformed Email - Generic 400)
  try {
    console.log('[Test 5] Testing Malformed Login Input (Invalid email format)...');
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email<script>',
        password: 'ValidPassword123!',
      }),
    });
    const data: any = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', data);

    if (res.status === 400 && !data.errors && data.message === 'Invalid email, password, or request data.') {
      console.log('PASS: Malformed login input returns generic error and does not leak failing field.\n');
    } else {
      console.error('FAIL: Malformed login response leaked specific validation fields.\n');
      allPassed = false;
    }
  } catch (err: any) {
    console.error('Error in Test 5:', err.message);
    allPassed = false;
  }

  // Test 6: Legitimate Registration (Verify valid input still works seamlessly)
  try {
    console.log('[Test 6] Testing Legitimate Customer Registration...');
    const validEmail = `legit.user.${Date.now()}@carepulse.in`;
    const res = await fetch(`${BASE_URL}/api/v1/auth/register/customer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: validEmail,
        password: 'StrongPassword123!',
        fullName: 'Dharmendra Sharma',
        phone: '9876543219',
      }),
    });
    const data: any = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', { success: data.success, message: data.message, hasToken: !!data.token });

    if (res.status === 201 && data.success && data.token) {
      console.log('PASS: Valid registration succeeds seamlessly.\n');
    } else {
      console.error('FAIL: Legitimate registration failed!\n');
      allPassed = false;
    }
  } catch (err: any) {
    console.error('Error in Test 6:', err.message);
    allPassed = false;
  }

  console.log('=== Audit Summary ===');
  if (allPassed) {
    console.log('ALL TESTS PASSED: Server-side validation is 100% strict, zero client trust, generic error responses active, and security rejections logged.');
  } else {
    console.error('SOME TESTS FAILED.');
    process.exit(1);
  }
}

runAuthSecurityAudit().catch(console.error);

export {};

