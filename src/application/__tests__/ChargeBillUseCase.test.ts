import { ChargeBillUseCase } from '../use-cases/ChargeBillUseCase';
import { TenantContext } from '../common/TenantContext';
import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { IPaymentRepository } from '@domain/repositories/IPaymentRepository';
import { IPaymentProvider } from '../ports/IPaymentProvider';
import { Order } from '@domain/entities/Order';
import { OrderItem } from '@domain/entities/OrderItem';
import { OrderStatus } from '@domain/value-objects/OrderStatus';
import { Payment } from '@domain/entities/Payment';
import { PaymentStatus } from '@domain/value-objects/PaymentStatus';
import {
  ConflictException,
  EntityNotFoundException,
  ForbiddenException,
  InvalidOperationException,
} from '@domain/exceptions/DomainException';

describe('ChargeBillUseCase', () => {
  let useCase: ChargeBillUseCase;
  let mockPaymentRepo: jest.Mocked<IPaymentRepository>;
  let mockOrderRepo: jest.Mocked<IOrderRepository>;
  let mockProvider: jest.Mocked<IPaymentProvider>;

  const tenant: TenantContext = {
    userId: 'user-1',
    restaurantId: 'rest-1',
    role: 'owner',
  };

  const makeOrder = (
    overrides: { restaurantId?: string; status?: OrderStatus } = {}
  ) =>
    new Order({
      id: 'order-1',
      restaurantId: overrides.restaurantId ?? 'rest-1',
      reservationId: 'res-1',
      tableId: 't-1',
      status: overrides.status ?? OrderStatus.open(),
      items: [
        new OrderItem({
          menuItemId: 'menu-1',
          itemName: 'Margherita',
          quantity: 2,
          unitPriceCents: 1250,
        }),
      ],
      taxCents: 200,
      tipCents: 300,
    });

  const makePayment = (status: PaymentStatus) =>
    new Payment({
      restaurantId: 'rest-1',
      orderId: 'order-1',
      amountCents: 3000,
      method: 'card',
      status,
    });

  beforeEach(() => {
    mockPaymentRepo = {
      save: jest.fn().mockImplementation(async (p) => p),
      findById: jest.fn(),
      findByExternalRef: jest.fn(),
      findByOrderId: jest.fn().mockResolvedValue([]),
      hasProcessedEvent: jest.fn(),
      settleWithEventDedupe: jest.fn(),
    };

    mockOrderRepo = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(makeOrder()),
      findByReservationId: jest.fn(),
      findAll: jest.fn(),
    };

    mockProvider = {
      createCharge: jest.fn().mockResolvedValue({ externalRef: 'ch_mock_1' }),
    };

    useCase = new ChargeBillUseCase(
      mockPaymentRepo,
      mockOrderRepo,
      mockProvider
    );
  });

  it('charges the bill through the provider and stores a pending payment', async () => {
    const result = await useCase.execute('order-1', {}, tenant);

    // 2 × 1250 + 200 tax + 300 tip
    expect(result.amountCents).toBe(3000);
    expect(result.tipCents).toBe(300);
    expect(result.status).toBe('pending');
    expect(result.externalRef).toBe('ch_mock_1');
    expect(result.method).toBe('card');
    expect(mockProvider.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        restaurantId: 'rest-1',
        amountCents: 3000,
      })
    );
    const saved = mockPaymentRepo.save.mock.calls[0][0];
    expect(saved.externalRef).toBe('ch_mock_1');
    expect(saved.status.isPending()).toBe(true);
  });

  it('honours the requested payment method', async () => {
    const result = await useCase.execute('order-1', { method: 'online' }, tenant);

    expect(result.method).toBe('online');
  });

  it('throws when the order does not exist', async () => {
    mockOrderRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', {}, tenant)).rejects.toThrow(
      EntityNotFoundException
    );
    expect(mockProvider.createCharge).not.toHaveBeenCalled();
  });

  it("rejects charging another restaurant's order", async () => {
    mockOrderRepo.findById.mockResolvedValue(
      makeOrder({ restaurantId: 'rest-other' })
    );

    await expect(useCase.execute('order-1', {}, tenant)).rejects.toThrow(
      ForbiddenException
    );
    expect(mockProvider.createCharge).not.toHaveBeenCalled();
  });

  it('refuses to charge a cancelled order', async () => {
    mockOrderRepo.findById.mockResolvedValue(
      makeOrder({ status: OrderStatus.cancelled() })
    );

    await expect(useCase.execute('order-1', {}, tenant)).rejects.toThrow(
      InvalidOperationException
    );
    expect(mockProvider.createCharge).not.toHaveBeenCalled();
  });

  it.each([
    ['pending', PaymentStatus.pending()],
    ['succeeded', PaymentStatus.succeeded()],
  ])(
    'rejects a second charge while a %s payment exists',
    async (_label, status) => {
      mockPaymentRepo.findByOrderId.mockResolvedValue([makePayment(status)]);

      await expect(useCase.execute('order-1', {}, tenant)).rejects.toThrow(
        ConflictException
      );
      expect(mockProvider.createCharge).not.toHaveBeenCalled();
    }
  );

  it('allows retrying after a failed payment', async () => {
    mockPaymentRepo.findByOrderId.mockResolvedValue([
      makePayment(PaymentStatus.failed()),
    ]);

    const result = await useCase.execute('order-1', {}, tenant);

    expect(result.status).toBe('pending');
    expect(mockProvider.createCharge).toHaveBeenCalledTimes(1);
  });
});
