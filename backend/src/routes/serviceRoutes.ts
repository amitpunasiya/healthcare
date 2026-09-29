import { Router } from 'express';
import {
  getCategories,
  getCategoryBySlug,
  getServices,
  createCategory,
  createService,
  updateService,
  toggleServiceStatus,
} from '../controllers/serviceController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { UserRole } from '../constants/enums';
import {
  createCategorySchema,
  createServiceSchema,
  updateServiceSchema,
  getCategoryBySlugSchema,
} from '../validators/serviceValidators';
import { mongoIdParamSchema } from '../validators/bookingValidators';

const router = Router();

// Public routes
router.get('/categories', getCategories);
router.get('/categories/:slug', validateRequest(getCategoryBySlugSchema), getCategoryBySlug);
router.get('/', getServices);

// Admin dynamic service management routes
router.post('/categories', authenticateToken, authorizeRoles(UserRole.ADMIN), validateRequest(createCategorySchema), createCategory);
router.post('/', authenticateToken, authorizeRoles(UserRole.ADMIN), validateRequest(createServiceSchema), createService);
router.put('/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), validateRequest(updateServiceSchema), updateService);
router.patch('/:id', authenticateToken, authorizeRoles(UserRole.ADMIN), validateRequest(updateServiceSchema), updateService);
router.patch('/:id/toggle', authenticateToken, authorizeRoles(UserRole.ADMIN), validateRequest(mongoIdParamSchema), toggleServiceStatus);

export default router;
