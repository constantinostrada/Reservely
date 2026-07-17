export interface OrderItemProps {
  id?: string;
  menuItemId: string;
  /** Snapshot of the menu item name at order time (survives renames). */
  itemName: string;
  quantity: number;
  /** Snapshot of the menu item price at order time, integer cents. */
  unitPriceCents: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * A line on an order. Belongs to the Order aggregate — it is never
 * persisted or loaded outside of its order.
 */
export class OrderItem {
  private readonly props: OrderItemProps;

  constructor(props: OrderItemProps) {
    this.validateProps(props);
    this.props = {
      ...props,
      id: props.id || this.generateId(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  private validateProps(props: OrderItemProps): void {
    if (!props.menuItemId || props.menuItemId.trim().length === 0) {
      throw new Error('Menu item id is required');
    }

    if (!props.itemName || props.itemName.trim().length === 0) {
      throw new Error('Item name is required');
    }

    if (!Number.isInteger(props.quantity) || props.quantity < 1) {
      throw new Error('Quantity must be a positive integer');
    }

    if (props.quantity > 100) {
      throw new Error('Quantity cannot exceed 100');
    }

    if (!Number.isInteger(props.unitPriceCents) || props.unitPriceCents < 0) {
      throw new Error(
        'Unit price must be a non-negative integer amount in cents'
      );
    }

    if (props.notes && props.notes.length > 255) {
      throw new Error('Item notes must not exceed 255 characters');
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  get id(): string {
    return this.props.id!;
  }

  get menuItemId(): string {
    return this.props.menuItemId;
  }

  get itemName(): string {
    return this.props.itemName;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unitPriceCents(): number {
    return this.props.unitPriceCents;
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

  /** quantity × unit price, integer cents. */
  get lineTotalCents(): number {
    return this.props.quantity * this.props.unitPriceCents;
  }
}
