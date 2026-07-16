/**
 * Merges the tenant filter into a Prisma where clause. Every list/search
 * query in a repository must build its filter through this helper so no
 * query can accidentally span restaurants.
 */
export function withTenant<T extends object>(
  restaurantId: string,
  where?: T
): T & { restaurantId: string } {
  if (!restaurantId || restaurantId.trim().length === 0) {
    throw new Error('restaurantId is required to scope a tenant query');
  }

  return { ...(where as T), restaurantId };
}
