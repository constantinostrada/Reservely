import { Reservation } from '../entities/Reservation';

export interface IReservationRepository {
  save(reservation: Reservation): Promise<Reservation>;
  findById(id: string): Promise<Reservation | null>;
  findByEmail(restaurantId: string, email: string): Promise<Reservation[]>;
  findByDate(restaurantId: string, date: Date): Promise<Reservation[]>;
  findAll(): Promise<Reservation[]>;
  update(reservation: Reservation): Promise<Reservation>;
  delete(id: string): Promise<void>;
}
