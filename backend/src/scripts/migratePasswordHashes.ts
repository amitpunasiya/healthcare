import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from '../models/User';
import {
  BCRYPT_SALT_ROUNDS,
  isBcryptHash,
  getBcryptCost,
  hashPassword,
} from '../utils/passwordSecurity';

export interface MigrationAuditSummary {
  totalUsers: number;
  guestUsers: number;
  compliantCount: number;
  lowCostBcryptCount: number;
  legacyMd5Count: number;
  legacySha1Count: number;
  plaintextFixedCount: number;
  pendingLazyRehashCount: number;
}

/**
 * Migration & Password Security Audit Script.
 *
 * 1. Audits all user accounts in the database for password hashing compliance.
 * 2. Immediately secures any detected plaintext passwords by hashing them with bcrypt (cost >= 12).
 * 3. Inventories accounts with legacy hashes (MD5, SHA-1) or low-cost bcrypt (< 12) that are queued
 *    for automatic transparent rehashing upon their next successful login.
 */
export const runPasswordMigration = async (): Promise<MigrationAuditSummary> => {
  const summary: MigrationAuditSummary = {
    totalUsers: 0,
    guestUsers: 0,
    compliantCount: 0,
    lowCostBcryptCount: 0,
    legacyMd5Count: 0,
    legacySha1Count: 0,
    plaintextFixedCount: 0,
    pendingLazyRehashCount: 0,
  };

  console.log('================================================================');
  console.log('   CAREPULSE - PASSWORD STORAGE AUDIT & MIGRATION SCRIPT        ');
  console.log('================================================================');
  console.log(`[Target Policy] Work factor: Bcrypt >= ${BCRYPT_SALT_ROUNDS} rounds\n`);

  const users = await User.find({});
  summary.totalUsers = users.length;

  console.log(`Found ${users.length} total user records in database.\n`);

  for (const user of users) {
    if (user.isGuest || !user.passwordHash) {
      summary.guestUsers++;
      continue;
    }

    const storedHash = user.passwordHash.trim();

    // 1. Modern Bcrypt Check
    if (isBcryptHash(storedHash)) {
      const cost = getBcryptCost(storedHash);
      if (cost !== null && cost >= BCRYPT_SALT_ROUNDS) {
        summary.compliantCount++;
      } else {
        summary.lowCostBcryptCount++;
        summary.pendingLazyRehashCount++;
        console.log(`[ACTION QUEUED] User ${user.email}: Outdated bcrypt cost factor (${cost}). Queued for rehash to ${BCRYPT_SALT_ROUNDS} on next login.`);
      }
      continue;
    }

    // 2. Legacy MD5 Check (32 hex characters)
    if (/^[a-fA-F0-9]{32}$/.test(storedHash)) {
      summary.legacyMd5Count++;
      summary.pendingLazyRehashCount++;
      console.log(`[ACTION QUEUED] User ${user.email}: Legacy MD5 format detected. Queued for rehash to bcrypt ${BCRYPT_SALT_ROUNDS} on next login.`);
      continue;
    }

    // 3. Legacy SHA-1 Check (40 hex characters)
    if (/^[a-fA-F0-9]{40}$/.test(storedHash)) {
      summary.legacySha1Count++;
      summary.pendingLazyRehashCount++;
      console.log(`[ACTION QUEUED] User ${user.email}: Legacy SHA-1 format detected. Queued for rehash to bcrypt ${BCRYPT_SALT_ROUNDS} on next login.`);
      continue;
    }

    // 4. Plaintext Password - Immediate in-place remediation!
    // Since plaintext is readable, we can immediately upgrade it without waiting for user login.
    console.warn(`[VULNERABILITY DETECTED] User ${user.email}: Unhashed plaintext password detected! Upgrading immediately to bcrypt ${BCRYPT_SALT_ROUNDS}...`);
    try {
      const secureHash = await hashPassword(storedHash);
      user.passwordHash = secureHash;
      await user.save();
      summary.plaintextFixedCount++;
      summary.compliantCount++;
      console.log(`[REMEDIATED] User ${user.email}: Successfully converted plaintext password to bcrypt ${BCRYPT_SALT_ROUNDS}.`);
    } catch (err) {
      console.error(`[ERROR] Failed to remediate plaintext password for ${user.email}:`, err);
    }
  }

  console.log('\n================================================================');
  console.log('                     MIGRATION AUDIT RESULTS                    ');
  console.log('================================================================');
  console.log(`Total Accounts Examined:         ${summary.totalUsers}`);
  console.log(`Guest Accounts (No Password):    ${summary.guestUsers}`);
  console.log(`Compliant (Bcrypt >= 12):        ${summary.compliantCount}`);
  console.log(`Plaintext Passwords Upgraded:    ${summary.plaintextFixedCount}`);
  console.log(`Low-cost Bcrypt (< 12):          ${summary.lowCostBcryptCount}`);
  console.log(`Legacy MD5 Hashes:               ${summary.legacyMd5Count}`);
  console.log(`Legacy SHA-1 Hashes:             ${summary.legacySha1Count}`);
  console.log(`Queued for Next-Login Rehash:    ${summary.pendingLazyRehashCount}`);
  console.log('================================================================\n');

  return summary;
};

// If invoked directly from CLI
if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare';
  console.log(`Connecting to database: ${mongoUri}...`);

  mongoose
    .connect(mongoUri)
    .then(async () => {
      console.log('Connected to MongoDB successfully.');
      await runPasswordMigration();
      await mongoose.disconnect();
      console.log('Database connection closed. Migration script finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to connect to MongoDB:', err);
      process.exit(1);
    });
}
