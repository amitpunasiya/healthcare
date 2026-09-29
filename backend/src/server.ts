import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middlewares/errorHandler';
import { seedDefaultServices } from './controllers/serviceController';
import { seedDefaultAdmin } from './utils/seedAdmin';

import authRoutes from './routes/authRoutes';
import serviceRoutes from './routes/serviceRoutes';
import providerRoutes from './routes/providerRoutes';
import clinicRoutes from './routes/clinicRoutes';
import labRoutes from './routes/labRoutes';
import verificationRoutes from './routes/verificationRoutes';
import availabilityRoutes from './routes/availabilityRoutes';
import bookingRoutes from './routes/bookingRoutes';
import notificationRoutes from './routes/notificationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import refundRoutes from './routes/refundRoutes';
import settlementRoutes from './routes/settlementRoutes';
import adminRoutes from './routes/adminRoutes';
import documentRoutes from './routes/documentRoutes';
import webhookRoutes from './routes/webhookRoutes';
import { publicRateLimiter, authenticatedRateLimiter } from './middlewares/rateLimiter';

const app = express();

// Trust proxy for reverse proxies / load balancers to correctly determine client IP
app.set('trust proxy', 1);

// Middlewares: Support localhost and any local network IP / mobile phone
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile native apps, curl, etc.)
      if (!origin) return callback(null, true);

      // Allow configured origins or any local network IP (192.168.x, 10.x, 172.x, localhost)
      if (
        process.env.NODE_ENV !== 'production' ||
        env.CORS_ORIGIN.includes(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }

      // In development fallback, allow origin to prevent mobile network blocking
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Health Check (Moderate public rate limiting)
app.get('/api/health', publicRateLimiter, (req, res) => {
  res.json({ status: 'ok', message: 'Healthcare Marketplace API operational', timestamp: new Date() });
});

// Tier 1: Authentication Routes (Internal strict per-IP and per-account exponential backoff applied per route)
app.use('/api/v1/auth', authRoutes);

// Tier 2: Public Endpoints (Moderate rate limiting per IP)
app.use('/api/v1/services', publicRateLimiter, serviceRoutes);
app.use('/api/v1/providers', publicRateLimiter, providerRoutes);
app.use('/api/v1/clinics', publicRateLimiter, clinicRoutes);
app.use('/api/v1/labs', publicRateLimiter, labRoutes);

// Tier 3: Authenticated User Actions & Management (Looser rate limiting per authenticated user / session)
app.use('/api/v1/verifications', authenticatedRateLimiter, verificationRoutes);
app.use('/api/v1/availability', authenticatedRateLimiter, availabilityRoutes);
app.use('/api/v1/bookings', authenticatedRateLimiter, bookingRoutes);
app.use('/api/v1/notifications', authenticatedRateLimiter, notificationRoutes);
app.use('/api/v1/payments', authenticatedRateLimiter, paymentRoutes);
app.use('/api/v1/refunds', authenticatedRateLimiter, refundRoutes);
app.use('/api/v1/settlements', authenticatedRateLimiter, settlementRoutes);
app.use('/api/v1/admin', authenticatedRateLimiter, adminRoutes);
app.use('/api/v1/documents', authenticatedRateLimiter, documentRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// Unmatched route 404 handler - prevents default HTML error leaking Express framework details
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'The requested API endpoint does not exist.',
  });
});

// Global Error Handler
app.use(errorHandler);

// Global unhandled promise rejection and uncaught exception safety listeners
process.on('unhandledRejection', (reason: any) => {
  console.error('[FATAL: Unhandled Promise Rejection]:', {
    timestamp: new Date().toISOString(),
    reason: reason?.stack || reason,
  });
});

process.on('uncaughtException', (error: Error) => {
  console.error('[FATAL: Uncaught Exception]:', {
    timestamp: new Date().toISOString(),
    error: error.stack || error.message,
  });
});

// Start Server
const startServer = async () => {
  await connectDB();
  await seedDefaultServices();
  await seedDefaultAdmin();

  app.listen(env.PORT, () => {
    console.log(`[Server] Healthcare API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });
};
// Start server instance
startServer();