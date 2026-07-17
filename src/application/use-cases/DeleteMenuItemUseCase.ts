import { IMenuItemRepository } from '@domain/repositories/IMenuItemRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';

export class DeleteMenuItemUseCase {
  constructor(private readonly menuItemRepository: IMenuItemRepository) {}

  async execute(id: string, context: TenantContext): Promise<void> {
    const menuItem = await this.menuItemRepository.findById(id);

    if (!menuItem) {
      throw new EntityNotFoundException('MenuItem', id);
    }

    assertSameTenant(menuItem.restaurantId, context);

    await this.menuItemRepository.delete(context.restaurantId, id);
  }
}
