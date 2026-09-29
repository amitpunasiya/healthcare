import { Router } from 'express';
import {
  getPublicClinics,
  getClinicById,
  updateOwnClinicProfile,
} from '../controllers/clinicController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../constants/enums';

import { validateRequest } from '../middlewares/validate';
import { mongoIdParamSchema } from '../validators/bookingValidators';

const router = Router();

// Public routes (Verified clinics only)
router.get('/', getPublicClinics);
router.get('/:id', validateRequest(mongoIdParamSchema), getClinicById);

// Clinic self update
router.put('/me', authenticateToken, authorizeRoles(UserRole.CLINIC), updateOwnClinicProfile);

export default router;
