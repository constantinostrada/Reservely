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
  /**
   * Every restaurant, for the public booking directory. This is the one
   * cross-tenant read in the system and is only ever reached through the
   * unauthenticated public endpoints, never through a tenant-scoped path.
   */
  findAll(): Promise<Restaurant[]>;
  update(restaurant: Restaurant): Promise<Restaurant>;
  delete(id: string): Promise<void>;
}
