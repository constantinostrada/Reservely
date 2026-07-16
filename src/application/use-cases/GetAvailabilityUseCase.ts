import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import {
  AvailabilityService,
  OPENING_TIME,
  CLOSING_TIME,
} from '@domain/services/AvailabilityService';
import { DEFAULT_RESERVATION_DURATION_MINUTES } from '@domain/entities/Reservation';
import { EntityNotFoundException } from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { localWindowToUtcSlot } from '../common/timeZone';
import { AvailabilityDTO, GetAvailabilityDTO } from '../dtos/AvailabilityDTO';

export class GetAvailabilityUseCase {
  constructor(
    private readonly reservationRepository: IReservationRepository,
    private readonly tableRepository: ITableRepository,
    private readonly restaurantRepository: IRestaurantRepository,
    private readonly availabilityService: AvailabilityService
  ) {}

  async execute(
    dto: GetAvailabilityDTO,
    context: TenantContext
  ): Promise<AvailabilityDTO> {
    const restaurant = await this.restaurantRepository.findById(
      context.restaurantId
    );
    if (!restaurant) {
      throw new EntityNotFoundException('Restaurant', context.restaurantId);
    }

    // Convert at the boundary: the requested local calendar date becomes a
    // UTC service window; everything below is pure UTC math.
    const serviceWindow = localWindowToUtcSlot(
      dto.date,
      OPENING_TIME,
      CLOSING_TIME,
      restaurant.timezone
    );

    const [tables, reservations] = await Promise.all([
      this.tableRepository.findAvailableTables(context.restaurantId),
      this.reservationRepository.findOverlapping(
        context.restaurantId,
        serviceWindow.start,
        serviceWindow.end
      ),
    ]);

    const availability = this.availabilityService.computeFreeSlots(
      tables,
      reservations,
      serviceWindow,
      dto.partySize,
      DEFAULT_RESERVATION_DURATION_MINUTES
    );

    return {
      restaurantId: restaurant.id,
      date: dto.date,
      timezone: restaurant.timezone,
      partySize: dto.partySize,
      slotDurationMinutes: DEFAULT_RESERVATION_DURATION_MINUTES,
      tables: availability.map(({ table, freeSlots }) => ({
        tableId: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        location: table.location,
        freeSlots: freeSlots.map((slot) => ({
          startsAt: slot.start.toISOString(),
          endsAt: slot.end.toISOString(),
        })),
      })),
    };
  }
}
