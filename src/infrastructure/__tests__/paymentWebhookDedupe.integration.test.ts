/**
 * Integration test for exactly-once webhook settlement against a real
 * Postgres instance. Proves acceptance criterion: replaying the same
 * provider event (even concurrently) applies the payment only once,
 * keyed on the unique event id.
 *
 * Runs when INTEGRATION_DATABASE_URL is available (jest.setup.js captures
 * the URL loaded from .env before unit tests are pointed at a fake one).
 * Set SKIP_INTEGRATION=1 to skip explicitly.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPaymentRepository } from '../repositories/PrismaPaymentRepository';
import { Payment } from '@domain/entities/Payment';
import { PaymentStatus } from '@domain/value-objects/PaymentStatus';

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const describeIntegration =
  databaseUrl && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('PrismaPaymentRepository.settleWithEventDedupe (Postgres)', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const repository = new PrismaPaymentRepository(prisma);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const restaurantId = `it-rest-${suffix}`;
  const orderId = `it-order-${suffix}`;

  let paymentCounter = 0;

  const createPendingPayment = async (): Promise<Payment> => {
    paymentCounter += 1;
    return repository.save(
      new Payment({
        restaurantId,
        orderId,
        amountCents: 3000,
        tipCents: 300,
        method: 'card',
        status: PaymentStatus.pending(),
        externalRef: `ch_it_${suffix}_${paymentCounter}`,
      })
    );
  };

  beforeAll(async () => {
    await prisma.restaurant.create({
      data: {
        id: restaurantId,
        name: 'Integration Test Bistro',
        slug: `it-bistro-pay-${suffix}`,
        timezone: 'America/New_York',
      },
    });
    await prisma.order.create({
      data: {
        id: orderId,
        restaurantId,
        subtotalCents: 2500,
        taxCents: 200,
        tipCents: 300,
        totalCents: 3000,
      },
    });
  });

  afterAll(async () => {
    // Cascades to orders, payments and payment_events
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  it('applies a settlement exactly once across concurrent duplicate deliveries', async () => {
    const payment = await createPendingPayment();
    const eventId = `evt_it_${suffix}_concurrent`;

    const ATTEMPTS = 8;
    const results = await Promise.all(
      Array.from({ length: ATTEMPTS }, () => {
        // Each delivery works on its own copy, as separate webhook
        // requests would
        const copy = new Payment({
          id: payment.id,
          restaurantId: payment.restaurantId,
          orderId: payment.orderId,
          amountCents: payment.amountCents,
          tipCents: payment.tipCents,
          method: payment.method,
          status: PaymentStatus.pending(),
          externalRef: payment.externalRef,
        });
        copy.markSucceeded();
        return repository.settleWithEventDedupe(
          copy,
          eventId,
          'payment.succeeded'
        );
      })
    );

    const applied = results.filter((r) => r.applied);
    expect(applied).toHaveLength(1);
    for (const result of results) {
      expect(result.payment.status.isSucceeded()).toBe(true);
    }

    // The database agrees: one event row, payment settled once
    const eventRows = await prisma.paymentEvent.count({
      where: { paymentId: payment.id },
    });
    expect(eventRows).toBe(1);
    const stored = await prisma.payment.findUnique({
      where: { id: payment.id },
    });
    expect(stored!.status).toBe('SUCCEEDED');
  }, 30_000);

  it('a sequential replay of the same event id is not applied again', async () => {
    const payment = await createPendingPayment();
    const eventId = `evt_it_${suffix}_replay`;

    payment.markSucceeded();
    const first = await repository.settleWithEventDedupe(
      payment,
      eventId,
      'payment.succeeded'
    );
    const replay = await repository.settleWithEventDedupe(
      payment,
      eventId,
      'payment.succeeded'
    );

    expect(first.applied).toBe(true);
    expect(replay.applied).toBe(false);
    expect(await repository.hasProcessedEvent(eventId)).toBe(true);
  });

  it('distinct event ids are applied independently', async () => {
    const payment = await createPendingPayment();

    payment.markFailed();
    const result = await repository.settleWithEventDedupe(
      payment,
      `evt_it_${suffix}_other`,
      'payment.failed'
    );

    expect(result.applied).toBe(true);
    expect(result.payment.status.isFailed()).toBe(true);
  });
});
