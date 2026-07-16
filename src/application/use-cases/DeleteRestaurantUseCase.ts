import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';

/**
 * Deletes the restaurant and (via DB cascade) everything it owns.
 * Destructive enough that only the owner may do it.
 */
export class DeleteRestaurantUseCase {
  constructor(private readonly restaurantRepository: IRestaurantRepository) {}

  async execute(id: string, context: TenantContext): Promise<void> {
    const restaurant = await this.restaurantRepository.findById(id);

    if (!restaurant) {
      throw new EntityNotFoundException('Restaurant', id);
    }

    assertSameTenant(restaurant.id, context);

    if (context.role !== 'owner') {
      throw new ForbiddenException(
        'Only the restaurant owner can delete the restaurant'
      );
    }

    await this.restaurantRepository.delete(id);
  }
}
