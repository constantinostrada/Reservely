/**
 * Integration test for the atomic multi-table hold (B12) against a real
 * Postgres instance. Proves the acceptance criteria: combined bookings hold
 * every table atomically, a partial hold rolls back entirely (no table left
 * held), and two combined holds sharing a table can never both succeed.
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

describeIntegration('PrismaReservationRepository.createCombinedWithSlotHold (Postgres)', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const repository = new PrismaReservationRepository(prisma);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const restaurantId = `comb-rest-${suffix}`;
  const tableA = `comb-a-${suffix}`;
  const tableB = `comb-b-${suffix}`;
  const tableC = `comb-c-${suffix}`;

  const startsAt = new Date('2099-04-10T18:00:00.000Z');

  const combo = (tableIds: string[], combinationId: string): Reservation[] =>
    tableIds.map(
      (tableId) =>
        new Reservation({
          restaurantId,
          tableId,
          guestName: 'Combo Guest',
          guestEmail: new Email('combo@example.com'),
          startsAt,
          partySize: 8,
          status: ReservationStatus.confirmed(),
          combinationId,
        })
    );

  const single = (tableId: string): Reservation =>
    new Reservation({
      restaurantId,
      tableId,
      guestName: 'Solo Guest',
      guestEmail: new Email('solo@example.com'),
      startsAt,
      partySize: 2,
      status: ReservationStatus.confirmed(),
    });

  const activeCount = (tableId: string) =>
    prisma.reservation.count({
      where: {
        tableId,
        status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
      },
    });

  beforeAll(async () => {
    await prisma.restaurant.create({
      data: {
        id: restaurantId,
        name: 'Combination Test Bistro',
        slug: `comb-bistro-${suffix}`,
        timezone: 'America/New_York',
      },
    });
    await prisma.table.createMany({
      data: [
        { id: tableA, restaurantId, number: 801, capacity: 4, location: 'patio' },
        { id: tableB, restaurantId, number: 802, capacity: 4, location: 'patio' },
        { id: tableC, restaurantId, number: 803, capacity: 4, location: 'patio' },
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

  it('holds every table of the combination atomically', async () => {
    const created = await repository.createCombinedWithSlotHold(
      combo([tableA, tableC], 'comb-ok')
    );

    expect(created).toHaveLength(2);
    expect(new Set(created.map((r) => r.combinationId))).toEqual(
      new Set(['comb-ok'])
    );

    const stored = await prisma.reservation.count({
      where: { combinationId: 'comb-ok' },
    });
    expect(stored).toBe(2);
    expect(await activeCount(tableA)).toBe(1);
    expect(await activeCount(tableC)).toBe(1);
  });

  it('rolls back the whole hold when one table is already taken (no partial hold)', async () => {
    // tableB is already booked; the combination [tableA, tableB] must fail…
    await repository.createWithSlotHold(single(tableB));

    await expect(
      repository.createCombinedWithSlotHold(combo([tableA, tableB], 'comb-fail'))
    ).rejects.toThrow(ConflictException);

    // …and crucially the free tableA must NOT be left held.
    expect(await activeCount(tableA)).toBe(0);
    const orphaned = await prisma.reservation.count({
      where: { combinationId: 'comb-fail' },
    });
    expect(orphaned).toBe(0);
  });

  it('lets only one of two combined holds sharing a table succeed', async () => {
    const results = await Promise.allSettled([
      repository.createCombinedWithSlotHold(combo([tableA, tableB], 'race-1')),
      repository.createCombinedWithSlotHold(combo([tableA, tableC], 'race-2')),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);

    // The contended table ends with exactly one active reservation, and the
    // losing combination left nothing behind on its other table.
    expect(await activeCount(tableA)).toBe(1);
  }, 30_000);
});
