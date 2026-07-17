// Kept dependency-free so the edge middleware (middleware.ts) can import it
// without pulling the DI container (Prisma, Node-only APIs) into the edge runtime.
export const AUTH_COOKIE_NAME = 'auth_token';
