import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middlewares/errorHandler';
import { seedDefaultServices } from './controllers/serviceController';

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

const app = express();

// Middlewares
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Healthcare Marketplace API operational', timestamp: new Date() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/providers', providerRoutes);
app.use('/api/v1/clinics', clinicRoutes);
app.use('/api/v1/labs', labRoutes);
app.use('/api/v1/verifications', verificationRoutes);
app.use('/api/v1/availability', availabilityRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/refunds', refundRoutes);
app.use('/api/v1/settlements', settlementRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Server
const startServer = async () => {
  await connectDB();
  await seedDefaultServices();

  app.listen(env.PORT, () => {
    console.log(`[Server] Healthcare API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });
};

startServer();
