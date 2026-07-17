import { NextResponse } from 'next/server';
import { PublicBookingController } from '@/src/interfaces/http/controllers/PublicBookingController';
import { createReservationSchema } from '@/src/interfaces/http/validation/reservationSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';

const controller = new PublicBookingController();

interface RouteParams {
  params: {
    id: string;
  };
}

// Public: a guest books a slot. The reservation use case places a transactional
// slot hold, so a slot taken between viewing and submitting fails with 409
// (ConflictException) rather than double-booking — the UI turns that into a
// clear "no longer available" state.
export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = createReservationSchema.parse(body);
    const result = await controller.reserve(params.id, validatedData);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
