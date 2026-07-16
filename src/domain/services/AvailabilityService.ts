import { Reservation } from '../entities/Reservation';
import { Table } from '../entities/Table';
import { TimeSlot } from '../value-objects/TimeSlot';

/**
 * Slot policy: reservations start every 30 minutes and last 90 minutes.
 * The service window (opening hours converted to UTC instants for a given
 * day) is supplied by the caller — this service is pure UTC math and knows
 * nothing about time zones or calendars.
 */
export const SLOT_INTERVAL_MINUTES = 30;
export const OPENING_TIME = '11:00';
export const CLOSING_TIME = '22:00';

export interface TableAvailability {
  table: Table;
  freeSlots: TimeSlot[];
}

export class AvailabilityService {
  /**
   * Candidate slots of `durationMinutes` starting every `intervalMinutes`,
   * such that each slot fits entirely inside the service window. On DST
   * transition days the window is shorter or longer in real time than on
   * paper — deriving slots from the UTC instants handles that for free.
   */
  public generateCandidateSlots(
    serviceWindow: TimeSlot,
    durationMinutes: number,
    intervalMinutes: number = SLOT_INTERVAL_MINUTES
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const intervalMs = intervalMinutes * 60_000;
    const durationMs = durationMinutes * 60_000;
    const windowEnd = serviceWindow.end.getTime();

    for (
      let start = serviceWindow.start.getTime();
      start + durationMs <= windowEnd;
      start += intervalMs
    ) {
      slots.push(
        new TimeSlot(new Date(start), new Date(start + durationMs))
      );
    }

    return slots;
  }

  /**
   * Free slots per table for the given party size. A slot is free for a
   * table when no active (slot-blocking) reservation on that table overlaps
   * it. Tables that cannot accommodate the party are excluded entirely.
   */
  public computeFreeSlots(
    tables: Table[],
    reservations: Reservation[],
    serviceWindow: TimeSlot,
    partySize: number,
    durationMinutes: number
  ): TableAvailability[] {
    const candidates = this.generateCandidateSlots(
      serviceWindow,
      durationMinutes
    );

    return tables
      .filter((table) => table.canAccommodate(partySize))
      .map((table) => {
        const tableReservations = reservations.filter(
          (r) => r.tableId === table.id
        );
        return {
          table,
          freeSlots: candidates.filter(
            (slot) => !tableReservations.some((r) => r.conflictsWith(slot))
          ),
        };
      });
  }

  /** Whether a requested slot is bookable within the day's service window. */
  public isWithinServiceWindow(slot: TimeSlot, serviceWindow: TimeSlot): boolean {
    return slot.isWithin(serviceWindow);
  }
}
