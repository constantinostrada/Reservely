import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { BillSplitService } from '@domain/services/BillSplitService';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { BillSplitDTO } from '../dtos/OrderDTO';

export class SplitBillUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly billSplitService: BillSplitService
  ) {}

  async execute(
    orderId: string,
    ways: number,
    context: TenantContext
  ): Promise<BillSplitDTO> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new EntityNotFoundException('Order', orderId);
    }

    assertSameTenant(order.restaurantId, context);

    const shareCents = this.billSplitService.split(order.totalCents, ways);

    return {
      orderId: order.id,
      subtotalCents: order.subtotalCents,
      taxCents: order.taxCents,
      tipCents: order.tipCents,
      totalCents: order.totalCents,
      ways,
      shareCents,
    };
  }
}
