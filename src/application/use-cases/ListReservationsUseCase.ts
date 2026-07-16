import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ReservationListDTO } from '../dtos/ReservationDTO';
import { ReservationMapper } from '../mappers/ReservationMapper';

export class ListReservationsUseCase {
  constructor(
    private readonly reservationRepository: IReservationRepository
  ) {}

  async execute(): Promise<ReservationListDTO> {
    const reservations = await this.reservationRepository.findAll();

    return {
      reservations: ReservationMapper.toDTOList(reservations),
      total: reservations.length,
    };
  }
}
