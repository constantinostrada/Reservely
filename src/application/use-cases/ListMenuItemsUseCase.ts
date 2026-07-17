import { IMenuItemRepository } from '@domain/repositories/IMenuItemRepository';
import { TenantContext } from '../common/TenantContext';
import { MenuItemListDTO } from '../dtos/MenuItemDTO';
import { MenuItemMapper } from '../mappers/MenuItemMapper';

export class ListMenuItemsUseCase {
  constructor(private readonly menuItemRepository: IMenuItemRepository) {}

  async execute(context: TenantContext): Promise<MenuItemListDTO> {
    const menuItems = await this.menuItemRepository.findAll(
      context.restaurantId
    );

    return {
      menuItems: MenuItemMapper.toDTOList(menuItems),
      total: menuItems.length,
    };
  }
}
