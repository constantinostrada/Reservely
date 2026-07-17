import { SplitBillUseCase } from '../use-cases/SplitBillUseCase';
import { TenantContext } from '../common/TenantContext';
import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { Order } from '@domain/entities/Order';
import { OrderItem } from '@domain/entities/OrderItem';
import { OrderStatus } from '@domain/value-objects/OrderStatus';
import { BillSplitService } from '@domain/services/BillSplitService';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@domain/exceptions/DomainException';

describe('SplitBillUseCase', () => {
  const tenant: TenantContext = {
    userId: 'user-1',
    restaurantId: 'rest-1',
    role: 'staff',
  };

  // subtotal 1000 (a non-divisible classic), no tax, no tip → total 1000
  const makeOrder = (
    restaurantId = 'rest-1',
    extras?: Partial<{ taxCents: number; tipCents: number }>
  ) =>
    new Order({
      id: 'order-1',
      restaurantId,
      reservationId: 'res-1',
      status: OrderStatus.open(),
      items: [
        new OrderItem({
          menuItemId: 'menu-1',
          itemName: 'Set menu',
          quantity: 1,
          unitPriceCents: 1000,
        }),
      ],
      ...extras,
    });

  let mockRepo: jest.Mocked<IOrderRepository>;
  let useCase: SplitBillUseCase;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByReservationId: jest.fn(),
      findAll: jest.fn(),
    };
    useCase = new SplitBillUseCase(mockRepo, new BillSplitService());
  });

  it('splits a non-divisible total so the shares sum back exactly', async () => {
    mockRepo.findById.mockResolvedValue(makeOrder());

    const result = await useCase.execute('order-1', 3, tenant);

    expect(result.totalCents).toBe(1000);
    expect(result.shareCents).toEqual([334, 333, 333]);
    expect(result.shareCents.reduce((sum, s) => sum + s, 0)).toBe(
      result.totalCents
    );
  });

  it('splits the full total including tax and tip', async () => {
    mockRepo.findById.mockResolvedValue(
      makeOrder('rest-1', { taxCents: 80, tipCents: 150 })
    );

    const result = await useCase.execute('order-1', 4, tenant);

    expect(result.subtotalCents).toBe(1000);
    expect(result.taxCents).toBe(80);
    expect(result.tipCents).toBe(150);
    expect(result.totalCents).toBe(1230);
    expect(result.shareCents).toEqual([308, 308, 307, 307]);
    expect(result.shareCents.reduce((sum, s) => sum + s, 0)).toBe(1230);
  });

  it('returns a single share equal to the total for 1 way', async () => {
    mockRepo.findById.mockResolvedValue(makeOrder());

    const result = await useCase.execute('order-1', 1, tenant);

    expect(result.shareCents).toEqual([1000]);
  });

  it('throws NotFound for a missing order', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', 2, tenant)).rejects.toThrow(
      EntityNotFoundException
    );
  });

  it("blocks splitting another tenant's order", async () => {
    mockRepo.findById.mockResolvedValue(makeOrder('rest-2'));

    await expect(useCase.execute('order-1', 2, tenant)).rejects.toThrow(
      ForbiddenException
    );
  });
});
