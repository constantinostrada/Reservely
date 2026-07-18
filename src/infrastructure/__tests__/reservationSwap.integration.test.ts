/**
 * Integration test for the B14 atomic reschedule/resize swap against a real
 * Postgres instance. Proves the acceptance criterion the unit tests can only
 * assume: the old hold is released ONLY if the new hold succeeds — a failed
 * swap rolls back completely and the original reservation stands untouched,
 * and of two concurrent swaps racing for the same target slot exactly one
 * wins.
 *
 * Runs when INTEGRATION_DATABASE_URL is available (jest.setup.js captures the
 * URL loaded from .env before unit tests are pointed at a fake one). Set
 * SKIP_INTEGRATION=1 to skip explicitly.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaReservationRepository } from '../repositories/PrismaReservationRepository';
import { Reservation } from '@domain/entities/Reservation';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import { ConflictException } from '@domain/exceptions/DomainException';

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const describeIntegration =
  databaseUrl && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('PrismaReservationRepository.swapSlotHold (Postgres)', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const repository = new PrismaReservationRepository(prisma);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const restaurantId = `swap-rest-${suffix}`;
  const tableA = `swap-table-a-${suffix}`;
  const tableB = `swap-table-b-${suffix}`;

  const slot1Start = new Date('2099-05-20T18:00:00.000Z');
  const slot1End = new Date(slot1Start.getTime() + 90 * 60_000);
  const slot2Start = new Date('2099-05-20T20:00:00.000Z');
  const slot2End = new Date(slot2Start.getTime() + 90 * 60_000);

  const seedReservation = (
    id: string,
    tableId: string,
    startsAt: Date,
    endsAt: Date,
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' = 'CONFIRMED'
  ) =>
    prisma.reservation.create({
      data: {
        id,
        restaurantId,
        tableId,
        guestName: 'Original Guest',
        guestEmail: 'original@example.com',
        partySize: 2,
        startsAt,
        endsAt,
        status,
      },
    });

  const holdRow = (opts: {
    id?: string;
    tableId: string;
    startsAt: Date;
    endsAt: Date;
    combinationId?: string;
  }) =>
    new Reservation({
      id: opts.id,
      restaurantId,
      tableId: opts.tableId,
      guestName: 'Original Guest',
      guestEmail: new Email('original@example.com'),
      startsAt: opts.startsAt,
      endsAt: opts.endsAt,
      partySize: 2,
      status: ReservationStatus.confirmed(),
      combinationId: opts.combinationId,
    });

  beforeAll(async () => {
    await prisma.restaurant.create({
      data: {
        id: restaurantId,
        name: 'Swap Test Bistro',
        slug: `swap-bistro-${suffix}`,
        timezone: 'America/New_York',
      },
    });
    await prisma.table.createMany({
      data: [
        { id: tableA, restaurantId, number: 921, capacity: 4 },
        { id: tableB, restaurantId, number: 922, capacity: 4 },
      ],
    });
  });

  afterAll(async () => {
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.reservation.deleteMany({ where: { restaurantId } });
  });

  it('moves a reservation to a free slot in place, keeping its id', async () => {
    const id = `swap-res-1-${suffix}`;
    await seedReservation(id, tableA, slot1Start, slot1End);

    const updated = await repository.swapSlotHold({
      hold: [holdRow({ id, tableId: tableB, startsAt: slot2Start, endsAt: slot2End })],
      releaseIds: [],
    });

    expect(updated.id).toBe(id);
    const row = await prisma.reservation.findUnique({ where: { id } });
    expect(row?.tableId).toBe(tableB);
    expect(row?.startsAt).toEqual(slot2Start);
    expect(row?.status).toBe('CONFIRMED');
    // Exactly one row: the booking moved, it was not duplicated.
    expect(await prisma.reservation.count({ where: { restaurantId } })).toBe(1);
  });

  it('rolls back completely when the target slot is taken — the original hold stands', async () => {
    const id = `swap-res-2-${suffix}`;
    await seedReservation(id, tableA, slot1Start, slot1End);
    // Another guest already holds the target table/slot.
    await seedReservation(`blocker-${suffix}`, tableB, slot2Start, slot2End);

    await expect(
      repository.swapSlotHold({
        hold: [
          holdRow({ id, tableId: tableB, startsAt: slot2Start, endsAt: slot2End }),
        ],
        releaseIds: [],
      })
    ).rejects.toThrow(ConflictException);

    // The failed swap released nothing and changed nothing.
    const row = await prisma.reservation.findUnique({ where: { id } });
    expect(row?.tableId).toBe(tableA);
    expect(row?.startsAt).toEqual(slot1Start);
    expect(row?.status).toBe('CONFIRMED');
  });

  it('rolls back a combined swap when one of its tables is taken, keeping released siblings alive', async () => {
    const primaryId = `swap-res-3-${suffix}`;
    const siblingId = `swap-res-3b-${suffix}`;
    // A combined booking on both tables at slot 1...
    await seedReservation(primaryId, tableA, slot1Start, slot1End);
    await seedReservation(siblingId, tableB, slot1Start, slot1End);
    // ...moving to slot 2 as a combination, but table B is taken there.
    await seedReservation(`blocker2-${suffix}`, tableB, slot2Start, slot2End);

    await expect(
      repository.swapSlotHold({
        hold: [
          holdRow({
            id: primaryId,
            tableId: tableA,
            startsAt: slot2Start,
            endsAt: slot2End,
            combinationId: 'comb-new',
          }),
          holdRow({
            tableId: tableB,
            startsAt: slot2Start,
            endsAt: slot2End,
            combinationId: 'comb-new',
          }),
        ],
        releaseIds: [siblingId],
      })
    ).rejects.toThrow(ConflictException);

    // Neither the primary nor the released sibling changed: no partial swap.
    const primary = await prisma.reservation.findUnique({
      where: { id: primaryId },
    });
    const sibling = await prisma.reservation.findUnique({
      where: { id: siblingId },
    });
    expect(primary?.startsAt).toEqual(slot1Start);
    expect(sibling?.status).toBe('CONFIRMED');
    expect(sibling?.startsAt).toEqual(slot1Start);
  });

  it('cancels released siblings atomically with a successful swap', async () => {
    const primaryId = `swap-res-4-${suffix}`;
    const siblingId = `swap-res-4b-${suffix}`;
    await seedReservation(primaryId, tableA, slot1Start, slot1End);
    await seedReservation(siblingId, tableB, slot1Start, slot1End);

    // The combined booking shrinks to a single table at a new slot.
    await repository.swapSlotHold({
      hold: [
        holdRow({
          id: primaryId,
          tableId: tableA,
          startsAt: slot2Start,
          endsAt: slot2End,
        }),
      ],
      releaseIds: [siblingId],
    });

    const primary = await prisma.reservation.findUnique({
      where: { id: primaryId },
    });
    const sibling = await prisma.reservation.findUnique({
      where: { id: siblingId },
    });
    expect(primary?.startsAt).toEqual(slot2Start);
    expect(primary?.status).toBe('CONFIRMED');
    expect(sibling?.status).toBe('CANCELLED');
  });

  it('lets exactly one of two concurrent swaps win the same target slot', async () => {
    const idA = `swap-race-a-${suffix}`;
    const idB = `swap-race-b-${suffix}`;
    await seedReservation(idA, tableA, slot1Start, slot1End);
    await seedReservation(idB, tableB, slot1Start, slot1End);

    // Both bookings try to move to table A at slot 2 at the same instant.
    const target = { tableId: tableA, startsAt: slot2Start, endsAt: slot2End };
    const results = await Promise.allSettled([
      repository.swapSlotHold({ hold: [holdRow({ id: idA, ...target })], releaseIds: [] }),
      repository.swapSlotHold({ hold: [holdRow({ id: idB, ...target })], releaseIds: [] }),
    ]);

    const wins = results.filter((r) => r.status === 'fulfilled');
    const losses = results.filter((r) => r.status === 'rejected');
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(1);

    // The loser kept its original slot — nobody ended up without a booking.
    const rows = await prisma.reservation.findMany({
      where: { id: { in: [idA, idB] } },
    });
    const moved = rows.filter((r) => r.startsAt.getTime() === slot2Start.getTime());
    const kept = rows.filter((r) => r.startsAt.getTime() === slot1Start.getTime());
    expect(moved).toHaveLength(1);
    expect(kept).toHaveLength(1);
    expect(kept[0].status).toBe('CONFIRMED');
  });

  it('refuses to swap a reservation that was cancelled concurrently', async () => {
    const id = `swap-res-5-${suffix}`;
    await seedReservation(id, tableA, slot1Start, slot1End, 'CANCELLED');

    await expect(
      repository.swapSlotHold({
        hold: [
          holdRow({ id, tableId: tableB, startsAt: slot2Start, endsAt: slot2End }),
        ],
        releaseIds: [],
      })
    ).rejects.toThrow(ConflictException);

    const row = await prisma.reservation.findUnique({ where: { id } });
    expect(row?.status).toBe('CANCELLED');
    expect(row?.tableId).toBe(tableA);
  });
});
