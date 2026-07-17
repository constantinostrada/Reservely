import { container } from '@infrastructure/di/container';
import { PlaceOrderDTO } from '@application/dtos/OrderDTO';
import { TenantContext } from '@application/common/TenantContext';

export class OrderController {
  async place(dto: PlaceOrderDTO, auth: TenantContext) {
    const useCase = container.getPlaceOrderUseCase();
    return await useCase.execute(dto, auth);
  }

  async getById(id: string, auth: TenantContext) {
    const useCase = container.getGetOrderUseCase();
    return await useCase.execute(id, auth);
  }

  async list(auth: TenantContext, reservationId?: string) {
    const useCase = container.getListOrdersUseCase();
    return await useCase.execute(auth, { reservationId });
  }

  async splitBill(id: string, ways: number, auth: TenantContext) {
    const useCase = container.getSplitBillUseCase();
    return await useCase.execute(id, ways, auth);
  }
}
