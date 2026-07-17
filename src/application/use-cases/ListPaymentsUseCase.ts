import { IPaymentRepository } from '@domain/repositories/IPaymentRepository';
import { TenantContext } from '../common/TenantContext';
import { PaymentListDTO } from '../dtos/PaymentDTO';
import { PaymentMapper } from '../mappers/PaymentMapper';

/**
 * Every payment for the tenant — the operational dashboard reads this once and
 * joins it to orders client-side, rather than fetching payments per order.
 */
export class ListPaymentsUseCase {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(context: TenantContext): Promise<PaymentListDTO> {
    const payments = await this.paymentRepository.findAll(
      context.restaurantId
    );

    return {
      payments: PaymentMapper.toDTOList(payments),
      total: payments.length,
    };
  }
}
