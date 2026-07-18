import { CancelReservationUseCase } from '../use-cases/CancelReservationUseCase';
import { CreateReservationUseCase } from '../use-cases/CreateReservationUseCase';
import { TenantContext } from '../common/TenantContext';
import { IEventPublisher } from '../ports/IEventPublisher';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { IWaitlistRepository } from '@domain/repositories/IWaitlistRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { ReservationDomainService } from '@domain/services/ReservationDomainService';
import { AvailabilityService } from '@domain/services/AvailabilityService';
import { TableCombinationService } from '@domain/services/TableCombinationService';
import { Reservation } from '@domain/entities/Reservation';
import { Restaurant } from '@domain/entities/Restaurant';
import { Table } from '@domain/entities/Table';
import { WaitlistEntry } from '@domain/entities/WaitlistEntry';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import { WaitlistStatus } from '@domain/value-objects/WaitlistStatus';
import { TableStatus } from '@domain/value-objects/TableStatus';
import {
  ConflictException,
  EntityNotFoundException,
  ForbiddenException,
} from '@domain/exceptions/DomainException';

const makeWaitlistRepoMock = (): jest.Mocked<IWaitlistRepository> => ({
  save: jest.fn(),
  findById: jest.fn(),
  findWaiting: jest.fn(),
  countWaitingForSlot: jest.fn(),
  // Default: no one waiting, so no promotion happens.
  promoteNextForFreedSlot: jest.fn().mockResolvedValue(null),
  expireStale: jest.fn(),
});

