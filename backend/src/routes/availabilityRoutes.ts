import { Router } from 'express';
import { getAvailableTimeSlots } from '../controllers/availabilityController';

const router = Router();

router.get('/slots', getAvailableTimeSlots);

export default router;
