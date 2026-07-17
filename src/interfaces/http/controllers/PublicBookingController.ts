import { container } from '@infrastructure/di/container';
import { CreateReservationDTO } from '@application/dtos/ReservationDTO';
import { GetAvailabilityDTO } from '@application/dtos/AvailabilityDTO';
import { TenantContext } from '@application/common/TenantContext';

/**
 * Entry point for the unauthenticated, customer-facing booking flow. A guest
 * browses restaurants, checks availability, and books — always naming the
 * restaurant explicitly in the URL rather than deriving it from a session.
 *
 * Availability and reservation creation reuse the same use cases the admin
 * flow uses; they only ever read `restaurantId` from the context, so we hand
 * them a public context whose restaurant comes from the request, not a token.
 */
export class PublicBookingController {
  async listRestaurants() {
    const useCase = container.getListPublicRestaurantsUseCase();
    return await useCase.execute();
  }

  async getRestaurant(id: string) {
    const useCase = container.getGetPublicRestaurantUseCase();
    return await useCase.execute(id);
  }

  async availability(restaurantId: string, dto: GetAvailabilityDTO) {
    const useCase = container.getGetAvailabilityUseCase();
    return await useCase.execute(dto, publicContext(restaurantId));
  }

  async reserve(restaurantId: string, dto: CreateReservationDTO) {
    const useCase = container.getCreateReservationUseCase();
    return await useCase.execute(dto, publicContext(restaurantId));
  }
}

/**
 * The restaurant being booked is the only tenant fact a public request
 * carries; there is no user or role behind it.
 */
function publicContext(restaurantId: string): TenantContext {
  return { userId: 'public', restaurantId, role: 'guest' };
}
