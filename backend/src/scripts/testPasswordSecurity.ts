import assert from 'assert';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  BCRYPT_SALT_ROUNDS,
  constantTimeCompare,
  isBcryptHash,
  getBcryptCost,
  needsRehash,
  hashPassword,
  verifyPassword,
} from '../utils/passwordSecurity';

let testsPassed = 0;
let testsFailed = 0;

const runTest = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    console.log(`  ✓ PASSED: ${name}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  ✗ FAILED: ${name}`);
    console.error(`    Error: ${err.message}`);
    testsFailed++;
  }
};

const runAllTests = async () => {
  console.log('================================================================');
  console.log('      RUNNING PASSWORD SECURITY & REHASHING TEST SUITE          ');
  console.log('================================================================\n');

  console.log('Group 1: Bcrypt Cost Factor & Hash Generation');
  await runTest('hashPassword generates valid bcrypt hash with cost factor >= 12', async () => {
    const rawPass = 'SecretP@ssw0rd!2026';
    const hash = await hashPassword(rawPass);

    assert.strictEqual(isBcryptHash(hash), true, 'Hash must match bcrypt regex pattern');
    const cost = getBcryptCost(hash);
    assert.strictEqual(cost, 12, 'Bcrypt cost factor must be exactly 12');
    assert.strictEqual(cost! >= BCRYPT_SALT_ROUNDS, true, `Cost must be >= ${BCRYPT_SALT_ROUNDS}`);
  });

  console.log('\nGroup 2: Constant-Time Comparison (Timing Safe)');
  await runTest('constantTimeCompare correctly compares identical strings', () => {
    const a = 'super_secure_password_hash_or_token_12345';
    const b = 'super_secure_password_hash_or_token_12345';
    assert.strictEqual(constantTimeCompare(a, b), true);
  });

  await runTest('constantTimeCompare safely rejects differing strings of equal length', () => {
    const a = 'abcdefghijklmnopqrstuvwxyz012345';
    const b = 'abcdefghijklmnopqrstuvwxyz012346';
    assert.strictEqual(constantTimeCompare(a, b), false);
  });

  await runTest('constantTimeCompare safely rejects strings of different lengths without throwing', () => {
    const a = 'short';
    const b = 'very_long_string_with_more_characters';
    assert.strictEqual(constantTimeCompare(a, b), false);
  });

  await runTest('constantTimeCompare safely handles empty strings and invalid types', () => {
    assert.strictEqual(constantTimeCompare('', ''), true);
    assert.strictEqual(constantTimeCompare('abc', ''), false);
    assert.strictEqual(constantTimeCompare(null as any, 'abc'), false);
    assert.strictEqual(constantTimeCompare('abc', undefined as any), false);
  });

  console.log('\nGroup 3: Hash Format Detection & needsRehash() Evaluation');
  await runTest('needsRehash accurately identifies modern vs legacy formats', async () => {
    const modernBcrypt = await bcrypt.hash('password', 12);
    const lowCostBcrypt = await bcrypt.hash('password', 10);
    const md5Hash = crypto.createHash('md5').update('password').digest('hex');
    const sha1Hash = crypto.createHash('sha1').update('password').digest('hex');
    const plaintext = 'PlaintextPassword123';

    assert.strictEqual(needsRehash(modernBcrypt), false, 'Modern cost 12 bcrypt should NOT need rehash');
    assert.strictEqual(needsRehash(lowCostBcrypt), true, 'Cost 10 bcrypt MUST need rehash');
    assert.strictEqual(needsRehash(md5Hash), true, 'MD5 MUST need rehash');
    assert.strictEqual(needsRehash(sha1Hash), true, 'SHA-1 MUST need rehash');
    assert.strictEqual(needsRehash(plaintext), true, 'Plaintext MUST need rehash');
  });

  console.log('\nGroup 4: Password Verification & Lazy Rehash Flow');
  await runTest('verifyPassword verifies modern bcrypt without flagging rehash', async () => {
    const rawPass = 'ValidSecret#456';
    const modernHash = await hashPassword(rawPass);

    const matchResult = await verifyPassword(rawPass, modernHash);
    assert.strictEqual(matchResult.isValid, true);
    assert.strictEqual(matchResult.needsRehash, false);
    assert.strictEqual(matchResult.detectedFormat, 'bcrypt-current');

    const wrongResult = await verifyPassword('WrongPassword', modernHash);
    assert.strictEqual(wrongResult.isValid, false);
  });

  await runTest('verifyPassword verifies legacy low-cost bcrypt (cost 10) and flags for rehash', async () => {
    const rawPass = 'OldCostPassword99!';
    const cost10Hash = await bcrypt.hash(rawPass, 10);

    const matchResult = await verifyPassword(rawPass, cost10Hash);
    assert.strictEqual(matchResult.isValid, true);
    assert.strictEqual(matchResult.needsRehash, true);
    assert.strictEqual(matchResult.detectedFormat, 'bcrypt-outdated');

    // Simulate lazy rehash on login
    const upgradedHash = await hashPassword(rawPass);
    assert.strictEqual(getBcryptCost(upgradedHash), 12);

    // Subsequent check with upgraded hash
    const nextLogin = await verifyPassword(rawPass, upgradedHash);
    assert.strictEqual(nextLogin.isValid, true);
    assert.strictEqual(nextLogin.needsRehash, false);
  });

  await runTest('verifyPassword verifies legacy MD5 hash using constant-time check and flags for rehash', async () => {
    const rawPass = 'LegacyMd5UserPass2020';
    const md5Hash = crypto.createHash('md5').update(rawPass).digest('hex');

    const matchResult = await verifyPassword(rawPass, md5Hash);
    assert.strictEqual(matchResult.isValid, true);
    assert.strictEqual(matchResult.needsRehash, true);
    assert.strictEqual(matchResult.detectedFormat, 'md5');

    const wrongResult = await verifyPassword('IncorrectPass', md5Hash);
    assert.strictEqual(wrongResult.isValid, false);
  });

  await runTest('verifyPassword verifies legacy SHA-1 hash using constant-time check and flags for rehash', async () => {
    const rawPass = 'LegacySha1UserPass2018';
    const sha1Hash = crypto.createHash('sha1').update(rawPass).digest('hex');

    const matchResult = await verifyPassword(rawPass, sha1Hash);
    assert.strictEqual(matchResult.isValid, true);
    assert.strictEqual(matchResult.needsRehash, true);
    assert.strictEqual(matchResult.detectedFormat, 'sha1');

    const wrongResult = await verifyPassword('IncorrectPass', sha1Hash);
    assert.strictEqual(wrongResult.isValid, false);
  });

  await runTest('verifyPassword verifies legacy plaintext using constant-time check and flags for rehash', async () => {
    const rawPass = 'LegacyPlaintextPass123';

    const matchResult = await verifyPassword(rawPass, rawPass);
    assert.strictEqual(matchResult.isValid, true);
    assert.strictEqual(matchResult.needsRehash, true);
    assert.strictEqual(matchResult.detectedFormat, 'plaintext');

    const wrongResult = await verifyPassword('IncorrectPass', rawPass);
    assert.strictEqual(wrongResult.isValid, false);
  });

  console.log('\n================================================================');
  console.log(` TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
};

runAllTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
