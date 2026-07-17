import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { IPaymentRepository } from '@domain/repositories/IPaymentRepository';
import { Payment } from '@domain/entities/Payment';
import { PaymentStatus } from '@domain/value-objects/PaymentStatus';
import {
  ConflictException,
  EntityNotFoundException,
  InvalidOperationException,
} from '@domain/exceptions/DomainException';
import { IPaymentProvider } from '../ports/IPaymentProvider';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { ChargeBillDTO, PaymentDTO } from '../dtos/PaymentDTO';
import { PaymentMapper } from '../mappers/PaymentMapper';

export class ChargeBillUseCase {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly orderRepository: IOrderRepository,
    private readonly paymentProvider: IPaymentProvider
  ) {}

  async execute(
    orderId: string,
    dto: ChargeBillDTO,
    context: TenantContext
  ): Promise<PaymentDTO> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new EntityNotFoundException('Order', orderId);
    }

    assertSameTenant(order.restaurantId, context);

    if (order.status.isCancelled()) {
      throw new InvalidOperationException(
        'A cancelled order cannot be charged'
      );
    }

    // One live charge per bill: an in-flight or succeeded payment blocks
    // a second one. Failed and refunded payments may be retried.
    const existingPayments = await this.paymentRepository.findByOrderId(
      context.restaurantId,
      orderId
    );
    if (existingPayments.some((p) => p.status.blocksNewCharge())) {
      throw new ConflictException(
        'This order already has a pending or successful payment'
      );
    }

    const payment = new Payment({
      restaurantId: order.restaurantId,
      orderId: order.id,
      // The order total already includes tax and tip (derived on the
      // Order aggregate); the payment snapshots both.
      amountCents: order.totalCents,
      tipCents: order.tipCents,
      method: dto.method ?? 'card',
      status: PaymentStatus.pending(),
    });

    // Initiate the asynchronous charge; the provider reports the outcome
    // later via webhook, keyed by this reference.
    const { externalRef } = await this.paymentProvider.createCharge({
      paymentId: payment.id,
      orderId: order.id,
      restaurantId: order.restaurantId,
      amountCents: payment.amountCents,
    });

    const saved = await this.paymentRepository.save(
      new Payment({
        id: payment.id,
        restaurantId: payment.restaurantId,
        orderId: payment.orderId,
        amountCents: payment.amountCents,
        tipCents: payment.tipCents,
        method: payment.method,
        status: payment.status,
        externalRef,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      })
    );

    return PaymentMapper.toDTO(saved);
  }
}
