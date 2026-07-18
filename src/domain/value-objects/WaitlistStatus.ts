type WaitlistStatusValue = 'waiting' | 'promoted' | 'expired' | 'cancelled';

/**
 * Lifecycle of a waitlist entry:
 *  - waiting:   in line for the slot, eligible for auto-promotion
 *  - promoted:  a freed slot was handed to this entry (a reservation exists)
 *  - expired:   the slot's start time passed before a spot opened up
 *  - cancelled: the guest withdrew before being promoted
 * Only `waiting` entries are ever considered for promotion.
 */
export class WaitlistStatus {
  private readonly _value: WaitlistStatusValue;

  private constructor(value: WaitlistStatusValue) {
    this._value = value;
  }

  static waiting(): WaitlistStatus {
    return new WaitlistStatus('waiting');
  }

  static promoted(): WaitlistStatus {
    return new WaitlistStatus('promoted');
  }

  static expired(): WaitlistStatus {
    return new WaitlistStatus('expired');
  }

  static cancelled(): WaitlistStatus {
    return new WaitlistStatus('cancelled');
  }

  static fromString(value: string): WaitlistStatus {
    switch (value.toLowerCase()) {
      case 'waiting':
        return WaitlistStatus.waiting();
      case 'promoted':
        return WaitlistStatus.promoted();
      case 'expired':
        return WaitlistStatus.expired();
      case 'cancelled':
        return WaitlistStatus.cancelled();
      default:
        throw new Error(`Invalid waitlist status: ${value}`);
    }
  }

  get value(): WaitlistStatusValue {
    return this._value;
  }

  public isWaiting(): boolean {
    return this._value === 'waiting';
  }

  public isPromoted(): boolean {
    return this._value === 'promoted';
  }

  public isExpired(): boolean {
    return this._value === 'expired';
  }

  public equals(other: WaitlistStatus): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
