import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { ConflictException } from '@domain/exceptions/DomainException';
import { CreateRestaurantDTO, RestaurantDTO } from '../dtos/RestaurantDTO';
import { RestaurantMapper } from '../mappers/RestaurantMapper';

/**
 * Creates a new restaurant (tenant). This is the onboarding entry point,
 * so unlike every other use case it takes no TenantContext — there is no
 * tenant yet to authenticate against.
 */
export class CreateRestaurantUseCase {
  constructor(private readonly restaurantRepository: IRestaurantRepository) {}

  async execute(dto: CreateRestaurantDTO): Promise<RestaurantDTO> {
    const existing = await this.restaurantRepository.findBySlug(dto.slug);

    if (existing) {
      throw new ConflictException(
        `A restaurant with slug '${dto.slug}' already exists`
      );
    }

    const restaurant = RestaurantMapper.toDomain(dto);
    const saved = await this.restaurantRepository.save(restaurant);

    return RestaurantMapper.toDTO(saved);
  }
}
