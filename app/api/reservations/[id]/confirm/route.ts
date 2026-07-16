import { NextRequest, NextResponse } from 'next/server';
import { ReservationController } from '@/src/interfaces/http/controllers/ReservationController';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';

const controller = new ReservationController();

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const result = await controller.confirm(params.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
