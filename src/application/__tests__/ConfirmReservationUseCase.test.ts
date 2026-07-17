import { ConfirmReservationUseCase } from '../use-cases/ConfirmReservationUseCase';
import { TenantContext } from '../common/TenantContext';
import { IEventPublisher } from '../ports/IEventPublisher';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ReservelyDomainEvent } from '@domain/events/DomainEvent';
import { Reservation } from '@domain/entities/Reservation';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@domain/exceptions/DomainException';

class RecordingEventPublisher implements IEventPublisher {
  public events: ReservelyDomainEvent[] = [];

  publish(event: ReservelyDomainEvent): void {
    this.events.push(event);
  }
}

describe('ConfirmReservationUseCase', () => {
  let useCase: ConfirmReservationUseCase;
  let mockReservationRepo: jest.Mocked<IReservationRepository>;
  let publisher: RecordingEventPublisher;

  const tenant: TenantContext = {
    userId: 'user-1',
    restaurantId: 'rest-1',
    role: 'owner',
  };

  const makeReservation = (
    overrides: {
      restaurantId?: string;
      status?: ReservationStatus;
    } = {}
  ) =>
    new Reservation({
      id: 'res-1',
      restaurantId: overrides.restaurantId ?? 'rest-1',
      tableId: 't-1',
      guestName: 'John Doe',
      guestEmail: new Email('john@example.com'),
      guestPhone: '+15550001111',
      startsAt: new Date('2026-12-25T23:30:00.000Z'),
      partySize: 4,
      status: overrides.status ?? ReservationStatus.pending(),
    });

  beforeEach(() => {
    mockReservationRepo = {
      save: jest.fn(),
      createWithSlotHold: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findOverlapping: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn().mockImplementation(async (r) => r),
      delete: jest.fn(),
    };
    publisher = new RecordingEventPublisher();

    useCase = new ConfirmReservationUseCase(mockReservationRepo, publisher);
  });

  it('confirms the reservation and persists the status change', async () => {
    mockReservationRepo.findById.mockResolvedValue(makeReservation());

    const result = await useCase.execute('res-1', tenant);

    expect(result.status).toBe('confirmed');
    expect(mockReservationRepo.update).toHaveBeenCalledTimes(1);
  });

  it('publishes a reservation.confirmed event with the guest snapshot', async () => {
    mockReservationRepo.findById.mockResolvedValue(makeReservation());

    await useCase.execute('res-1', tenant);

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]).toMatchObject({
      type: 'reservation.confirmed',
      reservationId: 'res-1',
      restaurantId: 'rest-1',
      guestName: 'John Doe',
      guestEmail: 'john@example.com',
      guestPhone: '+15550001111',
      partySize: 4,
    });
  });

  it('publishes nothing when the reservation does not exist', async () => {
    mockReservationRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', tenant)).rejects.toThrow(
      EntityNotFoundException
    );
    expect(publisher.events).toHaveLength(0);
  });

  it("publishes nothing when confirming another restaurant's reservation", async () => {
    mockReservationRepo.findById.mockResolvedValue(
      makeReservation({ restaurantId: 'rest-other' })
    );

    await expect(useCase.execute('res-1', tenant)).rejects.toThrow(
      ForbiddenException
    );
    expect(publisher.events).toHaveLength(0);
  });

  it('publishes nothing when the domain refuses the confirmation', async () => {
    mockReservationRepo.findById.mockResolvedValue(
      makeReservation({ status: ReservationStatus.cancelled() })
    );

    await expect(useCase.execute('res-1', tenant)).rejects.toThrow(
      'Cannot confirm a cancelled reservation'
    );
    expect(mockReservationRepo.update).not.toHaveBeenCalled();
    expect(publisher.events).toHaveLength(0);
  });
});
