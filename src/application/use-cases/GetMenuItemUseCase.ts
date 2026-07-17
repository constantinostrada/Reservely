import { IMenuItemRepository } from '@domain/repositories/IMenuItemRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { MenuItemDTO } from '../dtos/MenuItemDTO';
import { MenuItemMapper } from '../mappers/MenuItemMapper';

export class GetMenuItemUseCase {
  constructor(private readonly menuItemRepository: IMenuItemRepository) {}

  async execute(id: string, context: TenantContext): Promise<MenuItemDTO> {
    const menuItem = await this.menuItemRepository.findById(id);

    if (!menuItem) {
      throw new EntityNotFoundException('MenuItem', id);
    }

    assertSameTenant(menuItem.restaurantId, context);

    return MenuItemMapper.toDTO(menuItem);
  }
}
