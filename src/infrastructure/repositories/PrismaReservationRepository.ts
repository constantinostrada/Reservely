import { PrismaClient } from '@prisma/client';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { Reservation } from '@domain/entities/Reservation';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';

export class PrismaReservationRepository implements IReservationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(reservation: Reservation): Promise<Reservation> {
    const data = {
      id: reservation.id,
      guestName: reservation.guestName,
      guestEmail: reservation.guestEmail.value,
      guestPhone: reservation.guestPhone || null,
      date: reservation.date,
      time: reservation.time,
      partySize: reservation.partySize,
      status: reservation.status.value,
      notes: reservation.notes || null,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };

    const created = await this.prisma.reservation.create({ data });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<Reservation | null> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    return reservation ? this.toDomain(reservation) : null;
  }

  async findByEmail(email: string): Promise<Reservation[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: { guestEmail: email },
      orderBy: { date: 'desc' },
    });

    return reservations.map((r) => this.toDomain(r));
  }

  async findByDate(date: Date): Promise<Reservation[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { time: 'asc' },
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
    const data = {
      guestName: reservation.guestName,
      guestEmail: reservation.guestEmail.value,
      guestPhone: reservation.guestPhone || null,
      date: reservation.date,
      time: reservation.time,
      partySize: reservation.partySize,
      status: reservation.status.value,
      notes: reservation.notes || null,
      updatedAt: new Date(),
    };

    const updated = await this.prisma.reservation.update({
      where: { id: reservation.id },
      data,
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.reservation.delete({
      where: { id },
    });
  }

  private toDomain(data: {
    id: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string | null;
    date: Date;
    time: string;
    partySize: number;
    status: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Reservation {
    return new Reservation({
      id: data.id,
      guestName: data.guestName,
      guestEmail: new Email(data.guestEmail),
      guestPhone: data.guestPhone || undefined,
      date: data.date,
      time: data.time,
      partySize: data.partySize,
      status: ReservationStatus.fromString(data.status),
      notes: data.notes || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
