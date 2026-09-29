import { Router } from 'express';
import {
  getMyEarnings,
  getMyCashPayables,
  payPlatformFee,
  getAdminSettlements,
  getAdminCashPayables,
  processSettlement,
  adminVerifyCashSettlement,
} from '../controllers/settlementController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../constants/enums';

const router = Router();

router.use(authenticateToken);

router.get('/my-earnings', authorizeRoles(UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB, UserRole.ADMIN), getMyEarnings);
router.get('/cash-payables', authorizeRoles(UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB, UserRole.ADMIN), getMyCashPayables);
router.post('/pay-platform-fee', authorizeRoles(UserRole.PROVIDER, UserRole.CLINIC, UserRole.LAB, UserRole.ADMIN), payPlatformFee);

router.get('/admin-ledger', authorizeRoles(UserRole.ADMIN), getAdminSettlements);
router.get('/admin-cash-payables', authorizeRoles(UserRole.ADMIN), getAdminCashPayables);
router.post('/process/:settlementId', authorizeRoles(UserRole.ADMIN), processSettlement);
router.post('/admin-verify-cash/:id', authorizeRoles(UserRole.ADMIN), adminVerifyCashSettlement);

export default router;
