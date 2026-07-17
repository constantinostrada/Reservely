import { NextResponse } from 'next/server';
import { PublicBookingController } from '@/src/interfaces/http/controllers/PublicBookingController';
import { getAvailabilitySchema } from '@/src/interfaces/http/validation/availabilitySchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';

const controller = new PublicBookingController();

interface RouteParams {
  params: {
    id: string;
  };
}

// Public: real availability for a restaurant on a given date and party size.
// Returns only truly free slots, computed by the same engine the admin uses.
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const validatedData = getAvailabilitySchema.parse({
      date: searchParams.get('date'),
      partySize: searchParams.get('partySize'),
    });
    const result = await controller.availability(params.id, validatedData);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
