import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { sendAccountLockoutEmail } from '../services/emailService';

/**
 * In-Memory Sliding Window Rate Limiter Store (High performance key-value store)
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface AccountSecurityRecord {
  consecutiveFailures: number;
  lastFailedAt: number;
  blockedUntil: number;
  isLockedOut: boolean;
  lockoutCount: number;
  lockoutNotified: boolean;
}

// Dedicated high-speed in-memory key-value maps
const ipStore = new Map<string, RateLimitRecord>();
const accountStore = new Map<string, AccountSecurityRecord>();

// Periodic garbage collection every 5 minutes to keep memory footprint minimal
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipStore.entries()) {
    if (now > record.resetTime) {
      ipStore.delete(key);
    }
  }
  for (const [key, record] of accountStore.entries()) {
    if (now > record.blockedUntil && now - record.lastFailedAt > env.RATE_LIMIT_AUTH_ACCOUNT_WINDOW_MS) {
      accountStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
cleanupInterval.unref();

/**
 * Extracts a normalized client IP address considering proxy headers
 */
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
};

/**
 * Generic Rate Limiter Middleware Factory
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  keyGenerator: (req: Request) => string;
  tierName: string;
  errorMessage?: string;
  isLogin?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!env.RATE_LIMIT_ENABLED) {
      return next();
    }

    const key = `${options.tierName}:${options.keyGenerator(req)}`;
    const now = Date.now();

    let record = ipStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      ipStore.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, options.max - record.count);
    const resetSec = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSec);

    if (record.count > options.max) {
      res.setHeader('Retry-After', resetSec);

      // Security requirement: On /login, failure responses MUST look identical
      // to avoid leaking rate limit state to brute-force attack scripts
      if (options.isLogin) {
        console.warn(`[BRUTE FORCE ATTACK BLOCKED] Per-IP threshold exceeded: IP ${getClientIp(req)} on /login. Blocked for ${resetSec}s.`);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message: options.errorMessage || `Rate limit exceeded. Too many requests in this period. Please retry after ${resetSec} seconds.`,
        retryAfter: resetSec,
      });
    }

    next();
  };
};

/**
 * LAYER 1: STRICT PER-IP RATE LIMITER FOR /login
 * Tuned so real users never notice (10 attempts per 5 minutes per IP),
 * but automated scripts trying hundreds of combinations get stopped immediately.
 * Returns generic 'Invalid email or password.' to look identical to normal failures.
 */
export const loginIpRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_LOGIN_IP_WINDOW_MS, // 5 minutes
  max: env.RATE_LIMIT_LOGIN_IP_MAX, // 10 attempts
  keyGenerator: (req) => getClientIp(req),
  tierName: 'LOGIN_IP',
  isLogin: true,
});

/**
 * General Auth IP Rate Limiter (registration, forgot-password, etc.)
 */
export const authIpRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_AUTH_IP_WINDOW_MS, // 15 minutes
  max: env.RATE_LIMIT_AUTH_IP_MAX, // 30 attempts
  keyGenerator: (req) => getClientIp(req),
  tierName: 'AUTH_IP',
  errorMessage: 'Too many authentication requests from this IP address. Please try again later.',
});

/**
 * LAYER 2: PER-ACCOUNT PROGRESSIVE DELAY & TEMPORARY LOCKOUT
 * After repeated failures on the same account:
 * - Increases artificial delay (exponential slowdown) to starve automated crackers.
 * - Once lockout threshold (5 consecutive failures) is hit, locks account for 15 minutes.
 * - Dispatches a security notification email to the user.
 * - IMPORTANT: Returns identical generic error 'Invalid email or password.' with HTTP 401.
 */
