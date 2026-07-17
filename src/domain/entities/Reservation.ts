import { ReservationStatus } from '../value-objects/ReservationStatus';
import { Email } from '../value-objects/Email';
import { TimeSlot } from '../value-objects/TimeSlot';

export const DEFAULT_RESERVATION_DURATION_MINUTES = 90;

export interface ReservationProps {
  id?: string;
  restaurantId: string;
  /** The table this reservation holds; unassigned for legacy rows only. */
  tableId?: string;
  guestName: string;
  guestEmail: Email;
  guestPhone?: string;
  /** UTC instant. Local wall-clock times are converted before reaching here. */
  startsAt: Date;
  /** UTC instant; defaults to startsAt + the standard 90-minute duration. */
  endsAt?: Date;
  partySize: number;
  status: ReservationStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Reservation {
  private readonly props: ReservationProps;
  private readonly _slot: TimeSlot;

  constructor(props: ReservationProps) {
    this.validateProps(props);
    // TimeSlot enforces valid dates and end > start
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

  private validateProps(props: ReservationProps): void {
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
      throw new Error('Reservation start time is required');
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

  get tableId(): string | undefined {
    return this.props.tableId;
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

  get startsAt(): Date {
    return this._slot.start;
  }

  get endsAt(): Date {
    return this._slot.end;
  }

  get slot(): TimeSlot {
    return this._slot;
  }

  get partySize(): number {
    return this.props.partySize;
  }

  get status(): ReservationStatus {
    return this.props.status;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  get createdAt(): Date {
    return this.props.createdAt!;
  }

  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  // Business methods
  public confirm(): void {
    if (this.props.status.value === 'cancelled') {
      throw new Error('Cannot confirm a cancelled reservation');
    }
    this.props.status = ReservationStatus.confirmed();
    this.props.updatedAt = new Date();
  }

  public cancel(): void {
    if (this.props.status.value === 'completed') {
      throw new Error('Cannot cancel a completed reservation');
    }
    this.props.status = ReservationStatus.cancelled();
    this.props.updatedAt = new Date();
  }

  public complete(): void {
    if (this.props.status.value !== 'confirmed') {
      throw new Error('Only confirmed reservations can be completed');
    }
    this.props.status = ReservationStatus.completed();
    this.props.updatedAt = new Date();
  }

  public updateNotes(notes: string): void {
    if (notes.length > 500) {
      throw new Error('Notes must not exceed 500 characters');
    }
    this.props.notes = notes;
    this.props.updatedAt = new Date();
  }

  /** Whether this reservation currently occupies its table's slot. */
  public blocksTable(): boolean {
    return this.props.status.blocksTable();
  }

  /**
   * Orders can only be placed against a live reservation — one that still
   * holds (or will hold) its table. Cancelled, completed and no-show
   * reservations cannot take orders.
   */
  public canAcceptOrders(): boolean {
    return this.props.status.blocksTable();
  }

  public conflictsWith(slot: TimeSlot): boolean {
    return this.blocksTable() && this._slot.overlaps(slot);
  }

  public isPastDate(): boolean {
    return this._slot.start.getTime() < Date.now();
  }

  public canBeModified(): boolean {
    return (
      this.props.status.value !== 'cancelled' &&
      this.props.status.value !== 'completed' &&
      !this.isPastDate()
    );
  }
}
