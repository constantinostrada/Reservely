import { InProcessEventDispatcher } from '../events/InProcessEventDispatcher';
import { ConfirmReservationUseCase } from '@application/use-cases/ConfirmReservationUseCase';
import { NotificationDispatcher } from '@application/services/NotificationDispatcher';
import { INotificationSender } from '@application/ports/INotificationSender';
import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ReservelyDomainEvent } from '@domain/events/DomainEvent';
import { Reservation } from '@domain/entities/Reservation';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';

const testEvent: ReservelyDomainEvent = {
  type: 'payment.succeeded',
  occurredAt: new Date(),
  paymentId: 'pay-1',
  orderId: 'order-1',
  restaurantId: 'rest-1',
  amountCents: 1000,
};

describe('InProcessEventDispatcher', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('runs handlers off the publishing path', async () => {
    const dispatcher = new InProcessEventDispatcher();
    let handled = false;
    dispatcher.subscribe(async () => {
      handled = true;
    });

    dispatcher.publish(testEvent);

    // publish returned without the handler having run yet
    expect(handled).toBe(false);

    await dispatcher.waitForIdle();
    expect(handled).toBe(true);
  });

  it('swallows a rejecting handler and still runs the others', async () => {
    const dispatcher = new InProcessEventDispatcher();
    const seen: string[] = [];
    dispatcher.subscribe(async () => {
      throw new Error('sender is down');
    });
    dispatcher.subscribe(async (event) => {
      seen.push(event.type);
    });

    expect(() => dispatcher.publish(testEvent)).not.toThrow();

    await dispatcher.waitForIdle();
    expect(seen).toEqual(['payment.succeeded']);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('payment.succeeded'),
      expect.any(Error)
    );
  });

  it('a failing sender never breaks the originating operation', async () => {
    // Full wiring, as in the DI container, but with a sender that always
    // fails: confirming the reservation must still succeed.
    const reservation = new Reservation({
      id: 'res-1',
      restaurantId: 'rest-1',
      tableId: 't-1',
      guestName: 'John Doe',
      guestEmail: new Email('john@example.com'),
      startsAt: new Date('2026-12-25T23:30:00.000Z'),
      partySize: 4,
      status: ReservationStatus.pending(),
    });

    const reservationRepo = {
      save: jest.fn(),
      createWithSlotHold: jest.fn(),
      findById: jest.fn().mockResolvedValue(reservation),
      findByEmail: jest.fn(),
      findOverlapping: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn().mockImplementation(async (r) => r),
      delete: jest.fn(),
    } as jest.Mocked<IReservationRepository>;

    const orderRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByReservationId: jest.fn(),
      findAll: jest.fn(),
    } as jest.Mocked<IOrderRepository>;

    const failingSender: INotificationSender = {
      send: jest.fn().mockRejectedValue(new Error('SMTP unreachable')),
    };

    const dispatcher = new InProcessEventDispatcher();
    const notifications = new NotificationDispatcher(
      failingSender,
      orderRepo,
      reservationRepo
    );
    dispatcher.subscribe((event) => notifications.handle(event));

    const useCase = new ConfirmReservationUseCase(reservationRepo, dispatcher);

    const result = await useCase.execute('res-1', {
      userId: 'user-1',
      restaurantId: 'rest-1',
      role: 'owner',
    });

    expect(result.status).toBe('confirmed');

    // The sender was attempted and failed — but only after the request
    // path had already completed, and the failure stayed contained.
    await dispatcher.waitForIdle();
    expect(failingSender.send).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('reservation.confirmed'),
      expect.any(Error)
    );
  });
});
