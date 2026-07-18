import { IWaitlistRepository } from '@domain/repositories/IWaitlistRepository';
import { TenantContext } from '../common/TenantContext';

export interface CleanupExpiredWaitlistResult {
  expired: number;
}

/**
 * Expires waitlist entries whose slot start time has passed for the current
 * tenant. A freed spot after the slot has started is useless, so those entries
 * are moved out of the waiting queue. Safe to call repeatedly (idempotent: only
 * still-waiting, now-past entries are affected) — e.g. from a scheduled job.
 */
export class CleanupExpiredWaitlistUseCase {
  constructor(private readonly waitlistRepository: IWaitlistRepository) {}

  async execute(context: TenantContext): Promise<CleanupExpiredWaitlistResult> {
    const expired = await this.waitlistRepository.expireStale(
      context.restaurantId,
      new Date()
    );
    return { expired };
  }
}
