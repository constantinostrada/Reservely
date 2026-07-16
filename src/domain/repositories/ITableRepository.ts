import { Table } from '../entities/Table';

export interface ITableRepository {
  save(table: Table): Promise<Table>;
  findById(id: string): Promise<Table | null>;
  findByTableNumber(
    restaurantId: string,
    tableNumber: number
  ): Promise<Table | null>;
  findAvailableTables(restaurantId: string): Promise<Table[]>;
  findByCapacity(restaurantId: string, minCapacity: number): Promise<Table[]>;
  findAll(): Promise<Table[]>;
  update(table: Table): Promise<Table>;
  delete(id: string): Promise<void>;
}
