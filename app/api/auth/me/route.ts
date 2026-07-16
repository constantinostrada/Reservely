import { NextResponse } from 'next/server';
import { AuthController } from '@/src/interfaces/http/controllers/AuthController';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new AuthController();

export const GET = withAuth(async (_request, auth): Promise<NextResponse> => {
  try {
    const result = await controller.me(auth);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
});
