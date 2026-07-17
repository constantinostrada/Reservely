import { Order } from '../entities/Order';

export interface IOrderRepository {
  /**
   * Persists the order together with all of its line items atomically:
   * either the whole aggregate is stored or nothing is.
   */
  save(order: Order): Promise<Order>;
  /**
   * Not tenant-scoped on purpose: callers must check the entity's
   * restaurantId against the current tenant (see assertSameTenant) so
   * cross-tenant access can be rejected with 403 instead of 404.
   */
  findById(id: string): Promise<Order | null>;
  findByReservationId(
    restaurantId: string,
    reservationId: string
  ): Promise<Order[]>;
  findAll(restaurantId: string): Promise<Order[]>;
}
