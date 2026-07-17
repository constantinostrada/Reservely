import { Payment } from '@domain/entities/Payment';
import { PaymentDTO } from '../dtos/PaymentDTO';

export class PaymentMapper {
  static toDTO(payment: Payment): PaymentDTO {
    return {
      id: payment.id,
      restaurantId: payment.restaurantId,
      orderId: payment.orderId,
      amountCents: payment.amountCents,
      tipCents: payment.tipCents,
      method: payment.method,
      status: payment.status.value,
      externalRef: payment.externalRef,
      processedAt: payment.processedAt?.toISOString(),
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  static toDTOList(payments: Payment[]): PaymentDTO[] {
    return payments.map((payment) => this.toDTO(payment));
  }
}
