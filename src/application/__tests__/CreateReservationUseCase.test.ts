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
import { TableStatus } from '@domain/value-objects/TableStatus';
import {
  ConflictException,
  ValidationException,
} from '@domain/exceptions/DomainException';

describe('CreateReservationUseCase', () => {
  let useCase: CreateReservationUseCase;
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

  const makeTable = (id: string, capacity: number) =>
    new Table({
      id,
      restaurantId: 'rest-1',
      tableNumber: capacity,
      capacity,
      status: TableStatus.available(),
    });

  beforeEach(() => {
    mockReservationRepo = {
      save: jest.fn(),
      createWithSlotHold: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findOverlapping: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockTableRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByTableNumber: jest.fn(),
      findAvailableTables: jest.fn(),
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

    useCase = new CreateReservationUseCase(
      mockReservationRepo,
      mockTableRepo,
      mockRestaurantRepo,
      new ReservationDomainService(),
      new AvailabilityService()
    );
  });

  const validDto = {
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    guestPhone: '+1234567890',
    date: '2026-12-25',
    time: '18:30',
    partySize: 4,
    notes: 'Window seat preferred',
  };

  describe('execute', () => {
    it('creates a reservation through the transactional slot hold', async () => {
      mockTableRepo.findAvailableTables.mockResolvedValue([
        makeTable('t-1', 4),
      ]);
      mockReservationRepo.createWithSlotHold.mockImplementation(
        async (r) => r
      );

      const result = await useCase.execute(validDto, tenant);

      expect(result.guestName).toBe(validDto.guestName);
      expect(result.status).toBe('pending');
      expect(result.tableId).toBe('t-1');
      expect(mockReservationRepo.createWithSlotHold).toHaveBeenCalledTimes(1);
      expect(mockReservationRepo.save).not.toHaveBeenCalled();
    });

    it('converts the restaurant-local time to UTC at the boundary', async () => {
      mockTableRepo.findAvailableTables.mockResolvedValue([
        makeTable('t-1', 4),
      ]);
      mockReservationRepo.createWithSlotHold.mockImplementation(
        async (r) => r
      );

      const result = await useCase.execute(validDto, tenant);

      // 18:30 EST (winter, UTC-5) on Dec 25 = 23:30 UTC; 90 min later ends
      // 01:00 UTC on Dec 26 — a UTC day-boundary crossing handled correctly
      expect(result.startsAt).toBe('2026-12-25T23:30:00.000Z');
      expect(result.endsAt).toBe('2026-12-26T01:00:00.000Z');
    });

    it('scopes the new reservation to the authenticated tenant', async () => {
      mockTableRepo.findAvailableTables.mockResolvedValue([
        makeTable('t-1', 4),
      ]);
      mockReservationRepo.createWithSlotHold.mockImplementation(
        async (r) => r
      );

      const result = await useCase.execute(validDto, tenant);

      expect(result.restaurantId).toBe(tenant.restaurantId);
      const heldEntity =
        mockReservationRepo.createWithSlotHold.mock.calls[0][0];
      expect(heldEntity.restaurantId).toBe(tenant.restaurantId);
    });

    it('rejects times outside operating hours (restaurant-local)', async () => {
      await expect(
        useCase.execute({ ...validDto, time: '23:00' }, tenant)
      ).rejects.toThrow('outside of restaurant operating hours');

      // 21:00 + 90 min would end at 22:30, past closing
      await expect(
        useCase.execute({ ...validDto, time: '21:00' }, tenant)
      ).rejects.toThrow('outside of restaurant operating hours');
    });

    it('throws if no table can accommodate the party', async () => {
      mockTableRepo.findAvailableTables.mockResolvedValue([
        makeTable('t-1', 2),
      ]);

      await expect(useCase.execute(validDto, tenant)).rejects.toThrow(
        'No tables available'
      );
    });

    it('validates an explicitly requested table', async () => {
      mockTableRepo.findAvailableTables.mockResolvedValue([
        makeTable('t-1', 2),
      ]);

      await expect(
        useCase.execute({ ...validDto, tableId: 't-1' }, tenant)
      ).rejects.toThrow(ValidationException);
      await expect(
        useCase.execute({ ...validDto, tableId: 't-unknown' }, tenant)
      ).rejects.toThrow(ValidationException);
    });

    it('prefers the smallest suitable table', async () => {
      mockTableRepo.findAvailableTables.mockResolvedValue([
        makeTable('t-big', 8),
        makeTable('t-small', 4),
      ]);
      mockReservationRepo.createWithSlotHold.mockImplementation(
        async (r) => r
      );

      const result = await useCase.execute(validDto, tenant);

      expect(result.tableId).toBe('t-small');
    });

    it('falls through to the next table when a hold is lost to a race', async () => {
      mockTableRepo.findAvailableTables.mockResolvedValue([
        makeTable('t-1', 4),
        makeTable('t-2', 6),
      ]);
      mockReservationRepo.createWithSlotHold
        .mockRejectedValueOnce(new ConflictException('slot taken'))
        .mockImplementationOnce(async (r) => r);

      const result = await useCase.execute(validDto, tenant);

      expect(result.tableId).toBe('t-2');
    });

    it('surfaces the conflict when the requested table is taken', async () => {
      mockTableRepo.findAvailableTables.mockResolvedValue([
        makeTable('t-1', 4),
        makeTable('t-2', 6),
      ]);
      mockReservationRepo.createWithSlotHold.mockRejectedValue(
        new ConflictException('slot taken')
      );

      await expect(
        useCase.execute({ ...validDto, tableId: 't-1' }, tenant)
      ).rejects.toThrow(ConflictException);
      // No fallback attempted when the guest pinned a table
      expect(mockReservationRepo.createWithSlotHold).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrent double-booking attempt', () => {
    it('lets exactly one of two concurrent requests win the slot', async () => {
      mockTableRepo.findAvailableTables.mockResolvedValue([
        makeTable('t-1', 4),
      ]);

      // In-memory stand-in for the DB hold: an atomic check-and-insert per
      // table/slot, mirroring the row-lock + overlap-check transaction in
      // PrismaReservationRepository.createWithSlotHold.
      const held: Reservation[] = [];
      mockReservationRepo.createWithSlotHold.mockImplementation(
        async (reservation) => {
          const conflict = held.some(
            (existing) =>
              existing.tableId === reservation.tableId &&
              existing.conflictsWith(reservation.slot)
          );
          if (conflict) {
            throw new ConflictException('slot taken');
          }
          held.push(reservation);
          return reservation;
        }
      );

      const dto = { ...validDto, tableId: 't-1' };
      const results = await Promise.allSettled([
        useCase.execute(dto, tenant),
        useCase.execute(dto, tenant),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
      );

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(ConflictException);
      expect(held).toHaveLength(1);
    });
  });
});
