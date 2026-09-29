import { Router } from 'express';
import { z } from 'zod';
import {
  getPendingVerifications,
  updateVerificationStatus,
} from '../controllers/verificationController';
import { authenticateToken, authorizeRoles } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { UserRole } from '../constants/enums';

const router = Router();

router.use(authenticateToken, authorizeRoles(UserRole.ADMIN));

const updateVerificationStatusSchema = z.object({
  params: z
    .object({
      userId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid 24-character hexadecimal User ID format'),
    })
    .strict(),
  body: z
    .object({
      status: z.enum(['VERIFIED', 'REJECTED'], { errorMap: () => ({ message: 'Status must be VERIFIED or REJECTED' }) }),
      rejectionReason: z.string().trim().max(500, 'Rejection reason cannot exceed 500 characters').optional(),
    })
    .strict(),
});

router.get('/pending', getPendingVerifications);
router.patch('/:userId', validateRequest(updateVerificationStatusSchema), updateVerificationStatus);

export default router;
