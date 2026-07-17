import { z } from 'zod';

export const createMenuItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Menu item name is required')
    .max(100, 'Menu item name must not exceed 100 characters'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category must not exceed 50 characters'),
  priceCents: z
    .number()
    .int('Price must be an integer amount in cents')
    .min(0, 'Price cannot be negative'),
  isAvailable: z.boolean().optional(),
});

export const updateMenuItemSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .optional(),
  description: z
    .string()
    .max(500)
    .optional(),
  category: z
    .string()
    .min(1)
    .max(50)
    .optional(),
  priceCents: z
    .number()
    .int()
    .min(0)
    .optional(),
  isAvailable: z.boolean().optional(),
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
