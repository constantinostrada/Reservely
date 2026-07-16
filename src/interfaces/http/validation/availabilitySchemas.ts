import { z } from 'zod';

export const getAvailabilitySchema = z.object({
  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Date must be YYYY-MM-DD (restaurant local time)'
    ),
  partySize: z.coerce
    .number()
    .int()
    .min(1, 'Party size must be at least 1')
    .max(50, 'Party size cannot exceed 50'),
});

export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;
