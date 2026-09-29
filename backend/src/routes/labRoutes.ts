import { Router } from 'express';
import {
  getPublicLabs,
  getLabById,
  updateOwnLabProfile,
} from '../controllers/labController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../constants/enums';

import { validateRequest } from '../middlewares/validate';
import { mongoIdParamSchema } from '../validators/bookingValidators';

const router = Router();

// Public routes (Verified labs only)
router.get('/', getPublicLabs);
router.get('/:id', validateRequest(mongoIdParamSchema), getLabById);

// Lab self update
router.put('/me', authenticateToken, authorizeRoles(UserRole.LAB), updateOwnLabProfile);

export default router;
