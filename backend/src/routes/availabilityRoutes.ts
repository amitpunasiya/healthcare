import { Router } from 'express';
import { getAvailableTimeSlots } from '../controllers/availabilityController';
import { validateRequest } from '../middlewares/validate';
import { getAvailableTimeSlotsQuerySchema } from '../validators/availabilityValidators';

const router = Router();

router.get('/slots', validateRequest(getAvailableTimeSlotsQuerySchema), getAvailableTimeSlots);

export default router;
