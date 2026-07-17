import { MenuItem } from '../entities/MenuItem';

export interface IMenuItemRepository {
  save(menuItem: MenuItem): Promise<MenuItem>;
  /**
   * Not tenant-scoped on purpose: callers must check the entity's
   * restaurantId against the current tenant (see assertSameTenant) so
   * cross-tenant access can be rejected with 403 instead of 404.
   */
  findById(id: string): Promise<MenuItem | null>;
  findByName(restaurantId: string, name: string): Promise<MenuItem | null>;
  findAll(restaurantId: string): Promise<MenuItem[]>;
  update(menuItem: MenuItem): Promise<MenuItem>;
  delete(restaurantId: string, id: string): Promise<void>;
}
