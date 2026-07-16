import { NextRequest, NextResponse } from 'next/server';
import { ReservationController } from '@/src/interfaces/http/controllers/ReservationController';
import { createReservationSchema } from '@/src/interfaces/http/validation/reservationSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';

const controller = new ReservationController();

export async function GET(): Promise<NextResponse> {
  try {
    const result = await controller.list();
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = createReservationSchema.parse(body);
    const result = await controller.create(validatedData);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
