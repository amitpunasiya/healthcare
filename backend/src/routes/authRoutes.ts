import { Router } from 'express';
import {
  registerCustomer,
  registerProvider,
  registerClinic,
  registerLab,
  login,
  getMe,
} from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import {
  registerCustomerSchema,
  registerProviderSchema,
  registerClinicSchema,
  registerLabSchema,
  loginSchema,
} from '../validators/authValidators';

const router = Router();

router.post('/register/customer', validateRequest(registerCustomerSchema), registerCustomer);
router.post('/register/provider', validateRequest(registerProviderSchema), registerProvider);
router.post('/register/clinic', validateRequest(registerClinicSchema), registerClinic);
router.post('/register/lab', validateRequest(registerLabSchema), registerLab);
router.post('/login', validateRequest(loginSchema), login);
router.get('/me', authenticateToken, getMe);

export default router;
