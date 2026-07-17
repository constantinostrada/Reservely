import { z } from 'zod';

export const chargeBillSchema = z.object({
  method: z.enum(['card', 'cash', 'online']).optional(),
});

export type ChargeBillInput = z.infer<typeof chargeBillSchema>;

/**
 * Shape of a mock-provider webhook delivery. `id` is the provider's
 * event id — the idempotency key — not the payment id.
 */
export const paymentWebhookSchema = z.object({
  id: z.string().min(1, 'Event id is required'),
  type: z.enum(['payment.succeeded', 'payment.failed']),
  data: z.object({
    externalRef: z.string().min(1, 'Charge reference is required'),
  }),
});

export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
