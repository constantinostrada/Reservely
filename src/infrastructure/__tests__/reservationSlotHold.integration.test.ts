/**
 * Integration test for the concurrency-safe slot hold against a real
 * Postgres instance. Proves acceptance criterion: two concurrent
 * reservations for the same table/slot can never both succeed.
 *
 * Runs when INTEGRATION_DATABASE_URL is available (jest.setup.js captures
 * the URL loaded from .env before unit tests are pointed at a fake one).
 * Set SKIP_INTEGRATION=1 to skip explicitly.
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

describeIntegration('PrismaReservationRepository.createWithSlotHold (Postgres)', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const repository = new PrismaReservationRepository(prisma);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const restaurantId = `it-rest-${suffix}`;
  const tableId = `it-table-${suffix}`;

  // 18:00–19:30 UTC on a fixed future date
  const startsAt = new Date('2027-03-10T18:00:00.000Z');

  const makeReservation = (overrides: { startsAt?: Date; guest?: string } = {}) =>
    new Reservation({
      restaurantId,
      tableId,
      guestName: overrides.guest ?? 'Race Guest',
      guestEmail: new Email('race@example.com'),
      startsAt: overrides.startsAt ?? startsAt,
      partySize: 2,
      status: ReservationStatus.pending(),
    });

  beforeAll(async () => {
    await prisma.restaurant.create({
      data: {
        id: restaurantId,
        name: 'Integration Test Bistro',
        slug: `it-bistro-${suffix}`,
        timezone: 'America/New_York',
      },
    });
    await prisma.table.create({
      data: {
        id: tableId,
        restaurantId,
        number: 999,
        capacity: 4,
      },
    });
  });

  afterAll(async () => {
    // Cascades to tables and reservations
    await prisma.restaurant.delete({ where: { id: restaurantId } });
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.reservation.deleteMany({ where: { restaurantId } });
  });

  it('allows exactly one of many concurrent holds on the same table/slot', async () => {
    const ATTEMPTS = 8;
    const results = await Promise.allSettled(
      Array.from({ length: ATTEMPTS }, (_, i) =>
        repository.createWithSlotHold(makeReservation({ guest: `Guest ${i}` }))
      )
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(ATTEMPTS - 1);
    for (const failure of rejected) {
      expect(failure.reason).toBeInstanceOf(ConflictException);
    }

    // The database agrees: a single row holds the slot
    const stored = await prisma.reservation.count({
      where: { tableId, startsAt },
    });
    expect(stored).toBe(1);
  }, 30_000);

  it('rejects a partially overlapping hold on the same table', async () => {
    await repository.createWithSlotHold(makeReservation());

    // 19:00 starts inside the 18:00–19:30 hold
    await expect(
      repository.createWithSlotHold(
        makeReservation({ startsAt: new Date('2027-03-10T19:00:00.000Z') })
      )
    ).rejects.toThrow(ConflictException);
  });

  it('allows back-to-back holds on the same table (half-open slots)', async () => {
    await repository.createWithSlotHold(makeReservation());

    await expect(
      repository.createWithSlotHold(
        makeReservation({ startsAt: new Date('2027-03-10T19:30:00.000Z') })
      )
    ).resolves.toBeInstanceOf(Reservation);
  });

  it('frees the slot when the blocking reservation is cancelled', async () => {
    const held = await repository.createWithSlotHold(makeReservation());
    held.cancel();
    await repository.update(held);

    await expect(
      repository.createWithSlotHold(makeReservation({ guest: 'Second Guest' }))
    ).resolves.toBeInstanceOf(Reservation);
  });
});
