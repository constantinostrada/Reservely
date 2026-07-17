import { NextRequest, NextResponse } from 'next/server';
import { container } from '@infrastructure/di/container';
import { TenantContext } from '@application/common/TenantContext';
import { AUTH_COOKIE_NAME } from '../authCookie';

export { AUTH_COOKIE_NAME };

type AuthenticatedHandler<Ctx> = (
  request: NextRequest,
  auth: TenantContext,
  context: Ctx
) => Promise<NextResponse>;

/**
 * Auth + tenant-scoping middleware for route handlers. Verifies the JWT
 * (from the Authorization header or the auth cookie), resolves the current
 * restaurant once, and hands the TenantContext to the wrapped handler so
 * every downstream query is scoped to that tenant.
 *
 * Missing/invalid tokens are rejected with 401 before the handler runs.
 */
export function withAuth<Ctx = unknown>(
  handler: AuthenticatedHandler<Ctx>
): (request: NextRequest, context: Ctx) => Promise<NextResponse> {
  return async (request: NextRequest, context: Ctx) => {
    const token = extractToken(request);

    if (!token) {
      return unauthorized('Authentication token is missing');
    }

    const payload = container.getTokenService().verify(token);

    if (!payload) {
      return unauthorized('Authentication token is invalid or expired');
    }

    const auth: TenantContext = {
      userId: payload.userId,
      restaurantId: payload.restaurantId,
      role: payload.role,
    };

    return handler(request, auth, context);
  };
}

function extractToken(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization');
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice('bearer '.length).trim() || null;
  }

  return request.cookies.get(AUTH_COOKIE_NAME)?.value || null;
}

function unauthorized(message: string): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized', message },
    { status: 401 }
  );
}
