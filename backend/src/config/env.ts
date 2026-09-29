import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcare_marketplace',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:5174'],
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL || 'admin@healthcare.com',
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD || '',

  // Firebase Admin SDK Credentials
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',

  // Payment Gateway Secrets (Razorpay)
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',

  // Rate Limiting Configurations (Fully Configurable)
  RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED !== 'false',

  // Layer 1: Per-IP /login Throttling (Tuned for anti-brute-force)
  RATE_LIMIT_LOGIN_IP_WINDOW_MS: Number(process.env.RATE_LIMIT_LOGIN_IP_WINDOW_MS) || 5 * 60 * 1000, // 5 min window
  RATE_LIMIT_LOGIN_IP_MAX: Number(process.env.RATE_LIMIT_LOGIN_IP_MAX) || 10, // 10 attempts per IP per 5 mins

  // General Auth IP limit (registration, etc.)
  RATE_LIMIT_AUTH_IP_WINDOW_MS: Number(process.env.RATE_LIMIT_AUTH_IP_WINDOW_MS) || 15 * 60 * 1000,
  RATE_LIMIT_AUTH_IP_MAX: Number(process.env.RATE_LIMIT_AUTH_IP_MAX) || 30,

  // Layer 2: Per-Account Protection (Progressive Delay & Temporary Lockout)
  RATE_LIMIT_AUTH_ACCOUNT_MAX_FAILURES: Number(process.env.RATE_LIMIT_AUTH_ACCOUNT_MAX_FAILURES) || 3, // Start delay after 3 failures
  RATE_LIMIT_AUTH_ACCOUNT_BASE_DELAY_SEC: Number(process.env.RATE_LIMIT_AUTH_ACCOUNT_BASE_DELAY_SEC) || 2,
  RATE_LIMIT_AUTH_ACCOUNT_FACTOR: Number(process.env.RATE_LIMIT_AUTH_ACCOUNT_FACTOR) || 2,
  RATE_LIMIT_AUTH_ACCOUNT_MAX_DELAY_SEC: Number(process.env.RATE_LIMIT_AUTH_ACCOUNT_MAX_DELAY_SEC) || 30,
  RATE_LIMIT_AUTH_ACCOUNT_WINDOW_MS: Number(process.env.RATE_LIMIT_AUTH_ACCOUNT_WINDOW_MS) || 15 * 60 * 1000,
  RATE_LIMIT_AUTH_ACCOUNT_LOCKOUT_FAILURES: Number(process.env.RATE_LIMIT_AUTH_ACCOUNT_LOCKOUT_FAILURES) || 5, // Lock after 5 consecutive failures
  RATE_LIMIT_AUTH_ACCOUNT_LOCKOUT_DURATION_SEC: Number(process.env.RATE_LIMIT_AUTH_ACCOUNT_LOCKOUT_DURATION_SEC) || 15 * 60, // 15 min lock

  RATE_LIMIT_PUBLIC_WINDOW_MS: Number(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS) || 15 * 60 * 1000,
  RATE_LIMIT_PUBLIC_MAX: Number(process.env.RATE_LIMIT_PUBLIC_MAX) || 150,

  RATE_LIMIT_AUTH_USER_WINDOW_MS: Number(process.env.RATE_LIMIT_AUTH_USER_WINDOW_MS) || 15 * 60 * 1000,
  RATE_LIMIT_AUTH_USER_MAX: Number(process.env.RATE_LIMIT_AUTH_USER_MAX) || 1000,
};

// Strict production security sanity checks
if (env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    throw new Error('CRITICAL SECURITY ERROR: A custom JWT_SECRET environment variable is strictly required in production.');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('CRITICAL SECURITY ERROR: MONGODB_URI environment variable is strictly required in production.');
  }
}
