import { PrismaClient } from '@prisma/client';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { Table } from '@domain/entities/Table';
import { TableStatus } from '@domain/value-objects/TableStatus';

export class PrismaTableRepository implements ITableRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(table: Table): Promise<Table> {
    const data = {
      id: table.id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      location: table.location || null,
      status: table.status.value,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    };

    const created = await this.prisma.table.create({ data });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<Table | null> {
    const table = await this.prisma.table.findUnique({
      where: { id },
    });

    return table ? this.toDomain(table) : null;
  }

  async findByTableNumber(tableNumber: number): Promise<Table | null> {
    const table = await this.prisma.table.findUnique({
      where: { tableNumber },
    });

    return table ? this.toDomain(table) : null;
  }

  async findAvailableTables(): Promise<Table[]> {
    const tables = await this.prisma.table.findMany({
      where: { status: 'available' },
      orderBy: { capacity: 'asc' },
    });

    return tables.map((t) => this.toDomain(t));
  }

  async findByCapacity(minCapacity: number): Promise<Table[]> {
    const tables = await this.prisma.table.findMany({
      where: {
        capacity: {
          gte: minCapacity,
        },
        status: 'available',
      },
      orderBy: { capacity: 'asc' },
    });

    return tables.map((t) => this.toDomain(t));
  }

  async findAll(): Promise<Table[]> {
    const tables = await this.prisma.table.findMany({
      orderBy: { tableNumber: 'asc' },
    });

    return tables.map((t) => this.toDomain(t));
  }

  async update(table: Table): Promise<Table> {
    const data = {
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      location: table.location || null,
      status: table.status.value,
      updatedAt: new Date(),
    };

    const updated = await this.prisma.table.update({
      where: { id: table.id },
      data,
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.table.delete({
      where: { id },
    });
  }

  private toDomain(data: {
    id: string;
    tableNumber: number;
    capacity: number;
    location: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Table {
    return new Table({
      id: data.id,
      tableNumber: data.tableNumber,
      capacity: data.capacity,
      location: data.location || undefined,
      status: TableStatus.fromString(data.status),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
