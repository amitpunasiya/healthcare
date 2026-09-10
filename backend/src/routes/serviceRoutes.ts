import { Router } from 'express';
import {
  getCategories,
  getCategoryBySlug,
  getServices,
  createCategory,
  createService,
  toggleServiceStatus,
} from '../controllers/serviceController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../constants/enums';

const router = Router();

// Public routes
router.get('/categories', getCategories);
router.get('/categories/:slug', getCategoryBySlug);
router.get('/', getServices);

// Admin dynamic service management routes
router.post('/categories', authenticateToken, authorizeRoles(UserRole.ADMIN), createCategory);
router.post('/', authenticateToken, authorizeRoles(UserRole.ADMIN), createService);
router.patch('/:id/toggle', authenticateToken, authorizeRoles(UserRole.ADMIN), toggleServiceStatus);

export default router;
