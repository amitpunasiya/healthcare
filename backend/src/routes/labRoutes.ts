import { Router } from 'express';
import {
  getPublicLabs,
  getLabById,
  updateOwnLabProfile,
} from '../controllers/labController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../constants/enums';

const router = Router();

// Public routes (Verified labs only)
router.get('/', getPublicLabs);
router.get('/:id', getLabById);

// Lab self update
router.put('/me', authenticateToken, authorizeRoles(UserRole.LAB), updateOwnLabProfile);

export default router;
