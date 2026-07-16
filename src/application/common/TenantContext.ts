/**
 * The authenticated tenant for the current request. Resolved once by the
 * auth middleware and passed down to every use case so all queries are
 * scoped to a single restaurant.
 */
export interface TenantContext {
  userId: string;
  restaurantId: string;
  role: string;
}
