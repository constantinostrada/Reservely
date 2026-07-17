import { PaymentStatus } from '../value-objects/PaymentStatus';

export type PaymentMethodValue = 'card' | 'cash' | 'online';

const PAYMENT_METHODS: readonly PaymentMethodValue[] = [
  'card',
  'cash',
  'online',
];

export interface PaymentProps {
  id?: string;
  restaurantId: string;
  orderId: string;
  /** Amount charged in integer cents (already includes the order's tip). */
  amountCents: number;
  /** Integer cents. */
  tipCents?: number;
  method: PaymentMethodValue;
  status: PaymentStatus;
  /** Charge reference assigned by the external payment provider. */
  externalRef?: string;
  /** When the provider settled the charge (set by the webhook). */
  processedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Payment {
  private readonly props: PaymentProps;

  constructor(props: PaymentProps) {
    this.validateProps(props);
    this.props = {
      ...props,
      id: props.id || this.generateId(),
      tipCents: props.tipCents ?? 0,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  private validateProps(props: PaymentProps): void {
    if (!props.restaurantId || props.restaurantId.trim().length === 0) {
      throw new Error('Restaurant id is required');
    }

    if (!props.orderId || props.orderId.trim().length === 0) {
      throw new Error('Order id is required');
    }

    if (!Number.isInteger(props.amountCents) || props.amountCents <= 0) {
      throw new Error('Amount must be a positive integer amount in cents');
    }

    if (
      props.tipCents !== undefined &&
      (!Number.isInteger(props.tipCents) || props.tipCents < 0)
    ) {
      throw new Error('Tip must be a non-negative integer amount in cents');
    }

    if (!PAYMENT_METHODS.includes(props.method)) {
      throw new Error(`Invalid payment method: ${props.method}`);
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

  get orderId(): string {
    return this.props.orderId;
  }

  get amountCents(): number {
    return this.props.amountCents;
  }

  get tipCents(): number {
    return this.props.tipCents!;
  }

  get method(): PaymentMethodValue {
    return this.props.method;
  }

  get status(): PaymentStatus {
    return this.props.status;
  }

  get externalRef(): string | undefined {
    return this.props.externalRef;
  }

  get processedAt(): Date | undefined {
    return this.props.processedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt!;
  }

  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  // Business methods
  /**
   * Settlement is a one-way street: only an in-flight payment can
   * succeed. Replayed webhook deliveries are deduplicated by event id
   * before this transition is ever attempted.
   */
  public markSucceeded(processedAt?: Date): void {
    if (!this.props.status.isPending()) {
      throw new Error(
        `Only a pending payment can succeed (current status: ${this.props.status.value})`
      );
    }
    this.props.status = PaymentStatus.succeeded();
    this.props.processedAt = processedAt ?? new Date();
    this.props.updatedAt = new Date();
  }

  public markFailed(processedAt?: Date): void {
    if (!this.props.status.isPending()) {
      throw new Error(
        `Only a pending payment can fail (current status: ${this.props.status.value})`
      );
    }
    this.props.status = PaymentStatus.failed();
    this.props.processedAt = processedAt ?? new Date();
    this.props.updatedAt = new Date();
  }
}
