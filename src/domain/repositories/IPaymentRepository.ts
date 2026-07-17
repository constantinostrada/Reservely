import { Payment } from '../entities/Payment';

export interface SettleResult {
  /** The payment as persisted (the winner's state on a duplicate). */
  payment: Payment;
  /** False when the event id had already been applied — nothing changed. */
  applied: boolean;
}

export interface IPaymentRepository {
  save(payment: Payment): Promise<Payment>;
  /**
   * Not tenant-scoped on purpose: callers must check the entity's
   * restaurantId against the current tenant (see assertSameTenant) so
   * cross-tenant access can be rejected with 403 instead of 404.
   */
  findById(id: string): Promise<Payment | null>;
  /** Looks a payment up by the provider's charge reference. */
  findByExternalRef(externalRef: string): Promise<Payment | null>;
  findByOrderId(restaurantId: string, orderId: string): Promise<Payment[]>;
  /** Every payment for a tenant — the operational dashboard's payment feed. */
  findAll(restaurantId: string): Promise<Payment[]>;
  /** Whether a provider event id has already been applied. */
  hasProcessedEvent(eventId: string): Promise<boolean>;
  /**
   * Persists a settlement (status transition) exactly once per provider
   * event id, atomically: recording the event id and updating the
   * payment happen in the same transaction, so of two concurrent
   * deliveries of the same event exactly one is applied — the other
   * returns the already-persisted state with applied=false.
   */
  settleWithEventDedupe(
    payment: Payment,
    eventId: string,
    eventType: string
  ): Promise<SettleResult>;
}
