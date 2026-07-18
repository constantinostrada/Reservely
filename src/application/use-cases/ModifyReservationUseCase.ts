import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import { IWaitlistRepository } from '@domain/repositories/IWaitlistRepository';
import {
  AvailabilityService,
  OPENING_TIME,
  CLOSING_TIME,
} from '@domain/services/AvailabilityService';
import { ReservationDomainService } from '@domain/services/ReservationDomainService';
import { TableCombinationService } from '@domain/services/TableCombinationService';
import {
  DEFAULT_RESERVATION_DURATION_MINUTES,
  Reservation,
} from '@domain/entities/Reservation';
import { Table } from '@domain/entities/Table';
import { TimeSlot } from '@domain/value-objects/TimeSlot';
import {
  ConflictException,
  EntityNotFoundException,
  ValidationException,
} from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { assertSameTenant } from '../common/tenantGuard';
import {
  zonedTimeToUtc,
  localWindowToUtcSlot,
  utcToZonedDateTime,
} from '../common/timeZone';
import { UpdateReservationDTO, ReservationDTO } from '../dtos/ReservationDTO';
import { ReservationMapper } from '../mappers/ReservationMapper';
import { IEventPublisher } from '../ports/IEventPublisher';

/**
 * Reschedule and/or resize an existing booking (plus simple detail edits).
 *
 * The heart of it is the atomic swap: the new slot hold is taken and the old
 * one released in ONE repository transaction (swapSlotHold), so a failed move
 * leaves the original reservation untouched — the guest can never end up
 * without a booking. The booking keeps its primary row id across the move,
 * so orders placed against it stay attached.
 *
 * Table selection mirrors CreateReservationUseCase: prefer keeping the
 * current table(s), else the smallest suitable single table, else fall back
 * to combining adjacent tables (B12) when the party outgrows every single
 * table. If every candidate is taken the guest gets a ConflictException
 * (409). Old tables freed by a successful move are offered to the waitlist
 * (B11), like a cancellation would.
 */
