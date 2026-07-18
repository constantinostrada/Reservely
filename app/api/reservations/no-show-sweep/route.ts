import { NextResponse } from 'next/server';
import { ReservationController } from '@/src/interfaces/http/controllers/ReservationController';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new ReservationController();

// Admin/maintenance: mark reservations past the restaurant's no-show grace
// period as no-show, releasing their tables and promoting the waitlist.
// Safe to call repeatedly (idempotent) — e.g. from a scheduled job.
export const POST = withAuth(async (_request, auth): Promise<NextResponse> => {
  try {
    const result = await controller.sweepNoShows(auth);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
});
