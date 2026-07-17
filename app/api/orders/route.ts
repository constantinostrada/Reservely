import { NextResponse } from 'next/server';
import { OrderController } from '@/src/interfaces/http/controllers/OrderController';
import { placeOrderSchema } from '@/src/interfaces/http/validation/orderSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new OrderController();

export const GET = withAuth(async (request, auth): Promise<NextResponse> => {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId') || undefined;
    const result = await controller.list(auth, reservationId);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
});

export const POST = withAuth(async (request, auth): Promise<NextResponse> => {
  try {
    const body = await request.json();
    const validatedData = placeOrderSchema.parse(body);
    const result = await controller.place(validatedData, auth);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
});