export class ModifyReservationUseCase {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly tableRepository: ITableRepository,
    private readonly restaurantRepository: IRestaurantRepository,
    private readonly domainService: ReservationDomainService,
    private readonly availabilityService: AvailabilityService,
    private readonly combinationService: TableCombinationService,
    private readonly waitlistRepository: IWaitlistRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(
    id: string,
    dto: UpdateReservationDTO,
    context: TenantContext
  ): Promise<ReservationDTO> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new EntityNotFoundException('Reservation', id);
    }
    assertSameTenant(reservation.restaurantId, context);

    if (
      !reservation.status.isPending() &&
      !reservation.status.isConfirmed()
    ) {
      throw new ValidationException(
        `A ${reservation.status.value} reservation cannot be modified`
      );
    }

    const restaurant = await this.restaurantRepository.findById(
      context.restaurantId
    );
    if (!restaurant) {
      throw new EntityNotFoundException('Restaurant', context.restaurantId);
    }

    // Every row the booking currently holds (a combined booking holds one
    // per table). Rows that no longer block a table have nothing to swap.
    const currentRows = reservation.combinationId
      ? (
          await this.reservationRepository.findByCombinationId(
            reservation.restaurantId,
            reservation.combinationId
          )
        ).filter((row) => row.blocksTable())
      : [reservation];

    const partySize = dto.partySize ?? reservation.partySize;
    const slotChanged = dto.date !== undefined || dto.time !== undefined;
    const slot = slotChanged
      ? this.resolveNewSlot(dto, reservation, restaurant.timezone)
      : reservation.slot;

    const availableTables = await this.tableRepository.findAvailableTables(
      context.restaurantId
    );
    const tablesById = new Map(availableTables.map((t) => [t.id, t]));

    // Builds one row of the new hold; guest identity and detail edits apply
    // to every row, and the primary row keeps its id (and creation time).
    const buildRow = (opts: {
      id?: string;
      tableId: string;
      combinationId?: string;
      createdAt?: Date;
    }): Reservation =>
      new Reservation({
        id: opts.id,
        restaurantId: reservation.restaurantId,
        tableId: opts.tableId,
        guestName: dto.guestName ?? reservation.guestName,
        guestEmail: reservation.guestEmail,
        guestPhone: dto.guestPhone ?? reservation.guestPhone,
        startsAt: slot.start,
        endsAt: slot.end,
        partySize,
        status: reservation.status,
        notes: dto.notes ?? reservation.notes,
        combinationId: opts.combinationId,
        createdAt: opts.createdAt,
      });

    // Same slot and the current table(s) still seat the party: update the
    // held rows in place, nothing to re-select.
    const currentTables = currentRows
      .map((row) => (row.tableId ? tablesById.get(row.tableId) : undefined))
      .filter((t): t is Table => t !== undefined);
    const currentCapacity = currentTables.reduce(
      (sum, table) => sum + table.capacity,
      0
    );
    if (
      !slotChanged &&
      currentTables.length === currentRows.length &&
      currentCapacity >= partySize
    ) {
      const ordered = [
        reservation,
        ...currentRows.filter((row) => row.id !== reservation.id),
      ];
      const updated = await this.reservationRepository.swapSlotHold({
        hold: ordered.map((row) =>
          buildRow({
            id: row.id,
            tableId: row.tableId as string,
            combinationId: row.combinationId,
            createdAt: row.createdAt,
          })
        ),
        releaseIds: [],
      });
      return ReservationMapper.toDTO(updated);
    }

    // The booking moves: to a new slot, and/or to table(s) that fit the new
    // party. Anything the swap doesn't reuse is released by it.
    const releaseIds = currentRows
      .filter((row) => row.id !== reservation.id)
      .map((row) => row.id);

    // Prefer keeping the guest's current table when it still fits.
    const suitable = this.domainService.findSuitableTables(
      partySize,
      availableTables
    );
    const currentTable = reservation.tableId
      ? tablesById.get(reservation.tableId)
      : undefined;
    const candidateTables =
      currentTable && currentTable.canAccommodate(partySize)
        ? [currentTable, ...suitable.filter((t) => t.id !== currentTable.id)]
        : suitable;

    for (const table of candidateTables) {
      try {
        const updated = await this.reservationRepository.swapSlotHold({
          hold: [
            buildRow({
              id: reservation.id,
              tableId: table.id,
              createdAt: reservation.createdAt,
            }),
          ],
          releaseIds,
        });
        return await this.finishSwap(updated, currentRows);
      } catch (error) {
        if (error instanceof ConflictException) {
          continue;
        }
        throw error;
      }
    }

    // No single table fits (party outgrew them, or every suitable one was
    // taken): fall back to combining adjacent tables, like CreateReservation.
    const combinations = this.combinationService.findCombinations(
      availableTables,
      partySize
    );
    for (const combination of combinations) {
      const combinationId = this.generateCombinationId();
      const hold = combination.map((table, index) =>
        buildRow({
          id: index === 0 ? reservation.id : undefined,
          tableId: table.id,
          combinationId,
          createdAt: index === 0 ? reservation.createdAt : undefined,
        })
      );
      try {
        const updated = await this.reservationRepository.swapSlotHold({
          hold,
          releaseIds,
        });
        return await this.finishSwap(updated, currentRows, hold);
      } catch (error) {
        if (error instanceof ConflictException) {
          continue;
        }
        throw error;
      }
    }

    if (candidateTables.length === 0 && combinations.length === 0) {
      throw new ValidationException(
        `No tables available to accommodate a party of ${partySize}`
      );
    }

    throw new ConflictException(
      'The requested time slot conflicts with an existing reservation'
    );
  }

  /**
   * The new UTC slot from the DTO's local date/time; whichever half was not
   * provided is carried over from the reservation's current start, read in
   * the restaurant's time zone. Must land inside service hours and in the
   * future (rescheduling into the past would immediately count as a
   * no-show).
   */
  private resolveNewSlot(
    dto: UpdateReservationDTO,
    reservation: Reservation,
    timezone: string
  ): TimeSlot {
    const current = utcToZonedDateTime(reservation.startsAt, timezone);
    const date = dto.date ?? current.date;
    const time = dto.time ?? current.time;
    const startsAt = zonedTimeToUtc(date, time, timezone);
    const slot = TimeSlot.fromDuration(
      startsAt,
      DEFAULT_RESERVATION_DURATION_MINUTES
    );

    const serviceWindow = localWindowToUtcSlot(
      date,
      OPENING_TIME,
      CLOSING_TIME,
      timezone
    );
    if (!this.availabilityService.isWithinServiceWindow(slot, serviceWindow)) {
      throw new ValidationException(
        `Reservation time is outside of restaurant operating hours ` +
          `(${OPENING_TIME}–${CLOSING_TIME} restaurant time)`
      );
    }
    if (slot.start.getTime() <= Date.now()) {
      throw new ValidationException(
        'A reservation can only be moved to a future time'
      );
    }
    return slot;
  }

  /**
   * After a successful swap, offer every table/slot the booking no longer
   * holds to the waitlist — a move frees the old spot exactly like a
   * cancellation (B11). Best-effort and race-safe: promotion re-checks that
   * the slot is really open, so a table the booking kept is never given away.
   */
  private async finishSwap(
    updatedPrimary: Reservation,
    previousRows: Reservation[],
    newHold?: Reservation[]
  ): Promise<ReservationDTO> {
    const held = new Set(
      (newHold ?? [updatedPrimary]).map(
        (row) => `${row.tableId}|${row.startsAt.getTime()}`
      )
    );

    for (const row of previousRows) {
      if (!row.tableId) {
        continue;
      }
      if (held.has(`${row.tableId}|${row.startsAt.getTime()}`)) {
        continue;
      }
      const promotion = await this.waitlistRepository.promoteNextForFreedSlot({
        restaurantId: row.restaurantId,
        tableId: row.tableId,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
      });
      if (promotion) {
        this.eventPublisher.publish({
          type: 'waitlist.promoted',
          occurredAt: new Date(),
          waitlistEntryId: promotion.entry.id,
          reservationId: promotion.reservation.id,
          restaurantId: promotion.reservation.restaurantId,
          guestName: promotion.reservation.guestName,
          guestEmail: promotion.reservation.guestEmail.value,
          guestPhone: promotion.reservation.guestPhone,
          startsAt: promotion.reservation.startsAt,
          partySize: promotion.reservation.partySize,
        });
      }
    }

    return ReservationMapper.toDTO(updatedPrimary);
  }

  /** Shared id linking every table row of one combined booking. */
  private generateCombinationId(): string {
    return `comb-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}
