import { container } from '@infrastructure/di/container';
import { TenantContext } from '@application/common/TenantContext';

/**
 * Admin-facing waitlist operations for the authenticated tenant. Guests join a
 * waitlist through the public booking flow (see PublicBookingController).
 */
export class WaitlistController {
  async list(auth: TenantContext) {
    const useCase = container.getListWaitlistUseCase();
    return await useCase.execute(auth);
  }

  async cleanupExpired(auth: TenantContext) {
    const useCase = container.getCleanupExpiredWaitlistUseCase();
    return await useCase.execute(auth);
  }
}
