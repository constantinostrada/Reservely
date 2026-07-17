import { NextResponse } from 'next/server';
import { PublicBookingController } from '@/src/interfaces/http/controllers/PublicBookingController';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';

const controller = new PublicBookingController();

interface RouteParams {
  params: {
    id: string;
  };
}

// Public: a single restaurant's public details for the booking page header.
export async function GET(
  _request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const result = await controller.getRestaurant(params.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
