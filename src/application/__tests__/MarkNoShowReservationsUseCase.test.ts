import { MarkNoShowReservationsUseCase } from '../use-cases/MarkNoShowReservationsUseCase';
import { TenantContext } from '../common/TenantContext';
import { IEventPublisher } from '../ports/IEventPublisher';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { IWaitlistRepository } from '@domain/repositories/IWaitlistRepository';
import { Reservation } from '@domain/entities/Reservation';
import { Restaurant } from '@domain/entities/Restaurant';
import { WaitlistEntry } from '@domain/entities/WaitlistEntry';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import { WaitlistStatus } from '@domain/value-objects/WaitlistStatus';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';

describe('MarkNoShowReservationsUseCase', () => {
  let useCase: MarkNoShowReservationsUseCase;
  let mockReservationRepo: jest.Mocked<IReservationRepository>;
  let mockRestaurantRepo: jest.Mocked<IRestaurantRepository>;
  let mockWaitlistRepo: jest.Mocked<IWaitlistRepository>;
  let mockEventPublisher: jest.Mocked<IEventPublisher>;

  const tenant: TenantContext = {
    userId: 'user-1',
    restaurantId: 'rest-1',
    role: 'owner',
  };

  const GRACE_MINUTES = 15;

  const makeRestaurant = (graceMinutes = GRACE_MINUTES) =>
    new Restaurant({
      id: 'rest-1',
      name: 'Testaurant',
      slug: 'testaurant',
      noShowGraceMinutes: graceMinutes,
    });

  const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * 60_000);

  let reservationSeq = 0;
  const makeReservation = (
    overrides: {
      id?: string;
      tableId?: string;
      startsAt?: Date;
      status?: ReservationStatus;
      createdAt?: Date;
    } = {}
  ) =>
    new Reservation({
      id: overrides.id ?? `res-${++reservationSeq}`,
      restaurantId: 'rest-1',
      tableId: overrides.tableId ?? 't-1',
      guestName: 'John Doe',
      guestEmail: new Email('john@example.com'),
      // Overdue by default: started well past the grace period.
      startsAt: overrides.startsAt ?? minutesAgo(GRACE_MINUTES + 30),
      partySize: 4,
      status: overrides.status ?? ReservationStatus.confirmed(),
      // Booked the day before, like a normal reservation.
      createdAt: overrides.createdAt ?? minutesAgo(24 * 60),
    });

  const makePromotion = (reservation: Reservation) => ({
    reservation,
    entry: new WaitlistEntry({
      id: 'wl-1',
      restaurantId: 'rest-1',
      guestName: 'Waiting Guest',
      guestEmail: new Email('waiting@example.com'),
      partySize: 2,
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      status: WaitlistStatus.promoted(),
      promotedReservationId: reservation.id,
    }),
  });

  beforeEach(() => {
    mockReservationRepo = {
      save: jest.fn(),
      createWithSlotHold: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      createCombinedWithSlotHold: jest.fn(),
      swapSlotHold: jest.fn(),
      findByCombinationId: jest.fn(),
      findNoShowCandidates: jest.fn().mockResolvedValue([]),
      markNoShowIfUnseated: jest.fn().mockResolvedValue(true),
      findOverlapping: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn().mockImplementation(async (r) => r),
      delete: jest.fn(),
    };

    mockRestaurantRepo = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(makeRestaurant()),
      findBySlug: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockWaitlistRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findWaiting: jest.fn(),
      countWaitingForSlot: jest.fn(),
      // Default: no one waiting, so no promotion happens.
      promoteNextForFreedSlot: jest.fn().mockResolvedValue(null),
      expireStale: jest.fn(),
    };

    mockEventPublisher = { publish: jest.fn() };

    useCase = new MarkNoShowReservationsUseCase(
      mockReservationRepo,
      mockRestaurantRepo,
      mockWaitlistRepo,
      mockEventPublisher
    );
  });

  it('marks an overdue confirmed reservation as no-show and offers the freed table to the waitlist', async () => {
    const reservation = makeReservation();
    mockReservationRepo.findNoShowCandidates.mockResolvedValue([reservation]);

    const result = await useCase.execute(tenant);

    expect(result).toEqual({ markedNoShow: 1, promoted: 0 });
    expect(mockReservationRepo.markNoShowIfUnseated).toHaveBeenCalledWith(
      'rest-1',
      reservation.id
    );
    // The freed slot is offered mid-slot, so started slots must be included.
    expect(mockWaitlistRepo.promoteNextForFreedSlot).toHaveBeenCalledWith(
      {
        restaurantId: 'rest-1',
        tableId: 't-1',
        startsAt: reservation.startsAt,
        endsAt: reservation.endsAt,
      },
      { includeStartedSlots: true }
    );
  });

  it('asks the repository only for reservations already past the grace period', async () => {
    const before = Date.now();
    await useCase.execute(tenant);
    const after = Date.now();

    const [restaurantId, cutoff] =
      mockReservationRepo.findNoShowCandidates.mock.calls[0];
    expect(restaurantId).toBe('rest-1');
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(
      before - GRACE_MINUTES * 60_000
    );
    expect(cutoff.getTime()).toBeLessThanOrEqual(
      after - GRACE_MINUTES * 60_000
    );
  });

  it('sweeps a mix of states: only unseated reservations past the grace become no-shows', async () => {
    const overduePending = makeReservation({
      status: ReservationStatus.pending(),
    });
    const overdueConfirmed = makeReservation({
      status: ReservationStatus.confirmed(),
    });
    // Started, but still inside the grace period — the guest may yet arrive.
    const withinGrace = makeReservation({
      startsAt: minutesAgo(GRACE_MINUTES - 5),
    });
    // Terminal / seated states must never be (re-)released, even if the
    // repository pre-filter were to return them.
    const seated = makeReservation({ status: ReservationStatus.seated() });
    const cancelled = makeReservation({
      status: ReservationStatus.cancelled(),
    });
    const alreadyNoShow = makeReservation({
      status: ReservationStatus.noShow(),
    });

    mockReservationRepo.findNoShowCandidates.mockResolvedValue([
      overduePending,
      overdueConfirmed,
      withinGrace,
      seated,
      cancelled,
      alreadyNoShow,
    ]);

    const result = await useCase.execute(tenant);

    expect(result.markedNoShow).toBe(2);
    expect(mockReservationRepo.markNoShowIfUnseated).toHaveBeenCalledTimes(2);
    expect(mockReservationRepo.markNoShowIfUnseated).toHaveBeenCalledWith(
      'rest-1',
      overduePending.id
    );
    expect(mockReservationRepo.markNoShowIfUnseated).toHaveBeenCalledWith(
      'rest-1',
      overdueConfirmed.id
    );
    expect(mockWaitlistRepo.promoteNextForFreedSlot).toHaveBeenCalledTimes(2);
  });

  it('is idempotent: a reservation another run already transitioned is not re-released', async () => {
    const reservation = makeReservation();
    mockReservationRepo.findNoShowCandidates.mockResolvedValue([reservation]);
    // Concurrent sweep (or staff seating/cancelling) won the transition.
    mockReservationRepo.markNoShowIfUnseated.mockResolvedValue(false);

    const result = await useCase.execute(tenant);

    expect(result).toEqual({ markedNoShow: 0, promoted: 0 });
    expect(mockWaitlistRepo.promoteNextForFreedSlot).not.toHaveBeenCalled();
    expect(mockEventPublisher.publish).not.toHaveBeenCalled();
  });

  it('publishes waitlist.promoted when a waiting guest takes the freed table', async () => {
    const reservation = makeReservation();
    mockReservationRepo.findNoShowCandidates.mockResolvedValue([reservation]);

    const promotedReservation = new Reservation({
      id: 'res-promoted',
      restaurantId: 'rest-1',
      tableId: 't-1',
      guestName: 'Waiting Guest',
      guestEmail: new Email('waiting@example.com'),
      guestPhone: '+1 555 0100',
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      partySize: 2,
      status: ReservationStatus.confirmed(),
    });
    mockWaitlistRepo.promoteNextForFreedSlot.mockResolvedValue(
      makePromotion(promotedReservation)
    );

    const result = await useCase.execute(tenant);

    expect(result).toEqual({ markedNoShow: 1, promoted: 1 });
    expect(mockEventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'waitlist.promoted',
        waitlistEntryId: 'wl-1',
        reservationId: 'res-promoted',
        restaurantId: 'rest-1',
        guestEmail: 'waiting@example.com',
      })
    );
  });

  it('marks a reservation without a table as no-show but has nothing to release', async () => {
    const reservation = new Reservation({
      id: 'res-legacy',
      restaurantId: 'rest-1',
      guestName: 'John Doe',
      guestEmail: new Email('john@example.com'),
      startsAt: minutesAgo(GRACE_MINUTES + 30),
      partySize: 4,
      status: ReservationStatus.confirmed(),
      createdAt: minutesAgo(24 * 60),
    });
    mockReservationRepo.findNoShowCandidates.mockResolvedValue([reservation]);

    const result = await useCase.execute(tenant);

    expect(result).toEqual({ markedNoShow: 1, promoted: 0 });
    expect(mockWaitlistRepo.promoteNextForFreedSlot).not.toHaveBeenCalled();
  });

  it('gives a reservation created mid-slot its grace from creation, not from the past start time', async () => {
    // A waitlist promotion (or walk-in) booked 5 minutes ago into a slot that
    // started 45 minutes ago: the guest is not "late" yet.
    const justPromoted = makeReservation({ createdAt: minutesAgo(5) });
    mockReservationRepo.findNoShowCandidates.mockResolvedValue([justPromoted]);

    const result = await useCase.execute(tenant);

    expect(result).toEqual({ markedNoShow: 0, promoted: 0 });
    expect(mockReservationRepo.markNoShowIfUnseated).not.toHaveBeenCalled();
  });

  it('honours the restaurant-configured grace period', async () => {
    // 10 minutes late: a no-show for a 5-minute grace, not for the default 15.
    const reservation = makeReservation({ startsAt: minutesAgo(10) });
    mockRestaurantRepo.findById.mockResolvedValue(makeRestaurant(5));
    mockReservationRepo.findNoShowCandidates.mockResolvedValue([reservation]);

    const result = await useCase.execute(tenant);

    expect(result.markedNoShow).toBe(1);
  });

  it('releases every table of an overdue combined booking', async () => {
    const startsAt = minutesAgo(GRACE_MINUTES + 30);
    const first = makeReservation({ id: 'res-a', tableId: 't-1', startsAt });
    const second = makeReservation({ id: 'res-b', tableId: 't-2', startsAt });
    mockReservationRepo.findNoShowCandidates.mockResolvedValue([
      first,
      second,
    ]);

    const result = await useCase.execute(tenant);

    expect(result.markedNoShow).toBe(2);
    expect(mockWaitlistRepo.promoteNextForFreedSlot).toHaveBeenCalledWith(
      expect.objectContaining({ tableId: 't-1' }),
      { includeStartedSlots: true }
    );
    expect(mockWaitlistRepo.promoteNextForFreedSlot).toHaveBeenCalledWith(
      expect.objectContaining({ tableId: 't-2' }),
      { includeStartedSlots: true }
    );
  });

  it('throws when the tenant restaurant does not exist', async () => {
    mockRestaurantRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(tenant)).rejects.toThrow(
      EntityNotFoundException
    );
    expect(mockReservationRepo.findNoShowCandidates).not.toHaveBeenCalled();
  });
});
