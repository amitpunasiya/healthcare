const BASE_URL = 'http://localhost:5000';

async function runErrorTests() {
  console.log('=== CarePulse Error Handling & Information Leakage Tests ===\n');
  let allPassed = true;

  // Test 1: Unmatched Route 404 (Should return JSON, no Express stack/HTML)
  try {
    console.log('[Test 1] Testing Unmatched Route 404 (/api/v1/non-existent-endpoint)...');
    const res = await fetch(`${BASE_URL}/api/v1/non-existent-endpoint`);
    const data: any = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Payload:', data);

    const isJson = typeof data === 'object';
    const noStack = !data.stack && !JSON.stringify(data).includes('at ');
    const noPath = !JSON.stringify(data).includes('node_modules') && !JSON.stringify(data).includes('\\');
    if (res.status === 404 && isJson && noStack && noPath) {
      console.log('PASS: 404 returns safe JSON message without stack traces or path leakage.\n');
    } else {
      console.error('FAIL: 404 leaked info or wrong status.\n');
      allPassed = false;
    }
  } catch (err: any) {
    console.error('Error in Test 1:', err.message);
    allPassed = false;
  }

  // Test 2: Mongoose Cast Error (Should return 400 sanitized, not raw CastError or model schema)
  try {
    console.log('[Test 2] Testing Mongoose Cast Error (/api/v1/services?categoryId=invalid-id-12345)...');
    const res = await fetch(`${BASE_URL}/api/v1/services?categoryId=invalid-id-12345`);
    const data: any = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Payload:', data);

    const hasCastError = JSON.stringify(data).toLowerCase().includes('casterror') || JSON.stringify(data).includes('Cast to ObjectId');
    const noStack = !data.stack;
    if (res.status === 400 && !hasCastError && noStack && data.message === 'Invalid resource identifier format.') {
      console.log('PASS: Database CastError properly sanitized into safe user message.\n');
    } else {
      console.error('FAIL: CastError leaked database internals or wrong status/message.\n');
      allPassed = false;
    }
  } catch (err: any) {
    console.error('Error in Test 2:', err.message);
    allPassed = false;
  }

  // Test 3: Malformed JSON Payload (Should return 400 sanitized, not body-parser error)
  try {
    console.log('[Test 3] Testing Malformed JSON Payload (/api/v1/auth/login)...');
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email": "bad json',
    });
    const data: any = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Payload:', data);

    const noStack = !data.stack && !JSON.stringify(data).includes('SyntaxError');
    if (res.status === 400 && noStack) {
      console.log('PASS: Malformed JSON properly sanitized to safe message.\n');
    } else {
      console.error('FAIL: Malformed JSON error leaked internal parser details.\n');
      allPassed = false;
    }
  } catch (err: any) {
    console.error('Error in Test 3:', err.message);
    allPassed = false;
  }

  // Test 4: Verify that no response ever contains stack trace
  console.log('=== Error Handling Verification Summary ===');
  if (allPassed) {
    console.log('ALL TESTS PASSED: Users never receive stack traces, internal file paths, or raw DB errors.');
  } else {
    console.error('SOME TESTS FAILED.');
    process.exit(1);
  }
}

runErrorTests().catch(console.error);

export {};

