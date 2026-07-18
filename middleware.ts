import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/src/interfaces/http/authCookie';
import {
  REQUEST_ID_HEADER,
  resolveRequestId,
} from '@/src/interfaces/http/middleware/requestId';

// Exact-match public pages.
const PUBLIC_PATHS = ['/login'];
// Public page trees open to guests (the customer-facing booking flow).
const PUBLIC_PREFIXES = ['/book'];

/**
 * Page-level session guard + API request-id tagging.
 *
 * Pages: only checks that the auth cookie is present — actual token
 * verification happens in the API's withAuth middleware, and an invalid token
 * is caught by AuthProvider's /api/auth/me call, which redirects to /login.
 *
 * API: every response gets an X-Request-Id header for tracing — the client's
 * own id when it sends one, a generated UUID otherwise. The id is also
 * forwarded on the request so handlers can correlate their logs with it.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api')) {
    const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(REQUEST_ID_HEADER, requestId);
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

  if (!hasSession && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // A logged-in user has no reason to sit on /login; send them home. The
  // booking flow (PUBLIC_PREFIXES) stays open to everyone, signed in or not.
  if (hasSession && PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Pages (session guard) + API routes (request-id tagging only — API auth
  // stays in withAuth)
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
