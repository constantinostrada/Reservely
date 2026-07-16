import { NextResponse } from 'next/server';
import { ReservationController } from '@/src/interfaces/http/controllers/ReservationController';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new ReservationController();

interface RouteParams {
  params: {
    id: string;
  };
}

export const POST = withAuth<RouteParams>(
  async (_request, auth, { params }): Promise<NextResponse> => {
    try {
      const result = await controller.confirm(params.id, auth);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
);
