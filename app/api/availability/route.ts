import { NextResponse } from 'next/server';
import { ReservationController } from '@/src/interfaces/http/controllers/ReservationController';
import { getAvailabilitySchema } from '@/src/interfaces/http/validation/availabilitySchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new ReservationController();

export const GET = withAuth(async (request, auth): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(request.url);
    const validatedData = getAvailabilitySchema.parse({
      date: searchParams.get('date'),
      partySize: searchParams.get('partySize'),
    });
    const result = await controller.availability(validatedData, auth);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
});
