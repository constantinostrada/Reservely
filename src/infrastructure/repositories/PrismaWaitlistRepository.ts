import {
  Prisma,
  PrismaClient,
  WaitlistEntry as PrismaWaitlistEntry,
  WaitlistStatus as PrismaWaitlistStatus,
} from '@prisma/client';
import {
  FreedSlot,
  IWaitlistRepository,
  WaitlistPromotion,
} from '@domain/repositories/IWaitlistRepository';
import { WaitlistEntry } from '@domain/entities/WaitlistEntry';
import {
  DEFAULT_RESERVATION_DURATION_MINUTES,
  Reservation,
} from '@domain/entities/Reservation';
import { Email } from '@domain/value-objects/Email';
import { WaitlistStatus } from '@domain/value-objects/WaitlistStatus';
import { ReservationStatus } from '@domain/value-objects/ReservationStatus';
import { withTenant } from './tenantScope';

/** Shape of a waitlist row returned by the raw locking query (snake_case). */
interface WaitlistRow {
  id: string;
  restaurant_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  party_size: number;
  starts_at: Date;
  ends_at: Date;
  status: string;
  promoted_reservation_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export class PrismaWaitlistRepository implements IWaitlistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(entry: WaitlistEntry): Promise<WaitlistEntry> {
    const created = await this.prisma.waitlistEntry.create({
      data: this.toCreateData(entry),
    });
    return this.toDomain(created);
  }

  async findById(id: string): Promise<WaitlistEntry | null> {
    const entry = await this.prisma.waitlistEntry.findUnique({ where: { id } });
    return entry ? this.toDomain(entry) : null;
  }

  async findWaiting(restaurantId: string): Promise<WaitlistEntry[]> {
    const entries = await this.prisma.waitlistEntry.findMany({
      where: withTenant(restaurantId, { status: PrismaWaitlistStatus.WAITING }),
      orderBy: { createdAt: 'asc' },
    });
    return entries.map((e) => this.toDomain(e));
  }

  async countWaitingForSlot(
    restaurantId: string,
    startsAt: Date
  ): Promise<number> {
    return this.prisma.waitlistEntry.count({
      where: withTenant(restaurantId, {
        startsAt,
        status: PrismaWaitlistStatus.WAITING,
      }),
    });
  }

  /**
   * Concurrency-safe promotion. Inside one transaction:
   *  1. lock the freed table row (SELECT ... FOR UPDATE) so a concurrent
   *     booking cannot take the slot between our check and our insert;
   *  2. confirm the freed slot is still open (no slot-blocking reservation);
   *  3. pick the oldest eligible waiting entry with FOR UPDATE SKIP LOCKED, so
   *     two cancellations freeing space at once each grab a *different* entry
   *     (or none) — the same entry can never be promoted twice;
   *  4. create a CONFIRMED reservation for that guest and mark the entry
   *     promoted, all atomically.
   */
  async promoteNextForFreedSlot(
    slot: FreedSlot
  ): Promise<WaitlistPromotion | null> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const lockedTable = await tx.$queryRaw<
        Array<{ id: string; capacity: number }>
      >`
        SELECT id, capacity FROM tables
        WHERE id = ${slot.tableId} AND restaurant_id = ${slot.restaurantId}
        FOR UPDATE
      `;
      if (lockedTable.length === 0) {
        return null;
      }
      const capacity = lockedTable[0].capacity;

