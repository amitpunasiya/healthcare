import { z } from 'zod';

export const createRazorpayOrderSchema = z.object({
  body: z
    .object({
      bookingId: z
        .string({ required_error: 'Booking ID is required' })
        .trim()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid 24-character hexadecimal Booking ID format'),
    })
    .strict(),
});

export const verifyRazorpayPaymentSchema = z.object({
  body: z
    .object({
      bookingId: z
        .string({ required_error: 'Booking ID is required' })
        .trim()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid 24-character hexadecimal Booking ID format'),
      razorpay_order_id: z
        .string({ required_error: 'Razorpay Order ID is required' })
        .trim()
        .min(1)
        .max(100),
      razorpay_payment_id: z
        .string({ required_error: 'Razorpay Payment ID is required' })
        .trim()
        .min(1)
        .max(100),
      razorpay_signature: z
        .string({ required_error: 'Razorpay Signature is required' })
        .trim()
        .min(1)
        .max(256),
    })
    .strict(),
});

export const recordCashPaymentSchema = z.object({
  body: z
    .object({
      bookingId: z
        .string({ required_error: 'Booking ID is required' })
        .trim()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid 24-character hexadecimal Booking ID format'),
      amountCollected: z
        .number()
        .min(0, 'Amount collected must be non-negative')
        .max(1000000, 'Amount exceeds maximum allowed limit')
        .optional(),
    })
    .strict(),
});

export const manualPaymentParamSchema = z.object({
  params: z
    .object({
      bookingId: z
        .string({ required_error: 'Booking ID is required' })
        .trim()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Booking ID format'),
    })
    .strict(),
  body: z
    .object({
      paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']),
      notes: z.string().trim().max(500).optional(),
    })
    .strict(),
});
