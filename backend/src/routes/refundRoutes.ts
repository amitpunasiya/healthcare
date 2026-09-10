import { Router } from 'express';
import {
  getRefunds,
  initiateAdminRefund,
  retryFailedRefund,
} from '../controllers/refundController';
import { cancelBookingWithRefund } from '../controllers/cancellationController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../constants/enums';

const router = Router();

router.use(authenticateToken);

router.get('/', getRefunds);
router.post('/cancel-with-refund/:id', cancelBookingWithRefund);
router.post('/initiate', authorizeRoles(UserRole.ADMIN), initiateAdminRefund);
router.post('/:refundId/retry', authorizeRoles(UserRole.ADMIN), retryFailedRefund);

export default router;
