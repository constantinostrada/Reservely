import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { TenantContext } from '../common/TenantContext';
import { OrderListDTO } from '../dtos/OrderDTO';
import { OrderMapper } from '../mappers/OrderMapper';

export class ListOrdersUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(
    context: TenantContext,
    filters?: { reservationId?: string }
  ): Promise<OrderListDTO> {
    const orders = filters?.reservationId
      ? await this.orderRepository.findByReservationId(
          context.restaurantId,
          filters.reservationId
        )
      : await this.orderRepository.findAll(context.restaurantId);

    return {
      orders: OrderMapper.toDTOList(orders),
      total: orders.length,
    };
  }
}
