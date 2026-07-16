import {
  PrismaClient,
  Reservation as PrismaReservation,
  ReservationStatus as PrismaReservationStatus,
} from '@prisma/client';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { Reservation } from '@domain/entities/Reservation';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';

export class PrismaReservationRepository implements IReservationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(reservation: Reservation): Promise<Reservation> {
    const created = await this.prisma.reservation.create({
      data: {
        id: reservation.id,
        restaurantId: reservation.restaurantId,
        guestName: reservation.guestName,
        guestEmail: reservation.guestEmail.value,
        guestPhone: reservation.guestPhone || null,
        startsAt: this.toStartsAt(reservation.date, reservation.time),
        partySize: reservation.partySize,
        status: this.toPersistenceStatus(reservation.status),
        notes: reservation.notes || null,
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
      },
    });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<Reservation | null> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    return reservation ? this.toDomain(reservation) : null;
  }

  async findByEmail(
    restaurantId: string,
    email: string
  ): Promise<Reservation[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: { restaurantId, guestEmail: email },
      orderBy: { startsAt: 'desc' },
    });

    return reservations.map((r) => this.toDomain(r));
  }

  async findByDate(restaurantId: string, date: Date): Promise<Reservation[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        restaurantId,
        startsAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    return reservations.map((r) => this.toDomain(r));
  }

  async findAll(): Promise<Reservation[]> {
    const reservations = await this.prisma.reservation.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return reservations.map((r) => this.toDomain(r));
  }

  async update(reservation: Reservation): Promise<Reservation> {
    const updated = await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        guestName: reservation.guestName,
        guestEmail: reservation.guestEmail.value,
        guestPhone: reservation.guestPhone || null,
        startsAt: this.toStartsAt(reservation.date, reservation.time),
        partySize: reservation.partySize,
        status: this.toPersistenceStatus(reservation.status),
        notes: reservation.notes || null,
        updatedAt: new Date(),
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.reservation.delete({
      where: { id },
    });
  }

  private toStartsAt(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const startsAt = new Date(date);
    startsAt.setHours(hours, minutes, 0, 0);
    return startsAt;
  }

  private toPersistenceStatus(
    status: ReservationStatus
  ): PrismaReservationStatus {
    return status.value.toUpperCase() as PrismaReservationStatus;
  }

  private toDomain(data: PrismaReservation): Reservation {
    const hours = String(data.startsAt.getHours()).padStart(2, '0');
    const minutes = String(data.startsAt.getMinutes()).padStart(2, '0');

    return new Reservation({
      id: data.id,
      restaurantId: data.restaurantId,
      guestName: data.guestName,
      guestEmail: new Email(data.guestEmail),
      guestPhone: data.guestPhone || undefined,
      date: data.startsAt,
      time: `${hours}:${minutes}`,
      partySize: data.partySize,
      status: ReservationStatus.fromString(data.status),
      notes: data.notes || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
