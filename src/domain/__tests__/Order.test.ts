import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { OrderStatus } from '../value-objects/OrderStatus';

describe('Order', () => {
  const makeItem = (quantity: number, unitPriceCents: number) =>
    new OrderItem({
      menuItemId: 'menu-1',
      itemName: 'Margherita',
      quantity,
      unitPriceCents,
    });

  const makeOrder = (items: OrderItem[], extras?: Partial<{ taxCents: number; tipCents: number }>) =>
    new Order({
      restaurantId: 'rest-1',
      reservationId: 'res-1',
      status: OrderStatus.open(),
      items,
      ...extras,
    });

  it('derives line totals, subtotal and total as integer cents', () => {
    const order = makeOrder(
      [makeItem(2, 1250), makeItem(3, 995)],
      { taxCents: 371, tipCents: 500 }
    );

    expect(order.items[0].lineTotalCents).toBe(2500);
    expect(order.items[1].lineTotalCents).toBe(2985);
    expect(order.subtotalCents).toBe(5485);
    expect(order.totalCents).toBe(5485 + 371 + 500);
    expect(Number.isInteger(order.totalCents)).toBe(true);
  });

  it('defaults tax and tip to zero', () => {
    const order = makeOrder([makeItem(1, 700)]);

    expect(order.taxCents).toBe(0);
    expect(order.tipCents).toBe(0);
    expect(order.totalCents).toBe(700);
  });

  it('rejects an order with no items', () => {
    expect(() => makeOrder([])).toThrow(
      'An order must contain at least one item'
    );
  });

  it('rejects fractional-cent tips', () => {
    expect(() =>
      makeOrder([makeItem(1, 700)], { tipCents: 10.5 })
    ).toThrow('Tip must be a non-negative integer amount in cents');
  });

  it('rejects fractional-cent unit prices on items', () => {
    expect(() => makeItem(1, 9.99)).toThrow(
      'Unit price must be a non-negative integer amount in cents'
    );
  });

  it('rejects non-integer quantities', () => {
    expect(() => makeItem(1.5, 700)).toThrow(
      'Quantity must be a positive integer'
    );
  });
});
