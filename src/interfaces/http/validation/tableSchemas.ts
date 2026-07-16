import { z } from 'zod';

export const createTableSchema = z.object({
  tableNumber: z
    .number()
    .int()
    .min(1, 'Table number must be at least 1'),
  capacity: z
    .number()
    .int()
    .min(1, 'Capacity must be at least 1')
    .max(20, 'Capacity cannot exceed 20'),
  location: z
    .string()
    .max(50, 'Location must not exceed 50 characters')
    .optional(),
});

export const updateTableSchema = z.object({
  tableNumber: z
    .number()
    .int()
    .min(1)
    .optional(),
  capacity: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional(),
  location: z
    .string()
    .max(50)
    .optional(),
  status: z
    .enum(['available', 'reserved', 'unavailable'])
    .optional(),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
