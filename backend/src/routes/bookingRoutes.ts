import { Router } from 'express';
import {
  createOnlineBooking,
  createManualBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  getProviderBookings,
  getClinicBookings,
  getLabBookings,
  acceptBooking,
  rejectBooking,
  startBooking,
  completeBooking,
  cancelBooking,
} from '../controllers/bookingController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../constants/enums';

const router = Router();

router.use(authenticateToken);

// Role-specific booking queries
router.get('/provider', authorizeRoles(UserRole.PROVIDER, UserRole.ADMIN), getProviderBookings);
router.get('/clinic', authorizeRoles(UserRole.CLINIC, UserRole.ADMIN), getClinicBookings);
router.get('/lab', authorizeRoles(UserRole.LAB, UserRole.ADMIN), getLabBookings);

// Booking Action Endpoints
router.patch('/:id/accept', authorizeRoles(UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB, UserRole.ADMIN), acceptBooking);
router.patch('/:id/reject', authorizeRoles(UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB, UserRole.ADMIN), rejectBooking);
router.patch('/:id/start', authorizeRoles(UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB, UserRole.ADMIN), startBooking);
router.patch('/:id/complete', authorizeRoles(UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB, UserRole.ADMIN), completeBooking);
router.patch('/:id/cancel', cancelBooking);

// Customer Online Booking creation
router.post('/', authorizeRoles(UserRole.CUSTOMER), createOnlineBooking);

// Manual Booking creation
router.post('/manual', authorizeRoles(UserRole.ADMIN, UserRole.CLINIC, UserRole.PROVIDER, UserRole.LAB), createManualBooking);

// Generic bookings query & details
router.get('/', getMyBookings);
router.get('/:id', getBookingById);
router.patch('/:id/status', updateBookingStatus);

export default router;
