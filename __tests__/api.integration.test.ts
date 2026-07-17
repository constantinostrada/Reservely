/**
 * End-to-end API integration tests.
 *
 * These drive the real Next.js route handlers (auth middleware → validation →
 * controller → use case → Prisma repository) against a real Postgres instance,
 * exercising the full stack the way an HTTP client would. Only the payment
 * provider is a mock (as it is in production wiring); everything else is real,
 * including the transactional slot hold and the webhook idempotency table.
 *
 * Runs when INTEGRATION_DATABASE_URL is available (jest.setup.js captures the
 * URL loaded from .env before unit tests are pointed at a fake one). Set
 * SKIP_INTEGRATION=1 to skip explicitly.
 *
 * NOTE: the first import re-points DATABASE_URL at the real database and MUST
 * stay first — the route handlers it imports below construct the Prisma
 * singleton on load.
 */
import './support/useIntegrationDb';

import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { container } from '@infrastructure/di/container';

// Route handlers under test
import { POST as createRestaurant } from '@/app/api/restaurants/route';
import { POST as createTable } from '@/app/api/tables/route';
import { POST as createMenuItem } from '@/app/api/menu-items/route';
import { POST as createReservation } from '@/app/api/reservations/route';
import { GET as getReservation } from '@/app/api/reservations/[id]/route';
import { POST as confirmReservation } from '@/app/api/reservations/[id]/confirm/route';
import { POST as placeOrder, GET as listOrders } from '@/app/api/orders/route';
import { GET as getOrder } from '@/app/api/orders/[id]/route';
import { GET as splitBill } from '@/app/api/orders/[id]/split/route';
import { POST as chargeBill } from '@/app/api/orders/[id]/charge/route';
import { POST as paymentWebhook } from '@/app/api/webhooks/payments/route';

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const describeIntegration =
  databaseUrl && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

interface ApiResult<T = any> {
  status: number;
  body: T;
}

async function readJson<T = any>(res: Response): Promise<ApiResult<T>> {
  return { status: res.status, body: (await res.json()) as T };
}

// withAuth handlers always receive (request, context). Routes without path
// params ignore the context, so hand them an empty one.
const noCtx = {} as never;

