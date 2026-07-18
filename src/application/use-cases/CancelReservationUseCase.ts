import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { IWaitlistRepository } from '@domain/repositories/IWaitlistRepository';
import { Reservation } from '@domain/entities/Reservation';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { ReservationDTO } from '../dtos/ReservationDTO';
import { ReservationMapper } from '../mappers/ReservationMapper';
import { IEventPublisher } from '../ports/IEventPublisher';

export class CancelReservationUseCase {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly waitlistRepository: IWaitlistRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(id: string, context: TenantContext): Promise<ReservationDTO> {
    const reservation = await this.reservationRepository.findById(id);

    if (!reservation) {
      throw new EntityNotFoundException('Reservation', id);
    }

    assertSameTenant(reservation.restaurantId, context);

    // Cancel the requested reservation. The domain guards terminal states
    // (e.g. a completed reservation cannot be cancelled) — let that surface.
    const updatedReservation = await this.cancelAndPromote(reservation);

    // A combined booking holds several tables under one combinationId; freeing
    // the slot for the party means freeing every table in the combination.
    if (reservation.combinationId) {
      const siblings = await this.reservationRepository.findByCombinationId(
        reservation.restaurantId,
        reservation.combinationId
      );
      for (const sibling of siblings) {
        // Skip the one we already cancelled and any row that no longer holds
        // its slot (already cancelled/completed) — nothing to free there.
        if (sibling.id === reservation.id || !sibling.blocksTable()) {
          continue;
        }
        await this.cancelAndPromote(sibling);
      }
    }

    return ReservationMapper.toDTO(updatedReservation);
  }

  /**
   * Cancels one reservation and, if it was holding a table's slot, offers that
   * freed slot to the next guest on the waitlist (reusing B11's race-safe
   * transactional promotion + B9 notification pipeline). Returns the persisted
   * reservation.
   */
  private async cancelAndPromote(
    reservation: Reservation
  ): Promise<Reservation> {
    // Was it holding a table's slot before we cancelled it? Only then does
    // cancelling actually free a spot to hand to the waitlist.
    const freedSlot = reservation.blocksTable();

    reservation.cancel();
    const updated = await this.reservationRepository.update(reservation);

    // Promotion runs off the caller's critical path and is best-effort: it is
    // transactional and race-safe (two cancellations freeing space at once can
    // never promote the same entry twice) and its failure must not undo the
    // cancellation.
    if (freedSlot && updated.tableId) {
      const promotion = await this.waitlistRepository.promoteNextForFreedSlot({
        restaurantId: updated.restaurantId,
        tableId: updated.tableId,
        startsAt: updated.startsAt,
        endsAt: updated.endsAt,
      });

      if (promotion) {
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

    return updated;
  }
}