      const conflicts = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM reservations
        WHERE table_id = ${slot.tableId}
          AND status::text IN ('PENDING', 'CONFIRMED', 'SEATED')
          AND starts_at < ${slot.endsAt}
          AND COALESCE(
                ends_at,
                starts_at
                  + ${DEFAULT_RESERVATION_DURATION_MINUTES} * interval '1 minute'
              ) > ${slot.startsAt}
        LIMIT 1
      `;
      if (conflicts.length > 0) {
        // Someone re-booked the freed table for this slot; nothing to promote.
        return null;
      }

      const rows = await tx.$queryRaw<WaitlistRow[]>`
        SELECT id, restaurant_id, guest_name, guest_email, guest_phone,
               party_size, starts_at, ends_at, status,
               promoted_reservation_id, created_at, updated_at
        FROM waitlist_entries
        WHERE restaurant_id = ${slot.restaurantId}
          AND starts_at = ${slot.startsAt}
          AND status = 'WAITING'
          AND party_size <= ${capacity}
          AND starts_at > ${now}
        ORDER BY created_at ASC, id ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;
      if (rows.length === 0) {
        return null;
      }

      const entry = this.rawToDomain(rows[0]);

      // Confirmed reservation for the promoted guest, filling the freed slot.
      const reservation = new Reservation({
        restaurantId: slot.restaurantId,
        tableId: slot.tableId,
        guestName: entry.guestName,
        guestEmail: entry.guestEmail,
        guestPhone: entry.guestPhone,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        partySize: entry.partySize,
        status: ReservationStatus.confirmed(),
      });

      await tx.reservation.create({
        data: {
          id: reservation.id,
          restaurantId: reservation.restaurantId,
          tableId: reservation.tableId!,
          guestName: reservation.guestName,
          guestEmail: reservation.guestEmail.value,
          guestPhone: reservation.guestPhone ?? null,
          startsAt: reservation.startsAt,
          endsAt: reservation.endsAt,
          partySize: reservation.partySize,
          status: 'CONFIRMED',
          notes: null,
          createdAt: reservation.createdAt,
          updatedAt: reservation.updatedAt,
        },
      });

      entry.promote(reservation.id);
      await tx.waitlistEntry.update({
        where: { id: entry.id },
        data: {
          status: PrismaWaitlistStatus.PROMOTED,
          promotedReservationId: reservation.id,
          updatedAt: entry.updatedAt,
        },
      });

      return { reservation, entry };
    });
  }

  async expireStale(restaurantId: string, now: Date): Promise<number> {
    const result = await this.prisma.waitlistEntry.updateMany({
      where: withTenant(restaurantId, {
        status: PrismaWaitlistStatus.WAITING,
        startsAt: { lte: now },
      }),
      data: { status: PrismaWaitlistStatus.EXPIRED, updatedAt: now },
    });
    return result.count;
  }

  private toCreateData(
    entry: WaitlistEntry
  ): Prisma.WaitlistEntryUncheckedCreateInput {
    return {
      id: entry.id,
      restaurantId: entry.restaurantId,
      guestName: entry.guestName,
      guestEmail: entry.guestEmail.value,
      guestPhone: entry.guestPhone || null,
      partySize: entry.partySize,
      startsAt: entry.startsAt,
      endsAt: entry.endsAt,
      status: this.toPersistenceStatus(entry.status),
      promotedReservationId: entry.promotedReservationId || null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  private toPersistenceStatus(status: WaitlistStatus): PrismaWaitlistStatus {
    return status.value.toUpperCase() as PrismaWaitlistStatus;
  }

  private toDomain(data: PrismaWaitlistEntry): WaitlistEntry {
    return new WaitlistEntry({
      id: data.id,
      restaurantId: data.restaurantId,
      guestName: data.guestName,
      guestEmail: new Email(data.guestEmail),
      guestPhone: data.guestPhone || undefined,
      partySize: data.partySize,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      status: WaitlistStatus.fromString(data.status),
      promotedReservationId: data.promotedReservationId || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  private rawToDomain(row: WaitlistRow): WaitlistEntry {
    return new WaitlistEntry({
      id: row.id,
      restaurantId: row.restaurant_id,
      guestName: row.guest_name,
      guestEmail: new Email(row.guest_email),
      guestPhone: row.guest_phone || undefined,
      partySize: Number(row.party_size),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: WaitlistStatus.fromString(row.status),
      promotedReservationId: row.promoted_reservation_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
