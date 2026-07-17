import { randomUUID } from 'crypto';
import {
  CreateChargeRequest,
  CreateChargeResult,
  IPaymentProvider,
} from '@application/ports/IPaymentProvider';

/**
 * Mock payment processor. Accepts every charge and hands back a charge
 * reference; the "provider" then reports the outcome by POSTing events
 * to /api/webhooks/payments carrying that reference (in tests and local
 * development the webhook call is made by the test/client itself).
 */
export class MockPaymentProvider implements IPaymentProvider {
  async createCharge(
    _request: CreateChargeRequest
  ): Promise<CreateChargeResult> {
    return { externalRef: `ch_mock_${randomUUID()}` };
  }
}
