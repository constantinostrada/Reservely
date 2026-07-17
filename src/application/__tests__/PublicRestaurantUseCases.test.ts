import { ListPublicRestaurantsUseCase } from '../use-cases/ListPublicRestaurantsUseCase';
import { GetPublicRestaurantUseCase } from '../use-cases/GetPublicRestaurantUseCase';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { Restaurant } from '@domain/entities/Restaurant';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';

describe('public restaurant use cases', () => {
  const makeRestaurant = (id: string, slug: string) =>
    new Restaurant({
      id,
      name: slug,
      slug,
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

  describe('ListPublicRestaurantsUseCase', () => {
    it('lists every restaurant, cross-tenant, for the public directory', async () => {
      mockRepo.findAll.mockResolvedValue([
        makeRestaurant('rest-1', 'harbor-diner'),
        makeRestaurant('rest-2', 'trattoria-bella'),
      ]);

      const useCase = new ListPublicRestaurantsUseCase(mockRepo);
      const result = await useCase.execute();

      expect(result.total).toBe(2);
      expect(result.restaurants.map((r) => r.slug)).toEqual([
        'harbor-diner',
        'trattoria-bella',
      ]);
      expect(mockRepo.findAll).toHaveBeenCalledTimes(1);
    });

    it('returns an empty list when there are no restaurants', async () => {
      mockRepo.findAll.mockResolvedValue([]);

      const useCase = new ListPublicRestaurantsUseCase(mockRepo);
      const result = await useCase.execute();

      expect(result.total).toBe(0);
      expect(result.restaurants).toEqual([]);
    });
  });

  describe('GetPublicRestaurantUseCase', () => {
    it('returns the restaurant DTO by id with no tenant check', async () => {
      mockRepo.findById.mockResolvedValue(
        makeRestaurant('rest-1', 'harbor-diner')
      );

      const useCase = new GetPublicRestaurantUseCase(mockRepo);
      const result = await useCase.execute('rest-1');

      expect(result.id).toBe('rest-1');
      expect(result.slug).toBe('harbor-diner');
    });

    it('throws EntityNotFound for an unknown restaurant', async () => {
      mockRepo.findById.mockResolvedValue(null);

      const useCase = new GetPublicRestaurantUseCase(mockRepo);

      await expect(useCase.execute('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
