import { Router } from 'express';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  getMyPayments,
  updateManualPaymentStatus,
  recordCashPayment,
} from '../controllers/paymentController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { UserRole } from '../constants/enums';
import {
  createRazorpayOrderSchema,
  verifyRazorpayPaymentSchema,
  recordCashPaymentSchema,
  manualPaymentParamSchema,
} from '../validators/paymentValidators';

const router = Router();

// Public webhook route (does not use token auth)
router.post('/webhook', handleRazorpayWebhook);

// Protected routes
router.use(authenticateToken);

router.post('/create-order', validateRequest(createRazorpayOrderSchema), createRazorpayOrder);
router.post('/verify', validateRequest(verifyRazorpayPaymentSchema), verifyRazorpayPayment);
router.post('/cash-payment', validateRequest(recordCashPaymentSchema), recordCashPayment);
router.get('/', getMyPayments);
router.patch('/manual/:bookingId', authorizeRoles(UserRole.ADMIN), validateRequest(manualPaymentParamSchema), updateManualPaymentStatus);

export default router;
