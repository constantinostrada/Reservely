import { GetTableUseCase } from '../use-cases/GetTableUseCase';
import { UpdateTableUseCase } from '../use-cases/UpdateTableUseCase';
import { DeleteTableUseCase } from '../use-cases/DeleteTableUseCase';
import { TenantContext } from '../common/TenantContext';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { Table } from '@domain/entities/Table';
import { TableStatus } from '@domain/value-objects/TableStatus';
import {
  ConflictException,
  EntityNotFoundException,
  ForbiddenException,
} from '@domain/exceptions/DomainException';

describe('table CRUD use cases', () => {
  const tenant: TenantContext = {
    userId: 'user-1',
    restaurantId: 'rest-1',
    role: 'manager',
  };

  const makeTable = (restaurantId: string) =>
    new Table({
      id: 'table-1',
      restaurantId,
      tableNumber: 5,
      capacity: 4,
      status: TableStatus.available(),
    });

  let mockRepo: jest.Mocked<ITableRepository>;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByTableNumber: jest.fn(),
      findAvailableTables: jest.fn(),
      findByCapacity: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  describe('GetTableUseCase', () => {
    it('returns a table belonging to the tenant', async () => {
      mockRepo.findById.mockResolvedValue(makeTable('rest-1'));

      const useCase = new GetTableUseCase(mockRepo);
      const result = await useCase.execute('table-1', tenant);

      expect(result.id).toBe('table-1');
      expect(result.tableNumber).toBe(5);
    });

    it("blocks another tenant's table with Forbidden", async () => {
      mockRepo.findById.mockResolvedValue(makeTable('rest-2'));

      const useCase = new GetTableUseCase(mockRepo);

      await expect(useCase.execute('table-1', tenant)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('throws NotFound for a missing table', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const useCase = new GetTableUseCase(mockRepo);

      await expect(useCase.execute('missing', tenant)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('UpdateTableUseCase', () => {
    it('updates capacity and status', async () => {
      mockRepo.findById.mockResolvedValue(makeTable('rest-1'));
      mockRepo.update.mockImplementation(async (t) => t);

      const useCase = new UpdateTableUseCase(mockRepo);
      const result = await useCase.execute(
        'table-1',
        { capacity: 6, status: 'unavailable' },
        tenant
      );

      expect(result.capacity).toBe(6);
      expect(result.status).toBe('unavailable');
      expect(result.tableNumber).toBe(5);
    });

    it('rejects renumbering onto an existing table with Conflict', async () => {
      mockRepo.findById.mockResolvedValue(makeTable('rest-1'));
      mockRepo.findByTableNumber.mockResolvedValue(
        new Table({
          id: 'table-2',
          restaurantId: 'rest-1',
          tableNumber: 7,
          capacity: 2,
          status: TableStatus.available(),
        })
      );

      const useCase = new UpdateTableUseCase(mockRepo);

      await expect(
        useCase.execute('table-1', { tableNumber: 7 }, tenant)
      ).rejects.toThrow(ConflictException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('allows keeping the same table number', async () => {
      mockRepo.findById.mockResolvedValue(makeTable('rest-1'));
      mockRepo.update.mockImplementation(async (t) => t);

      const useCase = new UpdateTableUseCase(mockRepo);
      const result = await useCase.execute(
        'table-1',
        { tableNumber: 5, capacity: 8 },
        tenant
      );

      expect(result.capacity).toBe(8);
      expect(mockRepo.findByTableNumber).not.toHaveBeenCalled();
    });

    it("blocks updating another tenant's table", async () => {
      mockRepo.findById.mockResolvedValue(makeTable('rest-2'));

      const useCase = new UpdateTableUseCase(mockRepo);

      await expect(
        useCase.execute('table-1', { capacity: 6 }, tenant)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DeleteTableUseCase', () => {
    it('deletes a table belonging to the tenant', async () => {
      mockRepo.findById.mockResolvedValue(makeTable('rest-1'));

      const useCase = new DeleteTableUseCase(mockRepo);
      await useCase.execute('table-1', tenant);

      expect(mockRepo.delete).toHaveBeenCalledWith('rest-1', 'table-1');
    });

    it("blocks deleting another tenant's table", async () => {
      mockRepo.findById.mockResolvedValue(makeTable('rest-2'));

      const useCase = new DeleteTableUseCase(mockRepo);

      await expect(useCase.execute('table-1', tenant)).rejects.toThrow(
        ForbiddenException
      );
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });
});
