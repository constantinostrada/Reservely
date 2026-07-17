export interface CreateChargeRequest {
  paymentId: string;
  orderId: string;
  restaurantId: string;
  /** Integer cents. */
  amountCents: number;
}

export interface CreateChargeResult {
  /**
   * The provider's charge reference. The provider later reports the
   * outcome by delivering webhook events that carry this reference.
   */
  externalRef: string;
}

/**
 * Port for the external payment processor. Charges are asynchronous:
 * createCharge only initiates the payment; the outcome arrives later as
 * a webhook (see HandlePaymentWebhookUseCase), possibly more than once.
 */
export interface IPaymentProvider {
  createCharge(request: CreateChargeRequest): Promise<CreateChargeResult>;
}
