type ReservationStatusValue = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export class ReservationStatus {
  private readonly _value: ReservationStatusValue;

  private constructor(value: ReservationStatusValue) {
    this._value = value;
  }

  static pending(): ReservationStatus {
    return new ReservationStatus('pending');
  }

  static confirmed(): ReservationStatus {
    return new ReservationStatus('confirmed');
  }

  static cancelled(): ReservationStatus {
    return new ReservationStatus('cancelled');
  }

  static completed(): ReservationStatus {
    return new ReservationStatus('completed');
  }

  static fromString(value: string): ReservationStatus {
    const normalizedValue = value.toLowerCase();
    switch (normalizedValue) {
      case 'pending':
        return ReservationStatus.pending();
      case 'confirmed':
        return ReservationStatus.confirmed();
      case 'cancelled':
        return ReservationStatus.cancelled();
      case 'completed':
        return ReservationStatus.completed();
      default:
        throw new Error(`Invalid reservation status: ${value}`);
    }
  }

  get value(): ReservationStatusValue {
    return this._value;
  }

  public isPending(): boolean {
    return this._value === 'pending';
  }

  public isConfirmed(): boolean {
    return this._value === 'confirmed';
  }

  public isCancelled(): boolean {
    return this._value === 'cancelled';
  }

  public isCompleted(): boolean {
    return this._value === 'completed';
  }

  public equals(other: ReservationStatus): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
