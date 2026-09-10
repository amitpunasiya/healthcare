import { Router } from 'express';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  getMyPayments,
  updateManualPaymentStatus,
} from '../controllers/paymentController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../constants/enums';

const router = Router();

// Public webhook route (does not use token auth)
router.post('/webhook', handleRazorpayWebhook);

// Protected routes
router.use(authenticateToken);

router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyRazorpayPayment);
router.get('/', getMyPayments);
router.patch('/manual/:bookingId', authorizeRoles(UserRole.ADMIN), updateManualPaymentStatus);

export default router;
