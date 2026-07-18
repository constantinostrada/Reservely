import { NextResponse } from 'next/server';
import { WaitlistController } from '@/src/interfaces/http/controllers/WaitlistController';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new WaitlistController();

// Admin/maintenance: expire waitlist entries whose slot start time has passed.
// Safe to call repeatedly (idempotent) — e.g. from a scheduled job.
export const POST = withAuth(async (_request, auth): Promise<NextResponse> => {
  try {
    const result = await controller.cleanupExpired(auth);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
});
