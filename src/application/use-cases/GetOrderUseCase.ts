import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { OrderDTO } from '../dtos/OrderDTO';
import { OrderMapper } from '../mappers/OrderMapper';

export class GetOrderUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(id: string, context: TenantContext): Promise<OrderDTO> {
    const order = await this.orderRepository.findById(id);

    if (!order) {
      throw new EntityNotFoundException('Order', id);
    }

    assertSameTenant(order.restaurantId, context);

    return OrderMapper.toDTO(order);
  }
}
