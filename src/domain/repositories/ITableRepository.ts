import { Table } from '../entities/Table';

export interface ITableRepository {
  save(table: Table): Promise<Table>;
  findById(id: string): Promise<Table | null>;
  findByTableNumber(tableNumber: number): Promise<Table | null>;
  findAvailableTables(): Promise<Table[]>;
  findByCapacity(minCapacity: number): Promise<Table[]>;
  findAll(): Promise<Table[]>;
  update(table: Table): Promise<Table>;
  delete(id: string): Promise<void>;
}
