import { Restaurant } from '@domain/entities/Restaurant';
import { RestaurantDTO, CreateRestaurantDTO } from '../dtos/RestaurantDTO';

export class RestaurantMapper {
  static toDTO(restaurant: Restaurant): RestaurantDTO {
    return {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      timezone: restaurant.timezone,
      currency: restaurant.currency,
      address: restaurant.address,
      phone: restaurant.phone,
      noShowGraceMinutes: restaurant.noShowGraceMinutes,
      createdAt: restaurant.createdAt.toISOString(),
      updatedAt: restaurant.updatedAt.toISOString(),
    };
  }

  static toDomain(dto: CreateRestaurantDTO): Restaurant {
    return new Restaurant({
      name: dto.name,
      slug: dto.slug,
      timezone: dto.timezone,
      currency: dto.currency,
      address: dto.address,
      phone: dto.phone,
      noShowGraceMinutes: dto.noShowGraceMinutes,
    });
  }

  static toDTOList(restaurants: Restaurant[]): RestaurantDTO[] {
    return restaurants.map((restaurant) => this.toDTO(restaurant));
  }
}
