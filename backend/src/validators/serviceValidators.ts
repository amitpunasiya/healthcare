import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z
    .object({
      name: z.string({ required_error: 'Category name is required' }).trim().min(2, 'Name must be at least 2 characters').max(100),
      description: z.string({ required_error: 'Description is required' }).trim().min(5, 'Description must be at least 5 characters').max(1000),
      iconName: z.string().trim().max(50).optional(),
      displayOrder: z.number().min(0).max(1000).optional(),
    })
    .strict(),
});

export const createServiceSchema = z.object({
  body: z
    .object({
      categoryId: z.string({ required_error: 'Category ID is required' }).trim().min(1).max(64),
      name: z.string({ required_error: 'Service name is required' }).trim().min(2, 'Name must be at least 2 characters').max(150),
      description: z.string({ required_error: 'Description is required' }).trim().min(5, 'Description must be at least 5 characters').max(2000),
      basePrice: z.number({ required_error: 'Base price is required' }).min(1, 'Base price must be at least ₹1').max(1000000, 'Price exceeds maximum allowed limit'),
      originalPrice: z.number().min(1).max(1000000).optional(),
      discountPercent: z.number().min(0).max(99).optional(),
      durationMinutes: z.number().min(5, 'Duration must be at least 5 minutes').max(1440, 'Duration cannot exceed 24 hours').optional(),
      prepInstructions: z.string().trim().max(1000).optional(),
      sampleCollectionInfo: z.string().trim().max(1000).optional(),
    })
    .strict(),
});

export const updateServiceSchema = z.object({
  params: z
    .object({
      id: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Invalid 24-character hexadecimal ID format'),
    })
    .strict(),
  body: z
    .object({
      name: z.string().trim().min(2).max(150).optional(),
      description: z.string().trim().min(5).max(2000).optional(),
      basePrice: z.number().min(1).max(1000000).optional(),
      originalPrice: z.number().min(1).max(1000000).optional(),
      discountPercent: z.number().min(0).max(99).optional(),
      durationMinutes: z.number().min(5).max(1440).optional(),
      isActive: z.boolean().optional(),
    })
    .strict(),
});

export const getCategoryBySlugSchema = z.object({
  params: z
    .object({
      slug: z.string().trim().min(1, 'Category slug is required').max(100),
    })
    .strict(),
});
