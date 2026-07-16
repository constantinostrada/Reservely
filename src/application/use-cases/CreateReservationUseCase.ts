import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import {
  AvailabilityService,
  OPENING_TIME,
  CLOSING_TIME,
} from '@domain/services/AvailabilityService';
import { ReservationDomainService } from '@domain/services/ReservationDomainService';
import { DEFAULT_RESERVATION_DURATION_MINUTES } from '@domain/entities/Reservation';
import { TimeSlot } from '@domain/value-objects/TimeSlot';
import {
  ConflictException,
  EntityNotFoundException,
  ValidationException,
} from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { zonedTimeToUtc, localWindowToUtcSlot } from '../common/timeZone';
import { CreateReservationDTO, ReservationDTO } from '../dtos/ReservationDTO';
import { ReservationMapper } from '../mappers/ReservationMapper';

export class CreateReservationUseCase {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly tableRepository: ITableRepository,
    private readonly restaurantRepository: IRestaurantRepository,
    private readonly domainService: ReservationDomainService,
    private readonly availabilityService: AvailabilityService
  ) {}

  async execute(
    dto: CreateReservationDTO,
    context: TenantContext
  ): Promise<ReservationDTO> {
    // The restaurant always comes from the authenticated tenant, never from
    // client input; its time zone anchors all wall-clock → UTC conversion.
    const restaurant = await this.restaurantRepository.findById(
      context.restaurantId
    );
    if (!restaurant) {
      throw new EntityNotFoundException('Restaurant', context.restaurantId);
    }

    // Convert at the boundary: local date/time → UTC instants
    const startsAt = zonedTimeToUtc(dto.date, dto.time, restaurant.timezone);
    const slot = TimeSlot.fromDuration(
      startsAt,
      DEFAULT_RESERVATION_DURATION_MINUTES
    );

    const serviceWindow = localWindowToUtcSlot(
      dto.date,
      OPENING_TIME,
      CLOSING_TIME,
      restaurant.timezone
    );
    if (!this.availabilityService.isWithinServiceWindow(slot, serviceWindow)) {
      throw new ValidationException(
        `Reservation time is outside of restaurant operating hours ` +
          `(${OPENING_TIME}–${CLOSING_TIME} restaurant time)`
      );
    }

    const availableTables = await this.tableRepository.findAvailableTables(
      context.restaurantId
    );
    const candidateTables = dto.tableId
      ? availableTables.filter(
          (t) => t.id === dto.tableId && t.canAccommodate(dto.partySize)
        )
      : this.domainService.findSuitableTables(dto.partySize, availableTables);

    if (candidateTables.length === 0) {
      throw new ValidationException(
        dto.tableId
          ? `Table ${dto.tableId} is not available for a party of ${dto.partySize}`
          : `No tables available to accommodate a party of ${dto.partySize}`
      );
    }

    // Try to place a transactional hold. The repository guarantees that of
    // two concurrent holds on the same table/slot exactly one succeeds; when
    // the guest didn't pin a table, fall through to the next suitable one.
    for (const table of candidateTables) {
      const reservation = ReservationMapper.toDomain(
        dto,
        context.restaurantId,
        table.id,
        slot.start,
        slot.end
      );
      try {
        const saved =
          await this.reservationRepository.createWithSlotHold(reservation);
        return ReservationMapper.toDTO(saved);
      } catch (error) {
        if (error instanceof ConflictException && !dto.tableId) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException(
      'This time slot conflicts with an existing reservation'
    );
  }
}
