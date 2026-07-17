import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { IPaymentRepository } from '@domain/repositories/IPaymentRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { PaymentListDTO } from '../dtos/PaymentDTO';
import { PaymentMapper } from '../mappers/PaymentMapper';

/**
 * Reads the payments recorded against a single order so the checkout UI can
 * reflect the current, webhook-confirmed state of a bill (pending → paid /
 * declined). Tenant-scoped via the order's restaurant.
 */
export class ListOrderPaymentsUseCase {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly orderRepository: IOrderRepository
  ) {}

  async execute(
    orderId: string,
    context: TenantContext
  ): Promise<PaymentListDTO> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new EntityNotFoundException('Order', orderId);
    }

    assertSameTenant(order.restaurantId, context);

    const payments = await this.paymentRepository.findByOrderId(
      context.restaurantId,
      orderId
    );

    return {
      payments: PaymentMapper.toDTOList(payments),
      total: payments.length,
    };
  }
}
