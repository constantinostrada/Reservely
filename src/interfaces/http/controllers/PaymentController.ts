import { container } from '@infrastructure/di/container';
import {
  ChargeBillDTO,
  PaymentWebhookEventDTO,
} from '@application/dtos/PaymentDTO';
import { TenantContext } from '@application/common/TenantContext';

export class PaymentController {
  async charge(orderId: string, dto: ChargeBillDTO, auth: TenantContext) {
    const useCase = container.getChargeBillUseCase();
    return await useCase.execute(orderId, dto, auth);
  }

  async handleWebhook(event: PaymentWebhookEventDTO) {
    const useCase = container.getHandlePaymentWebhookUseCase();
    return await useCase.execute(event);
  }
}
