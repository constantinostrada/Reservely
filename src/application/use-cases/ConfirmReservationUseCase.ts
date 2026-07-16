import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import { ReservationDTO } from '../dtos/ReservationDTO';
import { ReservationMapper } from '../mappers/ReservationMapper';

export class ConfirmReservationUseCase {
  constructor(
    private readonly reservationRepository: IReservationRepository
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
    const updatedReservation = await this.reservationRepository.update(
      reservation
    );

    return ReservationMapper.toDTO(updatedReservation);
  }
}
