import {
  PrismaClient,
  Table as PrismaTable,
  TableStatus as PrismaTableStatus,
} from '@prisma/client';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { Table } from '@domain/entities/Table';
import { TableStatus } from '@domain/value-objects/TableStatus';
import { withTenant } from './tenantScope';

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
      where: withTenant(restaurantId, { status: 'AVAILABLE' as const }),
      orderBy: { capacity: 'asc' },
    });

    return tables.map((t) => this.toDomain(t));
  }

  async findByCapacity(
    restaurantId: string,
    minCapacity: number
  ): Promise<Table[]> {
    const tables = await this.prisma.table.findMany({
      where: withTenant(restaurantId, {
        capacity: {
          gte: minCapacity,
        },
        status: 'AVAILABLE' as const,
      }),
      orderBy: { capacity: 'asc' },
    });

    return tables.map((t) => this.toDomain(t));
  }

  async findAll(restaurantId: string): Promise<Table[]> {
    const tables = await this.prisma.table.findMany({
      where: withTenant(restaurantId),
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

  async delete(restaurantId: string, id: string): Promise<void> {
    // deleteMany so the tenant filter applies; delete() only accepts the
    // unique id and could remove another restaurant's row
    await this.prisma.table.deleteMany({
      where: withTenant(restaurantId, { id }),
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
