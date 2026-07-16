import { Reservation } from '../entities/Reservation';

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
   * Not tenant-scoped on purpose: callers must check the entity's
   * restaurantId against the current tenant (see assertSameTenant) so
   * cross-tenant access can be rejected with 403 instead of 404.
   */
  findById(id: string): Promise<Reservation | null>;
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
  update(reservation: Reservation): Promise<Reservation>;
  delete(restaurantId: string, id: string): Promise<void>;
}
