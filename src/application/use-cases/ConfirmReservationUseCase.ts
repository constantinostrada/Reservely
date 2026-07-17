import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { ReservationDTO } from '../dtos/ReservationDTO';
import { ReservationMapper } from '../mappers/ReservationMapper';
import { IEventPublisher } from '../ports/IEventPublisher';

export class ConfirmReservationUseCase {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(id: string, context: TenantContext): Promise<ReservationDTO> {
    const reservation = await this.reservationRepository.findById(id);

    if (!reservation) {
      throw new EntityNotFoundException('Reservation', id);
    }

    assertSameTenant(reservation.restaurantId, context);

    // Use domain method to confirm
    reservation.confirm();

    // Persist the change
    const updatedReservation =
      await this.reservationRepository.update(reservation);

    // Fire-and-forget: subscribers (e.g. guest notifications) run off the
    // request path and cannot fail the confirmation.
    this.eventPublisher.publish({
      type: 'reservation.confirmed',
      occurredAt: new Date(),
      reservationId: updatedReservation.id,
      restaurantId: updatedReservation.restaurantId,
      guestName: updatedReservation.guestName,
      guestEmail: updatedReservation.guestEmail.value,
      guestPhone: updatedReservation.guestPhone,
      startsAt: updatedReservation.startsAt,
      partySize: updatedReservation.partySize,
    });

    return ReservationMapper.toDTO(updatedReservation);
  }
}
