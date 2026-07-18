import { WaitlistEntry } from '@domain/entities/WaitlistEntry';
import { WaitlistEntryDTO } from '../dtos/WaitlistDTO';

export class WaitlistMapper {
  static toDTO(entry: WaitlistEntry, position?: number): WaitlistEntryDTO {
    return {
      id: entry.id,
      restaurantId: entry.restaurantId,
      guestName: entry.guestName,
      guestEmail: entry.guestEmail.value,
      guestPhone: entry.guestPhone,
      partySize: entry.partySize,
      startsAt: entry.startsAt.toISOString(),
      endsAt: entry.endsAt.toISOString(),
      status: entry.status.value,
      promotedReservationId: entry.promotedReservationId,
      position,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  static toDTOList(entries: WaitlistEntry[]): WaitlistEntryDTO[] {
    return entries.map((entry) => this.toDTO(entry));
  }
}
