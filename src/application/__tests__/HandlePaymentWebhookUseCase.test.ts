import { HandlePaymentWebhookUseCase } from '../use-cases/HandlePaymentWebhookUseCase';
import { IEventPublisher } from '../ports/IEventPublisher';
import {
  IPaymentRepository,
  SettleResult,
} from '@domain/repositories/IPaymentRepository';
import { ReservelyDomainEvent } from '@domain/events/DomainEvent';
import { Payment } from '@domain/entities/Payment';
import { PaymentStatus } from '@domain/value-objects/PaymentStatus';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';

class RecordingEventPublisher implements IEventPublisher {
  public events: ReservelyDomainEvent[] = [];

  publish(event: ReservelyDomainEvent): void {
    this.events.push(event);
  }
}

/**
 * In-memory stand-in for PrismaPaymentRepository: the processed-event
 * set plays the role of the unique event_id column, so recording an
 * event and updating the payment are atomic — exactly the dedupe
 * contract of settleWithEventDedupe.
 */
class InMemoryPaymentRepository implements IPaymentRepository {
  private payments = new Map<string, Payment>();
  private processedEvents = new Set<string>();

  async save(payment: Payment): Promise<Payment> {
    this.payments.set(payment.id, payment);
    return payment;
  }

  async findById(id: string): Promise<Payment | null> {
    return this.payments.get(id) ?? null;
  }

  async findByExternalRef(externalRef: string): Promise<Payment | null> {
    for (const payment of this.payments.values()) {
      if (payment.externalRef === externalRef) {
        return payment;
      }
    }
    return null;
  }

  async findByOrderId(
    restaurantId: string,
    orderId: string
  ): Promise<Payment[]> {
    return [...this.payments.values()].filter(
      (p) => p.restaurantId === restaurantId && p.orderId === orderId
    );
  }

  async hasProcessedEvent(eventId: string): Promise<boolean> {
    return this.processedEvents.has(eventId);
  }

  async settleWithEventDedupe(
    payment: Payment,
    eventId: string
  ): Promise<SettleResult> {
    if (this.processedEvents.has(eventId)) {
      return { payment: this.payments.get(payment.id)!, applied: false };
    }
    this.processedEvents.add(eventId);
    this.payments.set(payment.id, payment);
    return { payment, applied: true };
  }
}

describe('HandlePaymentWebhookUseCase', () => {
  let repository: InMemoryPaymentRepository;
  let useCase: HandlePaymentWebhookUseCase;
  let publisher: RecordingEventPublisher;

  const makePendingPayment = () =>
    new Payment({
      id: 'pay-1',
      restaurantId: 'rest-1',
      orderId: 'order-1',
      amountCents: 3000,
      tipCents: 300,
      method: 'card',
      status: PaymentStatus.pending(),
      externalRef: 'ch_mock_1',
    });

  const succeededEvent = {
    eventId: 'evt_1',
    type: 'payment.succeeded' as const,
    externalRef: 'ch_mock_1',
  };

  beforeEach(async () => {
    repository = new InMemoryPaymentRepository();
    await repository.save(makePendingPayment());
    publisher = new RecordingEventPublisher();
    useCase = new HandlePaymentWebhookUseCase(repository, publisher);
  });

  it('applies a payment.succeeded event', async () => {
    const result = await useCase.execute(succeededEvent);

    expect(result.applied).toBe(true);
    expect(result.payment.status).toBe('succeeded');
    expect(result.payment.processedAt).toBeDefined();

    const stored = await repository.findById('pay-1');
    expect(stored!.status.isSucceeded()).toBe(true);
  });

  it('applies a payment.failed event', async () => {
    const result = await useCase.execute({
      ...succeededEvent,
      type: 'payment.failed',
    });

    expect(result.applied).toBe(true);
    expect(result.payment.status).toBe('failed');
  });

  it('replaying the same event applies the payment only once', async () => {
    const first = await useCase.execute(succeededEvent);
    const replay = await useCase.execute(succeededEvent);

    expect(first.applied).toBe(true);
    expect(replay.applied).toBe(false);
    // The replay reports the already-persisted state, unchanged
    expect(replay.payment.status).toBe('succeeded');
    expect(replay.payment.processedAt).toBe(first.payment.processedAt);

    const stored = await repository.findById('pay-1');
    expect(stored!.status.isSucceeded()).toBe(true);
  });

  it('dedupes on the event id, not the event payload', async () => {
    await useCase.execute(succeededEvent);

    // Same event id delivered again with a contradictory type must
    // still be ignored: the id alone is the idempotency key.
    const replay = await useCase.execute({
      ...succeededEvent,
      type: 'payment.failed',
    });

    expect(replay.applied).toBe(false);
    const stored = await repository.findById('pay-1');
    expect(stored!.status.isSucceeded()).toBe(true);
  });

  it('treats distinct event ids as distinct deliveries', async () => {
    await useCase.execute(succeededEvent);

    // A different event for an already-settled payment is not a replay;
    // it hits the domain transition guard instead of being swallowed.
    await expect(
      useCase.execute({ ...succeededEvent, eventId: 'evt_2' })
    ).rejects.toThrow('Only a pending payment can succeed');
  });

  it('throws for an unknown charge reference', async () => {
    await expect(
      useCase.execute({ ...succeededEvent, externalRef: 'ch_unknown' })
    ).rejects.toThrow(EntityNotFoundException);
  });

  describe('event publication', () => {
    it('publishes payment.succeeded when the settlement is applied', async () => {
      await useCase.execute(succeededEvent);

      expect(publisher.events).toHaveLength(1);
      expect(publisher.events[0]).toMatchObject({
        type: 'payment.succeeded',
        paymentId: 'pay-1',
        orderId: 'order-1',
        restaurantId: 'rest-1',
        amountCents: 3000,
      });
    });

    it('does not publish again for a replayed event', async () => {
      await useCase.execute(succeededEvent);
      await useCase.execute(succeededEvent);

      expect(publisher.events).toHaveLength(1);
    });

    it('does not publish for a failed payment', async () => {
      await useCase.execute({ ...succeededEvent, type: 'payment.failed' });

      expect(publisher.events).toHaveLength(0);
    });
  });
});
