import { MenuItem } from '@domain/entities/MenuItem';
import { MenuItemDTO, CreateMenuItemDTO } from '../dtos/MenuItemDTO';

export class MenuItemMapper {
  static toDTO(menuItem: MenuItem): MenuItemDTO {
    return {
      id: menuItem.id,
      restaurantId: menuItem.restaurantId,
      name: menuItem.name,
      description: menuItem.description,
      category: menuItem.category,
      priceCents: menuItem.priceCents,
      isAvailable: menuItem.isAvailable,
      createdAt: menuItem.createdAt.toISOString(),
      updatedAt: menuItem.updatedAt.toISOString(),
    };
  }

  static toDomain(dto: CreateMenuItemDTO, restaurantId: string): MenuItem {
    return new MenuItem({
      restaurantId,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      priceCents: dto.priceCents,
      isAvailable: dto.isAvailable ?? true,
    });
  }

  static toDTOList(menuItems: MenuItem[]): MenuItemDTO[] {
    return menuItems.map((menuItem) => this.toDTO(menuItem));
  }
}
