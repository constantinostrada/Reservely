import { Table } from '../entities/Table';

export interface ITableRepository {
  save(table: Table): Promise<Table>;
  /**
   * Not tenant-scoped on purpose: callers must check the entity's
   * restaurantId against the current tenant (see assertSameTenant) so
   * cross-tenant access can be rejected with 403 instead of 404.
   */
  findById(id: string): Promise<Table | null>;
  findByTableNumber(
    restaurantId: string,
    tableNumber: number
  ): Promise<Table | null>;
  findAvailableTables(restaurantId: string): Promise<Table[]>;
  findByCapacity(restaurantId: string, minCapacity: number): Promise<Table[]>;
  findAll(restaurantId: string): Promise<Table[]>;
  update(table: Table): Promise<Table>;
  delete(restaurantId: string, id: string): Promise<void>;
}
