import { NextResponse } from 'next/server';
import { PaymentController } from '@/src/interfaces/http/controllers/PaymentController';
import { paymentWebhookSchema } from '@/src/interfaces/http/validation/paymentSchemas';
import { handleError } from '@/src/interfaces/http/utils/errorHandler';

const controller = new PaymentController();

/**
 * Provider-facing endpoint — no user auth: the caller is the payment
 * provider, not a signed-in user. Deliveries are deduplicated by event
 * id, so replays are safe and always answered with 200.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const event = paymentWebhookSchema.parse(body);
    const result = await controller.handleWebhook({
      eventId: event.id,
      type: event.type,
      externalRef: event.data.externalRef,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
