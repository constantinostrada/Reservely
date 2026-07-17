import { NextResponse } from 'next/server';
import { MenuItemController } from '@/src/interfaces/http/controllers/MenuItemController';
import { createMenuItemSchema } from '@/src/interfaces/http/validation/menuItemSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new MenuItemController();

export const GET = withAuth(async (_request, auth): Promise<NextResponse> => {
  try {
    const result = await controller.list(auth);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
});

export const POST = withAuth(async (request, auth): Promise<NextResponse> => {
  try {
    const body = await request.json();
    const validatedData = createMenuItemSchema.parse(body);
    const result = await controller.create(validatedData, auth);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
});
