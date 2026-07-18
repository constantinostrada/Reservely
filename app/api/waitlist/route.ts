import { NextResponse } from 'next/server';
import { WaitlistController } from '@/src/interfaces/http/controllers/WaitlistController';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new WaitlistController();

// Admin: the current tenant's still-waiting waitlist entries, oldest first.
export const GET = withAuth(async (_request, auth): Promise<NextResponse> => {
  try {
    const result = await controller.list(auth);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
});
