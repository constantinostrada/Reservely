import { IWaitlistRepository } from '@domain/repositories/IWaitlistRepository';
import { IReservationRepository } from '@domain/repositories/IReservationRepository';
import { ITableRepository } from '@domain/repositories/ITableRepository';
import { IRestaurantRepository } from '@domain/repositories/IRestaurantRepository';
import {
  AvailabilityService,
  OPENING_TIME,
  CLOSING_TIME,
} from '@domain/services/AvailabilityService';
import {
  DEFAULT_RESERVATION_DURATION_MINUTES,
} from '@domain/entities/Reservation';
import { WaitlistEntry } from '@domain/entities/WaitlistEntry';
import { WaitlistStatus } from '@domain/value-objects/WaitlistStatus';
import { Email } from '@domain/value-objects/Email';
import { TimeSlot } from '@domain/value-objects/TimeSlot';
import {
  EntityNotFoundException,
  ValidationException,
} from '@domain/exceptions/DomainException';
import { TenantContext } from '../common/TenantContext';
import { zonedTimeToUtc, localWindowToUtcSlot } from '../common/timeZone';
import { JoinWaitlistDTO, WaitlistEntryDTO } from '../dtos/WaitlistDTO';
import { WaitlistMapper } from '../mappers/WaitlistMapper';

/**
 * A guest joins the waitlist for a slot that is currently fully booked. If the
 * slot still has a free table the guest is told to book directly instead — the
 * waitlist only exists for slots with no availability. When a reservation on
 * the slot is later cancelled, CancelReservationUseCase auto-promotes the
 * oldest waiting entry (see IWaitlistRepository.promoteNextForFreedSlot).
 */
export class JoinWaitlistUseCase {
  constructor(
    private readonly waitlistRepository: IWaitlistRepository,
    private readonly reservationRepository: IReservationRepository,
    private readonly tableRepository: ITableRepository,
    private readonly restaurantRepository: IRestaurantRepository,
    private readonly availabilityService: AvailabilityService
  ) {}

  async execute(
    dto: JoinWaitlistDTO,
    context: TenantContext
  ): Promise<WaitlistEntryDTO> {
    const restaurant = await this.restaurantRepository.findById(
      context.restaurantId
    );
    if (!restaurant) {
      throw new EntityNotFoundException('Restaurant', context.restaurantId);
    }

    // Convert at the boundary: local date/time → UTC instants.
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
        `Waitlist time is outside of restaurant operating hours ` +
          `(${OPENING_TIME}–${CLOSING_TIME} restaurant time)`
      );
    }

    // A slot that has already started can never be promoted — refuse it.
    if (slot.start.getTime() <= Date.now()) {
      throw new ValidationException(
        'Cannot join the waitlist for a slot that has already started'
      );
    }

    const [tables, reservations] = await Promise.all([
      this.tableRepository.findAvailableTables(context.restaurantId),
      this.reservationRepository.findOverlapping(
        context.restaurantId,
        slot.start,
        slot.end
      ),
    ]);

    // The waitlist is only for full slots: if a table can still take the party,
    // the guest should just book it.
    if (
      this.availabilityService.hasFreeTableForSlot(
        tables,
        reservations,
        slot,
        dto.partySize
      )
    ) {
      throw new ValidationException(
        'This slot still has availability; please book directly instead of joining the waitlist'
      );
    }

    const entry = new WaitlistEntry({
      restaurantId: context.restaurantId,
      guestName: dto.guestName,
      guestEmail: new Email(dto.guestEmail),
      guestPhone: dto.guestPhone,
      partySize: dto.partySize,
      startsAt: slot.start,
      endsAt: slot.end,
      status: WaitlistStatus.waiting(),
    });

    const saved = await this.waitlistRepository.save(entry);

    // Place in line = number of entries waiting for this slot (the new one last).
    const position = await this.waitlistRepository.countWaitingForSlot(
      context.restaurantId,
      saved.startsAt
    );

    return WaitlistMapper.toDTO(saved, position);
  }
}
