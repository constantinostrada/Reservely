import { IMenuItemRepository } from '@domain/repositories/IMenuItemRepository';
import { ConflictException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { CreateMenuItemDTO, MenuItemDTO } from '../dtos/MenuItemDTO';
import { MenuItemMapper } from '../mappers/MenuItemMapper';

export class CreateMenuItemUseCase {
  constructor(private readonly menuItemRepository: IMenuItemRepository) {}

  async execute(
    dto: CreateMenuItemDTO,
    context: TenantContext
  ): Promise<MenuItemDTO> {
    // Menu item names are unique within a restaurant
    const existingItem = await this.menuItemRepository.findByName(
      context.restaurantId,
      dto.name
    );

    if (existingItem) {
      throw new ConflictException(
        `Menu item "${dto.name}" already exists`
      );
    }

    const menuItem = MenuItemMapper.toDomain(dto, context.restaurantId);

    const savedItem = await this.menuItemRepository.save(menuItem);

    return MenuItemMapper.toDTO(savedItem);
  }
}
