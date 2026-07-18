import { Reservation } from '../entities/Reservation';
import { Table } from '../entities/Table';
import { TimeSlot } from '../value-objects/TimeSlot';
import { TableCombinationService } from './TableCombinationService';

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

/** A slot that can only be served by pushing several adjacent tables together. */
export interface CombinationAvailability {
  slot: TimeSlot;
  tables: Table[];
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

  /**
   * Whether at least one table could seat the party for the given slot — i.e.
   * the slot is NOT fully booked. A table qualifies when it can accommodate
   * the party and no active reservation on it overlaps the slot. This is the
   * rule that decides whether a guest should book directly or join a waitlist.
   */
  public hasFreeTableForSlot(
    tables: Table[],
    reservations: Reservation[],
    slot: TimeSlot,
    partySize: number
  ): boolean {
    return tables.some(
      (table) =>
        table.canAccommodate(partySize) &&
        !reservations.some(
          (r) => r.tableId === table.id && r.conflictsWith(slot)
        )
    );
  }

  /** Tables with no active reservation overlapping the slot (status-available only). */
  public freeTablesForSlot(
    tables: Table[],
    reservations: Reservation[],
    slot: TimeSlot
  ): Table[] {
    return tables.filter(
      (table) =>
        table.isAvailable() &&
        !reservations.some(
          (r) => r.tableId === table.id && r.conflictsWith(slot)
        )
    );
  }

  /**
   * Slots that no single table can serve for the party, but a combination of
   * adjacent tables can. For each candidate slot where every free table is too
   * small on its own, the combination service proposes the best set of tables
   * to push together. Slots already coverable by a single table are omitted —
   * those are reported by computeFreeSlots.
   */
  public computeCombinationSlots(
    tables: Table[],
    reservations: Reservation[],
    serviceWindow: TimeSlot,
    partySize: number,
    durationMinutes: number,
    combinationService: TableCombinationService
  ): CombinationAvailability[] {
    const candidates = this.generateCandidateSlots(
      serviceWindow,
      durationMinutes
    );

    const result: CombinationAvailability[] = [];
    for (const slot of candidates) {
      const free = this.freeTablesForSlot(tables, reservations, slot);

      // A single free table already seats this party → not a combination slot.
      if (free.some((table) => table.canAccommodate(partySize))) {
        continue;
      }

      const combinations = combinationService.findCombinations(free, partySize);
      if (combinations.length > 0) {
        result.push({ slot, tables: combinations[0] });
      }
    }

    return result;
  }
}
