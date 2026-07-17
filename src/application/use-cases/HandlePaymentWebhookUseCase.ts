import { IPaymentRepository } from '@domain/repositories/IPaymentRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import {
  PaymentWebhookEventDTO,
  PaymentWebhookResultDTO,
} from '../dtos/PaymentDTO';
import { PaymentMapper } from '../mappers/PaymentMapper';

/**
 * Applies a payment provider webhook event exactly once.
 *
 * The provider may deliver the same event multiple times; idempotency is
 * keyed on the provider event id in two layers:
 *  1. a fast path that skips events already recorded, and
 *  2. the repository's settleWithEventDedupe, which records the event id
 *     and updates the payment in one transaction — so even two truly
 *     concurrent deliveries of the same event apply it only once.
 *
 * No tenant context: webhooks are provider-to-server calls, scoped by the
 * charge reference rather than an authenticated user.
 */
export class HandlePaymentWebhookUseCase {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(
    event: PaymentWebhookEventDTO
  ): Promise<PaymentWebhookResultDTO> {
    const payment = await this.paymentRepository.findByExternalRef(
      event.externalRef
    );
    if (!payment) {
      throw new EntityNotFoundException('Payment', event.externalRef);
    }

    // Replay fast path: the event was already applied, return the
    // persisted state untouched.
    if (await this.paymentRepository.hasProcessedEvent(event.eventId)) {
      return { payment: PaymentMapper.toDTO(payment), applied: false };
    }

    if (event.type === 'payment.succeeded') {
      payment.markSucceeded();
    } else {
      payment.markFailed();
    }

    const result = await this.paymentRepository.settleWithEventDedupe(
      payment,
      event.eventId,
      event.type
    );

    return {
      payment: PaymentMapper.toDTO(result.payment),
      applied: result.applied,
    };
  }
}
