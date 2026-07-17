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

  async listForOrder(orderId: string, auth: TenantContext) {
    const useCase = container.getListOrderPaymentsUseCase();
    return await useCase.execute(orderId, auth);
  }

  async list(auth: TenantContext) {
    const useCase = container.getListPaymentsUseCase();
    return await useCase.execute(auth);
  }

  async handleWebhook(event: PaymentWebhookEventDTO) {
    const useCase = container.getHandlePaymentWebhookUseCase();
    return await useCase.execute(event);
  }
}
