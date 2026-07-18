import { WaitlistStatus } from '../value-objects/WaitlistStatus';
import { Email } from '../value-objects/Email';
import { TimeSlot } from '../value-objects/TimeSlot';
import { DEFAULT_RESERVATION_DURATION_MINUTES } from './Reservation';

export interface WaitlistEntryProps {
  id?: string;
  restaurantId: string;
  guestName: string;
  guestEmail: Email;
  guestPhone?: string;
  partySize: number;
  /** UTC instant of the desired slot's start (matches Reservation.startsAt). */
  startsAt: Date;
  /** UTC instant; defaults to startsAt + the standard reservation duration. */
  endsAt?: Date;
  status: WaitlistStatus;
  /** Set once the entry is promoted: the reservation created for the guest. */
  promotedReservationId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A guest waiting for a fully-booked slot to open up. When a reservation on
 * the same slot is cancelled, the oldest waiting entry that fits the freed
 * table is auto-promoted into a confirmed reservation (see
 * IWaitlistRepository.promoteNextForFreedSlot). Entries expire the moment the
 * slot's start time passes — a spot that opens after that is no use.
 */
export class WaitlistEntry {
  private readonly props: WaitlistEntryProps;
  private readonly _slot: TimeSlot;

  constructor(props: WaitlistEntryProps) {
    this.validateProps(props);
    this._slot = props.endsAt
      ? new TimeSlot(props.startsAt, props.endsAt)
      : TimeSlot.fromDuration(
          props.startsAt,
          DEFAULT_RESERVATION_DURATION_MINUTES
        );
    this.props = {
      ...props,
      id: props.id || this.generateId(),
      endsAt: this._slot.end,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  private validateProps(props: WaitlistEntryProps): void {
    if (!props.restaurantId || props.restaurantId.trim().length === 0) {
      throw new Error('Restaurant id is required');
    }
    if (!props.guestName || props.guestName.trim().length === 0) {
      throw new Error('Guest name is required');
    }
    if (props.guestName.length > 100) {
      throw new Error('Guest name must not exceed 100 characters');
    }
    if (props.partySize < 1) {
      throw new Error('Party size must be at least 1');
    }
    if (props.partySize > 50) {
      throw new Error('Party size cannot exceed 50');
    }
    if (!props.startsAt || isNaN(props.startsAt.getTime())) {
      throw new Error('Waitlist slot start time is required');
    }
    if (props.guestPhone && props.guestPhone.length > 20) {
      throw new Error('Phone number must not exceed 20 characters');
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  get id(): string {
    return this.props.id!;
  }

  get restaurantId(): string {
    return this.props.restaurantId;
  }

  get guestName(): string {
    return this.props.guestName;
  }

  get guestEmail(): Email {
    return this.props.guestEmail;
  }

  get guestPhone(): string | undefined {
    return this.props.guestPhone;
  }

  get partySize(): number {
    return this.props.partySize;
  }

  get startsAt(): Date {
    return this._slot.start;
  }

  get endsAt(): Date {
    return this._slot.end;
  }

  get slot(): TimeSlot {
    return this._slot;
  }

  get status(): WaitlistStatus {
    return this.props.status;
  }

  get promotedReservationId(): string | undefined {
    return this.props.promotedReservationId;
  }

  get createdAt(): Date {
    return this.props.createdAt!;
  }

  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  // Business methods

  /** Hand this entry a freed slot: it becomes promoted, linked to a reservation. */
  public promote(reservationId: string): void {
    if (!this.props.status.isWaiting()) {
      throw new Error('Only a waiting entry can be promoted');
    }
    this.props.status = WaitlistStatus.promoted();
    this.props.promotedReservationId = reservationId;
    this.props.updatedAt = new Date();
  }

  /** Mark this entry expired because its slot's start time has passed. */
  public expire(): void {
    if (!this.props.status.isWaiting()) {
      throw new Error('Only a waiting entry can expire');
    }
    this.props.status = WaitlistStatus.expired();
    this.props.updatedAt = new Date();
  }

  /**
   * Whether the entry is past its usefulness: the slot's start time is at or
   * before `now`, so no freed spot could still serve this guest.
   */
  public isExpired(now: Date = new Date()): boolean {
    return this._slot.start.getTime() <= now.getTime();
  }

  /** Only waiting, not-yet-past entries are eligible for auto-promotion. */
  public isEligibleForPromotion(now: Date = new Date()): boolean {
    return this.props.status.isWaiting() && !this.isExpired(now);
  }
}
