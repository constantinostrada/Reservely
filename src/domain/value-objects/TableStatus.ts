type TableStatusValue = 'available' | 'reserved' | 'unavailable';

export class TableStatus {
  private readonly _value: TableStatusValue;

  private constructor(value: TableStatusValue) {
    this._value = value;
  }

  static available(): TableStatus {
    return new TableStatus('available');
  }

  static reserved(): TableStatus {
    return new TableStatus('reserved');
  }

  static unavailable(): TableStatus {
    return new TableStatus('unavailable');
  }

  static fromString(value: string): TableStatus {
    const normalizedValue = value.toLowerCase();
    switch (normalizedValue) {
      case 'available':
        return TableStatus.available();
      case 'reserved':
        return TableStatus.reserved();
      case 'unavailable':
        return TableStatus.unavailable();
      default:
        throw new Error(`Invalid table status: ${value}`);
    }
  }

  get value(): TableStatusValue {
    return this._value;
  }

  public isAvailable(): boolean {
    return this._value === 'available';
  }

  public isReserved(): boolean {
    return this._value === 'reserved';
  }

  public isUnavailable(): boolean {
    return this._value === 'unavailable';
  }

  public equals(other: TableStatus): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
