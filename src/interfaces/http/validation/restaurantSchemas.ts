import { z } from 'zod';

export const createRestaurantSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must not exceed 50 characters')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must contain only lowercase letters, numbers and hyphens'
    ),
  timezone: z.string().min(1, 'Timezone must not be empty').optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, 'Currency must be a 3-letter ISO 4217 code')
    .optional(),
  address: z
    .string()
    .max(200, 'Address must not exceed 200 characters')
    .optional(),
  phone: z.string().max(30, 'Phone must not exceed 30 characters').optional(),
  noShowGraceMinutes: z
    .number()
    .int('No-show grace period must be a whole number of minutes')
    .min(0, 'No-show grace period cannot be negative')
    .max(1440, 'No-show grace period cannot exceed 1440 minutes (24h)')
    .optional(),
});

// The slug is immutable: it is the restaurant's public identifier
export const updateRestaurantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  address: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  noShowGraceMinutes: z.number().int().min(0).max(1440).optional(),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
