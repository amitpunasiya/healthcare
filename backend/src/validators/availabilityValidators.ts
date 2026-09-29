import { z } from 'zod';
import { dateRegex } from './authValidators';

export const getAvailableTimeSlotsQuerySchema = z.object({
  query: z
    .object({
      date: z.string({ required_error: 'Date query parameter (YYYY-MM-DD) is required' }).regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
      providerId: z.string().trim().max(64).optional(),
      clinicId: z.string().trim().max(64).optional(),
      labId: z.string().trim().max(64).optional(),
      serviceId: z.string().trim().max(64).optional(),
    })
    .strict(),
});
