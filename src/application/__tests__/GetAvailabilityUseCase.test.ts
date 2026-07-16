import { GetAvailabilityUseCase } from '../use-cases/GetAvailabilityUseCase';
import { TenantContext } from '../common/TenantContext';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { AvailabilityService } from '@domain/services/AvailabilityService';
import { Reservation } from '@domain/entities/Reservation';
import { Restaurant } from '@domain/entities/Restaurant';
import { Table } from '@domain/entities/Table';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import { TableStatus } from '@domain/value-objects/TableStatus';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';

describe('GetAvailabilityUseCase', () => {
  let useCase: GetAvailabilityUseCase;
  let mockReservationRepo: jest.Mocked<IReservationRepository>;
  let mockTableRepo: jest.Mocked<ITableRepository>;
  let mockRestaurantRepo: jest.Mocked<IRestaurantRepository>;

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

  const makeTable = (id: string, tableNumber: number, capacity: number) =>
    new Table({
      id,
      restaurantId: 'rest-1',
      tableNumber,
      capacity,
      status: TableStatus.available(),
    });

  beforeEach(() => {
    mockReservationRepo = {
      save: jest.fn(),
      createWithSlotHold: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findOverlapping: jest.fn().mockResolvedValue([]),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockTableRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByTableNumber: jest.fn(),
      findAvailableTables: jest.fn().mockResolvedValue([]),
      findByCapacity: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockRestaurantRepo = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(restaurant),
      findBySlug: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new GetAvailabilityUseCase(
      mockReservationRepo,
      mockTableRepo,
      mockRestaurantRepo,
      new AvailabilityService()
    );
  });

  it('computes per-table slots as UTC instants from local opening hours', async () => {
    mockTableRepo.findAvailableTables.mockResolvedValue([
      makeTable('t-1', 1, 4),
    ]);

    // July → EDT (UTC-4): 11:00–22:00 local is 15:00Z–02:00Z next day
    const result = await useCase.execute(
      { date: '2026-07-16', partySize: 2 },
      tenant
    );

    expect(result.timezone).toBe('America/New_York');
    expect(result.tables).toHaveLength(1);
    const slots = result.tables[0].freeSlots;
    expect(slots).toHaveLength(20);
    expect(slots[0].startsAt).toBe('2026-07-16T15:00:00.000Z');
    expect(slots[0].endsAt).toBe('2026-07-16T16:30:00.000Z');
    // Last slot starts 20:30 local = 00:30Z the next UTC day
    expect(slots[slots.length - 1].startsAt).toBe('2026-07-17T00:30:00.000Z');
    expect(slots[slots.length - 1].endsAt).toBe('2026-07-17T02:00:00.000Z');
  });

  it('queries reservations over the UTC service window of the local date', async () => {
    await useCase.execute({ date: '2026-07-16', partySize: 2 }, tenant);

    expect(mockReservationRepo.findOverlapping).toHaveBeenCalledWith(
      'rest-1',
      new Date('2026-07-16T15:00:00.000Z'),
      new Date('2026-07-17T02:00:00.000Z')
    );
  });

  it('marks booked slots as unavailable only on the booked table', async () => {
    mockTableRepo.findAvailableTables.mockResolvedValue([
      makeTable('t-1', 1, 4),
      makeTable('t-2', 2, 4),
    ]);
    mockReservationRepo.findOverlapping.mockResolvedValue([
      new Reservation({
        restaurantId: 'rest-1',
        tableId: 't-1',
        guestName: 'Guest',
        guestEmail: new Email('guest@example.com'),
        // 18:00 local EDT = 22:00Z, blocks 90 minutes
        startsAt: new Date('2026-07-16T22:00:00.000Z'),
        partySize: 2,
        status: ReservationStatus.confirmed(),
      }),
    ]);

    const result = await useCase.execute(
      { date: '2026-07-16', partySize: 2 },
      tenant
    );

    const [t1, t2] = result.tables;
    const t1Starts = t1.freeSlots.map((s) => s.startsAt);
    expect(t1Starts).not.toContain('2026-07-16T22:00:00.000Z');
    expect(t1Starts).not.toContain('2026-07-16T21:00:00.000Z');
    // Five candidate starts (21:00Z–23:00Z) overlap the 22:00Z–23:30Z booking
    expect(t1.freeSlots.length).toBe(15);
    expect(t2.freeSlots.length).toBe(20);
  });

  it('excludes tables that cannot seat the party', async () => {
    mockTableRepo.findAvailableTables.mockResolvedValue([
      makeTable('t-1', 1, 2),
      makeTable('t-2', 2, 6),
    ]);

    const result = await useCase.execute(
      { date: '2026-07-16', partySize: 5 },
      tenant
    );

    expect(result.tables.map((t) => t.tableId)).toEqual(['t-2']);
  });

  it('throws when the tenant restaurant does not exist', async () => {
    mockRestaurantRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ date: '2026-07-16', partySize: 2 }, tenant)
    ).rejects.toThrow(EntityNotFoundException);
  });
});
