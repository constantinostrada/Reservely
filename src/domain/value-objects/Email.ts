export class Email {
  private readonly _value: string;

  constructor(value: string) {
    const normalized = (value || '').trim().toLowerCase();
    this.validate(normalized);
    this._value = normalized;
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Email cannot be empty');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error('Invalid email format');
    }

    if (value.length > 255) {
      throw new Error('Email must not exceed 255 characters');
    }
  }

  get value(): string {
    return this._value;
  }

  public equals(other: Email): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
