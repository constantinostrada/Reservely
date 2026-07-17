type PaymentStatusValue = 'pending' | 'succeeded' | 'failed' | 'refunded';

export class PaymentStatus {
  private readonly _value: PaymentStatusValue;

  private constructor(value: PaymentStatusValue) {
    this._value = value;
  }

  static pending(): PaymentStatus {
    return new PaymentStatus('pending');
  }

  static succeeded(): PaymentStatus {
    return new PaymentStatus('succeeded');
  }

  static failed(): PaymentStatus {
    return new PaymentStatus('failed');
  }

  static refunded(): PaymentStatus {
    return new PaymentStatus('refunded');
  }

  static fromString(value: string): PaymentStatus {
    const normalizedValue = value.toLowerCase();
    switch (normalizedValue) {
      case 'pending':
        return PaymentStatus.pending();
      case 'succeeded':
        return PaymentStatus.succeeded();
      case 'failed':
        return PaymentStatus.failed();
      case 'refunded':
        return PaymentStatus.refunded();
      default:
        throw new Error(`Invalid payment status: ${value}`);
    }
  }

  get value(): PaymentStatusValue {
    return this._value;
  }

  public isPending(): boolean {
    return this._value === 'pending';
  }

  public isSucceeded(): boolean {
    return this._value === 'succeeded';
  }

  public isFailed(): boolean {
    return this._value === 'failed';
  }

  /**
   * Whether a payment in this status prevents charging the same bill
   * again: an in-flight (pending) or already collected (succeeded)
   * payment blocks a new charge; failed and refunded ones do not.
   */
  public blocksNewCharge(): boolean {
    return this._value === 'pending' || this._value === 'succeeded';
  }

  public equals(other: PaymentStatus): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
