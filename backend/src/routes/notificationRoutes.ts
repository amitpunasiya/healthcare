import { Router } from 'express';
import { getMyNotifications, markNotificationAsRead } from '../controllers/notificationController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyNotifications);
router.patch('/:id/read', markNotificationAsRead);

export default router;
