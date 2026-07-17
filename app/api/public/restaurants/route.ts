import { NextResponse } from 'next/server';
import { PublicBookingController } from '@/src/interfaces/http/controllers/PublicBookingController';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';

const controller = new PublicBookingController();

// Public: the customer-facing restaurant directory. No auth — a guest browses
// every restaurant here before picking one to book at.
export async function GET(): Promise<NextResponse> {
  try {
    const result = await controller.listRestaurants();
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
