import {
  PaymentSucceededEvent,
  ReservationConfirmedEvent,
  ReservelyDomainEvent,
  WaitlistPromotedEvent,
} from '@domain/events/DomainEvent';
import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { INotificationSender } from '../ports/INotificationSender';

/**
 * Turns domain events into guest notifications. Runs as an event
 * subscriber — off the request path — so it may do its own lookups and
 * its failures never surface to the operation that raised the event.
 *
 * No tenant context: events already identify their restaurant, and the
 * subscriber acts on the system's behalf, not a signed-in user's.
 */
export class NotificationDispatcher {
  constructor(
    private readonly sender: INotificationSender,
    private readonly orderRepository: IOrderRepository,
    private readonly reservationRepository: IReservationRepository
  ) {}

  async handle(event: ReservelyDomainEvent): Promise<void> {
    switch (event.type) {
      case 'reservation.confirmed':
        await this.notifyReservationConfirmed(event);
        break;
      case 'payment.succeeded':
        await this.notifyPaymentSucceeded(event);
        break;
      case 'waitlist.promoted':
        await this.notifyWaitlistPromoted(event);
        break;
    }
  }

  private async notifyWaitlistPromoted(
    event: WaitlistPromotedEvent
  ): Promise<void> {
    const when = event.startsAt.toISOString();
    const body =
      `Good news ${event.guestName}! A spot opened up and your waitlist ` +
      `request for ${event.partySize} on ${when} is now a confirmed reservation.`;

    await this.sender.send({
      channel: 'email',
      to: event.guestEmail,
      subject: 'You’re off the waitlist — reservation confirmed',
      body,
    });

    if (event.guestPhone) {
      await this.sender.send({
        channel: 'sms',
        to: event.guestPhone,
        body,
      });
    }
  }

  private async notifyReservationConfirmed(
    event: ReservationConfirmedEvent
  ): Promise<void> {
    const when = event.startsAt.toISOString();
    const body = `Hi ${event.guestName}, your reservation for ${event.partySize} on ${when} is confirmed.`;

    await this.sender.send({
      channel: 'email',
      to: event.guestEmail,
      subject: 'Your reservation is confirmed',
      body,
    });

    if (event.guestPhone) {
      await this.sender.send({
        channel: 'sms',
        to: event.guestPhone,
        body,
      });
    }
  }

  private async notifyPaymentSucceeded(
    event: PaymentSucceededEvent
  ): Promise<void> {
    // The payment only knows its order; walk order → reservation to find
    // the guest. Orders without a reachable guest have no one to notify.
    const order = await this.orderRepository.findById(event.orderId);
    if (!order?.reservationId) {
      return;
    }
    const reservation = await this.reservationRepository.findById(
      order.reservationId
    );
    if (!reservation) {
      return;
    }

    const amount = (event.amountCents / 100).toFixed(2);
    await this.sender.send({
      channel: 'email',
      to: reservation.guestEmail.value,
      subject: 'Payment received',
      body: `Hi ${reservation.guestName}, we received your payment of $${amount}. Thank you!`,
    });
  }
}
