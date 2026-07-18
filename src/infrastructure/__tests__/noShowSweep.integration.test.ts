/**
 * Integration test for the B13 no-show sweep against a real Postgres
 * instance. Proves the DB-level guarantees the unit tests can only assume:
 * the no-show transition is atomic and idempotent (a reservation is released
 * exactly once, even under concurrent sweeps), reservations in other states
 * are untouched, and a table freed mid-slot is handed to the waitlist.
 *
 * Runs when INTEGRATION_DATABASE_URL is available (jest.setup.js captures the
 * URL loaded from .env before unit tests are pointed at a fake one). Set
 * SKIP_INTEGRATION=1 to skip explicitly.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaReservationRepository } from '../repositories/PrismaReservationRepository';
import { PrismaRestaurantRepository } from '../repositories/PrismaRestaurantRepository';
import { PrismaWaitlistRepository } from '../repositories/PrismaWaitlistRepository';
import { MarkNoShowReservationsUseCase } from '@application/use-cases/MarkNoShowReservationsUseCase';
import { TenantContext } from '@application/common/TenantContext';
import { IEventPublisher } from '@application/ports/IEventPublisher';
import { WaitlistEntry } from '@domain/entities/WaitlistEntry';
import { Email } from '@domain/value-objects/Email';
import { WaitlistStatus } from '@domain/value-objects/WaitlistStatus';

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const describeIntegration =
  databaseUrl && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('No-show sweep (Postgres)', () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  const reservationRepository = new PrismaReservationRepository(prisma);
  const restaurantRepository = new PrismaRestaurantRepository(prisma);
  const waitlistRepository = new PrismaWaitlistRepository(prisma);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const restaurantId = `ns-rest-${suffix}`;
  const tableA = `ns-table-a-${suffix}`;
  const tableB = `ns-table-b-${suffix}`;
  const tableC = `ns-table-c-${suffix}`;

  const tenant: TenantContext = {
    userId: 'user-1',
    restaurantId,
    role: 'owner',
  };

  const eventPublisher: jest.Mocked<IEventPublisher> = { publish: jest.fn() };
  const useCase = new MarkNoShowReservationsUseCase(
    reservationRepository,
    restaurantRepository,
    waitlistRepository,
    eventPublisher
  );

  // A slot that started 30 minutes ago (past the 15-minute grace) and still
  // has an hour to run — exactly the shape a no-show release deals with.
  const startsAt = new Date(Date.now() - 30 * 60_000);
  const endsAt = new Date(Date.now() + 60 * 60_000);

  const seedReservation = (
    id: string,
    tableId: string,
    status: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'COMPLETED'
  ) =>
    prisma.reservation.create({
      data: {
        id,
        restaurantId,
        tableId,
        guestName: 'Late Guest',
        guestEmail: 'late@example.com',
        partySize: 2,
        startsAt,
        endsAt,
        status,
        // Booked the day before, like a normal reservation — grace runs from
        // the slot start, not from this creation time.
        createdAt: new Date(Date.now() - 24 * 60 * 60_000),
      },
    });

  beforeAll(async () => {
    await prisma.restaurant.create({
      data: {
        id: restaurantId,
        name: 'No-show Test Bistro',
        slug: `ns-bistro-${suffix}`,
        timezone: 'America/New_York',
        noShowGraceMinutes: 15,
      },
    });
    await prisma.table.createMany({
      data: [
        { id: tableA, restaurantId, number: 911, capacity: 4 },
        { id: tableB, restaurantId, number: 912, capacity: 4 },
        { id: tableC, restaurantId, number: 913, capacity: 4 },
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
    eventPublisher.publish.mockClear();
  });

  it('marks only the overdue unseated reservation, promotes the waitlist into its table, and never re-releases', async () => {
    await seedReservation(`ns-res-a-${suffix}`, tableA, 'CONFIRMED');
    await seedReservation(`ns-res-b-${suffix}`, tableB, 'SEATED');
    await seedReservation(`ns-res-c-${suffix}`, tableC, 'CANCELLED');

    // A guest still waiting for this (already started, still running) slot.
    const entry = await waitlistRepository.save(
      new WaitlistEntry({
        restaurantId,
        guestName: 'Waiting Guest',
        guestEmail: new Email('waiting@example.com'),
        partySize: 2,
        startsAt,
        endsAt,
        status: WaitlistStatus.waiting(),
      })
    );

    const first = await useCase.execute(tenant);
    expect(first).toEqual({ markedNoShow: 1, promoted: 1 });

    // The overdue confirmed reservation is now a no-show; the seated and
    // cancelled ones kept their statuses.
    const byId = Object.fromEntries(
      (await prisma.reservation.findMany({ where: { restaurantId } })).map(
        (r) => [r.id, r.status]
      )
    );
    expect(byId[`ns-res-a-${suffix}`]).toBe('NO_SHOW');
    expect(byId[`ns-res-b-${suffix}`]).toBe('SEATED');
    expect(byId[`ns-res-c-${suffix}`]).toBe('CANCELLED');

    // The waiting guest took the freed table for the rest of the slot.
    const promoted = await prisma.waitlistEntry.findUnique({
      where: { id: entry.id },
    });
    expect(promoted?.status).toBe('PROMOTED');
    const replacement = await prisma.reservation.findUnique({
      where: { id: promoted!.promotedReservationId! },
    });
    expect(replacement?.tableId).toBe(tableA);
    expect(replacement?.status).toBe('CONFIRMED');
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'waitlist.promoted' })
    );

    // Idempotent: a second sweep finds nothing to release — the replacement
    // reservation is inside its grace period, the no-show is terminal.
    const second = await useCase.execute(tenant);
    expect(second).toEqual({ markedNoShow: 0, promoted: 0 });
  });

  it('releases a reservation exactly once under two concurrent sweeps', async () => {
    const id = `ns-res-race-${suffix}`;
    await seedReservation(id, tableA, 'CONFIRMED');

    const [a, b] = await Promise.all([
      reservationRepository.markNoShowIfUnseated(restaurantId, id),
      reservationRepository.markNoShowIfUnseated(restaurantId, id),
    ]);

    // Exactly one call performed the transition.
    expect([a, b].filter(Boolean)).toHaveLength(1);
    const row = await prisma.reservation.findUnique({ where: { id } });
    expect(row?.status).toBe('NO_SHOW');
  });

  it('does not promote the waitlist into a slot that has already ended', async () => {
    const endedStart = new Date(Date.now() - 3 * 60 * 60_000);
    const endedEnd = new Date(Date.now() - 90 * 60_000);
    await waitlistRepository.save(
      new WaitlistEntry({
        restaurantId,
        guestName: 'Too Late',
        guestEmail: new Email('toolate@example.com'),
        partySize: 2,
        startsAt: endedStart,
        endsAt: endedEnd,
        status: WaitlistStatus.waiting(),
      })
    );

    const promotion = await waitlistRepository.promoteNextForFreedSlot(
      {
        restaurantId,
        tableId: tableA,
        startsAt: endedStart,
        endsAt: endedEnd,
      },
      { includeStartedSlots: true }
    );

    expect(promotion).toBeNull();
  });
});
