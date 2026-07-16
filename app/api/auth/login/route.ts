import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '@/src/interfaces/http/controllers/AuthController';
import { loginSchema } from '@/src/interfaces/http/validation/authSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { AUTH_COOKIE_NAME } from '@/src/interfaces/http/middleware/auth';

const controller = new AuthController();

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);
    const result = await controller.login(validatedData);

    const response = NextResponse.json(result);
    response.cookies.set(AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    return response;
  } catch (error) {
    return handleError(error);
  }
}
