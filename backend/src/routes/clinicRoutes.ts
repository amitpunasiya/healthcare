import { Router } from 'express';
import {
  getPublicClinics,
  getClinicById,
  updateOwnClinicProfile,
} from '../controllers/clinicController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../constants/enums';

const router = Router();

// Public routes (Verified clinics only)
router.get('/', getPublicClinics);
router.get('/:id', getClinicById);

// Clinic self update
router.put('/me', authenticateToken, authorizeRoles(UserRole.CLINIC), updateOwnClinicProfile);

export default router;
