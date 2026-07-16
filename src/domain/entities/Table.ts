import { TableStatus } from '../value-objects/TableStatus';

export interface TableProps {
  id?: string;
  restaurantId: string;
  tableNumber: number;
  capacity: number;
  location?: string;
  status: TableStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Table {
  private readonly props: TableProps;

  constructor(props: TableProps) {
    this.validateProps(props);
    this.props = {
      ...props,
      id: props.id || this.generateId(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  private validateProps(props: TableProps): void {
    if (!props.restaurantId || props.restaurantId.trim().length === 0) {
      throw new Error('Restaurant id is required');
    }

    if (props.tableNumber < 1) {
      throw new Error('Table number must be at least 1');
    }

    if (props.capacity < 1) {
      throw new Error('Table capacity must be at least 1');
    }

    if (props.capacity > 20) {
      throw new Error('Table capacity cannot exceed 20');
    }

    if (props.location && props.location.length > 50) {
      throw new Error('Location must not exceed 50 characters');
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

  get tableNumber(): number {
    return this.props.tableNumber;
  }

  get capacity(): number {
    return this.props.capacity;
  }

  get location(): string | undefined {
    return this.props.location;
  }

  get status(): TableStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt!;
  }

  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  // Business methods
  public reserve(): void {
    if (this.props.status.value === 'reserved') {
      throw new Error('Table is already reserved');
    }
    if (this.props.status.value === 'unavailable') {
      throw new Error('Cannot reserve an unavailable table');
    }
    this.props.status = TableStatus.reserved();
    this.props.updatedAt = new Date();
  }

  public makeAvailable(): void {
    this.props.status = TableStatus.available();
    this.props.updatedAt = new Date();
  }

  public makeUnavailable(): void {
    this.props.status = TableStatus.unavailable();
    this.props.updatedAt = new Date();
  }

  public canAccommodate(partySize: number): boolean {
    return (
      this.props.capacity >= partySize &&
      this.props.status.value === 'available'
    );
  }

  public isAvailable(): boolean {
    return this.props.status.value === 'available';
  }
}
