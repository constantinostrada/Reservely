import { CreateReservationUseCase } from '../use-cases/CreateReservationUseCase';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { ReservationDomainService } from '@domain/services/ReservationDomainService';
import { Reservation } from '@domain/entities/Reservation';
import { Table } from '@domain/entities/Table';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import { TableStatus } from '@domain/value-objects/TableStatus';

describe('CreateReservationUseCase', () => {
  let useCase: CreateReservationUseCase;
  let mockReservationRepo: jest.Mocked<IReservationRepository>;
  let mockTableRepo: jest.Mocked<ITableRepository>;
  let domainService: ReservationDomainService;

  beforeEach(() => {
    mockReservationRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByDate: jest.fn(),
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

    domainService = new ReservationDomainService();

    useCase = new CreateReservationUseCase(
      mockReservationRepo,
      mockTableRepo,
      domainService
    );
  });

  describe('execute', () => {
    const validDto = {
      restaurantId: 'rest-1',
      guestName: 'John Doe',
      guestEmail: 'john@example.com',
      guestPhone: '+1234567890',
      date: '2024-12-25T00:00:00.000Z',
      time: '18:30',
      partySize: 4,
      notes: 'Window seat preferred',
    };

    it('should create a reservation successfully', async () => {
      const mockTable = new Table({
        restaurantId: 'rest-1',
        tableNumber: 1,
        capacity: 4,
        status: TableStatus.available(),
      });

      mockTableRepo.findAvailableTables.mockResolvedValue([mockTable]);
      mockReservationRepo.findByDate.mockResolvedValue([]);

      const mockSavedReservation = new Reservation({
        id: 'test-id',
        restaurantId: validDto.restaurantId,
        guestName: validDto.guestName,
        guestEmail: new Email(validDto.guestEmail),
        guestPhone: validDto.guestPhone,
        date: new Date(validDto.date),
        time: validDto.time,
        partySize: validDto.partySize,
        status: ReservationStatus.pending(),
        notes: validDto.notes,
      });

      mockReservationRepo.save.mockResolvedValue(mockSavedReservation);

      const result = await useCase.execute(validDto);

      expect(result.guestName).toBe(validDto.guestName);
      expect(result.guestEmail).toBe(validDto.guestEmail);
      expect(result.status).toBe('pending');
      expect(mockTableRepo.findAvailableTables).toHaveBeenCalled();
      expect(mockReservationRepo.save).toHaveBeenCalled();
    });

    it('should throw error if time is outside operating hours', async () => {
      const invalidDto = {
        ...validDto,
        time: '23:00', // Outside operating hours
      };

      await expect(useCase.execute(invalidDto)).rejects.toThrow(
        'outside of restaurant operating hours'
      );
    });

    it('should throw error if no tables available', async () => {
      mockTableRepo.findAvailableTables.mockResolvedValue([]);

      await expect(useCase.execute(validDto)).rejects.toThrow(
        'No tables available'
      );
    });

    it('should throw error if reservation conflicts with existing one', async () => {
      const mockTable = new Table({
        restaurantId: 'rest-1',
        tableNumber: 1,
        capacity: 4,
        status: TableStatus.available(),
      });

      const existingReservation = new Reservation({
        restaurantId: 'rest-1',
        guestName: 'Jane Doe',
        guestEmail: new Email('jane@example.com'),
        date: new Date(validDto.date),
        time: '18:00',
        partySize: 2,
        status: ReservationStatus.confirmed(),
      });

      mockTableRepo.findAvailableTables.mockResolvedValue([mockTable]);
      mockReservationRepo.findByDate.mockResolvedValue([existingReservation]);

      await expect(useCase.execute(validDto)).rejects.toThrow(
        'conflicts with an existing reservation'
      );
    });
  });
});
