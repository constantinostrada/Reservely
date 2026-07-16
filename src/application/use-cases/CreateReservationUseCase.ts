import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { ReservationDomainService } from '@domain/services/ReservationDomainService';
import { CreateReservationDTO, ReservationDTO } from '../dtos/ReservationDTO';
import { ReservationMapper } from '../mappers/ReservationMapper';

export class CreateReservationUseCase {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly tableRepository: ITableRepository,
    private readonly domainService: ReservationDomainService
  ) {}

  async execute(dto: CreateReservationDTO): Promise<ReservationDTO> {
    // Map DTO to domain entity
    const reservation = ReservationMapper.toDomain(dto);

    // Validate reservation time slot
    if (!this.domainService.isReservationInValidTimeSlot(reservation)) {
      throw new Error(
        'Reservation time is outside of restaurant operating hours (11:00 AM - 10:00 PM)'
      );
    }

    // Check if we have available tables for the party size
    const availableTables = await this.tableRepository.findAvailableTables();
    if (!this.domainService.canAccommodateReservation(reservation, availableTables)) {
      throw new Error(
        `No tables available to accommodate a party of ${reservation.partySize}`
      );
    }

    // Check for conflicts with existing reservations
    const existingReservations = await this.reservationRepository.findByDate(
      reservation.date
    );
    if (
      this.domainService.hasConflict(reservation, existingReservations)
    ) {
      throw new Error(
        'This time slot conflicts with an existing reservation'
      );
    }

    // Save the reservation
    const savedReservation = await this.reservationRepository.save(reservation);

    // Return DTO
    return ReservationMapper.toDTO(savedReservation);
  }
}
