import { NotificationDispatcher } from '../services/NotificationDispatcher';
import {
  INotificationSender,
  NotificationMessage,
} from '../ports/INotificationSender';
import {
  PaymentSucceededEvent,
  ReservationConfirmedEvent,
  WaitlistPromotedEvent,
} from '@domain/events/DomainEvent';
import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { Order } from '@domain/entities/Order';
import { OrderItem } from '@domain/entities/OrderItem';
import { Reservation } from '@domain/entities/Reservation';
import { Email } from '@domain/value-objects/Email';
import { OrderStatus } from '@domain/value-objects/OrderStatus';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';

class RecordingSender implements INotificationSender {
  public sent: NotificationMessage[] = [];

  async send(message: NotificationMessage): Promise<void> {
    this.sent.push(message);
  }
}

describe('NotificationDispatcher', () => {
  let sender: RecordingSender;
  let orderRepo: jest.Mocked<IOrderRepository>;
  let reservationRepo: jest.Mocked<IReservationRepository>;
  let dispatcher: NotificationDispatcher;

  const reservation = new Reservation({
    id: 'res-1',
    restaurantId: 'rest-1',
    tableId: 't-1',
    guestName: 'John Doe',
    guestEmail: new Email('john@example.com'),
    startsAt: new Date('2026-12-25T23:30:00.000Z'),
    partySize: 4,
    status: ReservationStatus.confirmed(),
  });

  const order = new Order({
    id: 'order-1',
    restaurantId: 'rest-1',
    reservationId: 'res-1',
    status: OrderStatus.open(),
    items: [
      new OrderItem({
        menuItemId: 'menu-1',
        itemName: 'Margherita',
        quantity: 2,
        unitPriceCents: 1500,
      }),
    ],
  });

  const confirmedEvent: ReservationConfirmedEvent = {
    type: 'reservation.confirmed',
    occurredAt: new Date(),
    reservationId: 'res-1',
    restaurantId: 'rest-1',
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    startsAt: new Date('2026-12-25T23:30:00.000Z'),
    partySize: 4,
  };

  const paymentEvent: PaymentSucceededEvent = {
    type: 'payment.succeeded',
    occurredAt: new Date(),
    paymentId: 'pay-1',
    orderId: 'order-1',
    restaurantId: 'rest-1',
    amountCents: 3300,
  };

  const waitlistPromotedEvent: WaitlistPromotedEvent = {
    type: 'waitlist.promoted',
    occurredAt: new Date(),
    waitlistEntryId: 'wl-1',
    reservationId: 'res-2',
    restaurantId: 'rest-1',
    guestName: 'Grace Hopper',
    guestEmail: 'grace@example.com',
    startsAt: new Date('2026-12-25T23:30:00.000Z'),
    partySize: 2,
  };

  beforeEach(() => {
    sender = new RecordingSender();
    orderRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByReservationId: jest.fn(),
      findAll: jest.fn(),
    };
    reservationRepo = {
      save: jest.fn(),
      createWithSlotHold: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      createCombinedWithSlotHold: jest.fn(),
      findByCombinationId: jest.fn(),
      findOverlapping: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    dispatcher = new NotificationDispatcher(sender, orderRepo, reservationRepo);
  });

  describe('reservation.confirmed', () => {
    it('emails the guest', async () => {
      await dispatcher.handle(confirmedEvent);

      expect(sender.sent).toHaveLength(1);
      expect(sender.sent[0]).toMatchObject({
        channel: 'email',
        to: 'john@example.com',
        subject: 'Your reservation is confirmed',
      });
      expect(sender.sent[0].body).toContain('John Doe');
    });

    it('also texts the guest when a phone number is on file', async () => {
      await dispatcher.handle({
        ...confirmedEvent,
        guestPhone: '+15550001111',
      });

      expect(sender.sent).toHaveLength(2);
      expect(sender.sent[1]).toMatchObject({
        channel: 'sms',
        to: '+15550001111',
      });
    });
  });

  describe('payment.succeeded', () => {
    it('emails a receipt to the guest behind the order', async () => {
      orderRepo.findById.mockResolvedValue(order);
      reservationRepo.findById.mockResolvedValue(reservation);

      await dispatcher.handle(paymentEvent);

      expect(orderRepo.findById).toHaveBeenCalledWith('order-1');
      expect(reservationRepo.findById).toHaveBeenCalledWith('res-1');
      expect(sender.sent).toHaveLength(1);
      expect(sender.sent[0]).toMatchObject({
        channel: 'email',
        to: 'john@example.com',
        subject: 'Payment received',
      });
      expect(sender.sent[0].body).toContain('$33.00');
    });

    it('sends nothing when the order cannot be found', async () => {
      orderRepo.findById.mockResolvedValue(null);

      await dispatcher.handle(paymentEvent);

      expect(sender.sent).toHaveLength(0);
    });

    it('sends nothing when the reservation behind the order is gone', async () => {
      orderRepo.findById.mockResolvedValue(order);
      reservationRepo.findById.mockResolvedValue(null);

      await dispatcher.handle(paymentEvent);

      expect(sender.sent).toHaveLength(0);
    });
  });

  describe('waitlist.promoted', () => {
    it('emails the promoted guest that their spot opened up', async () => {
      await dispatcher.handle(waitlistPromotedEvent);

      expect(sender.sent).toHaveLength(1);
      expect(sender.sent[0]).toMatchObject({
        channel: 'email',
        to: 'grace@example.com',
      });
      expect(sender.sent[0].body).toContain('Grace Hopper');
      expect(sender.sent[0].body).toContain('confirmed reservation');
    });

    it('also texts the promoted guest when a phone number is on file', async () => {
      await dispatcher.handle({
        ...waitlistPromotedEvent,
        guestPhone: '+15550002222',
      });

      expect(sender.sent).toHaveLength(2);
      expect(sender.sent[1]).toMatchObject({
        channel: 'sms',
        to: '+15550002222',
      });
    });
  });
});
