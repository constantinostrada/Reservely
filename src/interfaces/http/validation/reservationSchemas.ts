import { z } from 'zod';

export const createReservationSchema = z.object({
  guestName: z
    .string()
    .min(1, 'Guest name is required')
    .max(100, 'Guest name must not exceed 100 characters'),
  guestEmail: z.string().email('Invalid email format'),
  guestPhone: z
    .string()
    .max(20, 'Phone number must not exceed 20 characters')
    .optional(),
  date: z.string().datetime('Invalid date format'),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
  partySize: z
    .number()
    .int()
    .min(1, 'Party size must be at least 1')
    .max(50, 'Party size cannot exceed 50'),
  notes: z
    .string()
    .max(500, 'Notes must not exceed 500 characters')
    .optional(),
});

export const updateReservationSchema = z.object({
  guestName: z
    .string()
    .min(1)
    .max(100)
    .optional(),
  guestPhone: z
    .string()
    .max(20)
    .optional(),
  date: z.string().datetime().optional(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional(),
  partySize: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional(),
  notes: z
    .string()
    .max(500)
    .optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
