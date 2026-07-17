import { CreateMenuItemUseCase } from '../use-cases/CreateMenuItemUseCase';
import { GetMenuItemUseCase } from '../use-cases/GetMenuItemUseCase';
import { UpdateMenuItemUseCase } from '../use-cases/UpdateMenuItemUseCase';
import { DeleteMenuItemUseCase } from '../use-cases/DeleteMenuItemUseCase';
import { TenantContext } from '../common/TenantContext';
import { IMenuItemRepository } from '@domain/repositories/IMenuItemRepository';
import { MenuItem } from '@domain/entities/MenuItem';
import {
  ConflictException,
  EntityNotFoundException,
  ForbiddenException,
} from '@domain/exceptions/DomainException';

describe('menu item CRUD use cases', () => {
  const tenant: TenantContext = {
    userId: 'user-1',
    restaurantId: 'rest-1',
    role: 'manager',
  };

  const makeMenuItem = (restaurantId: string) =>
    new MenuItem({
      id: 'menu-1',
      restaurantId,
      name: 'Margherita',
      category: 'Pizza',
      priceCents: 1250,
      isAvailable: true,
    });

  let mockRepo: jest.Mocked<IMenuItemRepository>;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  describe('CreateMenuItemUseCase', () => {
    it('creates a menu item scoped to the tenant', async () => {
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.save.mockImplementation(async (item) => item);

      const useCase = new CreateMenuItemUseCase(mockRepo);
      const result = await useCase.execute(
        { name: 'Margherita', category: 'Pizza', priceCents: 1250 },
        tenant
      );

      expect(result.restaurantId).toBe('rest-1');
      expect(result.priceCents).toBe(1250);
      expect(result.isAvailable).toBe(true);
    });

    it('rejects a duplicate name with Conflict', async () => {
      mockRepo.findByName.mockResolvedValue(makeMenuItem('rest-1'));

      const useCase = new CreateMenuItemUseCase(mockRepo);

      await expect(
        useCase.execute(
          { name: 'Margherita', category: 'Pizza', priceCents: 1250 },
          tenant
        )
      ).rejects.toThrow(ConflictException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('GetMenuItemUseCase', () => {
    it('returns a menu item belonging to the tenant', async () => {
      mockRepo.findById.mockResolvedValue(makeMenuItem('rest-1'));

      const useCase = new GetMenuItemUseCase(mockRepo);
      const result = await useCase.execute('menu-1', tenant);

      expect(result.id).toBe('menu-1');
      expect(result.name).toBe('Margherita');
    });

    it("blocks another tenant's menu item with Forbidden", async () => {
      mockRepo.findById.mockResolvedValue(makeMenuItem('rest-2'));

      const useCase = new GetMenuItemUseCase(mockRepo);

      await expect(useCase.execute('menu-1', tenant)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('throws NotFound for a missing menu item', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const useCase = new GetMenuItemUseCase(mockRepo);

      await expect(useCase.execute('missing', tenant)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('UpdateMenuItemUseCase', () => {
    it('updates price and availability', async () => {
      mockRepo.findById.mockResolvedValue(makeMenuItem('rest-1'));
      mockRepo.update.mockImplementation(async (item) => item);

      const useCase = new UpdateMenuItemUseCase(mockRepo);
      const result = await useCase.execute(
        'menu-1',
        { priceCents: 1400, isAvailable: false },
        tenant
      );

      expect(result.priceCents).toBe(1400);
      expect(result.isAvailable).toBe(false);
      expect(result.name).toBe('Margherita');
    });

    it('rejects renaming onto an existing item with Conflict', async () => {
      mockRepo.findById.mockResolvedValue(makeMenuItem('rest-1'));
      mockRepo.findByName.mockResolvedValue(
        new MenuItem({
          id: 'menu-2',
          restaurantId: 'rest-1',
          name: 'Diavola',
          category: 'Pizza',
          priceCents: 1450,
          isAvailable: true,
        })
      );

      const useCase = new UpdateMenuItemUseCase(mockRepo);

      await expect(
        useCase.execute('menu-1', { name: 'Diavola' }, tenant)
      ).rejects.toThrow(ConflictException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('DeleteMenuItemUseCase', () => {
    it('deletes a menu item belonging to the tenant', async () => {
      mockRepo.findById.mockResolvedValue(makeMenuItem('rest-1'));

      const useCase = new DeleteMenuItemUseCase(mockRepo);
      await useCase.execute('menu-1', tenant);

      expect(mockRepo.delete).toHaveBeenCalledWith('rest-1', 'menu-1');
    });

    it("blocks deleting another tenant's menu item", async () => {
      mockRepo.findById.mockResolvedValue(makeMenuItem('rest-2'));

      const useCase = new DeleteMenuItemUseCase(mockRepo);

      await expect(useCase.execute('menu-1', tenant)).rejects.toThrow(
        ForbiddenException
      );
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });
});
