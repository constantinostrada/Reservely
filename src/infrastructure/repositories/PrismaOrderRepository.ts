import {
  PrismaClient,
  Order as PrismaOrder,
  OrderItem as PrismaOrderItem,
  OrderStatus as PrismaOrderStatus,
} from '@prisma/client';
import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { Order } from '@domain/entities/Order';
import { OrderItem } from '@domain/entities/OrderItem';
import { OrderStatus } from '@domain/value-objects/OrderStatus';
import { withTenant } from './tenantScope';

type PrismaOrderWithItems = PrismaOrder & { items: PrismaOrderItem[] };

export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(order: Order): Promise<Order> {
    // Nested create persists the order and all of its items in one
    // transaction — the aggregate is stored atomically
    const created = await this.prisma.order.create({
      data: {
        id: order.id,
        restaurantId: order.restaurantId,
        reservationId: order.reservationId || null,
        tableId: order.tableId || null,
        status: this.toPersistenceStatus(order.status),
        subtotalCents: order.subtotalCents,
        taxCents: order.taxCents,
        tipCents: order.tipCents,
        totalCents: order.totalCents,
        notes: order.notes || null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: {
          create: order.items.map((item) => ({
            id: item.id,
            restaurantId: order.restaurantId,
            menuItemId: item.menuItemId,
            itemName: item.itemName,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            notes: item.notes || null,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          })),
        },
      },
      include: { items: true },
    });

    return this.toDomain(created);
  }

  async findById(id: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    return order ? this.toDomain(order) : null;
  }

  async findByReservationId(
    restaurantId: string,
    reservationId: string
  ): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: withTenant(restaurantId, { reservationId }),
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.toDomain(order));
  }

  async findAll(restaurantId: string): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: withTenant(restaurantId),
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.toDomain(order));
  }

  private toPersistenceStatus(status: OrderStatus): PrismaOrderStatus {
    return status.value.toUpperCase() as PrismaOrderStatus;
  }

  private toDomain(data: PrismaOrderWithItems): Order {
    return new Order({
      id: data.id,
      restaurantId: data.restaurantId,
      reservationId: data.reservationId || undefined,
      tableId: data.tableId || undefined,
      status: OrderStatus.fromString(data.status),
      items: data.items.map(
        (item) =>
          new OrderItem({
            id: item.id,
            menuItemId: item.menuItemId,
            itemName: item.itemName,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            notes: item.notes || undefined,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          })
      ),
      taxCents: data.taxCents,
      tipCents: data.tipCents,
      notes: data.notes || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
