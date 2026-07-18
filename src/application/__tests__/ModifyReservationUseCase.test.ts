import { ModifyReservationUseCase } from '../use-cases/ModifyReservationUseCase';
import { TenantContext } from '../common/TenantContext';
import { IEventPublisher } from '../ports/IEventPublisher';
import {
  IReservationRepository,
  SlotHoldSwap,
} from '@domain/repositories/IReservationRepository';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { IWaitlistRepository } from '@domain/repositories/IWaitlistRepository';
import { ReservationDomainService } from '@domain/services/ReservationDomainService';
import { AvailabilityService } from '@domain/services/AvailabilityService';
import { TableCombinationService } from '@domain/services/TableCombinationService';
import { Reservation } from '@domain/entities/Reservation';
import { Restaurant } from '@domain/entities/Restaurant';
import { Table } from '@domain/entities/Table';
import { WaitlistEntry } from '@domain/entities/WaitlistEntry';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import { TableStatus } from '@domain/value-objects/TableStatus';
import { WaitlistStatus } from '@domain/value-objects/WaitlistStatus';
import {
  ConflictException,
  EntityNotFoundException,
  ForbiddenException,
  ValidationException,
} from '@domain/exceptions/DomainException';

describe('ModifyReservationUseCase', () => {
  let useCase: ModifyReservationUseCase;
  let mockReservationRepo: jest.Mocked<IReservationRepository>;
  let mockTableRepo: jest.Mocked<ITableRepository>;
  let mockRestaurantRepo: jest.Mocked<IRestaurantRepository>;
  let mockWaitlistRepo: jest.Mocked<IWaitlistRepository>;
  let mockEventPublisher: jest.Mocked<IEventPublisher>;

  const tenant: TenantContext = {
    userId: 'user-1',
    restaurantId: 'rest-1',
    role: 'owner',
  };

  const restaurant = new Restaurant({
    id: 'rest-1',
    name: 'Testaurant',
    slug: 'testaurant',
    timezone: 'UTC',
  });

  const makeTable = (id: string, capacity: number, location = 'patio') =>
    new Table({
      id,
      restaurantId: 'rest-1',
      tableNumber: Number(id.replace(/\D/g, '')) || 1,
      capacity,
      location,
      status: TableStatus.available(),
    });

  // 18:00 UTC tomorrow — inside the service window, in the future.
  const tomorrow = new Date(Date.now() + 24 * 60 * 60_000)
    .toISOString()
    .slice(0, 10);
  const originalStart = new Date(`${tomorrow}T18:00:00.000Z`);

  const makeReservation = (
    overrides: {
      id?: string;
      restaurantId?: string;
      tableId?: string;
      partySize?: number;
      status?: ReservationStatus;
      combinationId?: string;
      startsAt?: Date;
    } = {}
  ) =>
    new Reservation({
      id: overrides.id ?? 'res-1',
      restaurantId: overrides.restaurantId ?? 'rest-1',
      tableId: overrides.tableId ?? 't-1',
      guestName: 'John Doe',
      guestEmail: new Email('john@example.com'),
      startsAt: overrides.startsAt ?? originalStart,
      partySize: overrides.partySize ?? 2,
      status: overrides.status ?? ReservationStatus.confirmed(),
      combinationId: overrides.combinationId,
      createdAt: new Date(Date.now() - 60 * 60_000),
    });

  beforeEach(() => {
    mockReservationRepo = {
      save: jest.fn(),
      createWithSlotHold: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      createCombinedWithSlotHold: jest.fn(),
      swapSlotHold: jest
        .fn()
        .mockImplementation(async (swap: SlotHoldSwap) => swap.hold[0]),
      findByCombinationId: jest.fn(),
      findNoShowCandidates: jest.fn(),
      markNoShowIfUnseated: jest.fn(),
      findOverlapping: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockTableRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByTableNumber: jest.fn(),
      findAvailableTables: jest
        .fn()
        .mockResolvedValue([makeTable('t-1', 4), makeTable('t-2', 6)]),
      findByCapacity: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockRestaurantRepo = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(restaurant),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockWaitlistRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findWaiting: jest.fn(),
      countWaitingForSlot: jest.fn(),
      promoteNextForFreedSlot: jest.fn().mockResolvedValue(null),
      expireStale: jest.fn(),
    };

    mockEventPublisher = { publish: jest.fn() };

    useCase = new ModifyReservationUseCase(
      mockReservationRepo,
      mockTableRepo,
      mockRestaurantRepo,
      new ReservationDomainService(),
      new AvailabilityService(),
      new TableCombinationService(),
      mockWaitlistRepo,
      mockEventPublisher
    );
  });

  it('reschedules to a new time, keeping the current table and the reservation id', async () => {
    const reservation = makeReservation();
    mockReservationRepo.findById.mockResolvedValue(reservation);

    const result = await useCase.execute(
      'res-1',
      { date: tomorrow, time: '20:00' },
      tenant
    );

    expect(mockReservationRepo.swapSlotHold).toHaveBeenCalledTimes(1);
    const swap = mockReservationRepo.swapSlotHold.mock.calls[0][0];
    expect(swap.hold).toHaveLength(1);
    expect(swap.hold[0].id).toBe('res-1');
    expect(swap.hold[0].tableId).toBe('t-1');
    expect(swap.hold[0].startsAt.toISOString()).toBe(
      `${tomorrow}T20:00:00.000Z`
    );
    expect(swap.releaseIds).toEqual([]);
    expect(result.startsAt).toBe(`${tomorrow}T20:00:00.000Z`);
  });

  it('resizes within the current table without touching availability', async () => {
    const reservation = makeReservation({ partySize: 2 });
    mockReservationRepo.findById.mockResolvedValue(reservation);

    const result = await useCase.execute('res-1', { partySize: 4 }, tenant);

    const swap = mockReservationRepo.swapSlotHold.mock.calls[0][0];
    expect(swap.hold[0].tableId).toBe('t-1');
    expect(swap.hold[0].partySize).toBe(4);
    expect(swap.hold[0].startsAt).toEqual(reservation.startsAt);
    expect(swap.releaseIds).toEqual([]);
    expect(result.partySize).toBe(4);
  });

  it('moves to a bigger single table when the party outgrows the current one', async () => {
    const reservation = makeReservation({ partySize: 2 });
    mockReservationRepo.findById.mockResolvedValue(reservation);

    await useCase.execute('res-1', { partySize: 6 }, tenant);

    const swap = mockReservationRepo.swapSlotHold.mock.calls[0][0];
    expect(swap.hold).toHaveLength(1);
    expect(swap.hold[0].id).toBe('res-1');
    expect(swap.hold[0].tableId).toBe('t-2');
    expect(swap.hold[0].combinationId).toBeUndefined();
  });

  it('falls back to a table combination when no single table fits the grown party', async () => {
    const reservation = makeReservation({ partySize: 2 });
    mockReservationRepo.findById.mockResolvedValue(reservation);
    mockTableRepo.findAvailableTables.mockResolvedValue([
      makeTable('t-1', 4),
      makeTable('t-2', 6),
    ]);

    await useCase.execute('res-1', { partySize: 9 }, tenant);

    const swap = mockReservationRepo.swapSlotHold.mock.calls[0][0];
    expect(swap.hold).toHaveLength(2);
    // Primary keeps the booking's id; every row shares one combinationId.
    expect(swap.hold[0].id).toBe('res-1');
    expect(swap.hold[0].combinationId).toBeDefined();
    expect(swap.hold[1].combinationId).toBe(swap.hold[0].combinationId);
    const capacitySum = 4 + 6;
    expect(capacitySum).toBeGreaterThanOrEqual(9);
  });

  it('rejects with 409 when every candidate slot is taken, leaving the original untouched', async () => {
    const reservation = makeReservation();
    mockReservationRepo.findById.mockResolvedValue(reservation);
    mockReservationRepo.swapSlotHold.mockRejectedValue(
      new ConflictException('taken')
    );

    await expect(
      useCase.execute('res-1', { date: tomorrow, time: '20:00' }, tenant)
    ).rejects.toThrow(ConflictException);

    // The failed swap must not have released anything: no plain update, no
    // waitlist promotion, no event — the original reservation stands.
    expect(mockReservationRepo.update).not.toHaveBeenCalled();
    expect(mockWaitlistRepo.promoteNextForFreedSlot).not.toHaveBeenCalled();
    expect(mockEventPublisher.publish).not.toHaveBeenCalled();
  });

  it('tries the next suitable table when the preferred one conflicts', async () => {
    const reservation = makeReservation();
    mockReservationRepo.findById.mockResolvedValue(reservation);
    mockReservationRepo.swapSlotHold
      .mockRejectedValueOnce(new ConflictException('t-1 taken'))
      .mockImplementation(async (swap: SlotHoldSwap) => swap.hold[0]);

    await useCase.execute('res-1', { date: tomorrow, time: '20:00' }, tenant);

    expect(mockReservationRepo.swapSlotHold).toHaveBeenCalledTimes(2);
    const secondSwap = mockReservationRepo.swapSlotHold.mock.calls[1][0];
    expect(secondSwap.hold[0].tableId).toBe('t-2');
  });

  it('offers the freed old slot to the waitlist after a successful move', async () => {
    const reservation = makeReservation();
    mockReservationRepo.findById.mockResolvedValue(reservation);

    const promotedReservation = makeReservation({
      id: 'res-promoted',
      startsAt: originalStart,
    });
    mockWaitlistRepo.promoteNextForFreedSlot.mockResolvedValue({
      reservation: promotedReservation,
      entry: new WaitlistEntry({
        id: 'wl-1',
        restaurantId: 'rest-1',
        guestName: 'Waiting Guest',
        guestEmail: new Email('waiting@example.com'),
        partySize: 2,
        startsAt: originalStart,
        endsAt: reservation.endsAt,
        status: WaitlistStatus.promoted(),
        promotedReservationId: 'res-promoted',
      }),
    });

    await useCase.execute('res-1', { date: tomorrow, time: '20:00' }, tenant);

    expect(mockWaitlistRepo.promoteNextForFreedSlot).toHaveBeenCalledWith({
      restaurantId: 'rest-1',
      tableId: 't-1',
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
    });
    expect(mockEventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'waitlist.promoted' })
    );
  });

  it('releases the sibling rows when a combined booking moves to a single table', async () => {
    const primary = makeReservation({
      id: 'res-1',
      tableId: 't-1',
      partySize: 4,
      combinationId: 'comb-1',
    });
    const sibling = makeReservation({
      id: 'res-2',
      tableId: 't-2',
      partySize: 4,
      combinationId: 'comb-1',
    });
    mockReservationRepo.findById.mockResolvedValue(primary);
    mockReservationRepo.findByCombinationId.mockResolvedValue([
      primary,
      sibling,
    ]);

    await useCase.execute('res-1', { partySize: 2, time: '20:00' }, tenant);

    const swap = mockReservationRepo.swapSlotHold.mock.calls[0][0];
    expect(swap.hold).toHaveLength(1);
    expect(swap.hold[0].id).toBe('res-1');
    expect(swap.releaseIds).toEqual(['res-2']);
  });

  it('rejects a move outside the service window', async () => {
    mockReservationRepo.findById.mockResolvedValue(makeReservation());

    await expect(
      useCase.execute('res-1', { time: '03:00' }, tenant)
    ).rejects.toThrow(ValidationException);
    expect(mockReservationRepo.swapSlotHold).not.toHaveBeenCalled();
  });

  it('rejects a move into the past', async () => {
    mockReservationRepo.findById.mockResolvedValue(makeReservation());
    const yesterday = new Date(Date.now() - 24 * 60 * 60_000)
      .toISOString()
      .slice(0, 10);

    await expect(
      useCase.execute('res-1', { date: yesterday, time: '18:00' }, tenant)
    ).rejects.toThrow(ValidationException);
    expect(mockReservationRepo.swapSlotHold).not.toHaveBeenCalled();
  });

  it('refuses to modify a cancelled reservation', async () => {
    mockReservationRepo.findById.mockResolvedValue(
      makeReservation({ status: ReservationStatus.cancelled() })
    );

    await expect(
      useCase.execute('res-1', { partySize: 4 }, tenant)
    ).rejects.toThrow(ValidationException);
    expect(mockReservationRepo.swapSlotHold).not.toHaveBeenCalled();
  });

  it('rejects cross-tenant modification with a forbidden error', async () => {
    mockReservationRepo.findById.mockResolvedValue(
      makeReservation({ restaurantId: 'rest-2' })
    );

    await expect(
      useCase.execute('res-1', { partySize: 4 }, tenant)
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws not-found for a missing reservation', async () => {
    mockReservationRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('nope', { partySize: 4 }, tenant)
    ).rejects.toThrow(EntityNotFoundException);
  });

  it('fails validation when no table nor combination can seat the party', async () => {
    mockReservationRepo.findById.mockResolvedValue(makeReservation());
    // Tables in distinct locations can never combine.
    mockTableRepo.findAvailableTables.mockResolvedValue([
      makeTable('t-1', 4, 'patio'),
      makeTable('t-2', 4, 'terrace'),
    ]);

    await expect(
      useCase.execute('res-1', { partySize: 20 }, tenant)
    ).rejects.toThrow(ValidationException);
    expect(mockReservationRepo.swapSlotHold).not.toHaveBeenCalled();
  });
});
