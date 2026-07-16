import { Table } from '@domain/entities/Table';
import { TableStatus } from '@domain/value-objects/TableStatus';
import { TableDTO, CreateTableDTO } from '../dtos/TableDTO';

export class TableMapper {
  static toDTO(table: Table): TableDTO {
    return {
      id: table.id,
      restaurantId: table.restaurantId,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      location: table.location,
      status: table.status.value,
      createdAt: table.createdAt.toISOString(),
      updatedAt: table.updatedAt.toISOString(),
    };
  }

  static toDomain(dto: CreateTableDTO): Table {
    return new Table({
      restaurantId: dto.restaurantId,
      tableNumber: dto.tableNumber,
      capacity: dto.capacity,
      location: dto.location,
      status: TableStatus.available(),
    });
  }

  static toDTOList(tables: Table[]): TableDTO[] {
    return tables.map((table) => this.toDTO(table));
  }
}
