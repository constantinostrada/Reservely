import {
  PrismaClient,
  Table as PrismaTable,
  TableStatus as PrismaTableStatus,
} from '@prisma/client';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { Table } from '@domain/entities/Table';
import { TableStatus } from '@domain/value-objects/TableStatus';

export class PrismaTableRepository implements ITableRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(table: Table): Promise<Table> {
    const created = await this.prisma.table.create({
      data: {
        id: table.id,
        restaurantId: table.restaurantId,
        number: table.tableNumber,
        capacity: table.capacity,
        location: table.location || null,
        status: this.toPersistenceStatus(table.status),
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
      },
    });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<Table | null> {
    const table = await this.prisma.table.findUnique({
      where: { id },
    });

    return table ? this.toDomain(table) : null;
  }

  async findByTableNumber(
    restaurantId: string,
    tableNumber: number
  ): Promise<Table | null> {
    const table = await this.prisma.table.findUnique({
      where: {
        restaurantId_number: { restaurantId, number: tableNumber },
      },
    });

    return table ? this.toDomain(table) : null;
  }

  async findAvailableTables(restaurantId: string): Promise<Table[]> {
    const tables = await this.prisma.table.findMany({
      where: { restaurantId, status: 'AVAILABLE' },
      orderBy: { capacity: 'asc' },
    });

    return tables.map((t) => this.toDomain(t));
  }

  async findByCapacity(
    restaurantId: string,
    minCapacity: number
  ): Promise<Table[]> {
    const tables = await this.prisma.table.findMany({
      where: {
        restaurantId,
        capacity: {
          gte: minCapacity,
        },
        status: 'AVAILABLE',
      },
      orderBy: { capacity: 'asc' },
    });

    return tables.map((t) => this.toDomain(t));
  }

  async findAll(): Promise<Table[]> {
    const tables = await this.prisma.table.findMany({
      orderBy: { number: 'asc' },
    });

    return tables.map((t) => this.toDomain(t));
  }

  async update(table: Table): Promise<Table> {
    const updated = await this.prisma.table.update({
      where: { id: table.id },
      data: {
        number: table.tableNumber,
        capacity: table.capacity,
        location: table.location || null,
        status: this.toPersistenceStatus(table.status),
        updatedAt: new Date(),
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.table.delete({
      where: { id },
    });
  }

  private toPersistenceStatus(status: TableStatus): PrismaTableStatus {
    return status.value.toUpperCase() as PrismaTableStatus;
  }

  private toDomain(data: PrismaTable): Table {
    return new Table({
      id: data.id,
      restaurantId: data.restaurantId,
      tableNumber: data.number,
      capacity: data.capacity,
      location: data.location || undefined,
      status: TableStatus.fromString(data.status),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