describeIntegration('API integration (Postgres)', () => {
  // A direct client for fixtures/cleanup, mirroring the other integration
  // tests. The route handlers use their own singleton pointed at the same DB.
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const slug = `it-api-${suffix}`;
  // A fixed future date, safely inside the 11:00–22:00 service window in UTC.
  const date = '2030-06-15';

  let token: string;
  let restaurantId: string;
  let menuItemId: string;

  const authGet = (url: string) =>
    new NextRequest(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${token}` },
    });

  const authPost = (url: string, body?: unknown) =>
    new NextRequest(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  beforeAll(async () => {
    // Onboard a fresh tenant through the public endpoint.
    const created = await readJson(
      await createRestaurant(
        new NextRequest('http://localhost/api/restaurants', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: 'Integration API Bistro',
            slug,
            timezone: 'UTC',
            currency: 'USD',
          }),
        })
      )
    );
    expect(created.status).toBe(201);
    restaurantId = created.body.id;

    // Mint a tenant-scoped token the same way login would, using the app's own
    // token service so the auth middleware verifies it with the same secret.
    token = container.getTokenService().sign({
      userId: `it-user-${suffix}`,
      restaurantId,
      role: 'OWNER',
    });

    // A general-purpose table and a menu item priced so a 3-way split is uneven.
    const table = await readJson(
      await createTable(
        authPost('http://localhost/api/tables', {
          tableNumber: 1,
          capacity: 4,
          location: 'main room',
        }),
        noCtx
      )
    );
    expect(table.status).toBe(201);

    const menuItem = await readJson(
      await createMenuItem(
        authPost('http://localhost/api/menu-items', {
          name: 'House Special',
          category: 'mains',
          priceCents: 1000,
        }),
        noCtx
      )
    );
    expect(menuItem.status).toBe(201);
    menuItemId = menuItem.body.id;
  });

  afterAll(async () => {
    // Cascades to tables, reservations, orders, menu items, payments, events.
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  // Places a reservation at the given local time and returns its id.
  async function bookReservation(time: string): Promise<string> {
    const res = await readJson(
      await createReservation(
        authPost('http://localhost/api/reservations', {
          guestName: 'Ada Lovelace',
          guestEmail: 'ada@example.com',
          date,
          time,
          partySize: 2,
        }),
        noCtx
      )
    );
    expect(res.status).toBe(201);
    return res.body.id;
  }

  describe('Reservations', () => {
    it('creates, reads back, and confirms a reservation (happy path)', async () => {
      const create = await readJson(
        await createReservation(
          authPost('http://localhost/api/reservations', {
            guestName: 'Grace Hopper',
            guestEmail: 'grace@example.com',
            date,
            time: '18:00',
            partySize: 2,
            notes: 'Window seat',
          }),
          noCtx
        )
      );
      expect(create.status).toBe(201);
      expect(create.body.status).toBe('pending');
      expect(create.body.tableId).toBeTruthy();
      const reservationId = create.body.id;

      const fetched = await readJson(
        await getReservation(
          authGet(`http://localhost/api/reservations/${reservationId}`),
          { params: { id: reservationId } }
        )
      );
      expect(fetched.status).toBe(200);
      expect(fetched.body.id).toBe(reservationId);
      expect(fetched.body.guestName).toBe('Grace Hopper');

      const confirmed = await readJson(
        await confirmReservation(
          authPost(
            `http://localhost/api/reservations/${reservationId}/confirm`
          ),
          { params: { id: reservationId } }
        )
      );
      expect(confirmed.status).toBe(200);
      expect(confirmed.body.status).toBe('confirmed');
    });

    it('rejects a double-booking of the same table and slot with 409', async () => {
      // A dedicated table so we can pin both attempts to it and force the
      // conflict (auto-assign would otherwise fall through to another table).
      const table = await readJson(
        await createTable(
          authPost('http://localhost/api/tables', {
            tableNumber: 99,
            capacity: 4,
            location: 'contested',
          }),
          noCtx
        )
      );
      expect(table.status).toBe(201);
      const tableId = table.body.id;

      const payload = {
        guestName: 'First Guest',
        guestEmail: 'first@example.com',
        date,
        time: '19:00',
        partySize: 2,
        tableId,
      };

      const first = await readJson(
        await createReservation(
          authPost('http://localhost/api/reservations', payload),
          noCtx
        )
      );
      expect(first.status).toBe(201);

      const second = await readJson(
        await createReservation(
          authPost('http://localhost/api/reservations', {
            ...payload,
            guestName: 'Second Guest',
            guestEmail: 'second@example.com',
          }),
          noCtx
        )
      );
      expect(second.status).toBe(409);
      expect(second.body.error).toBe('Conflict');
    });
  });

  describe('Orders', () => {
    let reservationId: string;
    let orderId: string;

    beforeAll(async () => {
      reservationId = await bookReservation('12:00');
    });

    it('places an order against a live reservation with derived totals', async () => {
      const placed = await readJson(
        await placeOrder(
          authPost('http://localhost/api/orders', {
            reservationId,
            items: [{ menuItemId, quantity: 1 }],
          }),
          noCtx
        )
      );
      expect(placed.status).toBe(201);
      expect(placed.body.status).toBe('open');
      expect(placed.body.items).toHaveLength(1);
      expect(placed.body.items[0].itemName).toBe('House Special');
      expect(placed.body.items[0].unitPriceCents).toBe(1000);
      expect(placed.body.items[0].lineTotalCents).toBe(1000);
      expect(placed.body.subtotalCents).toBe(1000);
      expect(placed.body.totalCents).toBe(1000);
      orderId = placed.body.id;

      const fetched = await readJson(
        await getOrder(authGet(`http://localhost/api/orders/${orderId}`), {
          params: { id: orderId },
        })
      );
      expect(fetched.status).toBe(200);
      expect(fetched.body.id).toBe(orderId);

      const listed = await readJson(
        await listOrders(
          authGet(`http://localhost/api/orders?reservationId=${reservationId}`),
          noCtx
        )
      );
      expect(listed.status).toBe(200);
      expect(listed.body.total).toBe(1);
      expect(listed.body.orders[0].id).toBe(orderId);
    });

    it('splits a bill that does not divide evenly, shares summing to the total', async () => {
      const split = await readJson(
        await splitBill(
          authGet(`http://localhost/api/orders/${orderId}/split?ways=3`),
          { params: { id: orderId } }
        )
      );
      expect(split.status).toBe(200);
      expect(split.body.totalCents).toBe(1000);
      expect(split.body.ways).toBe(3);
      // 1000 / 3 → floor 333 each, the remaining cent to the first share.
      expect(split.body.shareCents).toEqual([334, 333, 333]);
      const sum = split.body.shareCents.reduce(
        (a: number, b: number) => a + b,
        0
      );
      expect(sum).toBe(split.body.totalCents);
    });
  });

  describe('Payments', () => {
    let orderId: string;
    let externalRef: string;

    beforeAll(async () => {
      const reservationId = await bookReservation('13:30');
      const placed = await readJson(
        await placeOrder(
          authPost('http://localhost/api/orders', {
            reservationId,
            items: [{ menuItemId, quantity: 2 }],
            tipCents: 300,
          }),
          noCtx
        )
      );
      expect(placed.status).toBe(201);
      orderId = placed.body.id;
    });

    it('charges a bill and settles it via a webhook exactly once (happy path)', async () => {
      const charge = await readJson(
        await chargeBill(
          authPost(`http://localhost/api/orders/${orderId}/charge`, {
            method: 'card',
          }),
          { params: { id: orderId } }
        )
      );
      expect(charge.status).toBe(201);
      expect(charge.body.status).toBe('pending');
      // Total is 2 × 1000 + 300 tip = 2300 cents.
      expect(charge.body.amountCents).toBe(2300);
      expect(charge.body.externalRef).toBeTruthy();
      externalRef = charge.body.externalRef;

      const eventId = `evt_it_${suffix}_ok`;
      const settle = await readJson(
        await paymentWebhook(
          new NextRequest('http://localhost/api/webhooks/payments', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              id: eventId,
              type: 'payment.succeeded',
              data: { externalRef },
            }),
          })
        )
      );
      expect(settle.status).toBe(200);
      expect(settle.body.applied).toBe(true);
      expect(settle.body.payment.status).toBe('succeeded');

      // Replaying the same event id is idempotent: nothing is applied again.
      const replay = await readJson(
        await paymentWebhook(
          new NextRequest('http://localhost/api/webhooks/payments', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              id: eventId,
              type: 'payment.succeeded',
              data: { externalRef },
            }),
          })
        )
      );
      expect(replay.status).toBe(200);
      expect(replay.body.applied).toBe(false);
      expect(replay.body.payment.status).toBe('succeeded');
    });

    it('rejects a second charge on an already-charged order with 409', async () => {
      const recharge = await readJson(
        await chargeBill(
          authPost(`http://localhost/api/orders/${orderId}/charge`, {}),
          { params: { id: orderId } }
        )
      );
      expect(recharge.status).toBe(409);
      expect(recharge.body.error).toBe('Conflict');
    });
  });
});
