import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { RestaurantDTO } from '../dtos/RestaurantDTO';
import { RestaurantMapper } from '../mappers/RestaurantMapper';

export class GetRestaurantUseCase {
  constructor(private readonly restaurantRepository: IRestaurantRepository) {}

  async execute(id: string, context: TenantContext): Promise<RestaurantDTO> {
    const restaurant = await this.restaurantRepository.findById(id);

    if (!restaurant) {
      throw new EntityNotFoundException('Restaurant', id);
    }

    // The restaurant is the tenant, so its own id is the tenant id
    assertSameTenant(restaurant.id, context);

    return RestaurantMapper.toDTO(restaurant);
  }
}
