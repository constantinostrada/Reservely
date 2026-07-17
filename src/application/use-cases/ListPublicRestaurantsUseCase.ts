import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { RestaurantListDTO } from '../dtos/RestaurantDTO';
import { RestaurantMapper } from '../mappers/RestaurantMapper';

/**
 * Public restaurant directory: lists every restaurant so an unauthenticated
 * guest can pick one to book at. Unlike ListRestaurantsUseCase (which is
 * tenant-scoped to the caller's own restaurant), this is intentionally
 * cross-tenant and is only reached through the public booking endpoints.
 */
export class ListPublicRestaurantsUseCase {
  constructor(private readonly restaurantRepository: IRestaurantRepository) {}

  async execute(): Promise<RestaurantListDTO> {
    const restaurants = await this.restaurantRepository.findAll();

    return {
      restaurants: RestaurantMapper.toDTOList(restaurants),
      total: restaurants.length,
    };
  }
}
