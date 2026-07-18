import { IWaitlistRepository } from '@domain/repositories/IWaitlistRepository';
import { TenantContext } from '../common/TenantContext';
import { WaitlistListDTO } from '../dtos/WaitlistDTO';
import { WaitlistMapper } from '../mappers/WaitlistMapper';

/** Lists the current tenant's still-waiting waitlist entries, oldest first. */
export class ListWaitlistUseCase {
  constructor(private readonly waitlistRepository: IWaitlistRepository) {}

  async execute(context: TenantContext): Promise<WaitlistListDTO> {
    const entries = await this.waitlistRepository.findWaiting(
      context.restaurantId
    );
    const dtos = WaitlistMapper.toDTOList(entries);
    return { entries: dtos, total: dtos.length };
  }
}
