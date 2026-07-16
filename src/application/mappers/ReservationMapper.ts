import { Reservation } from '@domain/entities/Reservation';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import { ReservationDTO, CreateReservationDTO } from '../dtos/ReservationDTO';

export class ReservationMapper {
  static toDTO(reservation: Reservation): ReservationDTO {
    return {
      id: reservation.id,
      restaurantId: reservation.restaurantId,
      guestName: reservation.guestName,
      guestEmail: reservation.guestEmail.value,
      guestPhone: reservation.guestPhone,
      date: reservation.date.toISOString(),
      time: reservation.time,
      partySize: reservation.partySize,
      status: reservation.status.value,
      notes: reservation.notes,
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
    };
  }

  static toDomain(
    dto: CreateReservationDTO,
    restaurantId: string
  ): Reservation {
    return new Reservation({
      restaurantId,
      guestName: dto.guestName,
      guestEmail: new Email(dto.guestEmail),
      guestPhone: dto.guestPhone,
      date: new Date(dto.date),
      time: dto.time,
      partySize: dto.partySize,
      status: ReservationStatus.pending(),
      notes: dto.notes,
    });
  }

  static toDTOList(reservations: Reservation[]): ReservationDTO[] {
    return reservations.map((reservation) => this.toDTO(reservation));
  }
}
