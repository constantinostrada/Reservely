import { CreateRestaurantUseCase } from '../use-cases/CreateRestaurantUseCase';
import { GetRestaurantUseCase } from '../use-cases/GetRestaurantUseCase';
import { UpdateRestaurantUseCase } from '../use-cases/UpdateRestaurantUseCase';
import { DeleteRestaurantUseCase } from '../use-cases/DeleteRestaurantUseCase';
import { TenantContext } from '../common/TenantContext';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { Restaurant } from '@domain/entities/Restaurant';
import {
  ConflictException,
  EntityNotFoundException,
  ForbiddenException,
  ValidationException,
} from '@domain/exceptions/DomainException';

describe('restaurant CRUD use cases', () => {
  const owner: TenantContext = {
    userId: 'user-1',
    restaurantId: 'rest-1',
    role: 'owner',
  };
  const staff: TenantContext = { ...owner, role: 'staff' };

  const makeRestaurant = (id: string) =>
    new Restaurant({
      id,
      name: 'La Trattoria',
      slug: 'la-trattoria',
      timezone: 'America/New_York',
      currency: 'USD',
    });

  let mockRepo: jest.Mocked<IRestaurantRepository>;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  describe('CreateRestaurantUseCase', () => {
    it('creates a restaurant and returns its DTO', async () => {
      mockRepo.findBySlug.mockResolvedValue(null);
      mockRepo.save.mockImplementation(async (r) => r);

      const useCase = new CreateRestaurantUseCase(mockRepo);
      const result = await useCase.execute({
        name: 'La Trattoria',
        slug: 'la-trattoria',
      });

      expect(result.slug).toBe('la-trattoria');
      expect(result.timezone).toBe('UTC');
      expect(result.currency).toBe('USD');
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('rejects a duplicate slug with Conflict', async () => {
      mockRepo.findBySlug.mockResolvedValue(makeRestaurant('rest-9'));

      const useCase = new CreateRestaurantUseCase(mockRepo);

      await expect(
        useCase.execute({ name: 'Copy', slug: 'la-trattoria' })
      ).rejects.toThrow(ConflictException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an invalid slug with Validation', async () => {
      mockRepo.findBySlug.mockResolvedValue(null);

      const useCase = new CreateRestaurantUseCase(mockRepo);

      await expect(
        useCase.execute({ name: 'Bad Slug', slug: 'Not A Slug!' })
      ).rejects.toThrow(ValidationException);
    });
  });

  describe('GetRestaurantUseCase', () => {
    it('returns the caller-owned restaurant', async () => {
      mockRepo.findById.mockResolvedValue(makeRestaurant('rest-1'));

      const useCase = new GetRestaurantUseCase(mockRepo);
      const result = await useCase.execute('rest-1', owner);

      expect(result.id).toBe('rest-1');
    });

    it("blocks another tenant's restaurant with Forbidden", async () => {
      mockRepo.findById.mockResolvedValue(makeRestaurant('rest-2'));

      const useCase = new GetRestaurantUseCase(mockRepo);

      await expect(useCase.execute('rest-2', owner)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('throws NotFound for a missing restaurant', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const useCase = new GetRestaurantUseCase(mockRepo);

      await expect(useCase.execute('missing', owner)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('UpdateRestaurantUseCase', () => {
    it('applies a partial update and keeps the slug', async () => {
      mockRepo.findById.mockResolvedValue(makeRestaurant('rest-1'));
      mockRepo.update.mockImplementation(async (r) => r);

      const useCase = new UpdateRestaurantUseCase(mockRepo);
      const result = await useCase.execute(
        'rest-1',
        { name: 'La Trattoria Nueva', currency: 'EUR' },
        owner
      );

      expect(result.name).toBe('La Trattoria Nueva');
      expect(result.currency).toBe('EUR');
      expect(result.slug).toBe('la-trattoria');
      expect(result.timezone).toBe('America/New_York');
    });

    it("blocks updating another tenant's restaurant", async () => {
      mockRepo.findById.mockResolvedValue(makeRestaurant('rest-2'));

      const useCase = new UpdateRestaurantUseCase(mockRepo);

      await expect(
        useCase.execute('rest-2', { name: 'Hijacked' }, owner)
      ).rejects.toThrow(ForbiddenException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('DeleteRestaurantUseCase', () => {
    it('lets the owner delete their restaurant', async () => {
      mockRepo.findById.mockResolvedValue(makeRestaurant('rest-1'));

      const useCase = new DeleteRestaurantUseCase(mockRepo);
      await useCase.execute('rest-1', owner);

      expect(mockRepo.delete).toHaveBeenCalledWith('rest-1');
    });

    it('blocks non-owner roles with Forbidden', async () => {
      mockRepo.findById.mockResolvedValue(makeRestaurant('rest-1'));

      const useCase = new DeleteRestaurantUseCase(mockRepo);

      await expect(useCase.execute('rest-1', staff)).rejects.toThrow(
        ForbiddenException
      );
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });
});
