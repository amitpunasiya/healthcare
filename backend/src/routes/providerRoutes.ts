import { Router } from 'express';
import {
  getPublicProviders,
  getProviderById,
  updateOwnProviderProfile,
} from '../controllers/providerController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../constants/enums';

const router = Router();

// Public routes (Verified providers only)
router.get('/', getPublicProviders);
router.get('/:id', getProviderById);

// Provider self update
router.put('/me', authenticateToken, authorizeRoles(UserRole.PROVIDER), updateOwnProviderProfile);

export default router;
