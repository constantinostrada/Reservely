import { ReservationStatus } from '../value-objects/ReservationStatus';
import { Email } from '../value-objects/Email';

export interface ReservationProps {
  id?: string;
  restaurantId: string;
  guestName: string;
  guestEmail: Email;
  guestPhone?: string;
  date: Date;
  time: string;
  partySize: number;
  status: ReservationStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Reservation {
  private readonly props: ReservationProps;

  constructor(props: ReservationProps) {
    this.validateProps(props);
    this.props = {
      ...props,
      id: props.id || this.generateId(),
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

    if (!props.date) {
      throw new Error('Reservation date is required');
    }

    if (!props.time || !this.isValidTime(props.time)) {
      throw new Error('Valid reservation time is required (HH:MM format)');
    }

    if (props.guestPhone && props.guestPhone.length > 20) {
      throw new Error('Phone number must not exceed 20 characters');
    }
  }

  private isValidTime(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
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

  get date(): Date {
    return this.props.date;
  }

  get time(): string {
    return this.props.time;
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

  public isPastDate(): boolean {
    const reservationDateTime = new Date(this.props.date);
    const now = new Date();
    return reservationDateTime < now;
  }

  public canBeModified(): boolean {
    return (
      this.props.status.value !== 'cancelled' &&
      this.props.status.value !== 'completed' &&
      !this.isPastDate()
    );
  }
}
