import { NextResponse } from 'next/server';
import { PaymentController } from '@/src/interfaces/http/controllers/PaymentController';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new PaymentController();

interface RouteParams {
  params: {
    id: string;
  };
}

/** Payments recorded against an order, so the UI can reflect the settled state. */
export const GET = withAuth<RouteParams>(
  async (_request, auth, { params }): Promise<NextResponse> => {
    try {
      const result = await controller.listForOrder(params.id, auth);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
);
