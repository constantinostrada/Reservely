import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { IWaitlistRepository } from '@domain/repositories/IWaitlistRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { IEventPublisher } from '../ports/IEventPublisher';

export interface MarkNoShowReservationsResult {
  /** Reservations transitioned to no-show by this run. */
  markedNoShow: number;
  /** Waitlist entries promoted into the tables those no-shows freed. */
  promoted: number;
}

/**
 * The no-show sweep: reservations whose start time passed the restaurant's
 * configurable grace period without the guest being seated are marked
 * no-show, which releases their table hold; each freed table is then offered
 * to the waitlist (reusing B11's race-safe promotion + B9 notifications).
 *
 * Safe to call repeatedly (e.g. from a scheduled job): only reservations
 * still waiting to be seated (pending/confirmed) are touched, and the
 * transition itself is atomic — a reservation already no-show, seated,
 * cancelled or completed is never re-released, so the waitlist can never be
 * promoted twice for the same freed table. Combined (multi-table) bookings
 * need no special casing: every table's row is itself an overdue
 * pending/confirmed reservation, so the sweep releases each of them.
 */
export class MarkNoShowReservationsUseCase {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly restaurantRepository: IRestaurantRepository,
    private readonly waitlistRepository: IWaitlistRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(context: TenantContext): Promise<MarkNoShowReservationsResult> {
    const restaurant = await this.restaurantRepository.findById(
      context.restaurantId
    );
    if (!restaurant) {
      throw new EntityNotFoundException('Restaurant', context.restaurantId);
    }

    const now = new Date();
    const graceMinutes = restaurant.noShowGraceMinutes;
    const cutoff = new Date(now.getTime() - graceMinutes * 60_000);

    const candidates = await this.reservationRepository.findNoShowCandidates(
      context.restaurantId,
      cutoff
    );

    let markedNoShow = 0;
    let promoted = 0;

    for (const reservation of candidates) {
      // Re-assert the domain rule on the loaded entity; the repository query
      // is just a pre-filter.
      if (!reservation.isNoShowAfterGrace(graceMinutes, now)) {
        continue;
      }

      // Atomic conditional transition: false means someone got there first
      // (a concurrent sweep, or staff seating/cancelling the guest), in which
      // case the table must not be released again.
      const transitioned = await this.reservationRepository.markNoShowIfUnseated(
        context.restaurantId,
        reservation.id
      );
      if (!transitioned) {
        continue;
      }
      markedNoShow++;

      if (!reservation.tableId) {
        continue;
      }

      // Offer the freed table to the waitlist. The slot already started (the
      // grace period passed), so opt into started-slot promotion: guests
      // waiting for this slot may still take the remainder of it.
      const promotion = await this.waitlistRepository.promoteNextForFreedSlot(
        {
          restaurantId: reservation.restaurantId,
          tableId: reservation.tableId,
          startsAt: reservation.startsAt,
          endsAt: reservation.endsAt,
        },
        { includeStartedSlots: true }
      );

      if (promotion) {
        promoted++;
        this.eventPublisher.publish({
          type: 'waitlist.promoted',
          occurredAt: new Date(),
          waitlistEntryId: promotion.entry.id,
          reservationId: promotion.reservation.id,
          restaurantId: promotion.reservation.restaurantId,
          guestName: promotion.reservation.guestName,
          guestEmail: promotion.reservation.guestEmail.value,
          guestPhone: promotion.reservation.guestPhone,
          startsAt: promotion.reservation.startsAt,
          partySize: promotion.reservation.partySize,
        });
      }
    }

    return { markedNoShow, promoted };
  }
}
