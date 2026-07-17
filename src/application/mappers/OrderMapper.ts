import { Order } from '@domain/entities/Order';
import { OrderItem } from '@domain/entities/OrderItem';
import { OrderDTO, OrderItemDTO } from '../dtos/OrderDTO';

export class OrderMapper {
  static toDTO(order: Order): OrderDTO {
    return {
      id: order.id,
      restaurantId: order.restaurantId,
      reservationId: order.reservationId,
      tableId: order.tableId,
      status: order.status.value,
      items: order.items.map((item) => this.toItemDTO(item)),
      subtotalCents: order.subtotalCents,
      taxCents: order.taxCents,
      tipCents: order.tipCents,
      totalCents: order.totalCents,
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  static toItemDTO(item: OrderItem): OrderItemDTO {
    return {
      id: item.id,
      menuItemId: item.menuItemId,
      itemName: item.itemName,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
      notes: item.notes,
    };
  }

  static toDTOList(orders: Order[]): OrderDTO[] {
    return orders.map((order) => this.toDTO(order));
  }
}
