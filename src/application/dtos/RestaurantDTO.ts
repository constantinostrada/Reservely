export interface CreateRestaurantDTO {
  name: string;
  slug: string;
  timezone?: string;
  currency?: string;
  address?: string;
  phone?: string;
  noShowGraceMinutes?: number;
}

export interface UpdateRestaurantDTO {
  name?: string;
  timezone?: string;
  currency?: string;
  address?: string;
  phone?: string;
  noShowGraceMinutes?: number;
}

export interface RestaurantDTO {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  address?: string;
  phone?: string;
  noShowGraceMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantListDTO {
  restaurants: RestaurantDTO[];
  total: number;
}
