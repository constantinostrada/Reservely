import { Reservation } from '../entities/Reservation';
import { Table } from '../entities/Table';
import { TimeSlot } from '../value-objects/TimeSlot';

export class ReservationDomainService {
  public canAccommodateReservation(
    reservation: Reservation,
    availableTables: Table[]
  ): boolean {
    return availableTables.some((table) =>
      table.canAccommodate(reservation.partySize)
    );
  }

  /** Suitable tables, smallest first so large tables stay free for large parties. */
  public findSuitableTables(
    partySize: number,
    availableTables: Table[]
  ): Table[] {
    return availableTables
      .filter((table) => table.canAccommodate(partySize))
      .sort((a, b) => a.capacity - b.capacity);
  }

  public hasConflict(
    slot: TimeSlot,
    tableId: string,
    existingReservations: Reservation[]
  ): boolean {
    return existingReservations.some(
      (existing) => existing.tableId === tableId && existing.conflictsWith(slot)
    );
  }
}
