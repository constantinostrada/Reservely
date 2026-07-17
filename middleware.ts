import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/src/interfaces/http/authCookie';

const PUBLIC_PATHS = ['/login'];

/**
 * Page-level session guard. Only checks that the auth cookie is present —
 * actual token verification happens in the API's withAuth middleware, and an
 * invalid token is caught by AuthProvider's /api/auth/me call, which
 * redirects back to /login.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!hasSession && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Pages only — API routes authenticate themselves via withAuth
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
