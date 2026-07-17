import { NextResponse } from 'next/server';
import { MenuItemController } from '@/src/interfaces/http/controllers/MenuItemController';
import { updateMenuItemSchema } from '@/src/interfaces/http/validation/menuItemSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new MenuItemController();

interface RouteParams {
  params: {
    id: string;
  };
}

export const GET = withAuth<RouteParams>(
  async (_request, auth, { params }): Promise<NextResponse> => {
    try {
      const result = await controller.getById(params.id, auth);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
);

export const PATCH = withAuth<RouteParams>(
  async (request, auth, { params }): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const validatedData = updateMenuItemSchema.parse(body);
      const result = await controller.update(params.id, validatedData, auth);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
);

export const DELETE = withAuth<RouteParams>(
  async (_request, auth, { params }): Promise<NextResponse> => {
    try {
      await controller.delete(params.id, auth);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return handleError(error);
    }
  }
);
