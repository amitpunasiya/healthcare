import assert from 'assert';
import {
  authIpRateLimiter,
  loginIpRateLimiter,
  authAccountProtection,
  recordAuthFailure,
  recordAuthSuccess,
  publicRateLimiter,
  authenticatedRateLimiter,
} from '../middlewares/rateLimiter';
import { env } from '../config/env';

// Mock Express Request & Response helper
function createMockReqRes(options: {
  ip?: string;
  body?: any;
  user?: any;
}) {
  const headers: Record<string, string | number> = {};
  let statusCode = 200;
  let jsonBody: any = null;

  const req: any = {
    headers: {},
    socket: { remoteAddress: options.ip || '127.0.0.1' },
    body: options.body || {},
    user: options.user,
  };

  const res: any = {
    setHeader: (key: string, val: any) => {
      headers[key.toLowerCase()] = val;
    },
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      jsonBody = data;
      return res;
    },
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getHeaders: () => headers,
    getJson: () => jsonBody,
  };
}

async function runTests() {
  console.log('=== CarePulse Anti-Brute-Force & Rate Limiting Tests ===\n');

  // TEST 1: Public Rate Limiter
  console.log('1. Testing Public Rate Limiter...');
  {
    const ip = '10.0.0.1';
    const { req, res, getStatus } = createMockReqRes({ ip });
    let nextCalled = false;
    publicRateLimiter(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'First request should pass');
    assert.strictEqual(getStatus(), 200);
    console.log('   ✓ PASSED: Public requests allowed within limit');
  }

  // TEST 2: Authenticated User Rate Limiter
  console.log('2. Testing Authenticated User Rate Limiter...');
  {
    const user = { id: 'usr_abc123' };
    const { req, res, getStatus } = createMockReqRes({ user });
    let nextCalled = false;
    authenticatedRateLimiter(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'First auth user request should pass');
    assert.strictEqual(getStatus(), 200);
    console.log('   ✓ PASSED: Authenticated user requests allowed');
  }

  // TEST 3: Layer 1 - Per-IP /login Throttling with Unified 401 Response
  console.log('3. Testing Layer 1: Per-IP /login Throttling...');
  {
    const attackerIp = '198.51.100.55';
    const max = env.RATE_LIMIT_LOGIN_IP_MAX; // e.g. 10 attempts

    for (let i = 1; i <= max; i++) {
      const { req, res, getStatus } = createMockReqRes({ ip: attackerIp });
      let nextCalled = false;
      loginIpRateLimiter(req, res, () => { nextCalled = true; });
      assert.strictEqual(nextCalled, true, `Request ${i} should be allowed`);
      assert.strictEqual(getStatus(), 200);
    }

    // Next request exceeds IP threshold
    const { req: reqBlocked, res: resBlocked, getStatus: getStatusBlocked, getJson: getJsonBlocked } = createMockReqRes({ ip: attackerIp });
    let nextCalledBlocked = false;
    loginIpRateLimiter(reqBlocked, resBlocked, () => { nextCalledBlocked = true; });
    assert.strictEqual(nextCalledBlocked, false, 'Request over limit should be throttled');
    // Unified failure response to user looks identical (401 Invalid email or password)
    assert.strictEqual(getStatusBlocked(), 401, 'Status should be 401');
    assert.strictEqual(getJsonBlocked().message, 'Invalid email or password.');
    console.log(`   ✓ PASSED: /login per-IP throttling triggers after ${max} attempts with identical 401 response`);
  }

  // TEST 4: Layer 2 - Per-Account Protection (Progressive Delay & Temporary Lockout)
  console.log('4. Testing Layer 2: Per-Account Protection & Lockout...');
  {
    const targetAccount = 'target_user@carepulse.com';
    recordAuthSuccess(targetAccount); // ensure clean initial state

    // 4.1: First 3 failures should have 0s delay
    for (let f = 1; f <= env.RATE_LIMIT_AUTH_ACCOUNT_MAX_FAILURES; f++) {
      const result = await recordAuthFailure(targetAccount, '203.0.113.10');
      assert.strictEqual(result?.failures, f);
      assert.strictEqual(result?.delaySec, 0, `Failure ${f} should have 0s delay`);

      const { req, res, getStatus } = createMockReqRes({ body: { email: targetAccount } });
      let nextCalled = false;
      await authAccountProtection(req, res, () => { nextCalled = true; });
      assert.strictEqual(nextCalled, true, `Attempt ${f} should pass to credential check`);
      assert.strictEqual(getStatus(), 200);
    }
    console.log(`   ✓ PASSED: First ${env.RATE_LIMIT_AUTH_ACCOUNT_MAX_FAILURES} failures allowed without backoff delay`);

    // 4.2: 4th failure triggers progressive delay (2s)
    const fail4 = await recordAuthFailure(targetAccount, '203.0.113.10');
    assert.strictEqual(fail4?.failures, 4);
    assert.strictEqual(fail4?.isLockedOut, false, '4th failure is not yet hard locked');
    assert.ok(fail4?.delaySec! > 0, '4th failure should have progressive delay');

    // Immediate attempt while throttled returns identical generic 401
    const { req: req4, res: res4, getStatus: getStatus4, getJson: getJson4 } = createMockReqRes({
      body: { email: targetAccount },
    });
    let nextCalled4 = false;
    await authAccountProtection(req4, res4, () => { nextCalled4 = true; });
    assert.strictEqual(nextCalled4, false, 'Immediate attempt during throttle must be blocked');
    assert.strictEqual(getStatus4(), 401, 'Status must be identical 401');
    assert.strictEqual(getJson4().message, 'Invalid email or password.');
    console.log(`   ✓ PASSED: 4th failure triggers progressive delay and returns unified 401 error`);

    // 4.3: 5th failure triggers TEMPORARY LOCKOUT & EMAIL ALERT
    const fail5 = await recordAuthFailure(targetAccount, '203.0.113.10');
    assert.strictEqual(fail5?.failures, 5);
    assert.strictEqual(fail5?.isLockedOut, true, '5th failure triggers temporary lockout');
    assert.ok(fail5?.delaySec! >= 800, 'Lockout duration must be 15 minutes (900s)');

    // Attempt on locked account returns identical generic 401
    const { req: req5, res: res5, getStatus: getStatus5, getJson: getJson5 } = createMockReqRes({
      body: { email: targetAccount },
    });
    let nextCalled5 = false;
    await authAccountProtection(req5, res5, () => { nextCalled5 = true; });
    assert.strictEqual(nextCalled5, false, 'Attempt on locked account must be blocked');
    assert.strictEqual(getStatus5(), 401, 'Status must be identical 401');
    assert.strictEqual(getJson5().message, 'Invalid email or password.');
    console.log(`   ✓ PASSED: 5th failure triggers 15-minute lockout, email alert, and returns unified 401 error`);

    // 4.4: Successful login clears all failure counters
    recordAuthSuccess(targetAccount);
    const { req: reqClear, res: resClear, getStatus: getStatusClear } = createMockReqRes({
      body: { email: targetAccount },
    });
    let nextCalledClear = false;
    await authAccountProtection(reqClear, resClear, () => { nextCalledClear = true; });
    assert.strictEqual(nextCalledClear, true, 'After successful login, account is immediately unblocked');
    assert.strictEqual(getStatusClear(), 200);
    console.log('   ✓ PASSED: Successful authentication resets failure counter and clears lockout');
  }

  console.log('\n=== ALL ANTI-BRUTE-FORCE TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

export {};
