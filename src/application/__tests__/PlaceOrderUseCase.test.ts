import { PlaceOrderUseCase } from '../use-cases/PlaceOrderUseCase';
import { TenantContext } from '../common/TenantContext';
import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { IMenuItemRepository } from '@domain/repositories/IMenuItemRepository';
import { Reservation } from '@domain/entities/Reservation';
import { MenuItem } from '@domain/entities/MenuItem';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import { Email } from '@domain/value-objects/Email';
import {
  EntityNotFoundException,
  ForbiddenException,
  InvalidOperationException,
} from '@domain/exceptions/DomainException';

describe('PlaceOrderUseCase', () => {
  const tenant: TenantContext = {
    userId: 'user-1',
    restaurantId: 'rest-1',
    role: 'staff',
  };

  const makeReservation = (
    restaurantId = 'rest-1',
    status = ReservationStatus.confirmed()
  ) =>
    new Reservation({
      id: 'res-1',
      restaurantId,
      tableId: 'table-1',
      guestName: 'John Doe',
      guestEmail: new Email('john@example.com'),
      startsAt: new Date('2026-12-25T23:30:00.000Z'),
      partySize: 4,
      status,
    });

  const makeMenuItem = (
    id: string,
    priceCents: number,
    overrides?: Partial<{ restaurantId: string; isAvailable: boolean }>
  ) =>
    new MenuItem({
      id,
      restaurantId: overrides?.restaurantId ?? 'rest-1',
      name: `Item ${id}`,
      category: 'Mains',
      priceCents,
      isAvailable: overrides?.isAvailable ?? true,
    });

  let mockOrderRepo: jest.Mocked<IOrderRepository>;
  let mockReservationRepo: jest.Mocked<IReservationRepository>;
  let mockMenuItemRepo: jest.Mocked<IMenuItemRepository>;
  let useCase: PlaceOrderUseCase;

  beforeEach(() => {
    mockOrderRepo = {
      save: jest.fn().mockImplementation(async (order) => order),
      findById: jest.fn(),
      findByReservationId: jest.fn(),
      findAll: jest.fn(),
    };
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
    mockMenuItemRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new PlaceOrderUseCase(
      mockOrderRepo,
      mockReservationRepo,
      mockMenuItemRepo
    );
  });

  it('places an order with items against a reservation', async () => {
    mockReservationRepo.findById.mockResolvedValue(makeReservation());
    mockMenuItemRepo.findById.mockImplementation(async (id) =>
      id === 'menu-1' ? makeMenuItem('menu-1', 1250) : makeMenuItem('menu-2', 995)
    );

    const result = await useCase.execute(
      {
        reservationId: 'res-1',
        items: [
          { menuItemId: 'menu-1', quantity: 2 },
          { menuItemId: 'menu-2', quantity: 3, notes: 'no onions' },
        ],
        tipCents: 500,
      },
      tenant
    );

    expect(result.reservationId).toBe('res-1');
    expect(result.tableId).toBe('table-1');
    expect(result.status).toBe('open');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].lineTotalCents).toBe(2500);
    expect(result.items[1].lineTotalCents).toBe(2985);
    expect(result.subtotalCents).toBe(5485);
    expect(result.tipCents).toBe(500);
    expect(result.totalCents).toBe(5985);
    expect(mockOrderRepo.save).toHaveBeenCalledTimes(1);
  });

  it('snapshots the menu item name and price at order time', async () => {
    mockReservationRepo.findById.mockResolvedValue(makeReservation());
    mockMenuItemRepo.findById.mockResolvedValue(makeMenuItem('menu-1', 1250));

    const result = await useCase.execute(
      { reservationId: 'res-1', items: [{ menuItemId: 'menu-1', quantity: 1 }] },
      tenant
    );

    expect(result.items[0].itemName).toBe('Item menu-1');
    expect(result.items[0].unitPriceCents).toBe(1250);
  });

  it('throws NotFound for a missing reservation', async () => {
    mockReservationRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        { reservationId: 'missing', items: [{ menuItemId: 'menu-1', quantity: 1 }] },
        tenant
      )
    ).rejects.toThrow(EntityNotFoundException);
  });

  it("blocks ordering against another tenant's reservation", async () => {
    mockReservationRepo.findById.mockResolvedValue(makeReservation('rest-2'));

    await expect(
      useCase.execute(
        { reservationId: 'res-1', items: [{ menuItemId: 'menu-1', quantity: 1 }] },
        tenant
      )
    ).rejects.toThrow(ForbiddenException);
    expect(mockOrderRepo.save).not.toHaveBeenCalled();
  });

  it('rejects ordering against a cancelled reservation', async () => {
    mockReservationRepo.findById.mockResolvedValue(
      makeReservation('rest-1', ReservationStatus.cancelled())
    );

    await expect(
      useCase.execute(
        { reservationId: 'res-1', items: [{ menuItemId: 'menu-1', quantity: 1 }] },
        tenant
      )
    ).rejects.toThrow(InvalidOperationException);
  });

  it('throws NotFound for a missing menu item', async () => {
    mockReservationRepo.findById.mockResolvedValue(makeReservation());
    mockMenuItemRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        { reservationId: 'res-1', items: [{ menuItemId: 'missing', quantity: 1 }] },
        tenant
      )
    ).rejects.toThrow(EntityNotFoundException);
    expect(mockOrderRepo.save).not.toHaveBeenCalled();
  });

  it("blocks ordering another tenant's menu item", async () => {
    mockReservationRepo.findById.mockResolvedValue(makeReservation());
    mockMenuItemRepo.findById.mockResolvedValue(
      makeMenuItem('menu-1', 1250, { restaurantId: 'rest-2' })
    );

    await expect(
      useCase.execute(
        { reservationId: 'res-1', items: [{ menuItemId: 'menu-1', quantity: 1 }] },
        tenant
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects unavailable menu items', async () => {
    mockReservationRepo.findById.mockResolvedValue(makeReservation());
    mockMenuItemRepo.findById.mockResolvedValue(
      makeMenuItem('menu-1', 1250, { isAvailable: false })
    );

    await expect(
      useCase.execute(
        { reservationId: 'res-1', items: [{ menuItemId: 'menu-1', quantity: 1 }] },
        tenant
      )
    ).rejects.toThrow(InvalidOperationException);
    expect(mockOrderRepo.save).not.toHaveBeenCalled();
  });
});
