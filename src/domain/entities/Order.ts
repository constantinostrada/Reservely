import { OrderStatus } from '../value-objects/OrderStatus';
import { OrderItem } from './OrderItem';

export interface OrderProps {
  id?: string;
  restaurantId: string;
  /** The reservation this order was placed against, if any. */
  reservationId?: string;
  /** Usually inherited from the reservation's table. */
  tableId?: string;
  status: OrderStatus;
  items: OrderItem[];
  /** Integer cents; no tax policy is applied automatically. */
  taxCents?: number;
  /** Integer cents. */
  tipCents?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Aggregate root for an order and its line items. All monetary amounts
 * are integer cents; the subtotal and total are always derived from the
 * items so they can never drift from the lines.
 */
export class Order {
  private readonly props: OrderProps;

  constructor(props: OrderProps) {
    this.validateProps(props);
    this.props = {
      ...props,
      id: props.id || this.generateId(),
      items: [...props.items],
      taxCents: props.taxCents ?? 0,
      tipCents: props.tipCents ?? 0,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  private validateProps(props: OrderProps): void {
    if (!props.restaurantId || props.restaurantId.trim().length === 0) {
      throw new Error('Restaurant id is required');
    }

    if (!props.items || props.items.length === 0) {
      throw new Error('An order must contain at least one item');
    }

    if (props.items.length > 100) {
      throw new Error('An order cannot contain more than 100 items');
    }

    if (
      props.taxCents !== undefined &&
      (!Number.isInteger(props.taxCents) || props.taxCents < 0)
    ) {
      throw new Error('Tax must be a non-negative integer amount in cents');
    }

    if (
      props.tipCents !== undefined &&
      (!Number.isInteger(props.tipCents) || props.tipCents < 0)
    ) {
      throw new Error('Tip must be a non-negative integer amount in cents');
    }

    if (props.notes && props.notes.length > 500) {
      throw new Error('Notes must not exceed 500 characters');
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

  get reservationId(): string | undefined {
    return this.props.reservationId;
  }

  get tableId(): string | undefined {
    return this.props.tableId;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get items(): OrderItem[] {
    return [...this.props.items];
  }

  /** Sum of the line totals, integer cents. */
  get subtotalCents(): number {
    return this.props.items.reduce(
      (sum, item) => sum + item.lineTotalCents,
      0
    );
  }

  get taxCents(): number {
    return this.props.taxCents!;
  }

  get tipCents(): number {
    return this.props.tipCents!;
  }

  /** subtotal + tax + tip, integer cents. */
  get totalCents(): number {
    return this.subtotalCents + this.taxCents + this.tipCents;
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
  public cancel(): void {
    if (this.props.status.isCompleted()) {
      throw new Error('Cannot cancel a completed order');
    }
    this.props.status = OrderStatus.cancelled();
    this.props.updatedAt = new Date();
  }
}
