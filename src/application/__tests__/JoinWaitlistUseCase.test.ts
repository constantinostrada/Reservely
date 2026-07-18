import { JoinWaitlistUseCase } from '../use-cases/JoinWaitlistUseCase';
import { TenantContext } from '../common/TenantContext';
import { zonedTimeToUtc } from '../common/timeZone';
import { IWaitlistRepository } from '@domain/repositories/IWaitlistRepository';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { AvailabilityService } from '@domain/services/AvailabilityService';
import { Reservation } from '@domain/entities/Reservation';
import { Restaurant } from '@domain/entities/Restaurant';
import { Table } from '@domain/entities/Table';
import { WaitlistEntry } from '@domain/entities/WaitlistEntry';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import { TableStatus } from '@domain/value-objects/TableStatus';
import { ValidationException } from '@domain/exceptions/DomainException';

describe('JoinWaitlistUseCase', () => {
  const tenant: TenantContext = {
    userId: 'public',
    restaurantId: 'rest-1',
    role: 'guest',
  };

  const restaurant = new Restaurant({
    id: 'rest-1',
    name: 'Test Bistro',
    slug: 'test-bistro',
    timezone: 'America/New_York',
  });

  // A well-into-the-future slot so "already started" never trips in tests.
  const dto = {
    guestName: 'Wait Guest',
    guestEmail: 'wait@example.com',
    guestPhone: '+15551234567',
    date: '2099-03-10',
    time: '18:00',
    partySize: 2,
  };

  const slotStart = zonedTimeToUtc(dto.date, dto.time, restaurant.timezone);

  const table = new Table({
    id: 't-1',
    restaurantId: 'rest-1',
    tableNumber: 1,
    capacity: 4,
    status: TableStatus.available(),
  });

  const blockingReservation = new Reservation({
    id: 'res-block',
    restaurantId: 'rest-1',
    tableId: 't-1',
    guestName: 'Booked Guest',
    guestEmail: new Email('booked@example.com'),
    startsAt: slotStart,
    partySize: 4,
    status: ReservationStatus.confirmed(),
  });

  let waitlistRepo: jest.Mocked<IWaitlistRepository>;
  let reservationRepo: jest.Mocked<IReservationRepository>;
  let tableRepo: jest.Mocked<ITableRepository>;
  let restaurantRepo: jest.Mocked<IRestaurantRepository>;
  let useCase: JoinWaitlistUseCase;

  beforeEach(() => {
    waitlistRepo = {
      save: jest.fn().mockImplementation(async (e: WaitlistEntry) => e),
      findById: jest.fn(),
      findWaiting: jest.fn(),
      countWaitingForSlot: jest.fn().mockResolvedValue(1),
      promoteNextForFreedSlot: jest.fn(),
      expireStale: jest.fn(),
    };
    reservationRepo = {
      save: jest.fn(),
      createWithSlotHold: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      createCombinedWithSlotHold: jest.fn(),
      findByCombinationId: jest.fn(),
      findOverlapping: jest.fn().mockResolvedValue([]),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    tableRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByTableNumber: jest.fn(),
      findAvailableTables: jest.fn().mockResolvedValue([table]),
      findByCapacity: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ITableRepository>;
    restaurantRepo = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(restaurant),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<IRestaurantRepository>;

    useCase = new JoinWaitlistUseCase(
      waitlistRepo,
      reservationRepo,
      tableRepo,
      restaurantRepo,
      new AvailabilityService()
    );
  });

  it('adds a waiting entry when the slot is fully booked', async () => {
    // Every table is blocked at the slot → no availability.
    reservationRepo.findOverlapping.mockResolvedValue([blockingReservation]);

    const result = await useCase.execute(dto, tenant);

    expect(waitlistRepo.save).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('waiting');
    expect(result.guestEmail).toBe('wait@example.com');
    expect(result.partySize).toBe(2);
    expect(result.startsAt).toBe(slotStart.toISOString());
    expect(result.position).toBe(1);
  });

  it('rejects joining when the slot still has a free table', async () => {
    // No overlapping reservations → the table is free → book directly.
    reservationRepo.findOverlapping.mockResolvedValue([]);

    await expect(useCase.execute(dto, tenant)).rejects.toThrow(
      ValidationException
    );
    expect(waitlistRepo.save).not.toHaveBeenCalled();
  });

  it('rejects a slot outside operating hours', async () => {
    reservationRepo.findOverlapping.mockResolvedValue([blockingReservation]);

    await expect(
      useCase.execute({ ...dto, time: '02:00' }, tenant)
    ).rejects.toThrow(/operating hours/);
    expect(waitlistRepo.save).not.toHaveBeenCalled();
  });

  it('rejects a slot that has already started', async () => {
    reservationRepo.findOverlapping.mockResolvedValue([blockingReservation]);

    await expect(
      useCase.execute({ ...dto, date: '2000-01-01' }, tenant)
    ).rejects.toThrow(/already started/);
    expect(waitlistRepo.save).not.toHaveBeenCalled();
  });
});
