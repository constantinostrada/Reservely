import { IMenuItemRepository } from '@domain/repositories/IMenuItemRepository';
import {
  ConflictException,
  EntityNotFoundException,
} from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { UpdateMenuItemDTO, MenuItemDTO } from '../dtos/MenuItemDTO';
import { MenuItemMapper } from '../mappers/MenuItemMapper';

export class UpdateMenuItemUseCase {
  constructor(private readonly menuItemRepository: IMenuItemRepository) {}

  async execute(
    id: string,
    dto: UpdateMenuItemDTO,
    context: TenantContext
  ): Promise<MenuItemDTO> {
    const menuItem = await this.menuItemRepository.findById(id);

    if (!menuItem) {
      throw new EntityNotFoundException('MenuItem', id);
    }

    assertSameTenant(menuItem.restaurantId, context);

    // Renaming must not collide with another item in this restaurant
    if (dto.name !== undefined && dto.name !== menuItem.name) {
      const existingItem = await this.menuItemRepository.findByName(
        context.restaurantId,
        dto.name
      );

      if (existingItem && existingItem.id !== id) {
        throw new ConflictException(
          `Menu item "${dto.name}" already exists`
        );
      }
    }

    menuItem.updateDetails({
      name: dto.name,
      description: dto.description,
      category: dto.category,
      priceCents: dto.priceCents,
    });

    if (dto.isAvailable !== undefined) {
      if (dto.isAvailable) {
        menuItem.makeAvailable();
      } else {
        menuItem.makeUnavailable();
      }
    }

    const updatedItem = await this.menuItemRepository.update(menuItem);

    return MenuItemMapper.toDTO(updatedItem);
  }
}
