import { Reservation } from '../entities/Reservation';

export interface IReservationRepository {
  save(reservation: Reservation): Promise<Reservation>;
  /**
   * Not tenant-scoped on purpose: callers must check the entity's
   * restaurantId against the current tenant (see assertSameTenant) so
   * cross-tenant access can be rejected with 403 instead of 404.
   */
  findById(id: string): Promise<Reservation | null>;
  findByEmail(restaurantId: string, email: string): Promise<Reservation[]>;
  findByDate(restaurantId: string, date: Date): Promise<Reservation[]>;
  findAll(restaurantId: string): Promise<Reservation[]>;
  update(reservation: Reservation): Promise<Reservation>;
  delete(restaurantId: string, id: string): Promise<void>;
}
