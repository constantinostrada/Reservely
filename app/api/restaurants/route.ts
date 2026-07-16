import { NextRequest, NextResponse } from 'next/server';
import { RestaurantController } from '@/src/interfaces/http/controllers/RestaurantController';
import { createRestaurantSchema } from '@/src/interfaces/http/validation/restaurantSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';
import { withAuth } from '@/src/interfaces/http/middleware/auth';

const controller = new RestaurantController();

// Tenant-scoped: returns only the caller's restaurant
export const GET = withAuth(async (_request, auth): Promise<NextResponse> => {
  try {
    const result = await controller.list(auth);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
});

// Public: creating a restaurant creates the tenant itself (onboarding),
// so there is no tenant to authenticate against yet
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validatedData = createRestaurantSchema.parse(body);
    const result = await controller.create(validatedData);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
