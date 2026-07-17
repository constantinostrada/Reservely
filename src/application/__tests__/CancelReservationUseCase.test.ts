import { CancelReservationUseCase } from '../use-cases/CancelReservationUseCase';
import { CreateReservationUseCase } from '../use-cases/CreateReservationUseCase';
import { TenantContext } from '../common/TenantContext';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { ReservationDomainService } from '@domain/services/ReservationDomainService';
import { AvailabilityService } from '@domain/services/AvailabilityService';
import { Reservation } from '@domain/entities/Reservation';
import { Restaurant } from '@domain/entities/Restaurant';
import { Table } from '@domain/entities/Table';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import { TableStatus } from '@domain/value-objects/TableStatus';
import {
  ConflictException,
  EntityNotFoundException,
  ForbiddenException,
} from '@domain/exceptions/DomainException';

describe('CancelReservationUseCase', () => {
  let useCase: CancelReservationUseCase;
  let mockReservationRepo: jest.Mocked<IReservationRepository>;

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
      startsAt: new Date('2026-12-25T23:30:00.000Z'),
      partySize: 4,
      status: overrides.status ?? ReservationStatus.confirmed(),
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

    useCase = new CancelReservationUseCase(mockReservationRepo);
  });

  describe('execute', () => {
    it('cancels the reservation and persists the status change', async () => {
      mockReservationRepo.findById.mockResolvedValue(makeReservation());

      const result = await useCase.execute('res-1', tenant);

      expect(result.status).toBe('cancelled');
      expect(mockReservationRepo.update).toHaveBeenCalledTimes(1);
      const persisted = mockReservationRepo.update.mock.calls[0][0];
      expect(persisted.status.isCancelled()).toBe(true);
    });

    it('releases the table slot (cancelled reservations stop blocking)', async () => {
      const reservation = makeReservation();
      mockReservationRepo.findById.mockResolvedValue(reservation);
      expect(reservation.blocksTable()).toBe(true);

      await useCase.execute('res-1', tenant);

      expect(reservation.blocksTable()).toBe(false);
      expect(reservation.conflictsWith(reservation.slot)).toBe(false);
    });

    it('throws when the reservation does not exist', async () => {
      mockReservationRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute('missing', tenant)).rejects.toThrow(
        EntityNotFoundException
      );
      expect(mockReservationRepo.update).not.toHaveBeenCalled();
    });

    it('rejects cancelling another restaurant\'s reservation', async () => {
      mockReservationRepo.findById.mockResolvedValue(
        makeReservation({ restaurantId: 'rest-other' })
      );

      await expect(useCase.execute('res-1', tenant)).rejects.toThrow(
        ForbiddenException
      );
      expect(mockReservationRepo.update).not.toHaveBeenCalled();
    });

    it('refuses to cancel a completed reservation', async () => {
      mockReservationRepo.findById.mockResolvedValue(
        makeReservation({ status: ReservationStatus.completed() })
      );

      await expect(useCase.execute('res-1', tenant)).rejects.toThrow(
        'Cannot cancel a completed reservation'
      );
      expect(mockReservationRepo.update).not.toHaveBeenCalled();
    });
  });
});

describe('reservation lifecycle: create → cancel → rebook', () => {
  const tenant: TenantContext = {
    userId: 'user-1',
    restaurantId: 'rest-1',
    role: 'owner',
  };

  const restaurant = new Restaurant({
    id: 'rest-1',
    name: 'Test Bistro',
    slug: 'test-bistro',
    timezone: 'America/New_York',
  });

  const dto = {
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    date: '2026-12-25',
    time: '18:30',
    partySize: 4,
    tableId: 't-1',
  };

  it('a cancelled hold frees the slot for the next guest', async () => {
    // In-memory stand-in for the DB: the hold check mirrors the SQL in
    // PrismaReservationRepository.createWithSlotHold, which only counts
    // slot-blocking statuses — conflictsWith() encodes the same rule.
    const rows = new Map<string, Reservation>();
    const reservationRepo: IReservationRepository = {
      save: jest.fn(),
      createWithSlotHold: jest.fn(async (reservation: Reservation) => {
        const conflict = [...rows.values()].some(
          (existing) =>
            existing.tableId === reservation.tableId &&
            existing.conflictsWith(reservation.slot)
        );
        if (conflict) {
          throw new ConflictException('slot taken');
        }
        rows.set(reservation.id, reservation);
        return reservation;
      }),
      findById: jest.fn(async (id: string) => rows.get(id) ?? null),
      findByEmail: jest.fn(),
      findOverlapping: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(async (reservation: Reservation) => {
        rows.set(reservation.id, reservation);
        return reservation;
      }),
      delete: jest.fn(),
    };

    const tableRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByTableNumber: jest.fn(),
      findAvailableTables: jest.fn().mockResolvedValue([
        new Table({
          id: 't-1',
          restaurantId: 'rest-1',
          tableNumber: 1,
          capacity: 4,
          status: TableStatus.available(),
        }),
      ]),
      findByCapacity: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<ITableRepository>;

    const restaurantRepo = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(restaurant),
      findBySlug: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IRestaurantRepository>;

    const createUseCase = new CreateReservationUseCase(
      reservationRepo,
      tableRepo,
      restaurantRepo,
      new ReservationDomainService(),
      new AvailabilityService()
    );
    const cancelUseCase = new CancelReservationUseCase(reservationRepo);

    // 1. The first guest takes the slot…
    const first = await createUseCase.execute(dto, tenant);
    expect(first.status).toBe('pending');

    // 2. …which blocks a second booking for the same table/slot
    await expect(
      createUseCase.execute({ ...dto, guestName: 'Jane Doe' }, tenant)
    ).rejects.toThrow(ConflictException);

    // 3. Cancelling frees the slot…
    const cancelled = await cancelUseCase.execute(first.id, tenant);
    expect(cancelled.status).toBe('cancelled');

    // 4. …so the second guest can now book it
    const rebooked = await createUseCase.execute(
      { ...dto, guestName: 'Jane Doe' },
      tenant
    );
    expect(rebooked.tableId).toBe(first.tableId);
    expect(rebooked.startsAt).toBe(first.startsAt);
    expect(rebooked.status).toBe('pending');
  });
});
