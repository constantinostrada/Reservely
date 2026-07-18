import { GetReservationUseCase } from '../use-cases/GetReservationUseCase';
import { assertSameTenant } from '../common/tenantGuard';
import { TenantContext } from '../common/TenantContext';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { Reservation } from '@domain/entities/Reservation';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@domain/exceptions/DomainException';

describe('tenant scoping', () => {
  const tenant: TenantContext = {
    userId: 'user-1',
    restaurantId: 'rest-1',
    role: 'owner',
  };

  describe('assertSameTenant', () => {
    it('allows access within the same tenant', () => {
      expect(() => assertSameTenant('rest-1', tenant)).not.toThrow();
    });

    it('throws ForbiddenException for another tenant', () => {
      expect(() => assertSameTenant('rest-2', tenant)).toThrow(
        ForbiddenException
      );
    });
  });

  describe('GetReservationUseCase', () => {
    let mockReservationRepo: jest.Mocked<IReservationRepository>;
    let useCase: GetReservationUseCase;

    const makeReservation = (restaurantId: string) =>
      new Reservation({
        id: 'res-1',
        restaurantId,
        tableId: 'table-1',
        guestName: 'John Doe',
        guestEmail: new Email('john@example.com'),
        startsAt: new Date('2026-12-25T23:30:00.000Z'),
        partySize: 4,
        status: ReservationStatus.pending(),
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
        update: jest.fn(),
        delete: jest.fn(),
      };
      useCase = new GetReservationUseCase(mockReservationRepo);
    });

    it('returns a reservation belonging to the tenant', async () => {
      mockReservationRepo.findById.mockResolvedValue(
        makeReservation('rest-1')
      );

      const result = await useCase.execute('res-1', tenant);

      expect(result.id).toBe('res-1');
      expect(result.restaurantId).toBe('rest-1');
    });

    it("blocks access to another tenant's reservation with Forbidden", async () => {
      mockReservationRepo.findById.mockResolvedValue(
        makeReservation('rest-2')
      );

      await expect(useCase.execute('res-1', tenant)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('throws NotFound when the reservation does not exist', async () => {
      mockReservationRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute('missing', tenant)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
