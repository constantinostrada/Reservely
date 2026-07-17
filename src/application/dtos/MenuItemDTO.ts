export interface CreateMenuItemDTO {
  name: string;
  description?: string;
  category: string;
  /** Integer cents. */
  priceCents: number;
  isAvailable?: boolean;
}

export interface UpdateMenuItemDTO {
  name?: string;
  description?: string;
  category?: string;
  /** Integer cents. */
  priceCents?: number;
  isAvailable?: boolean;
}

export interface MenuItemDTO {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  category: string;
  priceCents: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItemListDTO {
  menuItems: MenuItemDTO[];
  total: number;
}
