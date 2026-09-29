import { Router } from 'express';
import {
  createOnlineBooking,
  createManualBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  getProviderBookings,
  getProviderAnalytics,
  getClinicBookings,
  getLabBookings,
  acceptBooking,
  rejectBooking,
  startBooking,
  completeBooking,
  cancelBooking,
  getLiveBookingStatus,
} from '../controllers/bookingController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { UserRole } from '../constants/enums';
import {
  createOnlineBookingSchema,
  createManualBookingSchema,
  updateBookingStatusSchema,
  cancelBookingSchema,
  mongoIdParamSchema,
} from '../validators/bookingValidators';

const router = Router();

router.use(authenticateToken);

// Role-specific booking & analytics queries
router.get('/provider/analytics', authorizeRoles(UserRole.PROVIDER, UserRole.ADMIN), getProviderAnalytics);
router.get('/provider', authorizeRoles(UserRole.PROVIDER, UserRole.ADMIN), getProviderBookings);
router.get('/clinic', authorizeRoles(UserRole.CLINIC, UserRole.ADMIN), getClinicBookings);
router.get('/lab', authorizeRoles(UserRole.LAB, UserRole.ADMIN), getLabBookings);

// Booking Action Endpoints
router.get('/:id/live-status', validateRequest(mongoIdParamSchema), getLiveBookingStatus);
router.patch('/:id/accept', authorizeRoles(UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB, UserRole.ADMIN), validateRequest(mongoIdParamSchema), acceptBooking);
router.patch('/:id/reject', authorizeRoles(UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB, UserRole.ADMIN), validateRequest(mongoIdParamSchema), rejectBooking);
router.patch('/:id/start', authorizeRoles(UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB, UserRole.ADMIN), validateRequest(mongoIdParamSchema), startBooking);
router.patch('/:id/complete', authorizeRoles(UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB, UserRole.ADMIN), validateRequest(mongoIdParamSchema), completeBooking);
router.patch('/:id/cancel', validateRequest(cancelBookingSchema), cancelBooking);

// Customer & Multi-Role Online Booking creation
router.post('/', authorizeRoles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB, UserRole.ADMIN), validateRequest(createOnlineBookingSchema), createOnlineBooking);

// Manual Booking creation
router.post('/manual', authorizeRoles(UserRole.ADMIN, UserRole.CLINIC, UserRole.PROVIDER, UserRole.LAB), validateRequest(createManualBookingSchema), createManualBooking);

// Generic bookings query & details
router.get('/', getMyBookings);
router.get('/:id', validateRequest(mongoIdParamSchema), getBookingById);
router.patch('/:id/status', validateRequest(updateBookingStatusSchema), updateBookingStatus);

export default router;
