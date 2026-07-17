import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { RestaurantDTO } from '../dtos/RestaurantDTO';
import { RestaurantMapper } from '../mappers/RestaurantMapper';

/**
 * Public read of a single restaurant for the guest booking page. There is no
 * tenant check here (unlike GetRestaurantUseCase): the booking flow is open
 * to anyone, and only public-facing fields are exposed via RestaurantDTO.
 */
export class GetPublicRestaurantUseCase {
  constructor(private readonly restaurantRepository: IRestaurantRepository) {}

  async execute(id: string): Promise<RestaurantDTO> {
    const restaurant = await this.restaurantRepository.findById(id);

    if (!restaurant) {
      throw new EntityNotFoundException('Restaurant', id);
    }

    return RestaurantMapper.toDTO(restaurant);
  }
}
