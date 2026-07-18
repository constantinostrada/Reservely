import { NextResponse } from 'next/server';
import { ReservationController } from '@/src/interfaces/http/controllers/ReservationController';
import { updateReservationSchema } from '@/src/interfaces/http/validation/reservationSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new ReservationController();

interface RouteParams {
  params: {
    id: string;
  };
}

export const GET = withAuth<RouteParams>(
  async (_request, auth, { params }): Promise<NextResponse> => {
    try {
      const result = await controller.getById(params.id, auth);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
);

// Modify a reservation: reschedule (date/time), resize (partySize) and/or
// edit details. Slot changes swap the hold atomically — the old table(s) are
// released only if the new hold succeeds; a taken slot answers 409.
export const PATCH = withAuth<RouteParams>(
  async (request, auth, { params }): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const validatedData = updateReservationSchema.parse(body);
      const result = await controller.modify(params.id, validatedData, auth);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
);
