import { Reservation } from '@domain/entities/Reservation';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import { ReservationDTO, CreateReservationDTO } from '../dtos/ReservationDTO';

export class ReservationMapper {
  static toDTO(reservation: Reservation): ReservationDTO {
    return {
      id: reservation.id,
      restaurantId: reservation.restaurantId,
      tableId: reservation.tableId,
      guestName: reservation.guestName,
      guestEmail: reservation.guestEmail.value,
      guestPhone: reservation.guestPhone,
      startsAt: reservation.startsAt.toISOString(),
      endsAt: reservation.endsAt.toISOString(),
      partySize: reservation.partySize,
      status: reservation.status.value,
      notes: reservation.notes,
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
    };
  }

  /**
   * The UTC instants are computed by the use case from the DTO's local
   * date/time using the restaurant's time zone — never here.
   */
  static toDomain(
    dto: CreateReservationDTO,
    restaurantId: string,
    tableId: string,
    startsAt: Date,
    endsAt: Date
  ): Reservation {
    return new Reservation({
      restaurantId,
      tableId,
      guestName: dto.guestName,
      guestEmail: new Email(dto.guestEmail),
      guestPhone: dto.guestPhone,
      startsAt,
      endsAt,
      partySize: dto.partySize,
      status: ReservationStatus.pending(),
      notes: dto.notes,
    });
  }

  static toDTOList(reservations: Reservation[]): ReservationDTO[] {
    return reservations.map((reservation) => this.toDTO(reservation));
  }
}
