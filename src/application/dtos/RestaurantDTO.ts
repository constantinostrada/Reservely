export interface CreateRestaurantDTO {
  name: string;
  slug: string;
  timezone?: string;
  currency?: string;
  address?: string;
  phone?: string;
}

export interface UpdateRestaurantDTO {
  name?: string;
  timezone?: string;
  currency?: string;
  address?: string;
  phone?: string;
}

export interface RestaurantDTO {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  address?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantListDTO {
  restaurants: RestaurantDTO[];
  total: number;
}
