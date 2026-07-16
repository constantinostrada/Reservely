import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/src/interfaces/http/middleware/auth';

export async function POST(): Promise<NextResponse> {
  // JWTs are stateless; logout just discards the session cookie.
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
