import { Router } from 'express';
import {
  getMyEarnings,
  getAdminSettlements,
  processSettlement,
} from '../controllers/settlementController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../constants/enums';

const router = Router();

router.use(authenticateToken);

router.get('/my-earnings', authorizeRoles(UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB, UserRole.ADMIN), getMyEarnings);
router.get('/admin-ledger', authorizeRoles(UserRole.ADMIN), getAdminSettlements);
router.post('/process/:settlementId', authorizeRoles(UserRole.ADMIN), processSettlement);

export default router;
