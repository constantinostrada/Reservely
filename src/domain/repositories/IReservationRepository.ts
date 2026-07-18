import { Reservation } from '../entities/Reservation';

/** An atomic exchange of a booking's slot hold (see swapSlotHold). */
export interface SlotHoldSwap {
  /**
   * Every row the booking holds after the swap, primary row first. Rows whose
   * id already exists are updated in place (the booking keeps its identity —
   * orders keep pointing at it); new ids are inserted. Each row must carry a
   * tableId, and all rows must share one restaurant.
   */
  hold: Reservation[];
  /** Old rows the swap releases; cancelled atomically with the new hold. */
  releaseIds: string[];
}

export interface IReservationRepository {
  save(reservation: Reservation): Promise<Reservation>;
  /**
   * Atomically create the reservation only if no other slot-blocking
   * reservation overlaps the same table and time slot. Implementations must
   * guarantee that of two concurrent calls for the same table/slot exactly
   * one succeeds; the loser gets a ConflictException. Requires a tableId.
   */
  createWithSlotHold(reservation: Reservation): Promise<Reservation>;
  /**
   * Atomically hold several tables for one large party. All reservations share
   * one combinationId, slot and guest, one per table. Implementations must lock
   * every table and re-check every slot inside a single transaction: if ANY
   * table is already taken the whole hold rolls back (no partial hold), so of
   * two combined holds sharing a table at most one succeeds. Each reservation
   * must carry a tableId. Returns the created rows.
   */
  createCombinedWithSlotHold(
    reservations: Reservation[]
  ): Promise<Reservation[]>;
  /**
   * Atomically move a booking to a new slot hold (reschedule/resize). In one
   * transaction: lock the primary row (refusing if it is no longer
   * pending/confirmed) and every target table, re-check every new row's slot
   * ignoring the booking's own rows, then update/insert the `hold` rows and
   * cancel the `releaseIds` rows. If ANY target slot is taken the whole swap
   * throws a ConflictException and rolls back — the old hold is released ONLY
   * when the new hold succeeds, so the guest is never left without a
   * reservation. Returns the updated primary row.
   */
  swapSlotHold(swap: SlotHoldSwap): Promise<Reservation>;
  /**
   * Not tenant-scoped on purpose: callers must check the entity's
   * restaurantId against the current tenant (see assertSameTenant) so
   * cross-tenant access can be rejected with 403 instead of 404.
   */
  findById(id: string): Promise<Reservation | null>;
  /** Every reservation row of a combined booking, oldest first. */
  findByCombinationId(
    restaurantId: string,
    combinationId: string
  ): Promise<Reservation[]>;
  findByEmail(restaurantId: string, email: string): Promise<Reservation[]>;
  /**
   * Reservations whose [startsAt, endsAt) slot intersects the given UTC
   * range. Callers pass day boundaries already converted from the
   * restaurant's local time zone.
   */
  findOverlapping(
    restaurantId: string,
    rangeStart: Date,
    rangeEnd: Date
  ): Promise<Reservation[]>;
  findAll(restaurantId: string): Promise<Reservation[]>;
  /**
   * Reservations that may be no-shows: still waiting to be seated
   * (pending/confirmed), with both start time and creation time at or before
   * `startedBefore` (a booking created mid-slot gets its grace from creation).
   * Callers pass `now - grace period` so only overdue guests are returned.
   */
  findNoShowCandidates(
    restaurantId: string,
    startedBefore: Date
  ): Promise<Reservation[]>;
  /**
   * Atomically transition the reservation to no-show, but only if it is
   * still waiting to be seated (pending/confirmed). Returns whether THIS call
   * performed the transition: seated/cancelled/completed/already-no-show rows
   * are left untouched and return false, so of two concurrent sweeps exactly
   * one gets true and the freed table is offered to the waitlist only once.
   */
  markNoShowIfUnseated(restaurantId: string, id: string): Promise<boolean>;
  update(reservation: Reservation): Promise<Reservation>;
  delete(restaurantId: string, id: string): Promise<void>;
}
