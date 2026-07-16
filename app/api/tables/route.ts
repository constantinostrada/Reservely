import { NextRequest, NextResponse } from 'next/server';
import { TableController } from '@/src/interfaces/http/controllers/TableController';
import { createTableSchema } from '@/src/interfaces/http/validation/tableSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';

const controller = new TableController();

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
    const validatedData = createTableSchema.parse(body);
    const result = await controller.create(validatedData);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
