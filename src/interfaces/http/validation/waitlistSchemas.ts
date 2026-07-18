import { z } from 'zod';

/**
 * Joining a waitlist needs the same guest + slot facts as a booking, minus the
 * table (the guest waits for the whole slot, not a specific table).
 */
export const joinWaitlistSchema = z.object({
  guestName: z
    .string()
    .min(1, 'Guest name is required')
    .max(100, 'Guest name must not exceed 100 characters'),
  guestEmail: z.string().email('Invalid email format'),
  guestPhone: z
    .string()
    .max(20, 'Phone number must not exceed 20 characters')
    .optional(),
  date: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Date must be YYYY-MM-DD (restaurant local time)'
    ),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'),
  partySize: z
    .number()
    .int()
    .min(1, 'Party size must be at least 1')
    .max(50, 'Party size cannot exceed 50'),
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
