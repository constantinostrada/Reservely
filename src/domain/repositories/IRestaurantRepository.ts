import { Restaurant } from '../entities/Restaurant';

export interface IRestaurantRepository {
  save(restaurant: Restaurant): Promise<Restaurant>;
  /**
   * The restaurant IS the tenant, so there is no restaurantId filter here.
   * Callers must check the fetched id against the current tenant (see
   * assertSameTenant) so cross-tenant access is rejected with 403.
   */
  findById(id: string): Promise<Restaurant | null>;
  findBySlug(slug: string): Promise<Restaurant | null>;
  update(restaurant: Restaurant): Promise<Restaurant>;
  delete(id: string): Promise<void>;
}
