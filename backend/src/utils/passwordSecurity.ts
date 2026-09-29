import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Bcrypt cost factor (work factor) configuration.
 * Salt rounds >= 12 ensures high computational hardness against GPU-accelerated brute force attacks.
 */
export const BCRYPT_SALT_ROUNDS = 12;

/**
 * Perform a constant-time string comparison using crypto.timingSafeEqual.
 * To safely compare strings of arbitrary or unequal lengths without leaking length
 * information through execution timing or throwing Node.js Buffer length mismatch errors,
 * we hash both inputs using SHA-256 and compare the resulting fixed 32-byte digests.
 */
export const constantTimeCompare = (a: string, b: string): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const hashA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const hashB = crypto.createHash('sha256').update(b, 'utf8').digest();
  const hashMatch = crypto.timingSafeEqual(hashA, hashB);
  return hashMatch && a.length === b.length;
};

/**
 * Check whether a string matches standard bcrypt hash format.
 * Format: $2[aby]$<2-digit cost>$<53 chars base64>
 */
export const isBcryptHash = (hash: string): boolean => {
  if (!hash || typeof hash !== 'string') return false;
  return /^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/.test(hash);
};

/**
 * Extract the cost factor (rounds) from a bcrypt hash.
 * Returns null if the hash is not a valid bcrypt hash.
 */
export const getBcryptCost = (hash: string): number | null => {
  if (!hash || typeof hash !== 'string') return null;
  const match = hash.match(/^\$2[aby]\$([0-9]{2})\$/);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Check if a stored hash needs to be rehashed to current security standards (Bcrypt >= 12).
 * Returns true if the stored value is:
 * 1. Plaintext
 * 2. Legacy MD5 or SHA-1
 * 3. Bcrypt with cost factor < BCRYPT_SALT_ROUNDS (e.g. 10)
 */
export const needsRehash = (storedHashOrPlaintext: string): boolean => {
  if (!storedHashOrPlaintext || typeof storedHashOrPlaintext !== 'string') return true;

  if (isBcryptHash(storedHashOrPlaintext)) {
    const cost = getBcryptCost(storedHashOrPlaintext);
    return cost === null || cost < BCRYPT_SALT_ROUNDS;
  }

  // Any non-bcrypt format (plaintext, MD5, SHA-1) needs rehashing
  return true;
};

/**
 * Securely hashes a password using bcrypt with cost factor 12.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

export type DetectedHashFormat =
  | 'bcrypt-current'
  | 'bcrypt-outdated'
  | 'md5'
  | 'sha1'
  | 'plaintext'
  | 'unknown';

export interface PasswordVerificationResult {
  isValid: boolean;
  needsRehash: boolean;
  detectedFormat: DetectedHashFormat;
}

/**
 * Verifies a candidate plaintext password against a stored hash or legacy representation.
 * Supports:
 * - Bcrypt (constant-time verification built into bcrypt)
 * - Legacy MD5 (32 hex characters) using constant-time comparison
 * - Legacy SHA-1 (40 hex characters) using constant-time comparison
 * - Legacy Plaintext using constant-time comparison
 */
export const verifyPassword = async (
  candidatePassword: string,
  storedHashOrPlaintext: string
): Promise<PasswordVerificationResult> => {
  if (!candidatePassword || !storedHashOrPlaintext) {
    return { isValid: false, needsRehash: false, detectedFormat: 'unknown' };
  }

  // Case 1: Bcrypt hash
  if (isBcryptHash(storedHashOrPlaintext)) {
    const isMatch = await bcrypt.compare(candidatePassword, storedHashOrPlaintext);
    if (!isMatch) {
      return { isValid: false, needsRehash: false, detectedFormat: 'bcrypt-current' };
    }

    const cost = getBcryptCost(storedHashOrPlaintext);
    const isOutdated = cost === null || cost < BCRYPT_SALT_ROUNDS;
    return {
      isValid: true,
      needsRehash: isOutdated,
      detectedFormat: isOutdated ? 'bcrypt-outdated' : 'bcrypt-current',
    };
  }

  // Case 2: Legacy MD5 (32 hexadecimal characters)
  if (/^[a-fA-F0-9]{32}$/.test(storedHashOrPlaintext)) {
    const candidateMd5 = crypto.createHash('md5').update(candidatePassword, 'utf8').digest('hex');
    const isMatch = constantTimeCompare(candidateMd5.toLowerCase(), storedHashOrPlaintext.toLowerCase());
    return {
      isValid: isMatch,
      needsRehash: isMatch,
      detectedFormat: 'md5',
    };
  }

  // Case 3: Legacy SHA-1 (40 hexadecimal characters)
  if (/^[a-fA-F0-9]{40}$/.test(storedHashOrPlaintext)) {
    const candidateSha1 = crypto.createHash('sha1').update(candidatePassword, 'utf8').digest('hex');
    const isMatch = constantTimeCompare(candidateSha1.toLowerCase(), storedHashOrPlaintext.toLowerCase());
    return {
      isValid: isMatch,
      needsRehash: isMatch,
      detectedFormat: 'sha1',
    };
  }

  // Case 4: Legacy Plaintext fallback
  const isMatch = constantTimeCompare(candidatePassword, storedHashOrPlaintext);
  return {
    isValid: isMatch,
    needsRehash: isMatch,
    detectedFormat: 'plaintext',
  };
};
