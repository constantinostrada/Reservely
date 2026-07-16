import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { ReservationDTO } from '../dtos/ReservationDTO';
import { ReservationMapper } from '../mappers/ReservationMapper';

export class CancelReservationUseCase {
  constructor(
    private readonly reservationRepository: IReservationRepository
  ) {}

  async execute(id: string): Promise<ReservationDTO> {
    const reservation = await this.reservationRepository.findById(id);

    if (!reservation) {
      throw new EntityNotFoundException('Reservation', id);
    }

    // Use domain method to cancel
    reservation.cancel();

    // Persist the change
    const updatedReservation = await this.reservationRepository.update(
      reservation
    );

    return ReservationMapper.toDTO(updatedReservation);
  }
}