export const authAccountProtection = async (req: Request, res: Response, next: NextFunction) => {
  if (!env.RATE_LIMIT_ENABLED) {
    return next();
  }

  const rawId = req.body?.email || req.body?.phone || '';
  if (!rawId) {
    return next();
  }

  const accountId = String(rawId).trim().toLowerCase();
  const now = Date.now();
  const record = accountStore.get(accountId);

  if (record && record.blockedUntil > now) {
    const remainingSec = Math.ceil((record.blockedUntil - now) / 1000);
    res.setHeader('Retry-After', remainingSec);

    // If account was locked out, log security event
    if (record.isLockedOut) {
      console.warn(`[ACCOUNT LOCKED ATTEMPT BLOCKED] Account ${accountId} is locked. Attempt from IP ${getClientIp(req)}. Remaining lock: ${remainingSec}s.`);
    } else {
      console.warn(`[ACCOUNT THROTTLED ATTEMPT BLOCKED] Account ${accountId} is throttled. Attempt from IP ${getClientIp(req)}. Wait: ${remainingSec}s.`);
    }

    // Critical Security Requirement: Failure response looks IDENTICAL to standard wrong password
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  next();
};

/**
 * Helper to record authentication failures, apply progressive delay,
 * trigger account lockout, and dispatch lockout security email.
 */
export const recordAuthFailure = async (rawId: string, clientIp = 'unknown') => {
  if (!env.RATE_LIMIT_ENABLED || !rawId) return;

  const accountId = String(rawId).trim().toLowerCase();
  const now = Date.now();
  const existing = accountStore.get(accountId);

  const failures = (existing ? existing.consecutiveFailures : 0) + 1;
  const lockoutThreshold = env.RATE_LIMIT_AUTH_ACCOUNT_LOCKOUT_FAILURES; // 5 failures
  const delayThreshold = env.RATE_LIMIT_AUTH_ACCOUNT_MAX_FAILURES; // 3 failures

  let isLockedOut = false;
  let blockedUntil = now;
  let lockoutDurationSec = 0;

  // Check if lockout threshold is reached
  if (failures >= lockoutThreshold) {
    isLockedOut = true;
    lockoutDurationSec = env.RATE_LIMIT_AUTH_ACCOUNT_LOCKOUT_DURATION_SEC; // 15 mins (900s)
    blockedUntil = now + lockoutDurationSec * 1000;

    // Send security lockout email once per lockout event
    if (!existing?.lockoutNotified) {
      const lockoutMinutes = Math.ceil(lockoutDurationSec / 60);
      console.warn(`[SECURITY ALERT] Account ${accountId} locked for ${lockoutMinutes} minutes due to ${failures} consecutive failed attempts from IP ${clientIp}. Triggering email alert.`);
      sendAccountLockoutEmail(accountId, lockoutMinutes, clientIp).catch((err) => {
        console.error('[Lockout Email Error]:', err);
      });
    }
  } else if (failures > delayThreshold) {
    // Progressive exponential backoff delay before lockout (e.g. 2s, 4s)
    const exponent = failures - delayThreshold - 1;
    const delaySec = Math.min(
      env.RATE_LIMIT_AUTH_ACCOUNT_BASE_DELAY_SEC * Math.pow(env.RATE_LIMIT_AUTH_ACCOUNT_FACTOR, exponent),
      env.RATE_LIMIT_AUTH_ACCOUNT_MAX_DELAY_SEC
    );
    blockedUntil = now + delaySec * 1000;
  }

  accountStore.set(accountId, {
    consecutiveFailures: failures,
    lastFailedAt: now,
    blockedUntil,
    isLockedOut,
    lockoutCount: isLockedOut ? (existing?.lockoutCount || 0) + 1 : 0,
    lockoutNotified: isLockedOut,
  });

  const effectiveDelaySec = Math.max(0, Math.ceil((blockedUntil - now) / 1000));
  return { failures, isLockedOut, blockedUntil, delaySec: effectiveDelaySec };
};

/**
 * Backward-compatible alias for authAccountProtection
 */
export const authAccountExponentialBackoff = authAccountProtection;

/**
 * Helper to clear failure history and reset lockout on successful authentication
 */
export const recordAuthSuccess = (rawId: string) => {
  if (!rawId) return;
  const accountId = String(rawId).trim().toLowerCase();
  accountStore.delete(accountId);
};

/**
 * 3. MODERATE PUBLIC ENDPOINTS RATE LIMITER
 */
export const publicRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_PUBLIC_WINDOW_MS,
  max: env.RATE_LIMIT_PUBLIC_MAX,
  keyGenerator: (req) => getClientIp(req),
  tierName: 'PUBLIC_IP',
  errorMessage: 'Rate limit exceeded for public requests. Please slow down and try again shortly.',
});

/**
 * 4. LOOSER AUTHENTICATED USER RATE LIMITER
 */
export const authenticatedRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_AUTH_USER_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_USER_MAX,
  keyGenerator: (req) => {
    const user = (req as any).user;
    if (user && (user.id || user._id)) {
      return `USER_${user.id || user._id}`;
    }
    return `ANON_${getClientIp(req)}`;
  },
  tierName: 'AUTH_USER',
  errorMessage: 'High activity detected. Please wait a moment before sending more requests.',
});
