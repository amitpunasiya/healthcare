import { Router } from 'express';
import {
  getAdminCustomers,
  getAdminCustomerById,
  getAdminProviders,
  getAdminProviderById,
  toggleProviderStatus,
  getAdminLabs,
  getAdminLabById,
  toggleLabStatus,
  updateDocumentVerificationStatus,
  blockUser,
  unblockUser,
  getUserAuditLogs,
} from '../controllers/adminController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { UserRole } from '../constants/enums';

const router = Router();

// Protect all admin endpoints
router.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

// Customer management
router.get('/customers', getAdminCustomers);
router.get('/customers/:id', getAdminCustomerById);

// Provider management (includes category filters like PHYSIOTHERAPY, OCCUPATIONAL_THERAPY, ADULT_CARE)
router.get('/providers', getAdminProviders);
router.get('/providers/:id', getAdminProviderById);
router.patch('/providers/:id/status', toggleProviderStatus);

// Lab management
router.get('/labs', getAdminLabs);
router.get('/labs/:id', getAdminLabById);
router.patch('/labs/:id/status', toggleLabStatus);

// Document verification
router.post('/verify-document/:docId', updateDocumentVerificationStatus);

// User Block / Unblock Management
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/unblock', unblockUser);
router.get('/users/:id/audit-logs', getUserAuditLogs);

export default router;
