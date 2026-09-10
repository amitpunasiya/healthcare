import { Router } from 'express';
import {
  getPendingVerifications,
  updateVerificationStatus,
} from '../controllers/verificationController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../constants/enums';

const router = Router();

router.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

router.get('/pending', getPendingVerifications);
router.patch('/:userId', updateVerificationStatus);

export default router;
