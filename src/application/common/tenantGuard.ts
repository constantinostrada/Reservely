import { ForbiddenException } from '@domain/exceptions/DomainException';
import { TenantContext } from './TenantContext';

/**
 * Guards by-id lookups: list queries are scoped by restaurantId at the
 * repository layer, but entities fetched by id must be checked against the
 * caller's tenant so cross-tenant access fails with 403 (not 404).
 */
export function assertSameTenant(
  resourceRestaurantId: string,
  context: TenantContext
): void {
  if (resourceRestaurantId !== context.restaurantId) {
    throw new ForbiddenException(
      'This resource belongs to another restaurant'
    );
  }
}
