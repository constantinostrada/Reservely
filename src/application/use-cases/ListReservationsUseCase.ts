import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { TenantContext } from '../common/TenantContext';
import { ReservationListDTO } from '../dtos/ReservationDTO';
import { ReservationMapper } from '../mappers/ReservationMapper';

export class ListReservationsUseCase {
  constructor(
    private readonly reservationRepository: IReservationRepository
  ) {}

  async execute(context: TenantContext): Promise<ReservationListDTO> {
    const reservations = await this.reservationRepository.findAll(
      context.restaurantId
    );

    return {
      reservations: ReservationMapper.toDTOList(reservations),
      total: reservations.length,
    };
  }
}
