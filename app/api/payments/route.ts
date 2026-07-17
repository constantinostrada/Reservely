import { NextResponse } from 'next/server';
import { PaymentController } from '@/src/interfaces/http/controllers/PaymentController';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new PaymentController();

/** All payments for the tenant — the dashboard joins these to orders. */
export const GET = withAuth(async (_request, auth): Promise<NextResponse> => {
  try {
    const result = await controller.list(auth);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
});
