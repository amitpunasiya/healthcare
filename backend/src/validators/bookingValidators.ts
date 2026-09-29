import { z } from 'zod';
import { indianPhoneRegex, indianPincodeRegex, dateRegex } from './authValidators';

const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

export const mongoIdParamSchema = z.object({
  params: z
    .object({
      id: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid 24-character hexadecimal ID format'),
    })
    .strict(),
});

export const serviceAddressSchema = z
  .object({
    label: z.string().trim().max(50).optional(),
    addressLine1: z.string({ required_error: 'Address is required' }).trim().min(3, 'Address must be at least 3 characters').max(250, 'Address cannot exceed 250 characters'),
    addressLine2: z.string().trim().max(250).optional(),
    houseNumber: z.string().trim().max(50).optional(),
    flatNumber: z.string().trim().max(50).optional(),
    buildingName: z.string().trim().max(100).optional(),
    street: z.string().trim().max(150).optional(),
    area: z.string().trim().max(150).optional(),
    landmark: z.string().trim().max(150).optional(),
    district: z.string().trim().max(100).optional(),
    city: z.string({ required_error: 'City is required' }).trim().min(1, 'City is required').max(100, 'City cannot exceed 100 characters'),
    state: z.string({ required_error: 'State is required' }).trim().min(1, 'State is required').max(100, 'State cannot exceed 100 characters'),
    pincode: z.string({ required_error: 'Pincode is required' }).trim().regex(indianPincodeRegex, 'Please enter a valid 6-digit Indian PIN code'),
    country: z.string().trim().max(50).optional(),
    countryCode: z.string().trim().max(10).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .strict();

export const timeSlotSchema = z
  .object({
    startTime: z.string({ required_error: 'Start time is required' }).regex(timeRegex, 'Start time must be in HH:MM format'),
    endTime: z.string({ required_error: 'End time is required' }).regex(timeRegex, 'End time must be in HH:MM format'),
  })
  .strict();

export const createOnlineBookingSchema = z.object({
  body: z
    .object({
      serviceCategoryId: z.string({ required_error: 'Service Category ID is required' }).trim().min(1).max(64),
      serviceId: z.string({ required_error: 'Service ID is required' }).trim().min(1).max(64),
      serviceMode: z.literal('HOME_VISIT', { errorMap: () => ({ message: 'Only HOME_VISIT mode is supported' }) }),
      engagementType: z.enum(['ONE_TIME', 'REGULAR_RECURRING']).default('ONE_TIME'),
      bookingDate: z.string({ required_error: 'Booking date is required' }).regex(dateRegex, 'Booking date must be in YYYY-MM-DD format'),
      timeSlot: timeSlotSchema,
      serviceAddress: serviceAddressSchema,
      providerId: z.string().trim().max(64).optional(),
      clinicId: z.string().trim().max(64).optional(),
      labId: z.string().trim().max(64).optional(),
      notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional(),
      recurringConfig: z
        .object({
          frequency: z.enum(['DAILY', 'WEEKLY']),
          interval: z.number().min(1).max(30).optional(),
          startDate: z.string().regex(dateRegex).optional(),
          endDate: z.string().regex(dateRegex).optional(),
          durationWeeks: z.number().min(1).max(52).optional(),
          daysOfWeek: z.array(z.number().min(0).max(6)).max(7).optional(),
          preferredTimeSlot: timeSlotSchema.optional(),
          totalSessionsExpected: z.number().min(1).max(365).optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
});

export const createManualBookingSchema = z.object({
  body: z
    .object({
      customerName: z.string().trim().min(2, 'Customer name must be at least 2 characters').max(100),
      customerPhone: z.string().trim().regex(indianPhoneRegex, 'Customer phone must be a valid 10-digit Indian mobile number'),
      customerEmail: z.string().trim().email('Invalid email address').optional(),
      serviceCategoryId: z.string().trim().min(1).max(64),
      serviceId: z.string().trim().min(1).max(64),
      serviceMode: z.literal('HOME_VISIT', { errorMap: () => ({ message: 'Only HOME_VISIT mode is supported' }) }),
      engagementType: z.enum(['ONE_TIME', 'REGULAR_RECURRING']).default('ONE_TIME'),
      bookingDate: z.string().regex(dateRegex, 'Booking date must be in YYYY-MM-DD format'),
      timeSlot: timeSlotSchema,
      serviceAddress: serviceAddressSchema,
      assignedProviderId: z.string().trim().max(64).optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .strict(),
});

export const updateBookingStatusSchema = z.object({
  params: z
    .object({
      id: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid 24-character hexadecimal ID format'),
    })
    .strict(),
  body: z
    .object({
      status: z.enum([
        'REQUESTED',
        'SEARCHING',
        'PENDING',
        'ACCEPTED',
        'REJECTED',
        'IN_PROGRESS',
        'COMPLETED',
        'PAYMENT_PENDING',
        'PAID',
        'NO_PROVIDER_FOUND',
        'CANCELLED',
        'NO_SHOW',
      ]),
      notes: z.string().trim().max(500).optional(),
    })
    .strict(),
});

export const cancelBookingSchema = z.object({
  params: z
    .object({
      id: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid 24-character hexadecimal ID format'),
    })
    .strict(),
  body: z
    .object({
      reason: z.string().trim().max(500, 'Cancellation reason cannot exceed 500 characters').optional(),
    })
    .strict(),
});