describe('CancelReservationUseCase', () => {
  let useCase: CancelReservationUseCase;
  let mockReservationRepo: jest.Mocked<IReservationRepository>;
  let mockWaitlistRepo: jest.Mocked<IWaitlistRepository>;
  let mockEventPublisher: jest.Mocked<IEventPublisher>;

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
      createCombinedWithSlotHold: jest.fn(),
      findByCombinationId: jest.fn(),
      findOverlapping: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn().mockImplementation(async (r) => r),
      delete: jest.fn(),
    };

    mockWaitlistRepo = makeWaitlistRepoMock();
    mockEventPublisher = { publish: jest.fn() };

    useCase = new CancelReservationUseCase(
      mockReservationRepo,
      mockWaitlistRepo,
      mockEventPublisher
    );
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

  describe('waitlist promotion on cancel', () => {
    it('promotes the next waiting guest for the freed slot and notifies them', async () => {
      const reservation = makeReservation();
      mockReservationRepo.findById.mockResolvedValue(reservation);

      const promotedReservation = new Reservation({
        id: 'res-promoted',
        restaurantId: 'rest-1',
        tableId: 't-1',
        guestName: 'Wait Guest',
        guestEmail: new Email('wait@example.com'),
        guestPhone: '+15551234567',
        startsAt: reservation.startsAt,
        endsAt: reservation.endsAt,
        partySize: 2,
        status: ReservationStatus.confirmed(),
      });
      const promotedEntry = new WaitlistEntry({
        id: 'wl-1',
        restaurantId: 'rest-1',
        guestName: 'Wait Guest',
        guestEmail: new Email('wait@example.com'),
        guestPhone: '+15551234567',
        partySize: 2,
        startsAt: reservation.startsAt,
        status: WaitlistStatus.promoted(),
        promotedReservationId: 'res-promoted',
      });
      mockWaitlistRepo.promoteNextForFreedSlot.mockResolvedValue({
        reservation: promotedReservation,
        entry: promotedEntry,
      });

      await useCase.execute('res-1', tenant);

      // The freed slot is offered to the waitlist with the exact slot facts.
      expect(mockWaitlistRepo.promoteNextForFreedSlot).toHaveBeenCalledWith({
        restaurantId: 'rest-1',
        tableId: 't-1',
        startsAt: reservation.startsAt,
        endsAt: reservation.endsAt,
      });

      // The B9 pipeline is reused: a waitlist.promoted event carries the
      // promoted guest's contact + slot so the notifier can reach them.
      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'waitlist.promoted',
          waitlistEntryId: 'wl-1',
          reservationId: 'res-promoted',
          restaurantId: 'rest-1',
          guestEmail: 'wait@example.com',
          guestPhone: '+15551234567',
          partySize: 2,
        })
      );
    });

    it('publishes nothing when no one is waiting for the freed slot', async () => {
      mockReservationRepo.findById.mockResolvedValue(makeReservation());
      // Default mock already resolves null (no eligible entry).

      await useCase.execute('res-1', tenant);

      expect(mockWaitlistRepo.promoteNextForFreedSlot).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });

    it('does not touch the waitlist when the reservation was not holding the slot', async () => {
      // A no-show never held the slot, so cancelling it frees nothing.
      mockReservationRepo.findById.mockResolvedValue(
        makeReservation({ status: ReservationStatus.noShow() })
      );

      await useCase.execute('res-1', tenant);

      expect(mockWaitlistRepo.promoteNextForFreedSlot).not.toHaveBeenCalled();
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });
  });

  describe('combined booking cancel', () => {
    const makeComboRow = (id: string, tableId: string) =>
      new Reservation({
        id,
        restaurantId: 'rest-1',
        tableId,
        guestName: 'Big Party',
        guestEmail: new Email('party@example.com'),
        startsAt: new Date('2026-12-25T23:30:00.000Z'),
        partySize: 8,
        status: ReservationStatus.confirmed(),
        combinationId: 'comb-1',
      });

    it('cancels every table of the combination, freeing each slot', async () => {
      const requested = makeComboRow('res-1', 't-1');
      const sibling = makeComboRow('res-2', 't-2');
      mockReservationRepo.findById.mockResolvedValue(requested);
      mockReservationRepo.findByCombinationId.mockResolvedValue([
        requested,
        sibling,
      ]);

      const result = await useCase.execute('res-1', tenant);

      expect(result.status).toBe('cancelled');
      // Both rows were cancelled and persisted.
      expect(mockReservationRepo.update).toHaveBeenCalledTimes(2);
      const cancelledIds = mockReservationRepo.update.mock.calls.map(
        (c) => c[0].id
      );
      expect(cancelledIds.sort()).toEqual(['res-1', 'res-2']);

      // Each freed table's slot was offered to the waitlist (B11 reuse).
      expect(mockWaitlistRepo.promoteNextForFreedSlot).toHaveBeenCalledTimes(2);
      const freedTables = mockWaitlistRepo.promoteNextForFreedSlot.mock.calls.map(
        (c) => c[0].tableId
      );
      expect(freedTables.sort()).toEqual(['t-1', 't-2']);
    });

    it('does not re-cancel a sibling that is already free', async () => {
      const requested = makeComboRow('res-1', 't-1');
      const cancelledSibling = new Reservation({
        id: 'res-2',
        restaurantId: 'rest-1',
        tableId: 't-2',
        guestName: 'Big Party',
        guestEmail: new Email('party@example.com'),
        startsAt: new Date('2026-12-25T23:30:00.000Z'),
        partySize: 8,
        status: ReservationStatus.cancelled(),
        combinationId: 'comb-1',
      });
      mockReservationRepo.findById.mockResolvedValue(requested);
      mockReservationRepo.findByCombinationId.mockResolvedValue([
        requested,
        cancelledSibling,
      ]);

      await useCase.execute('res-1', tenant);

      // Only the still-blocking requested row is updated.
      expect(mockReservationRepo.update).toHaveBeenCalledTimes(1);
      expect(mockReservationRepo.update.mock.calls[0][0].id).toBe('res-1');
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
      createCombinedWithSlotHold: jest.fn(),
      findByCombinationId: jest.fn(),
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
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IRestaurantRepository>;

    const createUseCase = new CreateReservationUseCase(
      reservationRepo,
      tableRepo,
      restaurantRepo,
      new ReservationDomainService(),
      new AvailabilityService(),
      new TableCombinationService()
    );
    const cancelUseCase = new CancelReservationUseCase(
      reservationRepo,
      makeWaitlistRepoMock(),
      { publish: jest.fn() }
    );

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
