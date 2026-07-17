import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { IMenuItemRepository } from '@domain/repositories/IMenuItemRepository';
import {
  EntityNotFoundException,
  InvalidOperationException,
} from '@domain/exceptions/DomainException';
import { Order } from '@domain/entities/Order';
import { OrderItem } from '@domain/entities/OrderItem';
import { OrderStatus } from '@domain/value-objects/OrderStatus';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { PlaceOrderDTO, OrderDTO } from '../dtos/OrderDTO';
import { OrderMapper } from '../mappers/OrderMapper';

export class PlaceOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly reservationRepository: IReservationRepository,
    private readonly menuItemRepository: IMenuItemRepository
  ) {}

  async execute(
    dto: PlaceOrderDTO,
    context: TenantContext
  ): Promise<OrderDTO> {
    // The order must hang off a live reservation of this tenant
    const reservation = await this.reservationRepository.findById(
      dto.reservationId
    );

    if (!reservation) {
      throw new EntityNotFoundException('Reservation', dto.reservationId);
    }

    assertSameTenant(reservation.restaurantId, context);

    if (!reservation.canAcceptOrders()) {
      throw new InvalidOperationException(
        `Cannot place an order against a ${reservation.status.value} reservation`
      );
    }

    // Resolve every ordered menu item, snapshotting name and price so the
    // order keeps its history when the menu changes later
    const orderItems: OrderItem[] = [];
    for (const itemDto of dto.items) {
      const menuItem = await this.menuItemRepository.findById(
        itemDto.menuItemId
      );

      if (!menuItem) {
        throw new EntityNotFoundException('MenuItem', itemDto.menuItemId);
      }

      assertSameTenant(menuItem.restaurantId, context);

      if (!menuItem.isAvailable) {
        throw new InvalidOperationException(
          `Menu item "${menuItem.name}" is not available`
        );
      }

      orderItems.push(
        new OrderItem({
          menuItemId: menuItem.id,
          itemName: menuItem.name,
          quantity: itemDto.quantity,
          unitPriceCents: menuItem.priceCents,
          notes: itemDto.notes,
        })
      );
    }

    // The Order entity derives subtotal and total from its items
    const order = new Order({
      restaurantId: context.restaurantId,
      reservationId: reservation.id,
      tableId: reservation.tableId,
      status: OrderStatus.open(),
      items: orderItems,
      tipCents: dto.tipCents,
      notes: dto.notes,
    });

    const savedOrder = await this.orderRepository.save(order);

    return OrderMapper.toDTO(savedOrder);
  }
}
