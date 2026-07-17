import {
  Prisma,
  PrismaClient,
  MenuItem as PrismaMenuItem,
} from '@prisma/client';
import { IMenuItemRepository } from '@domain/repositories/IMenuItemRepository';
import { MenuItem } from '@domain/entities/MenuItem';
import { ConflictException } from '@domain/exceptions/DomainException';
import { withTenant } from './tenantScope';

export class PrismaMenuItemRepository implements IMenuItemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(menuItem: MenuItem): Promise<MenuItem> {
    const created = await this.prisma.menuItem.create({
      data: {
        id: menuItem.id,
        restaurantId: menuItem.restaurantId,
        name: menuItem.name,
        description: menuItem.description || null,
        category: menuItem.category,
        priceCents: menuItem.priceCents,
        isAvailable: menuItem.isAvailable,
        createdAt: menuItem.createdAt,
        updatedAt: menuItem.updatedAt,
      },
    });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<MenuItem | null> {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id },
    });

    return menuItem ? this.toDomain(menuItem) : null;
  }

  async findByName(
    restaurantId: string,
    name: string
  ): Promise<MenuItem | null> {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: {
        restaurantId_name: { restaurantId, name },
      },
    });

    return menuItem ? this.toDomain(menuItem) : null;
  }

  async findAll(restaurantId: string): Promise<MenuItem[]> {
    const menuItems = await this.prisma.menuItem.findMany({
      where: withTenant(restaurantId),
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return menuItems.map((item) => this.toDomain(item));
  }

  async update(menuItem: MenuItem): Promise<MenuItem> {
    const updated = await this.prisma.menuItem.update({
      where: { id: menuItem.id },
      data: {
        name: menuItem.name,
        description: menuItem.description || null,
        category: menuItem.category,
        priceCents: menuItem.priceCents,
        isAvailable: menuItem.isAvailable,
        updatedAt: new Date(),
      },
    });

    return this.toDomain(updated);
  }

  async delete(restaurantId: string, id: string): Promise<void> {
    try {
      // deleteMany so the tenant filter applies; delete() only accepts the
      // unique id and could remove another restaurant's row
      await this.prisma.menuItem.deleteMany({
        where: withTenant(restaurantId, { id }),
      });
    } catch (error) {
      // order_items.menu_item_id is ON DELETE RESTRICT
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Menu item is referenced by existing orders and cannot be deleted'
        );
      }
      throw error;
    }
  }

  private toDomain(data: PrismaMenuItem): MenuItem {
    return new MenuItem({
      id: data.id,
      restaurantId: data.restaurantId,
      name: data.name,
      description: data.description || undefined,
      category: data.category,
      priceCents: data.priceCents,
      isAvailable: data.isAvailable,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
