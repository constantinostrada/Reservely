import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { TenantContext } from '../common/TenantContext';
import { RestaurantListDTO } from '../dtos/RestaurantDTO';
import { RestaurantMapper } from '../mappers/RestaurantMapper';

/**
 * Tenant-scoped list: a caller only ever sees their own restaurant, so
 * this returns a list of zero or one. The list shape keeps the endpoint
 * consistent with the other collection endpoints.
 */
export class ListRestaurantsUseCase {
  constructor(private readonly restaurantRepository: IRestaurantRepository) {}

  async execute(context: TenantContext): Promise<RestaurantListDTO> {
    const restaurant = await this.restaurantRepository.findById(
      context.restaurantId
    );

    const restaurants = restaurant ? [restaurant] : [];

    return {
      restaurants: RestaurantMapper.toDTOList(restaurants),
      total: restaurants.length,
    };
  }
}
