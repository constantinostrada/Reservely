import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { UpdateRestaurantDTO, RestaurantDTO } from '../dtos/RestaurantDTO';
import { RestaurantMapper } from '../mappers/RestaurantMapper';

export class UpdateRestaurantUseCase {
  constructor(private readonly restaurantRepository: IRestaurantRepository) {}

  async execute(
    id: string,
    dto: UpdateRestaurantDTO,
    context: TenantContext
  ): Promise<RestaurantDTO> {
    const restaurant = await this.restaurantRepository.findById(id);

    if (!restaurant) {
      throw new EntityNotFoundException('Restaurant', id);
    }

    assertSameTenant(restaurant.id, context);

    restaurant.updateDetails(dto);

    const updated = await this.restaurantRepository.update(restaurant);

    return RestaurantMapper.toDTO(updated);
  }
}
