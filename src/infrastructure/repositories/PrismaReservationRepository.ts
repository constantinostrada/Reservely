import {
  Prisma,
  PrismaClient,
  Reservation as PrismaReservation,
  ReservationStatus as PrismaReservationStatus,
} from '@prisma/client';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import {
  DEFAULT_RESERVATION_DURATION_MINUTES,
  Reservation,
} from '@domain/entities/Reservation';
import { Email } from '@domain/value-objects/Email';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import {
  ConflictException,
  EntityNotFoundException,
  ValidationException,
} from '@domain/exceptions/DomainException';
import { withTenant } from './tenantScope';

export class PrismaReservationRepository implements IReservationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(reservation: Reservation): Promise<Reservation> {
    const created = await this.prisma.reservation.create({
      data: this.toCreateData(reservation),
    });
    return this.toDomain(created);
  }

  /**
   * Concurrency-safe slot hold. Inside one transaction:
   *  1. lock the table row (SELECT ... FOR UPDATE) so concurrent holds on
   *     the same table serialize — the second waits for the first to commit;
   *  2. re-check for overlapping slot-blocking reservations;
   *  3. insert.
   * The loser of a race therefore always sees the winner's row in step 2
   * and gets a ConflictException — double-booking is impossible.
   */
  async createWithSlotHold(reservation: Reservation): Promise<Reservation> {
    const tableId = reservation.tableId;
    if (!tableId) {
      throw new ValidationException(
        'A reservation must be assigned to a table to hold a slot'
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const lockedTable = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM tables
        WHERE id = ${tableId} AND restaurant_id = ${reservation.restaurantId}
        FOR UPDATE
      `;
      if (lockedTable.length === 0) {
        throw new EntityNotFoundException('Table', tableId);
      }

      // Half-open overlap check; legacy rows without ends_at are assumed to
      // last the standard duration.
      const conflicts = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM reservations
        WHERE table_id = ${tableId}
          AND status::text IN ('PENDING', 'CONFIRMED', 'SEATED')
          AND starts_at < ${reservation.endsAt}
          AND COALESCE(
                ends_at,
                starts_at
                  + ${DEFAULT_RESERVATION_DURATION_MINUTES} * interval '1 minute'
              ) > ${reservation.startsAt}
        LIMIT 1
      `;
      if (conflicts.length > 0) {
        throw new ConflictException(
          'This table is already reserved for the requested time slot'
        );
      }

      return tx.reservation.create({ data: this.toCreateData(reservation) });
    });

    return this.toDomain(created);
  }

  /**
   * Atomic multi-table hold for a combined booking. Inside one transaction:
   *  1. lock every table row (in a stable order, to avoid deadlocks between
   *     two concurrent combined holds);
   *  2. re-check every table for an overlapping slot-blocking reservation;
   *  3. only if all are clear, insert all rows.
   * Because the inserts happen after all checks, a conflict on any one table
   * throws before anything is written — the whole hold rolls back and no table
   * is left partially held.
   */
  async createCombinedWithSlotHold(
    reservations: Reservation[]
  ): Promise<Reservation[]> {
    if (reservations.length === 0) {
      throw new ValidationException(
        'A combined hold requires at least one reservation'
      );
    }
    const restaurantId = reservations[0].restaurantId;
    for (const reservation of reservations) {
      if (!reservation.tableId) {
        throw new ValidationException(
          'A reservation must be assigned to a table to hold a slot'
        );
      }
    }

    // Lock tables in a deterministic order so two combined holds that share
    // tables can never deadlock waiting on each other.
    const ordered = [...reservations].sort((a, b) =>
      (a.tableId as string).localeCompare(b.tableId as string)
    );

    const created = await this.prisma.$transaction(async (tx) => {
      for (const reservation of ordered) {
        const tableId = reservation.tableId as string;
        const lockedTable = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM tables
          WHERE id = ${tableId} AND restaurant_id = ${restaurantId}
          FOR UPDATE
        `;
        if (lockedTable.length === 0) {
          throw new EntityNotFoundException('Table', tableId);
        }
      }

      for (const reservation of ordered) {
        const tableId = reservation.tableId as string;
        const conflicts = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM reservations
          WHERE table_id = ${tableId}
            AND status::text IN ('PENDING', 'CONFIRMED', 'SEATED')
            AND starts_at < ${reservation.endsAt}
            AND COALESCE(
                  ends_at,
                  starts_at
                    + ${DEFAULT_RESERVATION_DURATION_MINUTES} * interval '1 minute'
                ) > ${reservation.startsAt}
          LIMIT 1
        `;
        if (conflicts.length > 0) {
          throw new ConflictException(
            'One of the tables in the combination is already reserved for the requested time slot'
          );
        }
      }

      const rows: PrismaReservation[] = [];
      for (const reservation of ordered) {
        rows.push(
          await tx.reservation.create({ data: this.toCreateData(reservation) })
        );
      }
      return rows;
    });

    return created.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<Reservation | null> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
    });

    return reservation ? this.toDomain(reservation) : null;
  }

  async findByCombinationId(
    restaurantId: string,
    combinationId: string
  ): Promise<Reservation[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: withTenant(restaurantId, { combinationId }),
      orderBy: { createdAt: 'asc' },
    });

    return reservations.map((r) => this.toDomain(r));
  }

  async findByEmail(
    restaurantId: string,
    email: string
  ): Promise<Reservation[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: withTenant(restaurantId, { guestEmail: email }),
      orderBy: { startsAt: 'desc' },
    });

    return reservations.map((r) => this.toDomain(r));
  }

  async findOverlapping(
    restaurantId: string,
    rangeStart: Date,
    rangeEnd: Date
  ): Promise<Reservation[]> {
    // A reservation intersects the range when it starts before the range
    // ends and ends after the range starts. Rows without ends_at are given
    // the standard duration, so compare starts_at against a widened bound.
    const defaultDurationMs = DEFAULT_RESERVATION_DURATION_MINUTES * 60_000;
    const reservations = await this.prisma.reservation.findMany({
      where: withTenant(restaurantId, {
        startsAt: { lt: rangeEnd },
        OR: [
          { endsAt: { gt: rangeStart } },
          {
            endsAt: null,
            startsAt: { gt: new Date(rangeStart.getTime() - defaultDurationMs) },
          },
        ],
      }),
      orderBy: { startsAt: 'asc' },
    });

    return reservations.map((r) => this.toDomain(r));
  }

  async findAll(restaurantId: string): Promise<Reservation[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: withTenant(restaurantId),
      orderBy: { createdAt: 'desc' },
    });

    return reservations.map((r) => this.toDomain(r));
  }

  async update(reservation: Reservation): Promise<Reservation> {
    const updated = await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        tableId: reservation.tableId || null,
        guestName: reservation.guestName,
        guestEmail: reservation.guestEmail.value,
        guestPhone: reservation.guestPhone || null,
        startsAt: reservation.startsAt,
        endsAt: reservation.endsAt,
        partySize: reservation.partySize,
        status: this.toPersistenceStatus(reservation.status),
        notes: reservation.notes || null,
        combinationId: reservation.combinationId || null,
        updatedAt: new Date(),
      },
    });

    return this.toDomain(updated);
  }

  async delete(restaurantId: string, id: string): Promise<void> {
    // deleteMany so the tenant filter applies; delete() only accepts the
    // unique id and could remove another restaurant's row
    await this.prisma.reservation.deleteMany({
      where: withTenant(restaurantId, { id }),
    });
  }

  private toCreateData(
    reservation: Reservation
  ): Prisma.ReservationUncheckedCreateInput {
    return {
      id: reservation.id,
      restaurantId: reservation.restaurantId,
      tableId: reservation.tableId || null,
      guestName: reservation.guestName,
      guestEmail: reservation.guestEmail.value,
      guestPhone: reservation.guestPhone || null,
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      partySize: reservation.partySize,
      status: this.toPersistenceStatus(reservation.status),
      notes: reservation.notes || null,
      combinationId: reservation.combinationId || null,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };
  }

  private toPersistenceStatus(
    status: ReservationStatus
  ): PrismaReservationStatus {
    return status.value.toUpperCase() as PrismaReservationStatus;
  }

  private toDomain(data: PrismaReservation): Reservation {
    return new Reservation({
      id: data.id,
      restaurantId: data.restaurantId,
      tableId: data.tableId || undefined,
      guestName: data.guestName,
      guestEmail: new Email(data.guestEmail),
      guestPhone: data.guestPhone || undefined,
      startsAt: data.startsAt,
      endsAt: data.endsAt || undefined,
      partySize: data.partySize,
      status: ReservationStatus.fromString(data.status),
      notes: data.notes || undefined,
      combinationId: data.combinationId || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
