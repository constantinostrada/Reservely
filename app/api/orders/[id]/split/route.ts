import { NextResponse } from 'next/server';
import { OrderController } from '@/src/interfaces/http/controllers/OrderController';
import { splitBillSchema } from '@/src/interfaces/http/validation/orderSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new OrderController();

interface RouteParams {
  params: {
    id: string;
  };
}

export const GET = withAuth<RouteParams>(
  async (request, auth, { params }): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const { ways } = splitBillSchema.parse({
        ways: searchParams.get('ways'),
      });
      const result = await controller.splitBill(params.id, ways, auth);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
);
