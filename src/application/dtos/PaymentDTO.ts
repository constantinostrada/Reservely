export interface ChargeBillDTO {
  /** How the guest pays; the mock provider accepts any method. */
  method?: 'card' | 'cash' | 'online';
}

export interface PaymentDTO {
  id: string;
  restaurantId: string;
  orderId: string;
  amountCents: number;
  tipCents: number;
  method: string;
  status: string;
  externalRef?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentListDTO {
  payments: PaymentDTO[];
  total: number;
}

/** A webhook delivery from the payment provider. */
export interface PaymentWebhookEventDTO {
  /** Provider-assigned event id — the idempotency key. */
  eventId: string;
  type: 'payment.succeeded' | 'payment.failed';
  /** The charge this event reports on. */
  externalRef: string;
}

export interface PaymentWebhookResultDTO {
  payment: PaymentDTO;
  /** False when the event was a duplicate and nothing was applied. */
  applied: boolean;
}
