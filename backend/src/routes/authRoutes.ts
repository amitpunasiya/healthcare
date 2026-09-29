import { Router } from 'express';
import {
  registerCustomer,
  registerProvider,
  registerClinic,
  registerLab,
  login,
  getMe,
  verifySelf,
  forgotPassword,
  resetPassword,
  changePassword,
} from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { authIpRateLimiter, loginIpRateLimiter, authAccountProtection } from '../middlewares/rateLimiter';
import {
  registerCustomerSchema,
  registerProviderSchema,
  registerClinicSchema,
  registerLabSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/authValidators';

const router = Router();

// Stricter Auth Routes with per-IP rate limiting, per-account exponential backoff, and generic error security
router.post('/register/customer', authIpRateLimiter, authAccountProtection, validateRequest(registerCustomerSchema, { isAuthRoute: true }), registerCustomer);
router.post('/register/provider', authIpRateLimiter, authAccountProtection, validateRequest(registerProviderSchema, { isAuthRoute: true }), registerProvider);
router.post('/register/clinic', authIpRateLimiter, authAccountProtection, validateRequest(registerClinicSchema, { isAuthRoute: true }), registerClinic);
router.post('/register/lab', authIpRateLimiter, authAccountProtection, validateRequest(registerLabSchema, { isAuthRoute: true }), registerLab);

// Layer 1 (per-IP throttling) + Layer 2 (per-account lockout & delay) on /login
router.post('/login', loginIpRateLimiter, authAccountProtection, validateRequest(loginSchema, { isAuthRoute: true, genericMessage: 'Invalid email or password.' }), login);
router.post('/forgot-password', authIpRateLimiter, authAccountProtection, validateRequest(forgotPasswordSchema, { isAuthRoute: true, genericMessage: 'If an account exists with that email address, a password reset link has been sent.' }), forgotPassword);
router.post('/reset-password', authIpRateLimiter, validateRequest(resetPasswordSchema, { isAuthRoute: true, genericMessage: 'Invalid password reset request data.' }), resetPassword);
router.post('/change-password', authenticateToken, validateRequest(changePasswordSchema, { isAuthRoute: true, genericMessage: 'Invalid password change request data.' }), changePassword);
router.get('/me', authenticateToken, getMe);
router.post('/verify-self', authenticateToken, verifySelf);

export default router;
