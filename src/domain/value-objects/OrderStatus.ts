type OrderStatusValue =
  | 'open'
  | 'submitted'
  | 'in_progress'
  | 'served'
  | 'completed'
  | 'cancelled';

export class OrderStatus {
  private readonly _value: OrderStatusValue;

  private constructor(value: OrderStatusValue) {
    this._value = value;
  }

  static open(): OrderStatus {
    return new OrderStatus('open');
  }

  static submitted(): OrderStatus {
    return new OrderStatus('submitted');
  }

  static inProgress(): OrderStatus {
    return new OrderStatus('in_progress');
  }

  static served(): OrderStatus {
    return new OrderStatus('served');
  }

  static completed(): OrderStatus {
    return new OrderStatus('completed');
  }

  static cancelled(): OrderStatus {
    return new OrderStatus('cancelled');
  }

  static fromString(value: string): OrderStatus {
    const normalizedValue = value.toLowerCase();
    switch (normalizedValue) {
      case 'open':
        return OrderStatus.open();
      case 'submitted':
        return OrderStatus.submitted();
      case 'in_progress':
        return OrderStatus.inProgress();
      case 'served':
        return OrderStatus.served();
      case 'completed':
        return OrderStatus.completed();
      case 'cancelled':
        return OrderStatus.cancelled();
      default:
        throw new Error(`Invalid order status: ${value}`);
    }
  }

  get value(): OrderStatusValue {
    return this._value;
  }

  public isOpen(): boolean {
    return this._value === 'open';
  }

  public isCancelled(): boolean {
    return this._value === 'cancelled';
  }

  public isCompleted(): boolean {
    return this._value === 'completed';
  }

  public equals(other: OrderStatus): boolean {
    return this._value === other._value;
  }

  public toString(): string {
    return this._value;
  }
}
