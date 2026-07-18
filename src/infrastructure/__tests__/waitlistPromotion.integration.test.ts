/**
 * Integration test for concurrency-safe waitlist promotion against a real
 * Postgres instance. Proves the B11 acceptance criterion: when two
 * cancellations free space for the same slot at the same time, a single
 * waiting entry is promoted exactly once — never twice.
 *
 * Runs when INTEGRATION_DATABASE_URL is available (jest.setup.js captures the
 * URL loaded from .env before unit tests are pointed at a fake one). Set
 * SKIP_INTEGRATION=1 to skip explicitly.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaWaitlistRepository } from '../repositories/PrismaWaitlistRepository';
import { WaitlistEntry } from '@domain/entities/WaitlistEntry';
import { Email } from '@domain/value-objects/Email';
import { WaitlistStatus } from '@domain/value-objects/WaitlistStatus';

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const describeIntegration =
  databaseUrl && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('PrismaWaitlistRepository.promoteNextForFreedSlot (Postgres)', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const repository = new PrismaWaitlistRepository(prisma);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const restaurantId = `wl-rest-${suffix}`;
  const tableA = `wl-table-a-${suffix}`;
  const tableB = `wl-table-b-${suffix}`;

  const startsAt = new Date('2099-03-10T18:00:00.000Z');
  const endsAt = new Date(startsAt.getTime() + 90 * 60_000);
  const freedSlotA = { restaurantId, tableId: tableA, startsAt, endsAt };
  const freedSlotB = { restaurantId, tableId: tableB, startsAt, endsAt };

  const makeEntry = (guest: string, partySize = 2) =>
    new WaitlistEntry({
      restaurantId,
      guestName: guest,
      guestEmail: new Email(`${guest.replace(/\s+/g, '.').toLowerCase()}@example.com`),
      partySize,
      startsAt,
      endsAt,
      status: WaitlistStatus.waiting(),
    });

  // Two cancelled reservations (one per table) stand in for the space that two
  // simultaneous cancellations just freed for this slot.
  const seedCancelledReservations = async () => {
    for (const tableId of [tableA, tableB]) {
      await prisma.reservation.create({
        data: {
          restaurantId,
          tableId,
          guestName: 'Cancelled Guest',
          guestEmail: 'cancelled@example.com',
          partySize: 2,
          startsAt,
          endsAt,
          status: 'CANCELLED',
        },
      });
    }
  };

  beforeAll(async () => {
    await prisma.restaurant.create({
      data: {
        id: restaurantId,
        name: 'Waitlist Test Bistro',
        slug: `wl-bistro-${suffix}`,
        timezone: 'America/New_York',
      },
    });
    await prisma.table.createMany({
      data: [
        { id: tableA, restaurantId, number: 901, capacity: 4 },
        { id: tableB, restaurantId, number: 902, capacity: 4 },
      ],
    });
  });

  afterAll(async () => {
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.waitlistEntry.deleteMany({ where: { restaurantId } });
    await prisma.reservation.deleteMany({ where: { restaurantId } });
  });

  it('promotes a single waiting entry exactly once under two concurrent freed slots', async () => {
    await seedCancelledReservations();
    const entry = await repository.save(makeEntry('Solo Waiter'));

    // Two cancellations free space for the same slot at the same instant.
    const results = await Promise.allSettled([
      repository.promoteNextForFreedSlot(freedSlotA),
      repository.promoteNextForFreedSlot(freedSlotB),
    ]);

    const promotions = results
      .filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof repository.promoteNextForFreedSlot>>> =>
          r.status === 'fulfilled'
      )
      .map((r) => r.value);

    // Exactly one call promoted the entry; the other found no one waiting.
    const successful = promotions.filter((p) => p !== null);
    const empty = promotions.filter((p) => p === null);
    expect(successful).toHaveLength(1);
    expect(empty).toHaveLength(1);
    expect(successful[0]!.entry.id).toBe(entry.id);

    // The database agrees: the entry is promoted once, one confirmed
    // reservation exists for the slot, and they are linked.
    const promotedEntries = await prisma.waitlistEntry.findMany({
      where: { restaurantId, status: 'PROMOTED' },
    });
    expect(promotedEntries).toHaveLength(1);
    expect(promotedEntries[0].id).toBe(entry.id);

    const confirmed = await prisma.reservation.findMany({
      where: { restaurantId, status: 'CONFIRMED', startsAt },
    });
    expect(confirmed).toHaveLength(1);
    expect(promotedEntries[0].promotedReservationId).toBe(confirmed[0].id);
    // Promotion landed on one of the two freed tables.
    expect([tableA, tableB]).toContain(confirmed[0].tableId);
  }, 30_000);

  it('promotes two waiting entries — one per freed table — never the same one twice', async () => {
    await seedCancelledReservations();
    const first = await repository.save(makeEntry('First Waiter'));
    const second = await repository.save(makeEntry('Second Waiter'));

    const results = await Promise.all([
      repository.promoteNextForFreedSlot(freedSlotA),
      repository.promoteNextForFreedSlot(freedSlotB),
    ]);

    const promotedIds = results
      .filter((r) => r !== null)
      .map((r) => r!.entry.id)
      .sort();
    expect(promotedIds).toEqual([first.id, second.id].sort());

    const promotedCount = await prisma.waitlistEntry.count({
      where: { restaurantId, status: 'PROMOTED' },
    });
    expect(promotedCount).toBe(2);

    const confirmed = await prisma.reservation.count({
      where: { restaurantId, status: 'CONFIRMED', startsAt },
    });
    expect(confirmed).toBe(2);
  }, 30_000);

  it('does not promote an entry whose party exceeds the freed table capacity', async () => {
    await seedCancelledReservations();
    // Tables seat 4; this party of 6 cannot be seated by the freed table.
    await repository.save(makeEntry('Big Party', 6));

    const promotion = await repository.promoteNextForFreedSlot(freedSlotA);

    expect(promotion).toBeNull();
    const promotedCount = await prisma.waitlistEntry.count({
      where: { restaurantId, status: 'PROMOTED' },
    });
    expect(promotedCount).toBe(0);
  });

  it('does not promote onto a table whose slot has been re-booked', async () => {
    const entry = await repository.save(makeEntry('Late Waiter'));
    // An active reservation still holds tableA for the slot (not freed).
    await prisma.reservation.create({
      data: {
        restaurantId,
        tableId: tableA,
        guestName: 'Active Guest',
        guestEmail: 'active@example.com',
        partySize: 2,
        startsAt,
        endsAt,
        status: 'CONFIRMED',
      },
    });

    const promotion = await repository.promoteNextForFreedSlot(freedSlotA);

    expect(promotion).toBeNull();
    const stillWaiting = await prisma.waitlistEntry.findUnique({
      where: { id: entry.id },
    });
    expect(stillWaiting?.status).toBe('WAITING');
  });

  it('expireStale moves past-slot waiting entries to EXPIRED', async () => {
    const pastStart = new Date('2000-01-01T18:00:00.000Z');
    await repository.save(
      new WaitlistEntry({
        restaurantId,
        guestName: 'Stale Waiter',
        guestEmail: new Email('stale@example.com'),
        partySize: 2,
        startsAt: pastStart,
        status: WaitlistStatus.waiting(),
      })
    );

    const expired = await repository.expireStale(restaurantId, new Date());

    expect(expired).toBe(1);
    const remainingWaiting = await prisma.waitlistEntry.count({
      where: { restaurantId, status: 'WAITING' },
    });
    expect(remainingWaiting).toBe(0);
  });
});
