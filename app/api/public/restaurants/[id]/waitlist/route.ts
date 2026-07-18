import { NextResponse } from 'next/server';
import { PublicBookingController } from '@/src/interfaces/http/controllers/PublicBookingController';
import { joinWaitlistSchema } from '@/src/interfaces/http/validation/waitlistSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';

const controller = new PublicBookingController();

interface RouteParams {
  params: {
    id: string;
  };
}

// Public: a guest joins the waitlist for a fully-booked slot. If the slot still
// has availability the use case rejects with 400 (book directly instead). When
// a reservation on the slot is later cancelled, the oldest waiting entry is
// auto-promoted into a confirmed reservation and the guest is notified.
export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = joinWaitlistSchema.parse(body);
    const result = await controller.joinWaitlist(params.id, validatedData);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
