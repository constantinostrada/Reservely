import { z } from 'zod';

export const placeOrderSchema = z.object({
  reservationId: z.string().min(1, 'Reservation id is required'),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1, 'Menu item id is required'),
        quantity: z
          .number()
          .int('Quantity must be an integer')
          .min(1, 'Quantity must be at least 1')
          .max(100, 'Quantity cannot exceed 100'),
        notes: z
          .string()
          .max(255, 'Item notes must not exceed 255 characters')
          .optional(),
      })
    )
    .min(1, 'Order must contain at least one item')
    .max(100, 'Order cannot contain more than 100 items'),
  tipCents: z
    .number()
    .int('Tip must be an integer amount in cents')
    .min(0, 'Tip cannot be negative')
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes must not exceed 500 characters')
    .optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
