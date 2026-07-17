import { randomUUID } from 'crypto';
import {
  Prisma,
  PrismaClient,
  Payment as PrismaPayment,
  PaymentMethod as PrismaPaymentMethod,
  PaymentStatus as PrismaPaymentStatus,
} from '@prisma/client';
import {
  IPaymentRepository,
  SettleResult,
} from '@domain/repositories/IPaymentRepository';
import { Payment, PaymentMethodValue } from '@domain/entities/Payment';
import { PaymentStatus } from '@domain/value-objects/PaymentStatus';
import { withTenant } from './tenantScope';

export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(payment: Payment): Promise<Payment> {
    const created = await this.prisma.payment.create({
      data: this.toCreateData(payment),
    });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<Payment | null> {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    return payment ? this.toDomain(payment) : null;
  }

  async findByExternalRef(externalRef: string): Promise<Payment | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { externalRef },
    });
    return payment ? this.toDomain(payment) : null;
  }

  async findByOrderId(
    restaurantId: string,
    orderId: string
  ): Promise<Payment[]> {
    const payments = await this.prisma.payment.findMany({
      where: withTenant(restaurantId, { orderId }),
      orderBy: { createdAt: 'desc' },
    });
    return payments.map((p) => this.toDomain(p));
  }

  async findAll(restaurantId: string): Promise<Payment[]> {
    const payments = await this.prisma.payment.findMany({
      where: withTenant(restaurantId, {}),
      orderBy: { createdAt: 'desc' },
    });
    return payments.map((p) => this.toDomain(p));
  }

  async hasProcessedEvent(eventId: string): Promise<boolean> {
    const event = await this.prisma.paymentEvent.findUnique({
      where: { eventId },
      select: { id: true },
    });
    return event !== null;
  }

  /**
   * Exactly-once settlement. Inside one transaction:
   *  1. record the provider event id — `ON CONFLICT DO NOTHING` on the
   *     unique event_id column means a duplicate insert returns no row
   *     (a concurrent duplicate blocks on the unique index until the
   *     winner commits, then also returns no row);
   *  2. only the delivery that actually recorded the event updates the
   *     payment; a duplicate reads back the persisted state instead.
   */
  async settleWithEventDedupe(
    payment: Payment,
    eventId: string,
    eventType: string
  ): Promise<SettleResult> {
    return this.prisma.$transaction(async (tx) => {
      const recorded = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO payment_events (id, restaurant_id, payment_id, event_id, type)
        VALUES (${randomUUID()}, ${payment.restaurantId}, ${payment.id},
                ${eventId}, ${eventType})
        ON CONFLICT (event_id) DO NOTHING
        RETURNING id
      `;

      if (recorded.length === 0) {
        const current = await tx.payment.findUniqueOrThrow({
          where: { id: payment.id },
        });
        return { payment: this.toDomain(current), applied: false };
      }

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: this.toPersistenceStatus(payment.status),
          processedAt: payment.processedAt ?? null,
          updatedAt: new Date(),
        },
      });
      return { payment: this.toDomain(updated), applied: true };
    });
  }

  private toCreateData(payment: Payment): Prisma.PaymentUncheckedCreateInput {
    return {
      id: payment.id,
      restaurantId: payment.restaurantId,
      orderId: payment.orderId,
      amountCents: payment.amountCents,
      tipCents: payment.tipCents,
      method: payment.method.toUpperCase() as PrismaPaymentMethod,
      status: this.toPersistenceStatus(payment.status),
      externalRef: payment.externalRef || null,
      processedAt: payment.processedAt ?? null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private toPersistenceStatus(status: PaymentStatus): PrismaPaymentStatus {
    return status.value.toUpperCase() as PrismaPaymentStatus;
  }

  private toDomain(data: PrismaPayment): Payment {
    return new Payment({
      id: data.id,
      restaurantId: data.restaurantId,
      orderId: data.orderId,
      amountCents: data.amountCents,
      tipCents: data.tipCents,
      method: data.method.toLowerCase() as PaymentMethodValue,
      status: PaymentStatus.fromString(data.status),
      externalRef: data.externalRef || undefined,
      processedAt: data.processedAt || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
