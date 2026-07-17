import { NextResponse } from 'next/server';
import { PaymentController } from '@/src/interfaces/http/controllers/PaymentController';
import { chargeBillSchema } from '@/src/interfaces/http/validation/paymentSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new PaymentController();

interface RouteParams {
  params: {
    id: string;
  };
}

export const POST = withAuth<RouteParams>(
  async (request, auth, { params }): Promise<NextResponse> => {
    try {
      // The charge body is optional; an empty body means default method
      const body = await request.json().catch(() => ({}));
      const validatedData = chargeBillSchema.parse(body);
      const result = await controller.charge(params.id, validatedData, auth);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  }
);
