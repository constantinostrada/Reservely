import { PrismaClient, Restaurant as PrismaRestaurant } from '@prisma/client';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { Restaurant } from '@domain/entities/Restaurant';

export class PrismaRestaurantRepository implements IRestaurantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(restaurant: Restaurant): Promise<Restaurant> {
    const created = await this.prisma.restaurant.create({
      data: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        timezone: restaurant.timezone,
        currency: restaurant.currency,
        address: restaurant.address || null,
        phone: restaurant.phone || null,
        createdAt: restaurant.createdAt,
        updatedAt: restaurant.updatedAt,
      },
    });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<Restaurant | null> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });

    return restaurant ? this.toDomain(restaurant) : null;
  }

  async findBySlug(slug: string): Promise<Restaurant | null> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
    });

    return restaurant ? this.toDomain(restaurant) : null;
  }

  async update(restaurant: Restaurant): Promise<Restaurant> {
    const updated = await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        name: restaurant.name,
        timezone: restaurant.timezone,
        currency: restaurant.currency,
        address: restaurant.address || null,
        phone: restaurant.phone || null,
        updatedAt: new Date(),
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    // The restaurant is the tenant root; the schema cascades this delete
    // to every row it owns (users, tables, reservations, orders, ...)
    await this.prisma.restaurant.delete({
      where: { id },
    });
  }

  private toDomain(data: PrismaRestaurant): Restaurant {
    return new Restaurant({
      id: data.id,
      name: data.name,
      slug: data.slug,
      timezone: data.timezone,
      currency: data.currency,
      address: data.address || undefined,
      phone: data.phone || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
