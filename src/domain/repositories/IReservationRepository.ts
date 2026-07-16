import { Reservation } from '../entities/Reservation';

export interface IReservationRepository {
  save(reservation: Reservation): Promise<Reservation>;
  findById(id: string): Promise<Reservation | null>;
  findByEmail(email: string): Promise<Reservation[]>;
  findByDate(date: Date): Promise<Reservation[]>;
  findAll(): Promise<Reservation[]>;
  update(reservation: Reservation): Promise<Reservation>;
  delete(id: string): Promise<void>;
}
