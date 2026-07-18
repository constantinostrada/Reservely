import { CleanupExpiredWaitlistUseCase } from '../use-cases/CleanupExpiredWaitlistUseCase';
import { TenantContext } from '../common/TenantContext';
import { IWaitlistRepository } from '@domain/repositories/IWaitlistRepository';

describe('CleanupExpiredWaitlistUseCase', () => {
  const tenant: TenantContext = {
    userId: 'user-1',
    restaurantId: 'rest-1',
    role: 'owner',
  };

  it('expires stale entries for the tenant and reports the count', async () => {
    const waitlistRepo: jest.Mocked<IWaitlistRepository> = {
      save: jest.fn(),
      findById: jest.fn(),
      findWaiting: jest.fn(),
      countWaitingForSlot: jest.fn(),
      promoteNextForFreedSlot: jest.fn(),
      expireStale: jest.fn().mockResolvedValue(3),
    };

    const useCase = new CleanupExpiredWaitlistUseCase(waitlistRepo);
    const result = await useCase.execute(tenant);

    expect(result.expired).toBe(3);
    expect(waitlistRepo.expireStale).toHaveBeenCalledTimes(1);
    // Scoped to the caller's restaurant, with "now" as the cutoff.
    const [restaurantId, now] = waitlistRepo.expireStale.mock.calls[0];
    expect(restaurantId).toBe('rest-1');
    expect(now).toBeInstanceOf(Date);
  });
});
